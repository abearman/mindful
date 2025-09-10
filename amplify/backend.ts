import { defineBackend, secret } from '@aws-amplify/backend';
import { defineFunction } from '@aws-amplify/backend-function';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as kms from 'aws-cdk-lib/aws-kms';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';

// ---------- 1) Lambdas ----------
const BOOKMARKS_FILE_NAME = 'bookmarks.json.encrypted'
const KEY_FILE_NAME = 'bookmarks.key'

const saveBookmarks = defineFunction({
  name: 'saveBookmarksFunc',
  entry: './functions/saveBookmarks/handler.ts',
  resourceGroupName: 'storage',
  environment: {
    // Pulled securely at runtime
    ALLOWED_EXTENSION_IDS: secret('ALLOWED_EXTENSION_IDS'),
    ALLOWED_ORIGIN: secret('ALLOWED_ORIGIN'),  // Keep this legacy value of single allowed Chrome extension ID
    // These are non-secret, fine to keep as plain envs
    BOOKMARKS_FILE_NAME: BOOKMARKS_FILE_NAME,
    KEY_FILE_NAME: KEY_FILE_NAME,
  },
  runtime: 20,
  memoryMB: 1024,
  timeoutSeconds: 10,
});

const loadBookmarks = defineFunction({
  name: 'loadBookmarksFunc',
  entry: './functions/loadBookmarks/handler.ts',
  resourceGroupName: 'storage',
  environment: {
    ALLOWED_EXTENSION_IDS: secret('ALLOWED_EXTENSION_IDS'),
    ALLOWED_ORIGIN: secret('ALLOWED_ORIGIN'),
    BOOKMARKS_FILE_NAME: BOOKMARKS_FILE_NAME,
    KEY_FILE_NAME: KEY_FILE_NAME,
  },
  runtime: 20,
  memoryMB: 1024,
  timeoutSeconds: 10,
});

const deleteBookmarks = defineFunction({
  name: 'deleteBookmarksFunc',
  entry: './functions/deleteBookmarks/handler.ts',
  resourceGroupName: 'storage',
  environment: {
    ALLOWED_EXTENSION_IDS: secret('ALLOWED_EXTENSION_IDS'),
    ALLOWED_ORIGIN: secret('ALLOWED_ORIGIN'),
    BOOKMARKS_FILE_NAME: BOOKMARKS_FILE_NAME,
    KEY_FILE_NAME: KEY_FILE_NAME,
  },
  runtime: 20,
  memoryMB: 1024,
  timeoutSeconds: 10,
});

// ---------- 2) Backend ----------
export const backend = defineBackend({
  auth,
  data,
  storage,
  saveBookmarks,
  loadBookmarks,
  deleteBookmarks,
});

// ---------- 3) Synthesized resources ----------
const stack = backend.storage.resources.bucket.stack;
const authenticatedUserRole = backend.auth.resources.authenticatedUserIamRole;
const s3Bucket = backend.storage.resources.bucket;

const saveBookmarksFn = backend.saveBookmarks.resources.lambda as lambda.Function;
const loadBookmarksFn = backend.loadBookmarks.resources.lambda as lambda.Function;
const deleteBookmarksFn = backend.deleteBookmarks.resources.lambda as lambda.Function;

// ---------- 4) KMS key (ID or ARN both work for GenerateDataKey) ----------
const kmsKeyId = 'arn:aws:kms:us-west-1:534861782220:key/51a54516-e016-4d00-a6da-7aff429418ed';
const kmsKey = kms.Key.fromKeyArn(stack, 'BookmarksKmsKey', kmsKeyId);

// Grant only what each function needs
kmsKey.grant(saveBookmarksFn, 'kms:GenerateDataKey');
kmsKey.grant(loadBookmarksFn, 'kms:Decrypt');

// ---------- 5) Lambda env ----------
for (const fn of [saveBookmarksFn, loadBookmarksFn, deleteBookmarksFn]) {
  fn.addEnvironment('S3_BUCKET_NAME', s3Bucket.bucketName);
}
saveBookmarksFn.addEnvironment('KMS_KEY_ID', kmsKeyId);
loadBookmarksFn.addEnvironment('KMS_KEY_ID', kmsKeyId);

// ---------- 6) S3 access for authenticated users ----------
const authenticatedUserPrincipal = new iam.ArnPrincipal(authenticatedUserRole.roleArn);

s3Bucket.addToResourcePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  principals: [authenticatedUserPrincipal],
  actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
  resources: [`${s3Bucket.bucketArn}/private/\${cognito-identity.amazonaws.com:sub}/*`],
}));

s3Bucket.addToResourcePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  principals: [authenticatedUserPrincipal],
  actions: ['s3:ListBucket'],
  resources: [s3Bucket.bucketArn],
  conditions: {
    StringLike: { 's3:prefix': [`private/\${cognito-identity.amazonaws.com:sub}/*`] },
  },
}));

// ---------- 7) HTTP API + authorizer ----------
const authorizer = new HttpUserPoolAuthorizer(
  'userPoolAuthorizer',
  backend.auth.resources.userPool,
  { userPoolClients: [backend.auth.resources.userPoolClient] }
);

const api = new apigwv2.HttpApi(stack, 'MyHttpApi', {
  apiName: 'bookmarksApi',
  corsPreflight: {
    allowOrigins: ['*'], // tighten for prod
    allowMethods: [
      apigwv2.CorsHttpMethod.OPTIONS,
      apigwv2.CorsHttpMethod.GET,
      apigwv2.CorsHttpMethod.POST,
      apigwv2.CorsHttpMethod.DELETE,
    ],
    allowHeaders: ['Content-Type', 'Authorization'],
  },
});

// explicit authorizer per-route (safer than relying on defaultAuthorizer)
api.addRoutes({
  path: '/bookmarks',
  methods: [apigwv2.HttpMethod.POST],
  integration: new HttpLambdaIntegration('saveBookmarksIntegration', saveBookmarksFn),
  authorizer,
});

api.addRoutes({
  path: '/bookmarks',
  methods: [apigwv2.HttpMethod.GET],
  integration: new HttpLambdaIntegration('loadBookmarksIntegration', loadBookmarksFn),
  authorizer,
});

api.addRoutes({
  path: '/bookmarks',
  methods: [apigwv2.HttpMethod.DELETE],
  integration: new HttpLambdaIntegration('deleteBookmarksIntegration', deleteBookmarksFn),
  authorizer,
});

// ---------- 8) Lambda IAM for S3 + KMS ----------
// Replace your shared policy with per-function policies:
saveBookmarksFn.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['s3:GetObject','s3:PutObject','s3:DeleteObject'],
  resources: [`${s3Bucket.bucketArn}/*`],
}));

loadBookmarksFn.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['s3:GetObject','s3:PutObject','s3:DeleteObject'],
  resources: [`${s3Bucket.bucketArn}/*`],
}));

deleteBookmarksFn.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['s3:GetObject','s3:PutObject','s3:DeleteObject'],
  resources: [`${s3Bucket.bucketArn}/*`],
}));

// ---------- 9) Export the API endpoint to amplify_outputs.json ----------
backend.addOutput({
  custom: {
    API: {
      bookmarks: {
        apiName: 'bookmarksApi',
        type: 'httpApi',
        endpoint: api.apiEndpoint, 
      },
    },
  },
});
