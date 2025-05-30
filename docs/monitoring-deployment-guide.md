# Monitoring Deployment Guide

## Quick Start

### 1. Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js and npm installed
- CDK CLI installed (`npm install -g aws-cdk`)

### 2. Deploy Infrastructure with Monitoring

```bash
# Navigate to infrastructure directory
cd infrastructure

# Install dependencies
npm install

# Bootstrap CDK (if first time)
npx cdk bootstrap

# Deploy with monitoring (basic)
npx cdk deploy

# Deploy with email alerts
npx cdk deploy --context alertEmail=your-ops-team@company.com
```

### 3. Verify Deployment

```bash
# Get stack outputs
npx cdk outputs

# Test health endpoints (replace with your App Runner URL)
curl https://your-app-runner-url.amazonaws.com/health
curl https://your-app-runner-url.amazonaws.com/health/detailed
```

### 4. Access Monitoring Dashboard

```bash
# Get dashboard URL from outputs
aws cloudformation describe-stacks \
  --stack-name TodoAppStack \
  --query 'Stacks[0].Outputs[?OutputKey==`MonitoringDashboardUrl`].OutputValue' \
  --output text
```

## Environment-Specific Deployment

### Development

```bash
npx cdk deploy --context environment=dev
```

### Production

```bash
npx cdk deploy --context environment=prod --context alertEmail=ops@company.com
```

## Monitoring Components Deployed

✅ **Health Check Endpoints**

- `/health` - Basic health status
- `/health/detailed` - Detailed system information

✅ **CloudWatch Dashboard**

- Frontend metrics (CloudFront)
- Backend metrics (App Runner)
- Database metrics (DynamoDB)

✅ **CloudWatch Alarms**

- High error rates (5xx > 10 in 5 minutes)
- High response times (> 5 seconds)
- CloudFront error rates (> 5%)

✅ **Synthetic Monitoring**

- Health check canary (every 5 minutes)
- Frontend availability monitoring

✅ **SNS Alerts**

- Email notifications for critical issues
- Configurable alert thresholds

## Post-Deployment Verification

### 1. Health Endpoints

```bash
# Basic health check
curl https://your-domain.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": "ok",
    "auth": "ok",
    "memory": "ok"
  }
}
```

### 2. Dashboard Access

- Navigate to CloudWatch Console
- Go to Dashboards
- Find `[app-name]-[environment]-monitoring`

### 3. Alarm Configuration

```bash
# List alarms
aws cloudwatch describe-alarms --alarm-name-prefix "your-app"

# Test alarm (optional - triggers alert)
aws cloudwatch put-metric-data \
  --namespace "AWS/AppRunner" \
  --metric-data MetricName=Http5xxCount,Value=15,Unit=Count
```

## Troubleshooting

### Common Issues

**Dashboard not showing data:**

- Wait 5-10 minutes for initial metrics
- Ensure App Runner service is receiving traffic
- Check CloudWatch agent configuration

**Alarms not triggering:**

- Verify SNS topic subscriptions
- Check alarm thresholds and evaluation periods
- Review CloudWatch alarm history

**Health endpoints not responding:**

- Check App Runner service status
- Verify security group configurations
- Review application logs

### Useful Commands

```bash
# Check App Runner service status
aws apprunner describe-service --service-arn <service-arn>

# View CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/aws/apprunner"

# List SNS subscriptions
aws sns list-subscriptions-by-topic --topic-arn <topic-arn>

# Test health check script
./scripts/health-check.sh https://your-domain.com --detailed
```

## Scaling Considerations

### Production Enhancements

- Add custom application metrics
- Implement log-based alarms
- Set up cross-region monitoring
- Configure performance budgets

### Cost Optimization

- Adjust CloudWatch log retention periods
- Optimize alarm evaluation periods
- Use CloudWatch Insights for log analysis

## Support

For issues with monitoring setup:

1. Check the [troubleshooting guide](./monitoring-quick-setup.md#troubleshooting)
2. Review CloudWatch console for error details
3. Contact the platform team with specific error messages
