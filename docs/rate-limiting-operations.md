# Rate Limiting Operations Guide

## Overview

This document provides operational procedures for monitoring, maintaining, and troubleshooting the rate limiting system implemented in the Todo application.

## Daily Operations

### 1. Monitoring Dashboard

#### CloudWatch Metrics to Monitor

**WAF Metrics:**

- `AWS/WAFV2/AllowedRequests` - Normal traffic flow
- `AWS/WAFV2/BlockedRequests` - Rate limited requests
- `AWS/WAFV2/SampledRequests` - Sample of blocked requests

**Application Metrics:**

- Response time trends
- Error rate (429 responses)
- Request volume patterns

#### Key Performance Indicators (KPIs)

```bash
# Daily KPI Checks
1. Rate limit violation rate < 5% of total requests
2. Average response time < 200ms
3. 99th percentile response time < 1000ms
4. Zero false positive blocks
```

### 2. Log Analysis

#### WAF Logs Location

```
CloudWatch Log Group: /aws/wafv2/cloudfront/{distribution-id}
```

#### Application Logs Location

```
CloudWatch Log Group: /aws/apprunner/{service-name}/application
```

#### Sample Log Queries

**High Rate Limit Violations:**

```sql
fields @timestamp, httpRequest.clientIP, action
| filter action = "BLOCK"
| stats count() by httpRequest.clientIP
| sort count desc
| limit 10
```

**Application Rate Limit Patterns:**

```sql
fields @timestamp, @message
| filter @message like /429/
| stats count() by bin(5m)
```

## Alerting and Incident Response

### 1. Alert Thresholds

#### Critical Alerts

- **WAF Block Rate > 20%**: Potential DDoS attack
- **Application 429 Rate > 15%**: Application under stress
- **Response Time > 2000ms**: Performance degradation

#### Warning Alerts

- **WAF Block Rate > 10%**: Increased suspicious activity
- **Application 429 Rate > 5%**: Higher than normal rate limiting
- **Response Time > 1000ms**: Performance concern

### 2. Incident Response Procedures

#### High Rate Limit Violations

**Step 1: Assess the Situation**

```bash
# Check current WAF metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=WebACL,Value=todo-app-prod-cloudfront-waf \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

**Step 2: Identify Attack Patterns**

```bash
# Get top blocked IPs
aws logs start-query \
  --log-group-name /aws/wafv2/cloudfront/E1234567890 \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields httpRequest.clientIP | filter action = "BLOCK" | stats count() by httpRequest.clientIP | sort count desc | limit 20'
```

**Step 3: Take Action**

- If legitimate traffic: Temporarily increase rate limits
- If attack: Implement additional WAF rules
- If false positive: Whitelist legitimate IPs

#### Application Performance Issues

**Step 1: Check Application Metrics**

```bash
# Check App Runner service health
aws apprunner describe-service \
  --service-arn arn:aws:apprunner:region:account:service/todo-app-prod-backend-api
```

**Step 2: Scale Resources if Needed**

```bash
# Update App Runner configuration for more resources
aws apprunner update-service \
  --service-arn arn:aws:apprunner:region:account:service/todo-app-prod-backend-api \
  --instance-configuration Cpu=2vCPU,Memory=4GB
```

## Maintenance Procedures

### 1. Rate Limit Adjustments

#### Temporary Rate Limit Increase

**For WAF (requires infrastructure update):**

```typescript
// In infrastructure/lib/todo-app-stack.ts
rateBasedStatement: {
  limit: 5000, // Increased from 2000
  aggregateKeyType: 'IP',
}
```

**For Application (environment variable):**

```bash
# Set environment variable in App Runner
RATE_LIMIT_MAX=200  # Increased from 100
RATE_LIMIT_AUTH_MAX=20  # Increased from 10
```

#### Permanent Rate Limit Changes

1. **Update Infrastructure Code**
2. **Test in Development Environment**
3. **Deploy via CI/CD Pipeline**
4. **Monitor for 24 hours**
5. **Document Changes**

### 2. IP Whitelisting

#### Emergency IP Whitelist (WAF)

```typescript
// Add to WAF rules with priority 0
{
  name: 'EmergencyWhitelist',
  priority: 0,
  statement: {
    ipSetReferenceStatement: {
      arn: 'arn:aws:wafv2:region:account:global/ipset/emergency-whitelist/id'
    }
  },
  action: { allow: {} }
}
```

#### Create IP Set for Whitelisting

```bash
# Create IP set
aws wafv2 create-ip-set \
  --name emergency-whitelist \
  --scope CLOUDFRONT \
  --ip-address-version IPV4 \
  --addresses "203.0.113.0/24" "198.51.100.0/24"
```

### 3. Configuration Backup and Recovery

#### Backup Current Configuration

```bash
# Export WAF configuration
aws wafv2 get-web-acl \
  --scope CLOUDFRONT \
  --id your-web-acl-id > waf-backup-$(date +%Y%m%d).json

# Export App Runner configuration
aws apprunner describe-service \
  --service-arn your-service-arn > apprunner-backup-$(date +%Y%m%d).json
```

#### Recovery Procedures

```bash
# Restore from backup if needed
aws wafv2 update-web-acl \
  --scope CLOUDFRONT \
  --id your-web-acl-id \
  --cli-input-json file://waf-backup-20231201.json
```

## Troubleshooting Guide

### 1. Common Issues

#### Issue: Legitimate Users Being Blocked

**Symptoms:**

- Customer complaints about access issues
- High rate of 403 errors from specific IPs
- Normal user behavior patterns in logs

**Diagnosis:**

```bash
# Check if IP is in blocked list
aws logs start-query \
  --log-group-name /aws/wafv2/cloudfront/E1234567890 \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, httpRequest.clientIP, action | filter httpRequest.clientIP = "203.0.113.1"'
```

**Resolution:**

1. Add IP to whitelist temporarily
2. Analyze traffic patterns
3. Adjust rate limits if necessary
4. Remove from whitelist after adjustment

#### Issue: Rate Limits Not Working

**Symptoms:**

- No 429 responses in application logs
- No blocked requests in WAF metrics
- Suspected abuse continuing

**Diagnosis:**

```bash
# Check rate limit configuration
curl -H "Authorization: Bearer $TOKEN" \
  -w "%{http_code}\n" \
  -o /dev/null \
  -s \
  https://your-api-endpoint.com/api/todos

# Repeat rapidly to test rate limiting
for i in {1..150}; do
  curl -H "Authorization: Bearer $TOKEN" \
    -w "%{http_code}\n" \
    -o /dev/null \
    -s \
    https://your-api-endpoint.com/api/todos
done
```

**Resolution:**

1. Verify rate limit middleware is loaded
2. Check environment variables
3. Restart application if needed
4. Verify WAF rules are active

#### Issue: False Positive Blocks

**Symptoms:**

- Legitimate API clients being blocked
- Mobile apps failing intermittently
- Batch operations failing

**Diagnosis:**

```bash
# Analyze request patterns
aws logs start-query \
  --log-group-name /aws/wafv2/cloudfront/E1234567890 \
  --start-time $(date -d '4 hours ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, httpRequest.clientIP, httpRequest.uri, action | filter action = "BLOCK" | stats count() by httpRequest.uri'
```

**Resolution:**

1. Identify legitimate use patterns
2. Create specific allow rules for legitimate clients
3. Adjust rate limits for specific endpoints
4. Implement user-agent based rules if needed

### 2. Performance Optimization

#### Optimize Rate Limit Efficiency

**Application Level:**

```typescript
// Use Redis for distributed rate limiting (future enhancement)
await fastify.register(rateLimit, {
  redis: redisClient, // Distributed rate limiting
  max: 100,
  timeWindow: '1 minute',
  skipOnError: true, // Don't fail open on Redis errors
});
```

**Infrastructure Level:**

```typescript
// Optimize WAF rules order (most specific first)
rules: [
  { name: 'WhitelistRule', priority: 1 }, // Allow trusted IPs
  { name: 'RateLimitRule', priority: 2 }, // Rate limiting
  { name: 'CommonRuleSet', priority: 3 }, // General protection
];
```

## Reporting and Analytics

### 1. Weekly Reports

#### Rate Limiting Effectiveness Report

```sql
-- CloudWatch Insights query for weekly summary
fields @timestamp, action
| filter @timestamp > date_sub(now(), interval 7 day)
| stats
    count() as total_requests,
    sum(case when action = "BLOCK" then 1 else 0 end) as blocked_requests,
    sum(case when action = "ALLOW" then 1 else 0 end) as allowed_requests
| eval block_rate = (blocked_requests / total_requests) * 100
```

#### Top Blocked IPs Report

```sql
fields httpRequest.clientIP, action
| filter action = "BLOCK" and @timestamp > date_sub(now(), interval 7 day)
| stats count() as block_count by httpRequest.clientIP
| sort block_count desc
| limit 50
```

### 2. Monthly Analysis

#### Traffic Pattern Analysis

- Peak usage hours
- Geographic distribution of blocks
- Most targeted endpoints
- Rate limit effectiveness trends

#### Recommendations

- Rate limit adjustments based on traffic growth
- Infrastructure scaling recommendations
- Security posture improvements

## Emergency Procedures

### 1. Disable Rate Limiting (Emergency Only)

#### Disable WAF Rate Limiting

```bash
# Update WAF rule to count only (not block)
aws wafv2 update-web-acl \
  --scope CLOUDFRONT \
  --id your-web-acl-id \
  --rules '[{
    "Name": "RateLimitRule",
    "Priority": 1,
    "Statement": {...},
    "Action": {"Count": {}},
    "VisibilityConfig": {...}
  }]'
```

#### Disable Application Rate Limiting

```bash
# Set very high rate limits
export RATE_LIMIT_MAX=999999
export RATE_LIMIT_AUTH_MAX=999999

# Restart App Runner service
aws apprunner start-deployment \
  --service-arn your-service-arn
```

### 2. Emergency Contact Information

- **On-call Engineer**: [Contact Information]
- **AWS Support**: [Support Case Process]
- **Escalation Path**: [Management Contacts]

## Conclusion

This operations guide provides the necessary procedures to maintain, monitor, and troubleshoot the rate limiting system. Regular review and updates of these procedures ensure continued effectiveness of the security measures.

For any questions or issues not covered in this guide, escalate to the security team or create a support ticket with detailed logs and symptoms.
