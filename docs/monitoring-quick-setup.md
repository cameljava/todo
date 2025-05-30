# Quick Health Monitoring Setup for Production Release

This document provides a minimal health monitoring implementation with dashboard for quick production release of the Todo application.

## 🎯 Overview

The monitoring setup includes:

- Enhanced health check endpoints (`/health` and `/health/detailed`)
- CloudWatch Dashboard with key metrics
- CloudWatch Alarms for critical issues
- CloudWatch Synthetics for proactive monitoring
- SNS alerts for incidents

## 🚀 Quick Deployment

### 1. Deploy with Monitoring

```bash
# Deploy the infrastructure with monitoring enabled
cd infrastructure
npm run cdk:deploy

# Optional: Set alert email for notifications
npm run cdk:deploy -- --context alertEmail=your-email@company.com
```

### 2. Access Monitoring Dashboard

After deployment, find the dashboard URL in the CloudFormation outputs:

```bash
# Get the dashboard URL
aws cloudformation describe-stacks \
  --stack-name your-stack-name \
  --query 'Stacks[0].Outputs[?OutputKey==`MonitoringDashboardUrl`].OutputValue' \
  --output text
```

Or navigate to: `CloudWatch → Dashboards → [app-name]-[environment]-monitoring`

## 📊 Monitoring Components

### Health Check Endpoints

**Basic Health Check**: `GET /health`

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": "ok",
    "auth": "ok",
    "memory": "ok"
  }
}
```

**Detailed Health Check**: `GET /health/detailed`

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "memory": {
    "rss": "45.23 MB",
    "heapTotal": "25.67 MB",
    "heapUsed": "18.45 MB",
    "external": "1.23 MB"
  },
  "config": {
    "port": "3000",
    "nodeEnv": "production",
    "dynamodbConfigured": true,
    "cognitoConfigured": true,
    "awsRegion": "ap-southeast-2"
  }
}
```

### Dashboard Metrics

**Frontend (CloudFront)**:

- Request count and error rates (4xx, 5xx)
- Cache hit rate and origin latency

**Backend (App Runner)**:

- Request count and HTTP status codes
- Response time and active instances

**Database (DynamoDB)**:

- Read/write capacity units consumed
- Request latency for operations

### CloudWatch Alarms

**Critical Alarms** (immediate notification):

- App Runner 5xx errors > 10 in 5 minutes
- App Runner response time > 5 seconds
- CloudFront 5xx error rate > 5%

**Synthetic Monitoring**:

- Health check canary runs every 5 minutes
- Tests both frontend availability and backend health

## 🔧 Testing Health Checks

### Local Testing

```bash
# Test basic health check
curl http://localhost:3000/health

# Test detailed health check
curl http://localhost:3000/health/detailed

# Use the health check script
./scripts/health-check.sh http://localhost:3000 --detailed
```

### Production Testing

```bash
# Get your App Runner service URL from CloudFormation outputs
SERVICE_URL=$(aws cloudformation describe-stacks \
  --stack-name your-stack-name \
  --query 'Stacks[0].Outputs[?OutputKey==`AppRunnerServiceUrl`].OutputValue' \
  --output text)

# Test health endpoints
./scripts/health-check.sh $SERVICE_URL --detailed
```

## 🚨 Alert Configuration

### SNS Topic Setup

```bash
# Deploy with email alerts
npm run cdk:deploy -- --context alertEmail=ops-team@company.com

# Or subscribe manually after deployment
aws sns subscribe \
  --topic-arn arn:aws:sns:region:account:app-env-alerts \
  --protocol email \
  --notification-endpoint your-email@company.com
```

### Alert Thresholds

| Metric          | Threshold   | Duration      | Action    |
| --------------- | ----------- | ------------- | --------- |
| 5xx Errors      | > 10 errors | 5 minutes     | SNS Alert |
| Response Time   | > 5 seconds | 15 minutes    | SNS Alert |
| CloudFront 5xx  | > 5% rate   | 5 minutes     | SNS Alert |
| Synthetic Check | Failure     | 2 consecutive | SNS Alert |

## 📈 Dashboard Sections

### 1. Frontend Performance

- **Requests & Errors**: Request volume, 4xx/5xx error rates
- **Cache Performance**: Cache hit rate, origin latency

### 2. Backend Performance

- **Request Metrics**: Total requests, status code breakdown
- **Performance & Health**: Response times, active instances

### 3. Database Performance

- **Operations**: Read/write capacity consumption
- **Latency**: Query and write operation latency

## 🛠 Operations

### Accessing Logs

```bash
# App Runner logs
aws logs describe-log-groups --log-group-name-prefix "/aws/apprunner"

# CloudWatch Synthetics logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/cwsyn"
```

### Manual Health Checks

```bash
# Quick health status
curl -s https://your-app-domain.com/api/health | jq '.status'

# Memory usage check
curl -s https://your-app-domain.com/api/health/detailed | jq '.memory'

# Full health script
./scripts/health-check.sh https://your-app-domain.com --detailed
```

### Scaling Monitoring

For production, consider adding:

- Custom application metrics (using CloudWatch EMF)
- Log-based metrics and alarms
- Cross-region monitoring
- Performance budgets and SLIs

## 🎯 Quick Production Checklist

Before going live:

- [ ] Health endpoints respond correctly
- [ ] Dashboard shows expected metrics
- [ ] Alarms are configured and tested
- [ ] SNS notifications work
- [ ] Synthetic monitoring passes
- [ ] Log retention configured
- [ ] Runbook documentation ready

## 📞 Troubleshooting

### Common Issues

**Health check fails**:

```bash
# Check App Runner service status
aws apprunner describe-service --service-arn <arn>

# Check recent deployments
aws apprunner list-operations --service-arn <arn>
```

**No metrics in dashboard**:

- Wait 5-10 minutes for initial metrics
- Verify service is receiving traffic
- Check CloudWatch agent configuration

**Alarms not triggering**:

- Verify SNS topic subscriptions
- Check alarm history in CloudWatch console
- Test with manual metric injection

### Emergency Contacts

- **Ops Team**: ops-team@company.com
- **Dev Team**: dev-team@company.com
- **CloudWatch Console**: [Direct link from outputs]

## 🔗 Related Documentation

- [Solution Design](../solution.md)
- [Rate Limiting Operations](./rate-limiting-operations.md)
- [Infrastructure README](../infrastructure/README.md)
- [Backend README](../backend/README.md)
