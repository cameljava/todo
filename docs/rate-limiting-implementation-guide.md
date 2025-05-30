# Rate Limiting Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the comprehensive rate limiting solution in the Todo application, covering both application-level and infrastructure-level configurations.

## Prerequisites

### Required Tools

- Node.js 22+
- AWS CLI configured with appropriate permissions
- AWS CDK v2
- Docker (for local testing)
- Git

### Required AWS Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["wafv2:*", "cloudfront:*", "apprunner:*", "logs:*", "cloudwatch:*"],
      "Resource": "*"
    }
  ]
}
```

## Implementation Steps

### Phase 1: Application-Level Rate Limiting

#### Step 1: Install Dependencies

```bash
# Navigate to backend directory
cd backend

# Install rate limiting package
npm install @fastify/rate-limit

# Verify installation
npm list @fastify/rate-limit
```

#### Step 2: Configure Rate Limiting Middleware

The rate limiting configuration has been implemented in `backend/src/server.ts` with the following features:

**Global Rate Limiting:**

- 100 requests per minute per client
- Custom error responses with retry information
- Rate limit headers for client awareness

**Authentication Rate Limiting:**

- 10 requests per minute for auth operations
- IP-based tracking for enhanced security

#### Step 3: Environment Configuration

Create or update environment variables:

```bash
# Development environment
export RATE_LIMIT_MAX=50
export RATE_LIMIT_AUTH_MAX=5
export RATE_LIMIT_WINDOW="1 minute"

# Production environment
export RATE_LIMIT_MAX=100
export RATE_LIMIT_AUTH_MAX=10
export RATE_LIMIT_WINDOW="1 minute"
```

#### Step 4: Test Application Rate Limiting

```bash
# Build and start the application
npm run build
npm start

# Test rate limiting (in another terminal)
# This should trigger rate limiting after 100 requests
for i in {1..150}; do
  curl -w "%{http_code}\n" -o /dev/null -s http://localhost:3000/
  sleep 0.1
done
```

Expected behavior:

- First 100 requests: HTTP 200
- Subsequent requests: HTTP 429 with rate limit headers

### Phase 2: Infrastructure-Level Rate Limiting

#### Step 1: Update Infrastructure Code

The WAF configuration has been added to `infrastructure/lib/todo-app-stack.ts` with:

- **Rate-based rule**: 2000 requests per 5 minutes per IP
- **AWS Managed Rules**: Common Rule Set and Known Bad Inputs
- **CloudWatch integration**: Full metrics and logging

#### Step 2: Deploy Infrastructure Changes

```bash
# Navigate to infrastructure directory
cd infrastructure

# Install dependencies
npm install

# Build the CDK app
npm run build

# Preview changes
npx cdk diff

# Deploy the changes
npx cdk deploy --all
```

#### Step 3: Verify WAF Deployment

```bash
# List WAF Web ACLs
aws wafv2 list-web-acls --scope CLOUDFRONT

# Get specific Web ACL details
aws wafv2 get-web-acl \
  --scope CLOUDFRONT \
  --id <web-acl-id>

# Check CloudFront association
aws cloudfront get-distribution \
  --id <distribution-id>
```

### Phase 3: Monitoring and Alerting Setup

#### Step 1: Create CloudWatch Dashboard

```bash
# Create dashboard configuration
cat > rate-limiting-dashboard.json << 'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/WAFV2", "AllowedRequests", "WebACL", "todo-app-prod-cloudfront-waf"],
          [".", "BlockedRequests", ".", "."]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "ap-southeast-2",
        "title": "WAF Request Status"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/AppRunner", "RequestLatency", "ServiceName", "todo-app-prod-backend-api"],
          [".", "4XXError", ".", "."],
          [".", "2XXResponse", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "ap-southeast-2",
        "title": "Application Performance"
      }
    }
  ]
}
EOF

# Create the dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "TodoApp-RateLimiting" \
  --dashboard-body file://rate-limiting-dashboard.json
```

#### Step 2: Set Up CloudWatch Alarms

```bash
# High WAF block rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "TodoApp-HighWAFBlockRate" \
  --alarm-description "High rate of WAF blocks detected" \
  --metric-name BlockedRequests \
  --namespace AWS/WAFV2 \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:ap-southeast-2:account:alert-topic

# Application response time alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "TodoApp-HighResponseTime" \
  --alarm-description "High application response time" \
  --metric-name RequestLatency \
  --namespace AWS/AppRunner \
  --statistic Average \
  --period 300 \
  --threshold 2000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:ap-southeast-2:account:alert-topic
```

### Phase 4: Testing and Validation

#### Step 1: Load Testing

Create a load testing script:

```bash
# Create load test script
cat > load-test.sh << 'EOF'
#!/bin/bash

ENDPOINT="https://your-cloudfront-domain.cloudfront.net"
CONCURRENT_USERS=50
REQUESTS_PER_USER=100

echo "Starting load test..."
echo "Endpoint: $ENDPOINT"
echo "Concurrent users: $CONCURRENT_USERS"
echo "Requests per user: $REQUESTS_PER_USER"

# Function to make requests
make_requests() {
  local user_id=$1
  for i in $(seq 1 $REQUESTS_PER_USER); do
    response=$(curl -w "%{http_code}" -o /dev/null -s "$ENDPOINT/")
    echo "User $user_id, Request $i: $response"
    if [ "$response" = "429" ] || [ "$response" = "403" ]; then
      echo "User $user_id hit rate limit at request $i"
      break
    fi
    sleep 0.1
  done
}

# Start concurrent users
for user in $(seq 1 $CONCURRENT_USERS); do
  make_requests $user &
done

wait
echo "Load test completed"
EOF

chmod +x load-test.sh
./load-test.sh
```

#### Step 2: Validate Rate Limiting Behavior

**Expected Results:**

- WAF should block IPs exceeding 2000 requests per 5 minutes
- Application should return 429 for requests exceeding 100 per minute
- Rate limit headers should be present in responses
- CloudWatch metrics should show blocked requests

#### Step 3: Monitor Logs

```bash
# Monitor WAF logs
aws logs tail /aws/wafv2/cloudfront/E1234567890 --follow

# Monitor application logs
aws logs tail /aws/apprunner/todo-app-prod-backend-api/application --follow
```

### Phase 5: Production Deployment

#### Step 1: Environment-Specific Configuration

**Development Environment:**

```typescript
// Lower limits for development
const rateLimit = environment === 'dev' ? 1000 : 2000;
const appRateLimit = environment === 'dev' ? 50 : 100;
```

**Production Environment:**

```typescript
// Full protection for production
const rateLimit = 2000;
const appRateLimit = 100;
```

#### Step 2: Gradual Rollout

1. **Deploy to Development**

   ```bash
   npx cdk deploy TodoAppStack-dev
   ```

2. **Test in Development**

   - Verify rate limiting works
   - Check monitoring and alerting
   - Validate user experience

3. **Deploy to Staging**

   ```bash
   npx cdk deploy TodoAppStack-staging
   ```

4. **Production Deployment**
   ```bash
   npx cdk deploy TodoAppStack-prod
   ```

#### Step 3: Post-Deployment Validation

```bash
# Check deployment status
aws apprunner describe-service \
  --service-arn arn:aws:apprunner:ap-southeast-2:account:service/todo-app-prod-backend-api

# Verify WAF is active
aws wafv2 get-web-acl \
  --scope CLOUDFRONT \
  --id <web-acl-id>

# Test rate limiting
curl -I https://your-production-domain.com/
# Should include rate limit headers
```

## Configuration Management

### Environment Variables

| Variable              | Development | Production | Description                  |
| --------------------- | ----------- | ---------- | ---------------------------- |
| `RATE_LIMIT_MAX`      | 50          | 100        | Global rate limit per minute |
| `RATE_LIMIT_AUTH_MAX` | 5           | 10         | Auth rate limit per minute   |
| `RATE_LIMIT_WINDOW`   | "1 minute"  | "1 minute" | Rate limit time window       |

### Infrastructure Parameters

| Parameter            | Development | Production | Description           |
| -------------------- | ----------- | ---------- | --------------------- |
| WAF Rate Limit       | 1000/5min   | 2000/5min  | WAF rate limit per IP |
| CloudWatch Retention | 7 days      | 30 days    | Log retention period  |
| Alerting             | Basic       | Full       | Monitoring level      |

## Troubleshooting

### Common Issues

#### Issue: Rate Limiting Not Working

**Symptoms:**

- No 429 responses
- No WAF blocks in metrics

**Solutions:**

1. Check middleware registration order
2. Verify environment variables
3. Confirm WAF association with CloudFront

#### Issue: Too Many False Positives

**Symptoms:**

- Legitimate users blocked
- Customer complaints

**Solutions:**

1. Increase rate limits temporarily
2. Add IP whitelist for known good IPs
3. Analyze traffic patterns

#### Issue: Performance Impact

**Symptoms:**

- Increased response times
- High CPU usage

**Solutions:**

1. Optimize rate limit storage (consider Redis)
2. Adjust rate limit algorithms
3. Scale application resources

### Debugging Commands

```bash
# Check rate limit middleware status
curl -v http://localhost:3000/ | grep -i rate

# Test WAF rules
aws wafv2 get-sampled-requests \
  --web-acl-arn <web-acl-arn> \
  --rule-metric-name RateLimitRule \
  --scope CLOUDFRONT \
  --time-window StartTime=2023-12-01T00:00:00Z,EndTime=2023-12-01T23:59:59Z \
  --max-items 100

# Check application logs for rate limiting
aws logs filter-log-events \
  --log-group-name /aws/apprunner/todo-app-prod-backend-api/application \
  --filter-pattern "429"
```

## Security Considerations

### Best Practices

1. **Layered Defense**: Use both WAF and application-level rate limiting
2. **Monitoring**: Implement comprehensive monitoring and alerting
3. **Tuning**: Regularly review and adjust rate limits based on traffic patterns
4. **Documentation**: Keep configuration and procedures well-documented

### Security Checklist

- [ ] WAF rate limiting configured and active
- [ ] Application rate limiting implemented
- [ ] CloudWatch monitoring enabled
- [ ] Alerting configured for anomalies
- [ ] Emergency procedures documented
- [ ] Regular security reviews scheduled

## Maintenance

### Regular Tasks

**Weekly:**

- Review rate limiting metrics
- Check for false positives
- Analyze traffic patterns

**Monthly:**

- Update rate limits based on growth
- Review security incidents
- Update documentation

**Quarterly:**

- Security assessment
- Performance optimization
- Disaster recovery testing

## Conclusion

This implementation guide provides a comprehensive approach to deploying rate limiting for the Todo application. The multi-layered solution ensures robust protection against various attack vectors while maintaining optimal user experience.

For ongoing support and maintenance, refer to the [Rate Limiting Operations Guide](./rate-limiting-operations.md) and [Solution Design Document](./rate-limiting-solution-design.md).
