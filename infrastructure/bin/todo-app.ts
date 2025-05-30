#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TodoAppStack } from '../lib/todo-app-stack';

const app = new cdk.App();

// Get environment and account from context or environment variables
const account = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID;
const region = process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'ap-southeast-2';

const envName = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';
const appName = app.node.tryGetContext('appName') || process.env.APP_NAME || 'todo-app';

new TodoAppStack(app, `${appName}-${envName}`, {
  env: {
    account,
    region,
  },
  description: `Todo App Infrastructure Stack for ${envName} environment`,
  tags: {
    Environment: envName,
    Application: appName,
    ManagedBy: 'CDK',
  },
  appName,
  environment: envName,
});

app.synth();
