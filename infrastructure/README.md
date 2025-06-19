# Todo App Infrastructure

AWS CDK Infrastructure as Code for deploying a scalable, secure Todo application with monitoring and multi-environment support.

## Description

- **Infrastructure as Code**: AWS CDK with TypeScript for type-safe infrastructure
- **Multi-Environment**: Separate dev/prod deployments with isolated resources
- **Serverless Architecture**: App Runner, DynamoDB, S3, CloudFront for auto-scaling
- **Security**: WAF, Cognito authentication, least-privilege IAM roles
- **Monitoring**: CloudWatch dashboards, alarms, and synthetic monitoring
- **CI/CD Ready**: ECR container registry and deployment automation

## Project Structure

```
infrastructure/
├── lib/
│   ├── todo-app-stack.ts       # Main CDK stack definition
│   ├── app-runner-stack.ts     # App Runner service stack
│   ├── constructs/             # Reusable CDK constructs
│   │   ├── monitoring.ts       # CloudWatch monitoring setup
│   │   └── cognito-identity-providers.ts # Social login providers
│   └── bin/                    # CDK app entry points
├── scripts/                    # Deployment and utility scripts
├── cdk.json                    # CDK configuration
├── tsconfig.json              # TypeScript configuration
└── package.json
```

## Setup

### Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 18+
- AWS CDK CLI (`npm install -g aws-cdk`)
- Docker (for container builds)

### Installation

```bash
# Install dependencies
npm install

# Bootstrap CDK (first time only per account/region)
npx cdk bootstrap

# Verify AWS credentials
aws sts get-caller-identity
```

### AWS Permissions Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "cloudfront:*",
        "apprunner:*",
        "dynamodb:*",
        "cognito-idp:*",
        "wafv2:*",
        "cloudwatch:*",
        "iam:*",
        "ecr:*",
        "logs:*",
        "sns:*",
        "synthetics:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## Deploy

### Development Environment

```bash
# Deploy to development environment
npx cdk deploy --context environment=dev

# Deploy with specific configuration
npx cdk deploy TodoAppStack-dev \
  --context environment=dev \
  --context alertEmail=dev-team@company.com
```

### Production Environment

```bash
# Deploy to production environment
npx cdk deploy --context environment=prod \
  --context alertEmail=ops-team@company.com

# Deploy with custom domain
npx cdk deploy --context environment=prod \
  --context domainName=todoapp.company.com \
  --context certificateArn=arn:aws:acm:...
```

### Multi-Stack Deployment

```bash
# Deploy all stacks
npx cdk deploy --all

# Deploy specific stack
npx cdk deploy TodoAppStack-prod

# Deploy with approval required
npx cdk deploy --require-approval broadening
```

## Test

### Validate Infrastructure

```bash
# Generate CloudFormation template
npx cdk synth > template.yaml

# Lint CloudFormation template
cfn-lint template.yaml

# Security scan (requires cfn-nag)
cfn_nag_scan --input-path template.yaml
```

### Infrastructure Testing

```bash
# Compare deployed vs code (drift detection)
npx cdk diff

# Check CDK version compatibility
npx cdk doctor

# Validate CDK app
npx cdk ls
```

### Post-Deployment Verification

```bash
# Get stack outputs
npx cdk outputs

# Test health endpoints
BACKEND_URL=$(npx cdk outputs --json | jq -r '.["TodoAppStack-prod"].BackendUrl')
curl $BACKEND_URL/health

# Test frontend
FRONTEND_URL=$(npx cdk outputs --json | jq -r '.["TodoAppStack-prod"].FrontendUrl')
curl -I $FRONTEND_URL
```

## Configuration

### Environment Context

```bash
# Development configuration
npx cdk deploy --context environment=dev \
  --context enableDetailedMonitoring=true

# Production configuration
npx cdk deploy --context environment=prod \
  --context enableDetailedMonitoring=true \
  --context alertEmail=ops@company.com
```

### Stack Customization

```typescript
// Custom stack configuration
const stackProps: TodoAppStackProps = {
  appName: 'todo-app',
  environment: 'prod',
  domainName: 'todoapp.company.com',
  certificateArn: 'arn:aws:acm:...',
  enableWaf: true,
  enableMonitoring: true,
};
```

## Infrastructure Components

### Backend (App Runner)

- **Auto-scaling**: Automatic scaling based on request volume
- **Container**: ECR repository for Docker images
- **Health Checks**: Integrated health monitoring
- **Security**: IAM roles with least privilege access

### Frontend (S3 + CloudFront)

- **Static Hosting**: S3 bucket with CloudFront distribution
- **Global CDN**: Edge locations for low latency
- **Security**: Private bucket with CloudFront OAI
- **SSL/TLS**: Automatic HTTPS with CloudFront

### Database (DynamoDB)

- **Serverless**: On-demand billing and auto-scaling
- **Schema**: Partition key (id) and sort key (userId)
- **Indexes**: Global Secondary Index for userId queries
- **Backup**: Point-in-time recovery in production

### Authentication (Cognito)

- **User Pool**: Email-based authentication
- **Security**: Strong password policy
- **OAuth2**: Authorization code grant flow
- **Custom Domain**: Cognito domain for authentication

### Monitoring (CloudWatch)

- **Dashboards**:
  - CloudFront metrics (requests, errors, cache performance)
  - App Runner metrics (requests, response times, instances)
  - DynamoDB metrics (operations, latency)
- **Alarms**:
  - CloudFront 4xx/5xx error rates
  - App Runner response times and errors
  - DynamoDB throttling and latency
- **Synthetics**: Health check canary (non-dev environments)

## Security Features

### Network Security

- **CloudFront**: HTTPS-only with modern TLS
- **S3**: Private bucket with CloudFront OAI
- **App Runner**: Private service with IAM authentication

### Application Security

- **IAM Roles**: Least-privilege access for all resources
- **Cognito**: Secure authentication with JWT tokens
- **CORS**: Properly configured cross-origin policies

### Data Security

- **Encryption**: Data encrypted at rest and in transit
- **User Isolation**: Data partitioned by user ID
- **Backup**: Point-in-time recovery in production

## Cost Optimization

### Serverless Architecture

- **Pay-per-use**: Only pay for actual usage
- **Auto-scaling**: Scales to zero when not in use
- **Managed Services**: Reduces operational overhead

### Resource Optimization

- **CloudFront**: Price Class 100 (North America and Europe)
- **DynamoDB**: On-demand capacity mode
- **Monitoring**: Synthetic canaries disabled in dev

## Troubleshooting

### Common Deployment Issues

**CDK Bootstrap Required**:

```bash
# Bootstrap CDK in target account/region
npx cdk bootstrap aws://ACCOUNT/REGION
```

**Insufficient Permissions**:

```bash
# Check current AWS identity
aws sts get-caller-identity

# Verify CDK can assume required roles
aws iam get-role --role-name cdk-*
```

**Stack Exists Error**:

```bash
# Check existing stacks
npx cdk ls

# Delete and redeploy if needed
npx cdk destroy TodoAppStack-dev
npx cdk deploy TodoAppStack-dev
```

### Infrastructure Debugging

```bash
# View CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name TodoAppStack-prod

# Check resource status
aws cloudformation describe-stack-resources \
  --stack-name TodoAppStack-prod

# View CDK metadata
npx cdk metadata TodoAppStack-prod
```

## Maintenance

### Updates and Patches

```bash
# Update CDK to latest version
npm update aws-cdk-lib constructs

# Check for security vulnerabilities
npm audit

# Update dependencies
npm update
```

### Backup and Recovery

```bash
# Enable DynamoDB point-in-time recovery
aws dynamodb update-continuous-backups \
  --table-name todo-app-prod-todos \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

## Documentation

- [CDK Developer Guide](https://docs.aws.amazon.com/cdk/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Deployment Guide](../docs/full-stack-deployment.md)
- [Monitoring Setup](../docs/monitoring-deployment-guide.md)
