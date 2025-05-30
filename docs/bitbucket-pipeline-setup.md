# Bitbucket CI/CD Pipeline Setup

This guide explains how to set up a Bitbucket CI/CD pipeline for the Todo App backend with ECR integration and App Runner deployment.

## 🔧 Prerequisites

1. **AWS Account** with appropriate permissions
2. **Bitbucket Repository** with the Todo App code
3. **ECR Repository** created via CDK deployment
4. **App Runner Service** created via CDK deployment

## 📋 Required Environment Variables

Configure these variables in your Bitbucket repository settings:

### Repository Variables (Settings > Repository settings > Repository variables)

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=ap-southeast-2

# ECR Configuration
ECR_REPOSITORY_URI=123456789012.dkr.ecr.ap-southeast-2.amazonaws.com/todo-app-dev-backend-api

# App Runner Configuration (optional - for manual deployment triggers)
APP_RUNNER_SERVICE_ARN=arn:aws:apprunner:ap-southeast-2:123456789012:service/todo-app-dev-backend-api/...

# Frontend Configuration
FRONTEND_BUCKET_NAME=todo-app-dev-frontend-123456789012
CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC
FRONTEND_URL=https://d1234567890abc.cloudfront.net

# Cognito Configuration (for frontend build)
COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
COGNITO_CLIENT_ID=your-cognito-client-id
COGNITO_DOMAIN=todo-app-dev-auth-123456789012.auth.ap-southeast-2.amazoncognito.com

# Backend API URL (for frontend)
BACKEND_API_URL=https://your-app-runner-service-url.ap-southeast-2.awsapprunner.com
```

## 🚀 Pipeline Configuration

Create a `bitbucket-pipelines.yml` file in your repository root:

```yaml
image: node:22-alpine

definitions:
  services:
    docker:
      memory: 2048

  steps:
    - step: &build-and-test-backend
        name: Build and Test Backend
        image: node:22-alpine
        caches:
          - node
        script:
          - cd backend
          - npm ci
          - npm run build
          - npm run test
          - npm run lint
        artifacts:
          - backend/dist/**

    - step: &build-docker-image
        name: Build Docker Image
        image: atlassian/default-image:4
        services:
          - docker
        caches:
          - docker
        script:
          - cd backend
          # Install AWS CLI
          - apk add --no-cache aws-cli
          # Configure AWS credentials
          - aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
          - aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY
          - aws configure set default.region $AWS_DEFAULT_REGION
          # Login to ECR
          - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY_URI
          # Build and tag Docker image
          - docker build -t $ECR_REPOSITORY_URI:$BITBUCKET_COMMIT .
          - docker tag $ECR_REPOSITORY_URI:$BITBUCKET_COMMIT $ECR_REPOSITORY_URI:latest
          # Push to ECR
          - docker push $ECR_REPOSITORY_URI:$BITBUCKET_COMMIT
          - docker push $ECR_REPOSITORY_URI:latest
          - echo "Image pushed to ECR: $ECR_REPOSITORY_URI:$BITBUCKET_COMMIT"

    - step: &deploy-infrastructure
        name: Deploy Infrastructure
        image: node:22-alpine
        caches:
          - node
        script:
          - cd infrastructure
          - npm ci
          - npm run build
          # Install AWS CLI
          - apk add --no-cache aws-cli
          # Configure AWS credentials
          - aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
          - aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY
          - aws configure set default.region $AWS_DEFAULT_REGION
          # Deploy CDK stack
          - npx cdk deploy --require-approval never --outputs-file outputs.json
          # Output the deployment results
          - cat outputs.json
        artifacts:
          - infrastructure/outputs.json

    - step: &trigger-app-runner-deployment
        name: Trigger App Runner Deployment
        image: atlassian/default-image:4
        script:
          # Install AWS CLI
          - apk add --no-cache aws-cli
          # Configure AWS credentials
          - aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
          - aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY
          - aws configure set default.region $AWS_DEFAULT_REGION
          # Trigger App Runner deployment (it should auto-deploy, but we can force it)
          - |
            if [ -n "$APP_RUNNER_SERVICE_ARN" ]; then
              echo "Triggering App Runner deployment..."
              aws apprunner start-deployment --service-arn $APP_RUNNER_SERVICE_ARN
              echo "Deployment triggered successfully"
            else
              echo "APP_RUNNER_SERVICE_ARN not set, skipping manual deployment trigger"
            fi

pipelines:
  default:
    - step: *build-and-test-backend

  branches:
    develop:
      - step: *build-and-test-backend
      - step: *build-docker-image
      - step: *deploy-infrastructure
      - step: *trigger-app-runner-deployment

    main:
      - step: *build-and-test-backend
      - step: *build-docker-image
      - step: *deploy-infrastructure
      - step: *trigger-app-runner-deployment

  pull-requests:
    '**':
      - step: *build-and-test-backend

  tags:
    'v*':
      - step: *build-and-test-backend
      - step: *build-docker-image
      - step: *deploy-infrastructure
      - step: *trigger-app-runner-deployment
```

## 🔄 Pipeline Workflow

### 1. **Pull Requests**

- Runs tests and linting for both backend and frontend
- No deployment

### 2. **Develop Branch**

- Builds and tests backend and frontend in parallel
- Builds Docker image and pushes to ECR
- Deploys infrastructure updates (including S3 bucket and CloudFront)
- Deploys frontend to S3 and backend to App Runner in parallel
- Updates Cognito callback URLs with CloudFront domain

### 3. **Main Branch**

- Same as develop branch
- Typically used for production deployments

### 4. **Tags (v\*)**

- Same workflow as main branch
- Triggered on version tags (e.g., v1.0.0)

## 🛠️ Setup Steps

### 1. Deploy Infrastructure First

```bash
cd infrastructure
npm install
npm run build
npx cdk deploy
```

This will create:

- ECR Repository
- App Runner Service
- DynamoDB Table
- Cognito User Pool
- S3 Bucket for frontend hosting
- CloudFront Distribution

### 2. Get Deployment Outputs

After deployment, get the required values from the CDK outputs:

```bash
# Get ECR Repository URI
aws cloudformation describe-stacks \
  --stack-name TodoAppStack \
  --query 'Stacks[0].Outputs[?OutputKey==`EcrRepositoryUri`].OutputValue' \
  --output text

# Get Frontend Bucket Name
aws cloudformation describe-stacks \
  --stack-name TodoAppStack \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text

# Get CloudFront Distribution ID
aws cloudformation describe-stacks \
  --stack-name TodoAppStack \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text

# Get Frontend URL
aws cloudformation describe-stacks \
  --stack-name TodoAppStack \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' \
  --output text

# Get App Runner Service URL
aws cloudformation describe-stacks \
  --stack-name TodoAppStack \
  --query 'Stacks[0].Outputs[?OutputKey==`AppRunnerServiceUrl`].OutputValue' \
  --output text
```

### 3. Configure Bitbucket Variables

Add the environment variables to your Bitbucket repository:

1. Go to **Repository settings** > **Repository variables**
2. Add the required variables listed above

### 4. Enable Pipelines

1. Go to **Repository settings** > **Pipelines** > **Settings**
2. Enable Pipelines
3. Commit the `bitbucket-pipelines.yml` file to trigger the first build

## 🔍 Monitoring

### Pipeline Logs

- View build logs in Bitbucket Pipelines dashboard
- Monitor Docker build and push progress
- Check CDK deployment outputs

### App Runner Service

- Monitor service health in AWS Console
- View deployment logs
- Check service metrics

### ECR Repository

- View pushed images and tags
- Monitor image scan results
- Check repository metrics

## 🚨 Troubleshooting

### Common Issues

1. **ECR Login Failed**

   - Check AWS credentials
   - Verify ECR repository exists
   - Ensure proper IAM permissions

2. **Docker Build Failed**

   - Check Dockerfile syntax
   - Verify all dependencies are available
   - Check build context size

3. **CDK Deployment Failed**

   - Verify AWS credentials have sufficient permissions
   - Check for resource conflicts
   - Review CloudFormation events

4. **App Runner Deployment Failed**
   - Check service configuration
   - Verify IAM roles and permissions
   - Review App Runner service logs

### Required IAM Permissions

The AWS user/role used by Bitbucket needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["apprunner:StartDeployment", "apprunner:DescribeService"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["cloudformation:*", "iam:*", "dynamodb:*", "cognito-idp:*"],
      "Resource": "*"
    }
  ]
}
```

## 🎯 Next Steps

1. **Security Enhancements**

   - Use IAM roles instead of access keys
   - Implement least privilege permissions
   - Enable ECR image scanning

2. **Monitoring & Alerting**

   - Set up CloudWatch alarms
   - Configure SNS notifications
   - Implement health checks

3. **Multi-Environment Support**
   - Create separate pipelines for staging/production
   - Use environment-specific configurations
   - Implement approval gates for production deployments
