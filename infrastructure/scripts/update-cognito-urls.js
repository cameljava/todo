#!/usr/bin/env node

import {
  CognitoIdentityProviderClient,
  UpdateUserPoolClientCommand,
  DescribeUserPoolClientCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';

const region = process.env.AWS_REGION || 'ap-southeast-2';
const stackName = process.env.STACK_NAME || 'TodoAppStack';

const cognitoClient = new CognitoIdentityProviderClient({ region });
const cfnClient = new CloudFormationClient({ region });

async function updateCognitoUrls() {
  try {
    console.log('🔍 Getting stack outputs...');

    // Get stack outputs
    const stackResponse = await cfnClient.send(
      new DescribeStacksCommand({
        StackName: stackName,
      })
    );

    const stack = stackResponse.Stacks[0];
    const outputs = stack.Outputs || [];

    const userPoolId = outputs.find((o) => o.OutputKey === 'UserPoolId')?.OutputValue;
    const userPoolClientId = outputs.find((o) => o.OutputKey === 'UserPoolClientId')?.OutputValue;
    const frontendUrl = outputs.find((o) => o.OutputKey === 'FrontendUrl')?.OutputValue;

    if (!userPoolId || !userPoolClientId || !frontendUrl) {
      throw new Error('Missing required stack outputs');
    }

    console.log(`📋 User Pool ID: ${userPoolId}`);
    console.log(`📋 Client ID: ${userPoolClientId}`);
    console.log(`📋 Frontend URL: ${frontendUrl}`);

    // Get current client configuration
    const currentClient = await cognitoClient.send(
      new DescribeUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientId: userPoolClientId,
      })
    );

    const currentConfig = currentClient.UserPoolClient;

    // Update callback and logout URLs
    const updatedCallbackUrls = [
      ...currentConfig.CallbackURLs.filter((url) => url.includes('localhost')),
      frontendUrl,
    ];

    const updatedLogoutUrls = [
      ...currentConfig.LogoutURLs.filter((url) => url.includes('localhost')),
      frontendUrl,
    ];

    console.log('🔄 Updating Cognito User Pool Client...');

    await cognitoClient.send(
      new UpdateUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientId: userPoolClientId,
        ClientName: currentConfig.ClientName,
        CallbackURLs: updatedCallbackUrls,
        LogoutURLs: updatedLogoutUrls,
        SupportedIdentityProviders: currentConfig.SupportedIdentityProviders,
        AllowedOAuthFlows: currentConfig.AllowedOAuthFlows,
        AllowedOAuthScopes: currentConfig.AllowedOAuthScopes,
        AllowedOAuthFlowsUserPoolClient: currentConfig.AllowedOAuthFlowsUserPoolClient,
        ExplicitAuthFlows: currentConfig.ExplicitAuthFlows,
        GenerateSecret: currentConfig.GenerateSecret,
        RefreshTokenValidity: currentConfig.RefreshTokenValidity,
        AccessTokenValidity: currentConfig.AccessTokenValidity,
        IdTokenValidity: currentConfig.IdTokenValidity,
        TokenValidityUnits: currentConfig.TokenValidityUnits,
        ReadAttributes: currentConfig.ReadAttributes,
        WriteAttributes: currentConfig.WriteAttributes,
        PreventUserExistenceErrors: currentConfig.PreventUserExistenceErrors,
      })
    );

    console.log('✅ Cognito User Pool Client updated successfully!');
    console.log(`📋 Callback URLs: ${updatedCallbackUrls.join(', ')}`);
    console.log(`📋 Logout URLs: ${updatedLogoutUrls.join(', ')}`);
  } catch (error) {
    console.error('❌ Error updating Cognito URLs:', error);
    process.exit(1);
  }
}

updateCognitoUrls();
