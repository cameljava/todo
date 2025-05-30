# Docker Setup for Todo API Backend

This guide explains how to containerize and run the Fastify Todo API using Docker and Docker Compose.

## 🐳 Docker Features

- **Multi-stage build**: Optimized for production with minimal image size
- **Security**: Non-root user, proper signal handling with dumb-init
- **Health checks**: Built-in health monitoring
- **Local development**: Complete setup with DynamoDB Local
- **Hot reload**: Development mode with file watching

## 📋 Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Node.js 22+ (for local development)

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment template:

```bash
cp env.docker.example .env
```

Update `.env` with your AWS credentials and Cognito settings:

```bash
# AWS Configuration
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Cognito Configuration (from your CDK deployment)
COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
COGNITO_CLIENT_ID=your-cognito-client-id
```

### 2. Start with Docker Compose (Recommended)

Start all services (API + DynamoDB Local + Admin UI):

```bash
npm run docker:dev
```

This will start:

- **Todo API**: http://localhost:3000
- **DynamoDB Local**: http://localhost:8000
- **DynamoDB Admin UI**: http://localhost:8001

### 3. Initialize DynamoDB Table

In a new terminal, create the required table:

```bash
# Build the project first (needed for the init script)
npm run build

# Initialize the table
node scripts/init-dynamodb.js
```

### 4. Test the API

```bash
# Health check
curl http://localhost:3000/health

# List todos (requires authentication)
curl -H "Authorization: Bearer <your-jwt-token>" http://localhost:3000/
```

## 🛠️ Docker Commands

### Building and Running

```bash
# Build the Docker image
npm run docker:build

# Run container with environment file
npm run docker:run

# Start development environment
npm run docker:dev

# Start in detached mode
npm run docker:dev:detached

# View logs
npm run docker:logs

# Stop all services
npm run docker:stop

# Clean up (remove containers, volumes, and images)
npm run docker:clean
```

### Manual Docker Commands

```bash
# Build the image
docker build -t todo-api .

# Run with environment variables
docker run -p 3000:3000 \
  -e AWS_REGION=ap-southeast-2 \
  -e DYNAMODB_ENDPOINT=http://host.docker.internal:8000 \
  -e DYNAMODB_TABLE_NAME=todo-app-dev-todos \
  todo-api

# Run with AWS credentials
docker run -p 3000:3000 \
  -e AWS_ACCESS_KEY_ID=your-key \
  -e AWS_SECRET_ACCESS_KEY=your-secret \
  -e AWS_REGION=ap-southeast-2 \
  -e DYNAMODB_TABLE_NAME=your-table-name \
  -e COGNITO_USER_POOL_ID=your-pool-id \
  -e COGNITO_CLIENT_ID=your-client-id \
  todo-api
```

## 🏗️ Docker Architecture

### Multi-Stage Build

The Dockerfile uses a multi-stage build for optimization:

1. **Builder Stage**:

   - Installs all dependencies
   - Compiles TypeScript
   - Removes dev dependencies

2. **Production Stage**:
   - Minimal Alpine Linux base
   - Non-root user for security
   - Only production files
   - Health checks enabled

### Image Size Optimization

- Uses `node:22-alpine` for smaller base image
- Multi-stage build removes build dependencies
- `.dockerignore` excludes unnecessary files
- Production dependencies only in final image

## 🔧 Configuration

### Environment Variables

| Variable               | Description                   | Default          | Required |
| ---------------------- | ----------------------------- | ---------------- | -------- |
| `NODE_ENV`             | Environment mode              | `production`     | No       |
| `PORT`                 | Server port                   | `3000`           | No       |
| `AWS_REGION`           | AWS region                    | `ap-southeast-2` | Yes      |
| `DYNAMODB_TABLE_NAME`  | DynamoDB table name           | -                | Yes      |
| `DYNAMODB_ENDPOINT`    | DynamoDB endpoint (for local) | -                | No       |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID          | -                | Yes\*    |
| `COGNITO_CLIENT_ID`    | Cognito Client ID             | -                | Yes\*    |

\*Required for authentication features

### Docker Compose Services

- **todo-api**: Main API service
- **dynamodb-local**: Local DynamoDB instance
- **dynamodb-admin**: Web UI for DynamoDB management

## 🔍 Health Checks

The container includes built-in health checks:

```bash
# Check container health
docker ps

# View health check logs
docker inspect <container-id> | grep -A 10 Health
```

Health check endpoint: `GET /health`

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**:

   ```bash
   # Check what's using port 3000
   lsof -i :3000

   # Use different port
   docker run -p 3001:3000 todo-api
   ```

2. **DynamoDB connection issues**:

   ```bash
   # Check DynamoDB Local is running
   curl http://localhost:8000

   # Restart DynamoDB
   docker-compose restart dynamodb-local
   ```

3. **Table not found**:

   ```bash
   # Initialize the table
   node scripts/init-dynamodb.js

   # Or check table exists in admin UI
   open http://localhost:8001
   ```

### Debugging

```bash
# View container logs
docker-compose logs -f todo-api

# Execute commands in running container
docker-compose exec todo-api sh

# Check environment variables
docker-compose exec todo-api env
```

## 🚀 Production Deployment

### AWS ECS/Fargate

```bash
# Build for production
docker build -t todo-api:latest .

# Tag for ECR
docker tag todo-api:latest <account>.dkr.ecr.<region>.amazonaws.com/todo-api:latest

# Push to ECR
docker push <account>.dkr.ecr.<region>.amazonaws.com/todo-api:latest
```

### Environment Variables for Production

```bash
# Use real AWS DynamoDB (remove DYNAMODB_ENDPOINT)
AWS_REGION=ap-southeast-2
DYNAMODB_TABLE_NAME=todo-app-prod-todos
COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
COGNITO_CLIENT_ID=your-prod-client-id

# Use IAM roles instead of access keys in production
```

### Security Considerations

- ✅ Non-root user in container
- ✅ Minimal base image (Alpine)
- ✅ No secrets in image layers
- ✅ Health checks for monitoring
- ✅ Proper signal handling
- ✅ Read-only filesystem (can be enabled)

## 📊 Monitoring

### Container Metrics

```bash
# View resource usage
docker stats

# Container logs
docker-compose logs -f

# Health status
docker-compose ps
```

### Application Metrics

The API exposes a health endpoint for monitoring:

- **Endpoint**: `GET /health`
- **Response**: `{"status": "ok"}`
- **Use**: Load balancer health checks

## 🔄 CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: |
          cd backend
          docker build -t todo-api .

      - name: Run tests
        run: |
          cd backend
          npm test
```

This Docker setup provides a complete containerization solution for the Todo API with local development support and production readiness.
