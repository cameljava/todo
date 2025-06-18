# Todo API Backend

A high-performance Fastify-based REST API for the Todo application with AWS Cognito authentication, DynamoDB persistence, and comprehensive monitoring.

## Description

- **Framework**: Fastify with TypeScript for optimal performance
- **Authentication**: AWS Cognito with JWT token validation
- **Database**: DynamoDB with user-partitioned data storage
- **Security**: Multi-layered rate limiting and CORS protection
- **Monitoring**: Health endpoints with dependency verification
- **Containerization**: Docker with multi-stage builds

## Project Structure

```
backend/
├── src/
│   ├── auth/                 # Authentication services
│   │   ├── cognitoAuth.ts   # Cognito integration
│   │   └── jwtValidator.ts  # JWT token validation
│   ├── config/              # Configuration modules
│   │   └── rateLimitConfig.ts
│   ├── middleware/          # Fastify middleware
│   │   └── auth.ts         # Authentication middleware
│   ├── store/              # Data persistence layer
│   │   ├── dynamoDbStore.ts # DynamoDB implementation
│   │   └── inMemoryStore.ts # Development store
│   ├── app.ts              # Core application logic
│   └── server.ts           # HTTP server setup
├── scripts/                # Utility scripts
│   ├── init-dynamodb.js    # Local DynamoDB setup
│   └── demo-jwt-verification.js
├── Dockerfile              # Production container
├── compose.yml             # Local development setup
└── package.json
```

## Setup

### Prerequisites

- Node.js 22+
- Docker and Docker Compose (for local development)
- AWS CLI configured (for production deployment)

### Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp env.example .env

# Edit .env with your AWS configuration
vim .env
```

### Environment Variables

```bash
# Required for production
COGNITO_USER_POOL_ID=ap-southeast-2_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-southeast-2
DYNAMODB_TABLE_NAME=todo-app-prod-todos

# Optional for local development
DYNAMODB_ENDPOINT=http://localhost:8000
NODE_ENV=development
PORT=3000
```

## Run

### Development Mode

```bash
# Option 1: Local with TypeScript watch mode
npm run dev

# Option 2: Docker Compose with DynamoDB Local
npm run docker:dev

# Initialize local DynamoDB table (if using Docker)
node scripts/init-dynamodb.js
```

### Production Mode

```bash
# Build TypeScript
npm run build

# Start production server
npm start

# Or build and run Docker container
npm run docker:build
npm run docker:run
```

### Docker Development

```bash
# Start all services (API + DynamoDB Local + Admin UI)
docker-compose up --build

# View logs
docker-compose logs -f todo-api

# Stop services
docker-compose down
```

## Test

### API Testing

```bash
# Run unit tests
npm test

# Lint code
npm run lint

# Health check
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed
```

### Authentication Testing

```bash
# Test without authentication (public access)
curl http://localhost:3000/

# Test with authentication (requires valid JWT)
curl -H "Authorization: Bearer <jwt-token>" \
     http://localhost:3000/

# Rate limiting test
for i in {1..150}; do curl http://localhost:3000/; done
```

### Docker Testing

```bash
# Test container health
docker-compose ps

# Verify DynamoDB connectivity
curl http://localhost:8001  # DynamoDB Admin UI

# Container resource usage
docker stats
```

## API Endpoints

| Method   | Endpoint           | Description          | Auth Required |
| -------- | ------------------ | -------------------- | ------------- |
| `GET`    | `/health`          | Basic health check   | No            |
| `GET`    | `/health/detailed` | Detailed system info | No            |
| `GET`    | `/`                | List user's todos    | Optional\*    |
| `POST`   | `/`                | Create new todo      | Optional\*    |
| `DELETE` | `/:id`             | Delete todo by ID    | Optional\*    |

_\* Authentication is optional but when provided, data is user-specific_

## Configuration

### Database Configuration

```typescript
// DynamoDB settings
DYNAMODB_TABLE_NAME=todo-app-{env}-todos
AWS_REGION=ap-southeast-2

// Local development
DYNAMODB_ENDPOINT=http://localhost:8000
```

## Monitoring

### Health Endpoints

- **Basic Health**: `GET /health` - Quick status check
- **Detailed Health**: `GET /health/detailed` - Memory usage, configuration, dependencies

### Logging

```bash
# View application logs
docker-compose logs -f todo-api

# Monitor health status
watch -n 5 'curl -s http://localhost:3000/health | jq'
```

## Development

### Code Quality

```bash
# Format code
npm run format

# Lint and fix issues
npm run lint

# Pre-commit hooks (automatic)
git commit -m "feat: add new feature"
```

### Database Schema

```typescript
// DynamoDB Item Structure
{
  "PK": "USER#cognito-user-id",     // Partition Key
  "SK": "TODO#uuid-v4",             // Sort Key
  "id": "uuid-v4",                  // Todo ID
  "summary": "Buy groceries",       // Todo text
  "done": false,                    // Completion status
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## Troubleshooting

### Common Issues

**DynamoDB Connection Failed**:

```bash
# Check DynamoDB Local is running
docker-compose ps dynamodb-local

# Restart DynamoDB service
docker-compose restart dynamodb-local
```

**Authentication Errors**:

```bash
# Verify Cognito configuration
echo $COGNITO_USER_POOL_ID
echo $COGNITO_CLIENT_ID

# Check JWT token validity
npm run demo:jwt-verification
```

## Documentation

- [Docker Setup Guide](./README-Docker.md)
- [JWT Verification Guide](./README-JWT-Verification.md)
- [Monitoring Setup](../docs/monitoring-quick-setup.md)

# Backend API Configuration

| Variable               | Description                   | Default          | Required |
| ---------------------- | ----------------------------- | ---------------- | -------- |
| `NODE_ENV`             | Environment mode              | `development`    | No       |
| `PORT`                 | Server port                   | `3000`           | No       |
| `AWS_REGION`           | AWS region                    | `ap-southeast-2` | Yes      |
| `DYNAMODB_TABLE_NAME`  | DynamoDB table name           | -                | Yes      |
| `DYNAMODB_ENDPOINT`    | DynamoDB endpoint (for local) | -                | No       |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID          | -                | Yes\*    |
| `COGNITO_CLIENT_ID`    | Cognito Client ID             | -                | Yes\*    |

\*Required for authentication features
