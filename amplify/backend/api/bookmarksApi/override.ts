// amplify/backend/api/bookmarksApi/override.ts
import { ArnFormat, Stack } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export function override(props: any) {
  const { api } = props.resources.cfnResources; // HttpApi CFN resource
  const stack = Stack.of(api);
  const aliasName = 'live';

  // ---- Helper to point a route to a Lambda alias ----
  const wireRouteToAlias = (routeKey: string, fnKey: string) => {
    // Get the Lambda CFN for this dependent function
    const cfnFn = props.resources.dependentResources.function[fnKey].resources.lambda as lambda.CfnFunction;

    // Import it as a usable IFunction to get its ARN
    const fnArn = cfnFn.getAtt('Arn').toString();
    const aliasArn = `${fnArn}:${aliasName}`;

    // Override the Integration URI to point to the alias (NOT $LATEST)
    const integration = props.resources.cfnResources.routes[routeKey].integration;
    integration.addPropertyOverride(
      'Uri',
      stack.formatArn({
        service: 'apigateway',
        resource: 'lambda:path/2015-03-31/functions',
        resourceName: `${aliasArn}/invocations`,
        arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      })
    );

    // Ensure API Gateway can invoke the alias (qualifier)
    // If your helper exists, it will attach a Lambda::Permission for the alias ARN:
    props.resources.addLambdaPermission({
      action: 'lambda:InvokeFunction',
      functionArn: aliasArn,                // include qualifier here
      principal: 'apigateway.amazonaws.com',
    });
  };

  // Wire routes we want to use PC for:
  wireRouteToAlias('GET /bookmarks',    'loadBookmarks');   
  wireRouteToAlias('POST /bookmarks',   'saveBookmarks');
}
