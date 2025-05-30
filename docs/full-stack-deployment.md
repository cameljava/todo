# 🚀 Complete Full-Stack Deployment Guide

## 📋 Overview

This guide covers the complete deployment setup for the Todo App, including:

- **Backend**: Containerized Fastify API deployed to AWS App Runner
- **Frontend**: React SPA deployed to S3 with CloudFront CDN
- **Infrastructure**: Managed via AWS CDK
- **CI/CD**: Automated via Bitbucket Pipelines

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

#### 1. **Frontend Build Fails**

```bash
# Check environment variables are set
echo $COGNITO_USER_POOL_ID
echo $FRONTEND_URL

# Verify Vite build configuration
cd frontend && npm run build
```

#### 2. **CloudFront Cache Issues**

```bash
# Manual cache invalidation
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

#### 3. **Cognito Authentication Issues**

```bash
# Verify callback URLs
aws cognito-idp describe-user-pool-client \
  --user-pool-id ap-southeast-2_XXXXXXXXX \
  --client-id your-client-id \
  --query 'UserPoolClient.CallbackURLs'
```

#### 4. **App Runner Deployment Issues**

```bash
# Check service status
aws apprunner describe-service \
  --service-arn arn:aws:apprunner:ap-southeast-2:123456789012:service/...

# View logs
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/apprunner/"
```

## 🎯 Performance Optimizations

### Frontend

- **CloudFront**: Global edge caching
- **Gzip Compression**: Enabled by default
- **Browser Caching**: Configured via CloudFront
- **Bundle Optimization**: Vite production build

### Backend

- **App Runner**: Auto-scaling based on demand
- **DynamoDB**: On-demand billing mode
- **Container**: Multi-stage build for minimal size
- **Health Checks**: Built-in monitoring

## 🔒 Security Features

### Frontend

- **HTTPS Only**: Enforced via CloudFront
- **Origin Access Identity**: Secure S3 access
- **CORS**: Configured for API access
- **CSP Headers**: Content Security Policy

### Backend

- **IAM Roles**: Least privilege access
- **VPC**: Optional network isolation
- **Secrets**: Environment variables only
- **Authentication**: Cognito JWT validation

## 💰 Cost Optimization

### Pay-per-Use Services

- **App Runner**: Only pay for active requests
- **DynamoDB**: On-demand billing
- **CloudFront**: Pay for data transfer
- **S3**: Pay for storage and requests

### Cost Monitoring

```bash
# Set up billing alerts
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://budget.json
```

## 🔄 Maintenance

### Regular Tasks

1. **Update Dependencies**: Monthly security updates
2. **Monitor Costs**: Weekly cost reviews
3. **Performance**: Monthly performance analysis
4. **Security**: Quarterly security audits

### Automated Tasks

- **Container Updates**: Triggered by code changes
- **Cache Invalidation**: Automatic on deployment
- **Health Monitoring**: CloudWatch alarms
- **Backup**: DynamoDB point-in-time recovery

## 📊 Deployment Metrics

### Key Performance Indicators

- **Build Time**: Target < 5 minutes
- **Deployment Time**: Target < 10 minutes
- **Frontend Load Time**: Target < 2 seconds
- **API Response Time**: Target < 200ms
- **Uptime**: Target > 99.9%

### Monitoring Tools

- **CloudWatch**: AWS native monitoring
- **App Runner Metrics**: Request count, response time
- **CloudFront Metrics**: Cache hit ratio, origin latency
- **DynamoDB Metrics**: Read/write capacity, throttling

## 🚨 Disaster Recovery

### Backup Strategy

- **DynamoDB**: Point-in-time recovery enabled
- **S3**: Versioning enabled for frontend assets
- **ECR**: Image retention policy
- **Infrastructure**: CDK code in version control

### Recovery Procedures

1. **Infrastructure**: Redeploy via CDK
2. **Database**: Restore from point-in-time backup
3. **Frontend**: Redeploy from latest build
4. **Backend**: Redeploy from latest container image

## 🎉 Success Criteria

Your deployment is successful when:

- ✅ Frontend loads at CloudFront URL
- ✅ Backend API responds at App Runner URL
- ✅ User authentication works via Cognito
- ✅ Todo CRUD operations function correctly
- ✅ Pipeline deploys automatically on code push
- ✅ CloudWatch shows healthy metrics

Your full-stack Todo App is now ready for production with enterprise-grade deployment automation! 🎉
