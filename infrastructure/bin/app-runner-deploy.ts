#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { AppRunnerStack } from '../lib/app-runner-stack';

const app = new cdk.App();

// Get configuration from context or environment variables
const envName = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';
const appName = app.node.tryGetContext('appName') || process.env.APP_NAME || 'todo-app';
const region = process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'ap-southeast-2';

// Get resource IDs from context or environment variables
const userPoolId = app.node.tryGetContext('userPoolId') || process.env.COGNITO_USER_POOL_ID;
const userPoolClientId = app.node.tryGetContext('userPoolClientId') || process.env.COGNITO_CLIENT_ID;

if (!userPoolId || !userPoolClientId) {
  throw new Error(
    'Cognito User Pool ID and Client ID are required. Please provide them via context or environment variables.'
  );
}

// Create a dummy stack to provide scope for imports
const dummyStack = new cdk.Stack(app, 'DummyStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region,
  },
});

// Import resources within the dummy stack's scope
const ecrRepository = ecr.Repository.fromRepositoryName(
  dummyStack,
  'ImportedEcrRepo',
  `${appName}-${envName}-backend-api`
);

const todoTable = dynamodb.Table.fromTableName(
  dummyStack,
  'ImportedTodoTable',
  `${appName}-${envName}-todos`
);

const userPool = cognito.UserPool.fromUserPoolId(dummyStack, 'ImportedUserPool', userPoolId);

const userPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
  dummyStack,
  'ImportedUserPoolClient',
  userPoolClientId
);

// Create the actual AppRunnerStack with imported resources
new AppRunnerStack(app, `${appName}-${envName}-apprunner`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region,
  },
  appName,
  environment: envName,
  ecrRepository,
  todoTable,
  userPool,
  userPoolClient,
});

app.synth();
