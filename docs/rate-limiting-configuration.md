# Rate Limiting Configuration Guide

## Overview

This document provides comprehensive information about configuring rate limiting for the Todo application. Rate limiting can be configured at both the application level (Fastify) and infrastructure level (AWS WAF).

## Environment-Specific Configuration

### Application-Level Rate Limits

| Environment | Global Limit | Auth Limit | Purpose             |
| ----------- | ------------ | ---------- | ------------------- |
| Development | 50/min       | 5/min      | Local development   |
| Test        | 1000/min     | 100/min    | Load testing        |
| Production  | 100/min      | 10/min     | Production workload |

### Infrastructure-Level Rate Limits (WAF)

| Environment | Rate Limit         | Monitoring |
| ----------- | ------------------ | ---------- |
| Development | 1000 requests/5min | Basic      |
| Test        | 1000 requests/5min | Basic      |
| Production  | 2000 requests/5min | Full       |

### Environment Variable Examples

#### Development Environment

```bash
NODE_ENV=development
RATE_LIMIT_MAX=50                    # Global requests per minute
RATE_LIMIT_AUTH_MAX=5                # Auth requests per minute
RATE_LIMIT_WINDOW=1 minute           # Time window
RATE_LIMIT_HEADERS_ENABLED=true     # Include headers
```

#### Production Environment

```bash
NODE_ENV=production
RATE_LIMIT_MAX=100                   # Global requests per minute
RATE_LIMIT_AUTH_MAX=10               # Auth requests per minute
RATE_LIMIT_WINDOW=1 minute           # Time window
RATE_LIMIT_HEADERS_ENABLED=true     # Include headers
```

#### Testing Environment

```bash
NODE_ENV=test
RATE_LIMIT_MAX=1000                  # Higher limits for testing
RATE_LIMIT_AUTH_MAX=100              # Higher auth limits
RATE_LIMIT_WINDOW=1 minute           # Time window
RATE_LIMIT_HEADERS_ENABLED=false    # Disable headers for tests
```

## Application-Level Configuration

### Environment Variables

The application uses environment variables to configure rate limiting behavior. All configuration is handled through the `rateLimitConfig.ts` module.

#### Global Rate Limiting

| Variable            | Default              | Description                      | Example                             |
| ------------------- | -------------------- | -------------------------------- | ----------------------------------- |
| `RATE_LIMIT_MAX`    | 50 (dev), 100 (prod) | Maximum requests per time window | `100`                               |
| `RATE_LIMIT_WINDOW` | `1 minute`           | Time window for rate limiting    | `1 minute`, `30 seconds`, `2 hours` |

#### Authentication Rate Limiting

| Variable                 | Default            | Description                           | Example    |
| ------------------------ | ------------------ | ------------------------------------- | ---------- |
| `RATE_LIMIT_AUTH_MAX`    | 5 (dev), 10 (prod) | Maximum auth requests per time window | `10`       |
| `RATE_LIMIT_AUTH_WINDOW` | `1 minute`         | Time window for auth rate limiting    | `1 minute` |

#### Headers and Monitoring

| Variable                     | Default | Description                             | Example         |
| ---------------------------- | ------- | --------------------------------------- | --------------- |
| `RATE_LIMIT_HEADERS_ENABLED` | `true`  | Include rate limit headers in responses | `true`, `false` |

### Environment-Based Defaults

The application automatically adjusts rate limits based on the `NODE_ENV`:

```typescript
const defaults = {
  development: {
    globalMax: 50,
    authMax: 5,
  },
  test: {
    globalMax: 1000, // Higher limits for testing
    authMax: 100,
  },
  production: {
    globalMax: 100,
    authMax: 10,
  },
};
```

## Infrastructure-Level Configuration

### AWS WAF Configuration

WAF rate limiting is configured in the CDK infrastructure code and can be customized per environment.

#### Environment-Based WAF Limits

| Environment | Rate Limit         | Monitoring |
| ----------- | ------------------ | ---------- |
| Development | 1000 requests/5min | Basic      |
| Staging     | 1500 requests/5min | Enhanced   |
| Production  | 2000 requests/5min | Full       |

#### CDK Context Override

You can override WAF rate limits using CDK context:

```bash
# Deploy with custom WAF rate limit
npx cdk deploy --context wafRateLimit=3000
```

#### Infrastructure Configuration

```typescript
// In infrastructure/lib/todo-app-stack.ts
const rateLimitConfig = {
  waf: {
    rateLimit: environment === 'prod' ? 2000 : 1000,
    rateLimitOverride: this.node.tryGetContext('wafRateLimit'),
  },
  monitoring: {
    sampledRequestsEnabled: environment === 'prod',
    cloudWatchMetricsEnabled: true,
  },
};
```

## Configuration Validation

The application includes built-in validation for rate limiting configuration:

### Validation Rules

1. **Positive Values**: All rate limits must be greater than 0
2. **Logical Consistency**: Auth limits should typically be lower than global limits
3. **Time Window Format**: Must match pattern `\d+\s+(second|minute|hour)s?`

### Validation Examples

```typescript
// Valid configurations
RATE_LIMIT_WINDOW=1 minute
RATE_LIMIT_WINDOW=30 seconds
RATE_LIMIT_WINDOW=2 hours

// Invalid configurations
RATE_LIMIT_WINDOW=invalid
RATE_LIMIT_WINDOW=1.5 minutes
RATE_LIMIT_MAX=0
```

## Configuration Management

### Per-Environment Configuration

#### Development

```bash
# Lower limits for development
export RATE_LIMIT_MAX=50
export RATE_LIMIT_AUTH_MAX=5
```

#### Staging

```bash
# Moderate limits for staging
export RATE_LIMIT_MAX=75
export RATE_LIMIT_AUTH_MAX=8
```

#### Production

```bash
# Production limits
export RATE_LIMIT_MAX=100
export RATE_LIMIT_AUTH_MAX=10
```

### Dynamic Configuration Updates

#### Application Level

Rate limiting configuration is read at startup. To update:

1. Update environment variables
2. Restart the application
3. Verify new limits in logs

#### Infrastructure Level

WAF configuration requires infrastructure deployment:

1. Update CDK code or context
2. Deploy infrastructure changes
3. Verify WAF rules in AWS Console

## Monitoring Configuration

### Rate Limit Headers

When `RATE_LIMIT_HEADERS_ENABLED=true`, responses include:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### CloudWatch Metrics

WAF automatically publishes metrics:

- `AWS/WAFV2/AllowedRequests`
- `AWS/WAFV2/BlockedRequests`
- `AWS/WAFV2/SampledRequests`

### Application Logs

Rate limiting events are logged:

```
🚦 Rate limiting configuration:
   Global: 100 requests per 1 minute
   Auth: 10 requests per 1 minute
   Headers enabled: true
   Environment: production
```

## Troubleshooting Configuration

### Common Issues

#### Issue: Rate Limits Not Applied

**Symptoms**: No 429 responses, unlimited requests allowed
**Solutions**:

1. Check environment variables are set correctly
2. Verify application restart after configuration changes
3. Check for configuration validation errors in logs

#### Issue: Too Restrictive Limits

**Symptoms**: Legitimate users getting 429 errors
**Solutions**:

1. Increase `RATE_LIMIT_MAX` temporarily
2. Analyze traffic patterns
3. Adjust limits based on actual usage

#### Issue: Configuration Validation Errors

**Symptoms**: Application fails to start
**Solutions**:

1. Check time window format
2. Ensure all rate limits are positive numbers
3. Review validation error messages in logs

### Debugging Commands

```bash
# Check current configuration
curl -I http://localhost:3000/
# Look for X-RateLimit-* headers

# Test rate limiting
for i in {1..150}; do
  curl -w "%{http_code}\n" -o /dev/null -s http://localhost:3000/
done

# Check application logs
docker logs <container-id> | grep "Rate limiting"
```

## Best Practices

### 1. Environment-Specific Configuration

- Use lower limits in development
- Use realistic limits in staging
- Use production-appropriate limits in production

### 2. Gradual Rollout

- Start with conservative limits
- Monitor traffic patterns
- Gradually increase based on capacity

### 3. Monitoring and Alerting

- Enable rate limit headers for debugging
- Set up CloudWatch alarms for high block rates
- Monitor application performance impact

### 4. Documentation

- Document all configuration changes
- Include rationale for specific limits
- Update this guide when adding new options

## Configuration Schema

### TypeScript Interfaces

```typescript
interface RateLimitConfig {
  global: {
    max: number;
    timeWindow: string;
  };
  auth: {
    max: number;
    timeWindow: string;
  };
  headers: {
    enabled: boolean;
  };
}

interface RateLimitEnvironmentConfig {
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW?: string;
  RATE_LIMIT_AUTH_MAX?: string;
  RATE_LIMIT_AUTH_WINDOW?: string;
  RATE_LIMIT_HEADERS_ENABLED?: string;
}
```

## Migration Guide

### From Hardcoded to Configurable

If migrating from hardcoded values:

1. **Identify Current Values**: Note existing hardcoded limits
2. **Set Environment Variables**: Configure equivalent environment variables
3. **Test Configuration**: Verify behavior matches previous implementation
4. **Update Documentation**: Document new configuration options

### Example Migration

```typescript
// Before (hardcoded)
max: 100,
timeWindow: '1 minute',

// After (configurable)
max: rateLimitConfig.global.max,
timeWindow: rateLimitConfig.global.timeWindow,
```

## Security Considerations

### 1. Configuration Security

- Don't expose rate limits in client-side code
- Use secure methods to manage environment variables
- Regularly review and audit rate limit settings

### 2. Attack Mitigation

- Set conservative defaults
- Implement multiple layers of rate limiting
- Monitor for configuration bypass attempts

### 3. Compliance

- Document rate limiting policies
- Ensure limits meet business requirements
- Regular security reviews of configuration

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Maintained By**: DevOps and Security Teams
