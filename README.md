# Enhanced Todo App with AWS Integration

This is an enhanced version of the todo application with the following features:

- **User Authentication** using AWS Cognito with OAuth2 support
- **Persistent Storage** using AWS DynamoDB
- **User-specific Todo Lists** - each user can only see and manage their own todos
- **Social Login** support for Google and Facebook
- **Modern React Frontend** with AWS Amplify UI components

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Fastify API   │    │   DynamoDB      │
│                 │    │                 │    │                 │
│ • AWS Amplify   │────│ • Authentication│────│ • User Todos    │
│ • Cognito Auth  │    │ • CRUD Ops      │    │ • Partitioned   │
│ • UI Components │    │ • JWT Verify    │    │   by userId     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │              ┌─────────────────┐
         └──────────────│  AWS Cognito    │
                        │                 │
                        │ • User Pool     │
                        │ • OAuth2/OIDC   │
                        │ • Social Login  │
                        └─────────────────┘
```

## Frontend Architecture

The React frontend follows a modular architecture optimized for React Fast Refresh:

```
frontend/src/
├── components/           # React components
│   ├── AuthenticatedApp.tsx    # Main app wrapper with user header
│   └── TodoApp.tsx            # Todo functionality
├── contexts/            # React contexts (components only)
│   ├── AuthContext.tsx         # Authentication provider component
│   └── AuthContextProvider.ts  # Context definition
├── hooks/               # Custom React hooks
│   └── useAuth.ts             # Authentication hook
├── types/               # TypeScript type definitions
│   └── auth.ts               # Authentication types
├── aws-config.ts        # AWS Amplify configuration
└── App.tsx             # Root component with Authenticator
```

**Key Design Principles:**

- **Separation of Concerns**: Types, hooks, and contexts are in separate files
- **Fast Refresh Compliance**: Component files only export React components
- **Type Safety**: Comprehensive TypeScript interfaces for all data structures
- **Reusability**: Modular hooks and contexts for easy testing and maintenance

## Prerequisites

- Node.js 22+ and npm
- AWS Account with appropriate permissions
- AWS CLI configured (for infrastructure deployment)

## Quick Start

### 1. Infrastructure Setup

Deploy the AWS infrastructure using the provided deployment scripts:

```bash
# Navigate to infrastructure directory
cd infrastructure

# Deploy main infrastructure (DynamoDB, Cognito, ECR, etc.)
./scripts/deploy.sh

# Deploy AppRunner service for backend
./scripts/deploy-apprunner.sh

# Get stack outputs for configuration
./scripts/get-outputs.sh todo-app-dev env
```

**Alternative: Manual CDK Deployment**

```bash
# Deploy the CloudFormation stack
aws cloudformation deploy \
  --template-file infrastructure/todo-app-stack.yaml \
  --stack-name todo-app-dev \
  --parameter-overrides \
    AppName=todo-app \
    Environment=dev \
  --capabilities CAPABILITY_NAMED_IAM
```

Get the stack outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name todo-app-dev \
  --query 'Stacks[0].Outputs'
```

### 2. Backend Configuration

Copy the environment template and fill in your AWS resource details:

```bash
cd backend
cp .env.example .env
```

Update `.env` with your AWS resources:

```bash
# AWS Configuration
NODE_ENV=production
AWS_REGION=ap-southeast-2
DYNAMODB_TABLE_NAME=todo-app-prod-todos
COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
COGNITO_CLIENT_ID=your-cognito-client-id
COGNITO_DOMAIN=your-cognito-domain

# Optional: For local DynamoDB
# DYNAMODB_ENDPOINT=http://localhost:8000
```

Install dependencies and start the backend:

```bash
npm install
npm run build
npm start
```

### 3. Frontend Configuration

Copy the environment template and configure:

```bash
cd frontend
cp env.example .env.local
```

Update `.env.local`:

```bash
VITE_TODO_API_URL=http://localhost:3000
VITE_COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=your-cognito-client-id
VITE_COGNITO_DOMAIN=your-domain.auth.ap-southeast-2.amazoncognito.com
VITE_REDIRECT_SIGN_IN=https://your-app-domain.com
VITE_REDIRECT_SIGN_OUT=https://your-app-domain.com
```

Install dependencies and start the frontend:

```bash
npm install
npm run dev
```

## Features

### Authentication Features

- ✅ **Email/Password Sign-up & Sign-in**
- ✅ **Social Login** (Google, Facebook)
- ✅ **Email Verification**
- ✅ **Password Reset**
- ✅ **JWT Token Authentication**
- ✅ **Automatic Session Management**

### Todo Management Features

- ✅ **User-specific Todo Lists** - isolated by user
- ✅ **Create, Read, Update, Delete** operations
- ✅ **Real-time UI Updates**
- ✅ **Persistent Storage** in DynamoDB
- ✅ **Responsive Design**

### Security Features

- ✅ **JWT Token Verification**
- ✅ **User Context Isolation**
- ✅ **CORS Protection**
- ✅ **Input Validation**
- ✅ **AWS IAM Integration**

## API Endpoints

All endpoints require authentication via `Authorization: Bearer <JWT_TOKEN>` header (except health check):

| Method | Endpoint  | Description                     |
| ------ | --------- | ------------------------------- |
| GET    | `/health` | Health check (no auth required) |
| GET    | `/`       | List user's todos               |
| POST   | `/`       | Create a new todo               |
| POST   | `/:id`    | Update an existing todo         |
| DELETE | `/:id`    | Delete a todo                   |

### Request/Response Examples

**Create Todo:**

```bash
curl -X POST http://localhost:3000/ \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"summary": "Learn AWS", "done": false}'
```

**Response:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "summary": "Learn AWS",
  "done": false
}
```

## Development

### Frontend Development

```bash
cd frontend
npm run dev  # Starts Vite dev server
```

### Backend Development

```bash
cd backend
npm run dev  # Starts TypeScript compiler in watch mode + nodemon
```

### Testing

```bash
cd backend
npm test     # Run backend tests
npm run lint # Lint backend code

cd frontend
npm run lint # Lint frontend code
```

## Deployment

### Backend Deployment Options

1. **AWS Lambda** (recommended for serverless)
2. **AWS ECS/Fargate** (for containerized deployment)
3. **AWS EC2** (for traditional server deployment)

### Frontend Deployment

Deploy to AWS S3 + CloudFront:

```bash
cd frontend
npm run build

# Upload to S3 bucket
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Environment Variables

### Backend Environment Variables

| Variable               | Required | Description                               |
| ---------------------- | -------- | ----------------------------------------- |
| `AWS_REGION`           | Yes      | AWS region for DynamoDB and Cognito       |
| `DYNAMODB_TABLE_NAME`  | Yes      | DynamoDB table name for todos             |
| `COGNITO_USER_POOL_ID` | Yes      | Cognito User Pool ID                      |
| `COGNITO_CLIENT_ID`    | Yes      | Cognito User Pool Client ID               |
| `DYNAMODB_ENDPOINT`    | No       | Local DynamoDB endpoint (for development) |

### Frontend Environment Variables

| Variable                    | Required | Description                 |
| --------------------------- | -------- | --------------------------- |
| `VITE_TODO_API_URL`         | Yes      | Backend API URL             |
| `VITE_COGNITO_USER_POOL_ID` | Yes      | Cognito User Pool ID        |
| `VITE_COGNITO_CLIENT_ID`    | Yes      | Cognito User Pool Client ID |
| `VITE_COGNITO_DOMAIN`       | Yes      | Cognito hosted UI domain    |
| `VITE_REDIRECT_SIGN_IN`     | Yes      | OAuth sign-in redirect URL  |
| `VITE_REDIRECT_SIGN_OUT`    | Yes      | OAuth sign-out redirect URL |

## Local Development with DynamoDB

For local development, you can use DynamoDB Local:

```bash
# Install DynamoDB Local
npm install -g dynamodb-local

# Start DynamoDB Local
dynamodb-local

# Create table
aws dynamodb create-table \
  --table-name todo-app-dev-todos \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
    AttributeName=userId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure frontend URL is in Cognito callback URLs
2. **Authentication Errors**: Check Cognito configuration and JWT tokens
3. **DynamoDB Access Errors**: Verify IAM permissions and table name
4. **Build Errors**: Ensure all dependencies are installed

### Debug Mode

Enable debug logging:

```bash
# Backend
DEBUG=* npm start

# Frontend
VITE_LOG_LEVEL=debug npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Additional Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Fastify Documentation](https://www.fastify.io/)
- [React Documentation](https://react.dev/)

## 🔗 Related Documentation

### Core Documentation

- [📋 Complete Documentation Index](./docs/README.md) - All guides organized by role and purpose
- [🎯 Solution Architecture](./solution.md) - Technical solution design and architecture decisions
- [🚀 Full Stack Deployment](./docs/full-stack-deployment.md) - Complete deployment procedures

### Component Guides

- [🔧 Backend API Setup](./backend/README.md) - Fastify API configuration and development
- [⚛️ Frontend Development](./frontend/README.md) - React application setup and features
- [🏗️ Infrastructure Deployment](./infrastructure/README.md) - AWS CDK infrastructure as code

### Operations & Security

- [ Monitoring Setup](./docs/monitoring-quick-setup.md) - Health monitoring and alerting
- [🔄 CI/CD Pipeline](./docs/bitbucket-pipeline-setup.md) - Automated deployment configuration

### Quick Start Guides

- [💻 Local Development](./backend/README-Docker.md) - Docker setup for local development
- [🧪 Code Quality Setup](./docs/eslint-setup.md) - ESLint and code formatting configuration
