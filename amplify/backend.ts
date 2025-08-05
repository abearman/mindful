import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource'; 
import * as iam from 'aws-cdk-lib/aws-iam'; 


/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
export const backend = defineBackend({
  auth,
  data,
  storage,
});

// --- Custom IAM Policy ---
// This is the correct place to define permissions between resources.

// 1. Get the underlying resources that were created by defineBackend.
const authenticatedUserRole = backend.auth.resources.authenticatedUserIamRole;
const s3Bucket = backend.storage.resources.bucket;

// 2. Create the policy statement that allows access to the user's own folder.
const s3PolicyStatement = new iam.PolicyStatement({
    actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
    effect: iam.Effect.ALLOW,
    resources: [
        `${s3Bucket.bucketArn}/private/\${cognito-identity.amazonaws.com:sub}/*`
    ]
});

// 3. Create the policy statement that allows listing their own folder.
const s3ListPolicyStatement = new iam.PolicyStatement({
    actions: ['s3:ListBucket'],
    effect: iam.Effect.ALLOW,
    resources: [s3Bucket.bucketArn],
    conditions: {
        "StringLike": {
            "s3:prefix": [
                `private/\${cognito-identity.amazonaws.com:sub}/`,
                `private/\${cognito-identity.amazonaws.com:sub}/*`
            ]
        }
    }
});

// 4. Attach the new policies directly to the authenticated user role.
authenticatedUserRole.addToPrincipalPolicy(s3PolicyStatement);
authenticatedUserRole.addToPrincipalPolicy(s3ListPolicyStatement);