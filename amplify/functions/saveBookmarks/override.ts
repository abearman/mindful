// Setting up Provisioned Concurrency for saveBookmarks 
import { Stack } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { MEMORY_MB, TIMEOUT_SECONDS } from '../_shared/constants';


export function override(props: any) {
  const cfn = props.resources.lambda as lambda.CfnFunction;
  const stack = Stack.of(cfn);

  // (optional) keep these asserted in the override too
  cfn.addPropertyOverride('MemorySize', MEMORY_MB);
  cfn.addPropertyOverride('Timeout', TIMEOUT_SECONDS);

  // Lift the low-level CfnFunction to an IFunction we can attach Version/Alias to
  const fnArn = cfn.getAtt('Arn').toString();
  const func = lambda.Function.fromFunctionArn(stack, 'ImportedFunc', fnArn);

  // Publish a Version and create an Alias
  const version = new lambda.Version(stack, 'Version', { lambda: func });
  const alias = new lambda.Alias(stack, 'LiveAlias', {
    aliasName: 'live',
    version,
  });

  // This sets Provisioned Concurrency = 1 (and creates the right resources)
  alias.addAutoScaling({ minCapacity: 1, maxCapacity: 1 });
}
