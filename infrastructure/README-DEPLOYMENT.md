# Infrastructure Deployment Guide

This document explains the deployment structure of the Todo App infrastructure, which is split into two main components:

1. Main Infrastructure Stack (TodoAppStack)
2. App Runner Stack (AppRunnerStack)

## Known Issues

### CloudFront S3Origin Deprecation

The current implementation uses the deprecated `S3Origin` class from `aws-cdk-lib.aws_cloudfront_origins`. In future updates, this will be replaced with either:

- `S3BucketOrigin`
- `S3StaticWebsiteOrigin`

### Stack Naming Convention

The App Runner stack name follows the pattern: `${appName}-${environment}-apprunner`

- Example: `todo-app-dev-apprunner`

## Deployment Structure

### 1. Main Infrastructure Stack (`todo-app.ts`)

The main infrastructure stack creates all core AWS resources:

- DynamoDB Table for todos
- Cognito User Pool and Client
- ECR Repository for backend API
- S3 Bucket for frontend
- CloudFront Distribution
- IAM Roles and Policies

**Deployment Command:**

```bash
cdk deploy todo-app-${ENVIRONMENT}
```

### 2. App Runner Stack (`app-runner-deploy.ts`)

The App Runner stack is deployed separately and imports resources from the main stack:

- Imports existing DynamoDB table
- Imports existing Cognito User Pool and Client
- Imports existing ECR repository
- Creates App Runner service with proper configuration

**Prerequisites:**

- Main infrastructure stack must be deployed first
- Required Cognito IDs (User Pool ID and Client ID)

**Deployment Command:**

```bash
npm run deploy:apprunner
```

## Getting Required Values

### Cognito IDs

You can get the required Cognito IDs using AWS CLI:

1. Get User Pool ID:

```bash
aws cognito-idp list-user-pools --max-results 20 \
  --query "UserPools[?Name=='todo-app-${ENVIRONMENT}-users'].Id" \
  --output text
```

2. Get Client ID:

```bash
aws cognito-idp list-user-pool-clients \
  --user-pool-id <USER_POOL_ID> \
  --query "UserPoolClients[?ClientName=='todo-app-${ENVIRONMENT}-client'].ClientId" \
  --output text
```

3. Or get both at once from CloudFormation outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name todo-app-${ENVIRONMENT} \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId` || OutputKey==`UserPoolClientId`].{Key:OutputKey,Value:OutputValue}'
```

## Environment Variables

### Required Variables

- `COGNITO_USER_POOL_ID`: Cognito User Pool ID
- `COGNITO_CLIENT_ID`: Cognito User Pool Client ID

### Optional Variables

- `ENVIRONMENT`: Deployment environment (defaults to 'dev')
- `APP_NAME`: Application name (defaults to 'todo-app')
- `AWS_REGION`: AWS region (defaults to 'ap-southeast-2')

## Deployment Steps

1. Deploy main infrastructure:

```bash
# Set environment variables
export ENVIRONMENT=dev
export APP_NAME=todo-app

# Deploy main stack
cdk deploy todo-app-${ENVIRONMENT}
```

2. Get Cognito IDs using AWS CLI commands above

3. Deploy App Runner:

```bash
# Set Cognito IDs
export COGNITO_USER_POOL_ID=ap-southeast-2_xxxxxxxxx
export COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# Deploy App Runner stack
npm run deploy:apprunner
```

**Note**: If you see the error "No stacks match the name(s) todo-app-dev-apprunner", verify that:

1. The environment variables are set correctly
2. The stack name matches the pattern `${appName}-${environment}-apprunner`
3. You're in the correct directory (infrastructure/)

## Benefits of Separate Stacks

1. **Independent Updates**: Update App Runner configuration without touching main infrastructure
2. **Faster Deployments**: Deploy only what's needed
3. **Better Resource Management**: Clear separation of concerns
4. **Flexible Deployment Options**: Deploy App Runner to different environments easily

## Troubleshooting

If you encounter errors during App Runner deployment:

1. Verify main infrastructure is deployed:

```bash
aws cloudformation describe-stacks --stack-name todo-app-${ENVIRONMENT}
```

2. Check if required resources exist:

```bash
# Check DynamoDB table
aws dynamodb describe-table --table-name todo-app-${ENVIRONMENT}-todos

# Check ECR repository
aws ecr describe-repositories --repository-names todo-app-${ENVIRONMENT}-backend-api

# Check Cognito resources
aws cognito-idp describe-user-pool --user-pool-id ${COGNITO_USER_POOL_ID}
```

3. Verify environment variables:

```bash
echo "Environment: ${ENVIRONMENT}"
echo "App Name: ${APP_NAME}"
echo "User Pool ID: ${COGNITO_USER_POOL_ID}"
echo "Client ID: ${COGNITO_CLIENT_ID}"
```
