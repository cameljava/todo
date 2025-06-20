# 🚀 Complete Full-Stack Deployment Guide

## 📋 Overview

This guide covers the complete deployment setup for the Todo App, including:

- **Backend**: Containerized Fastify API deployed to AWS App Runner
- **Frontend**: React SPA deployed to S3 with CloudFront CDN
- **Infrastructure**: Managed via AWS CDK
- **CI/CD**: Automated via Bitbucket Pipelines

## 🛠️ Deployment Scripts

The project includes two main deployment scripts for different purposes:

### 1. **Main Infrastructure Deployment Script** (`infrastructure/scripts/deploy.sh`)

Deploys the complete infrastructure stack including DynamoDB, Cognito, ECR, and other AWS resources.

### 2. **AppRunner Deployment Script** (`infrastructure/scripts/deploy-apprunner.sh`)

Deploys only the AppRunner service, importing existing resources from the main stack.

## 🚀 Quick Deployment Guide

### Prerequisites

- Node.js 22+ and npm
- AWS CLI configured with appropriate permissions
- CDK bootstrapped in your AWS account/region
- Required dependencies: `jq`, `aws-cli`, `node`, `npm`

### Step 1: Deploy Main Infrastructure

```bash
# Navigate to infrastructure directory
cd infrastructure

# Deploy to development environment (default)
./scripts/deploy.sh

# Or deploy to specific environment
./scripts/deploy.sh deploy prod

# Or deploy with alert email
./scripts/deploy.sh deploy prod admin@example.com

# Show what will be deployed (dry run)
./scripts/deploy.sh diff prod

# Get help
./scripts/deploy.sh help
```

**What this deploys:**

- DynamoDB table for todos
- Cognito User Pool and Client
- ECR repository for backend images
- CloudWatch monitoring and alerts
- IAM roles and policies

### Step 2: Deploy AppRunner Service

```bash
# Deploy AppRunner service (requires main stack to exist)
./scripts/deploy-apprunner.sh

# Or use npm script
npm run deploy:apprunner

# Show available stacks
./scripts/deploy-apprunner.sh list

# Destroy AppRunner service only
./scripts/deploy-apprunner.sh destroy

# Get help
./scripts/deploy-apprunner.sh help
```

**What this deploys:**

- AppRunner service for backend API
- IAM roles for AppRunner
- Environment variables configuration
- Service auto-scaling settings

### Step 3: Build and Deploy Backend

```bash
# Navigate to backend directory
cd backend

# Build and push Docker image to ECR
./build-and-push.sh

# Or manually:
docker build -t todo-app-backend .
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin <ECR_REPO_URI>
docker tag todo-app-backend:latest <ECR_REPO_URI>:latest
docker push <ECR_REPO_URI>:latest
```

### Step 4: Deploy Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to S3 (requires S3 bucket and CloudFront setup)
aws s3 sync dist/ s3://<FRONTEND_BUCKET_NAME> --delete
aws cloudfront create-invalidation --distribution-id <CLOUDFRONT_DISTRIBUTION_ID> --paths "/*"
```

## 📋 Detailed Script Usage

### Main Infrastructure Script (`deploy.sh`)

#### Commands

| Command   | Description                     | Example                           |
| --------- | ------------------------------- | --------------------------------- |
| `deploy`  | Deploy infrastructure (default) | `./scripts/deploy.sh deploy prod` |
| `diff`    | Show deployment differences     | `./scripts/deploy.sh diff prod`   |
| `destroy` | Destroy infrastructure          | `./scripts/deploy.sh destroy dev` |
| `help`    | Show help information           | `./scripts/deploy.sh help`        |

#### Environment Variables

```bash
# Set default environment
export ENVIRONMENT=prod

# Set default alert email
export ALERT_EMAIL=admin@example.com

# Set AWS region
export AWS_DEFAULT_REGION=ap-southeast-2
```

#### Examples

```bash
# Deploy to development (default)
./scripts/deploy.sh

# Deploy to production with alerts
./scripts/deploy.sh deploy prod admin@example.com

# Check what will change in production
./scripts/deploy.sh diff prod

# Destroy development environment
./scripts/deploy.sh destroy dev

# Using npm scripts
npm run deploy:infra
npm run deploy:infra:diff prod
npm run destroy:infra dev
```

### AppRunner Script (`deploy-apprunner.sh`)

#### Commands

| Command   | Description                        | Example                                 |
| --------- | ---------------------------------- | --------------------------------------- |
| `deploy`  | Deploy AppRunner service (default) | `./scripts/deploy-apprunner.sh deploy`  |
| `destroy` | Destroy AppRunner service          | `./scripts/deploy-apprunner.sh destroy` |
| `list`    | List available stacks              | `./scripts/deploy-apprunner.sh list`    |
| `help`    | Show help information              | `./scripts/deploy-apprunner.sh help`    |

#### Environment Variables

```bash
# Set default environment
export ENVIRONMENT=prod

# Set default app name
export APP_NAME=todo-app

# Set Cognito IDs (optional - will be fetched from CloudFormation)
export COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
export COGNITO_CLIENT_ID=your-cognito-client-id
```

#### Examples

```bash
# Deploy AppRunner service (default)
./scripts/deploy-apprunner.sh

# Deploy with explicit command
./scripts/deploy-apprunner.sh deploy

# Destroy AppRunner service
./scripts/deploy-apprunner.sh destroy

# List available stacks
./scripts/deploy-apprunner.sh list

# Using npm scripts
npm run deploy:apprunner
npm run destroy:apprunner
```

## 🔧 Script Features

### Main Infrastructure Script Features

- ✅ **Dependency validation** - Checks for required tools
- ✅ **Environment validation** - Validates dev/staging/prod
- ✅ **AWS credentials check** - Verifies AWS access
- ✅ **CDK bootstrap check** - Ensures CDK is ready
- ✅ **Email validation** - Validates alert email format
- ✅ **Safety confirmations** - Confirms destructive operations
- ✅ **Comprehensive error handling** - Clear error messages
- ✅ **Stack outputs display** - Shows deployment results

### AppRunner Script Features

- ✅ **Resource validation** - Checks main stack exists
- ✅ **Cognito ID auto-discovery** - Fetches from CloudFormation
- ✅ **Dependency checks** - Validates required tools
- ✅ **AWS credentials verification** - Ensures proper access
- ✅ **Safety confirmations** - Confirms destructive operations
- ✅ **Modular deployment** - Only deploys AppRunner resources
- ✅ **Import existing resources** - Uses main stack resources

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Bitbucket     │    │   AWS Services   │    │   End Users     │
│   Pipeline      │    │                  │    │                 │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ Build &     │ │───▶│ │ ECR          │ │    │ │ Web Browser │ │
│ │ Test        │ │    │ │ Repository   │ │    │ │             │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
│                 │    │        │         │    │        │        │
│ ┌─────────────┐ │    │        ▼         │    │        ▼        │
│ │ Deploy      │ │───▶│ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ Infra       │ │    │ │ App Runner   │◀┼────┼─│ CloudFront  │ │
│ └─────────────┘ │    │ │ Service      │ │    │ │ Distribution│ │
│                 │    │ └──────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │        │         │    │        │        │
│ │ Deploy      │ │───▶│        ▼         │    │        ▼        │
│ │ Frontend    │ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ └─────────────┘ │    │ │ DynamoDB     │ │    │ │ S3 Bucket   │ │
│                 │    │ │ Table        │ │    │ │ (Frontend)  │ │
└─────────────────┘    │ └──────────────┘ │    │ └─────────────┘ │
                       │                  │    │                 │
                       │ ┌──────────────┐ │    │                 │
                       │ │ Cognito      │ │    │                 │
                       │ │ User Pool    │ │    │                 │
                       │ └──────────────┘ │    │                 │
                       └──────────────────┘    └─────────────────┘
```

## 🛠️ Infrastructure Components

### Backend Services

- **App Runner**: Serverless container hosting for Fastify API
- **ECR**: Container registry for Docker images
- **DynamoDB**: NoSQL database for todo items
- **Cognito**: User authentication and authorization

### Frontend Services

- **S3 Bucket**: Static website hosting for React SPA
- **CloudFront**: Global CDN for fast content delivery
- **Route 53** (optional): Custom domain management

### Security & Access

- **IAM Roles**: Least privilege access for services
- **Origin Access Identity**: Secure S3 access via CloudFront
- **HTTPS**: Enforced via CloudFront

## 📦 Deployment Pipeline

### 1. **Code Push Triggers**

```yaml
Pull Request → Build & Test Only
Develop Branch → Full Deployment to Dev
Main Branch → Full Deployment to Prod
Version Tags → Full Deployment with Versioning
```

### 2. **Pipeline Stages**

#### Stage 1: Build & Test (Parallel)

- **Backend**: TypeScript compilation, unit tests, linting
- **Frontend**: React build, linting, environment configuration

#### Stage 2: Container Build

- **Docker**: Multi-stage build for optimized production image
- **ECR**: Push tagged images (commit SHA + latest)

#### Stage 3: Infrastructure Deployment

- **CDK**: Deploy/update AWS resources
- **Outputs**: Extract deployment URLs and resource IDs
- **Cognito**: Update callback URLs with CloudFront domain

#### Stage 4: Application Deployment (Parallel)

- **Frontend**: Deploy to S3, invalidate CloudFront cache
- **Backend**: Trigger App Runner deployment

## 🔧 Environment Variables

### Required for Bitbucket Pipeline

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=ap-southeast-2

# Backend Deployment
ECR_REPOSITORY_URI=123456789012.dkr.ecr.ap-southeast-2.amazonaws.com/todo-app-dev-backend-api
APP_RUNNER_SERVICE_ARN=arn:aws:apprunner:ap-southeast-2:123456789012:service/...

# Frontend Deployment
FRONTEND_BUCKET_NAME=todo-app-dev-frontend-123456789012
CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC
FRONTEND_URL=https://d1234567890abc.cloudfront.net

# Application Configuration
COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
COGNITO_CLIENT_ID=your-cognito-client-id
COGNITO_DOMAIN=todo-app-dev-auth-123456789012.auth.ap-southeast-2.amazoncognito.com
BACKEND_API_URL=https://your-app-runner-service-url.ap-southeast-2.awsapprunner.com
```

### Auto-configured by CDK

```bash
# Backend Environment (App Runner)
NODE_ENV=development
AWS_REGION=ap-southeast-2
DYNAMODB_TABLE_NAME=todo-app-dev-todos
COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
COGNITO_CLIENT_ID=your-cognito-client-id

# Frontend Environment (Build Time)
VITE_COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=your-cognito-client-id
VITE_COGNITO_DOMAIN=todo-app-dev-auth-123456789012.auth.ap-southeast-2.amazoncognito.com
VITE_REDIRECT_SIGN_IN=https://d1234567890abc.cloudfront.net
VITE_REDIRECT_SIGN_OUT=https://d1234567890abc.cloudfront.net
VITE_API_URL=https://your-app-runner-service-url.ap-southeast-2.awsapprunner.com
```

## 🚀 Deployment Steps

### 1. Initial Infrastructure Deployment

```bash
# Deploy infrastructure first
cd infrastructure
npm install
npm run build
npx cdk deploy

# Get deployment outputs
aws cloudformation describe-stacks \
  --stack-name TodoAppStack \
  --query 'Stacks[0].Outputs' \
  --output table
```

### 2. Configure Bitbucket Repository

1. **Enable Pipelines**:

   - Go to Repository settings → Pipelines → Settings
   - Enable Pipelines

2. **Add Environment Variables**:

   - Go to Repository settings → Repository variables
   - Add all required variables from the list above

3. **Commit Pipeline Configuration**:
   ```bash
   git add bitbucket-pipelines.yml
   git commit -m "Add CI/CD pipeline"
   git push origin develop
   ```

### 3. Monitor Deployment

1. **Pipeline Logs**: View in Bitbucket Pipelines dashboard
2. **AWS Console**: Monitor App Runner, CloudFront, S3
3. **Application**: Test at the CloudFront URL

## 🔍 Monitoring & Troubleshooting

### Health Checks

```bash
# Backend API Health
curl https://your-app-runner-url.ap-southeast-2.awsapprunner.com/health

# Frontend Availability
curl -I https://d1234567890abc.cloudfront.net

# CloudFront Cache Status
curl -I https://d1234567890abc.cloudfront.net
# Look for X-Cache header
```

### Common Issues

#### Script Errors

```bash
# Check dependencies
./scripts/deploy.sh help

# Verify AWS credentials
aws sts get-caller-identity

# Check CDK bootstrap
npx cdk doctor

# Validate environment
./scripts/deploy.sh diff dev
```

#### AppRunner Issues

```bash
# Check AppRunner service status
aws apprunner describe-service --service-arn <SERVICE_ARN>

# View service logs
aws logs describe-log-groups --log-group-name-prefix /aws/apprunner

# Check ECR repository
aws ecr describe-repositories --repository-names todo-app-dev-backend-api
```

### Debugging Commands

```bash
# Get stack outputs
./scripts/get-outputs.sh todo-app-dev

# Get outputs in environment format
./scripts/get-outputs.sh todo-app-dev env

# Update Cognito URLs
node scripts/update-cognito-urls.js

# Health check
./scripts/health-check.sh
```

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [App Runner Documentation](https://docs.aws.amazon.com/apprunner/)
- [CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [Bitbucket Pipelines Documentation](https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines/)

## 🎉 Success Criteria

Your deployment is successful when:

- ✅ Frontend loads at CloudFront URL
- ✅ Backend API responds at App Runner URL
- ✅ User authentication works via Cognito
- ✅ Todo CRUD operations function correctly
- ✅ Pipeline deploys automatically on code push
- ✅ CloudWatch shows healthy metrics

Your full-stack Todo App is now ready for production with enterprise-grade deployment automation! 🎉
