# Rate Limiting Solution Design

## Overview

This document outlines the comprehensive rate limiting solution implemented for the Todo application to protect against abuse, DDoS attacks, and ensure fair resource usage across all users.

## Architecture

The rate limiting solution implements a multi-layered approach:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client/User   │───▶│   CloudFront     │───▶│   App Runner    │
│                 │    │   + WAF v2       │    │   + Fastify     │
│                 │    │   (Edge Level)   │    │   (App Level)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                         │
                              ▼                         ▼
                       ┌─────────────┐         ┌─────────────┐
                       │ Rate Limit  │         │ Rate Limit  │
                       │ 2000 req/5m │         │ 100 req/1m  │
                       │ per IP      │         │ per client  │
                       └─────────────┘         └─────────────┘
```

## Implementation Layers

### 1. Infrastructure Level - AWS WAF v2

**Location**: CloudFront Distribution
**Configuration**: `infrastructure/lib/todo-app-stack.ts`

#### Features:

- **Rate-based Rule**: 2000 requests per 5-minute window per IP address
- **AWS Managed Rules**:
  - Common Rule Set (OWASP Top 10 protection)
  - Known Bad Inputs Rule Set (malicious input protection)
- **CloudWatch Integration**: Full metrics and monitoring
- **Geographic Flexibility**: Global protection at edge locations

#### Configuration Details:

```typescript
{
  name: 'RateLimitRule',
  priority: 1,
  statement: {
    rateBasedStatement: {
      limit: 2000, // 2000 requests per 5-minute window
      aggregateKeyType: 'IP',
    },
  },
  action: { block: {} }
}
```

### 2. Application Level - Fastify Rate Limiting

**Location**: Backend API Server
**Configuration**: `backend/src/server.ts`

#### Features:

- **Global Rate Limiting**: 100 requests per minute per client
- **Authentication Rate Limiting**: 10 requests per minute for auth operations
- **Custom Error Responses**: Detailed rate limit information
- **Rate Limit Headers**: Client-friendly headers for rate limit status

#### Configuration Details:

```typescript
// Global rate limiting
{
  max: 100, // 100 requests per minute globally
  timeWindow: '1 minute',
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true
  }
}

// Authentication rate limiting
{
  max: 10, // 10 requests per minute for auth operations
  timeWindow: '1 minute',
  keyGenerator: function (request) {
    return request.ip; // Rate limit by IP for auth operations
  }
}
```

## Rate Limiting Policies

### Frontend (CloudFront + WAF)

- **Limit**: 2000 requests per 5 minutes per IP
- **Scope**: All static assets and API calls through CloudFront
- **Action**: Block requests exceeding limit
- **Reset**: Automatic after 5-minute window

### Backend API (Fastify)

- **Global Limit**: 100 requests per minute per client
- **Authentication Limit**: 10 requests per minute per IP
- **Scope**: All API endpoints
- **Action**: Return 429 status with retry information
- **Reset**: Automatic after 1-minute window

## Security Benefits

### 1. DDoS Protection

- **Edge-level protection** via CloudFront and WAF
- **Application-level protection** via Fastify middleware
- **Automatic blocking** of malicious traffic patterns

### 2. Brute Force Prevention

- **Stricter limits** on authentication-related operations
- **IP-based tracking** for authentication attempts
- **Progressive blocking** for repeated violations

### 3. Resource Protection

- **Fair usage** enforcement across all users
- **Cost control** by preventing resource exhaustion
- **Performance maintenance** under high load

### 4. Compliance and Monitoring

- **CloudWatch metrics** for all rate limiting events
- **Detailed logging** of blocked requests
- **Real-time monitoring** capabilities

## Error Handling

### WAF Responses

When WAF rate limits are exceeded:

- **HTTP Status**: 403 Forbidden
- **Response**: AWS WAF default block page
- **Logging**: CloudWatch WAF logs

### Application Responses

When application rate limits are exceeded:

```json
{
  "code": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. You can make 100 requests per minute. Try again in 45 seconds.",
  "retryAfter": 45
}
```

### Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
Retry-After: 45
```

## Monitoring and Alerting

### CloudWatch Metrics

- **WAF Rate Limit Blocks**: `AWS/WAFV2/RateLimitRule`
- **Application Rate Limits**: Custom metrics via Fastify
- **Request Patterns**: CloudFront access logs

### Recommended Alerts

1. **High Rate Limit Violations**: > 100 blocks per minute
2. **Sustained Attack Patterns**: > 1000 blocks per hour
3. **Application Performance**: Response time degradation

## Configuration Management

### Environment-Specific Settings

#### Development

- **WAF Rate Limit**: 1000 requests per 5 minutes
- **App Rate Limit**: 50 requests per minute
- **Monitoring**: Basic CloudWatch metrics

#### Production

- **WAF Rate Limit**: 2000 requests per 5 minutes
- **App Rate Limit**: 100 requests per minute
- **Monitoring**: Full alerting and monitoring

### Customization Options

#### WAF Configuration

```typescript
// Adjust rate limits per environment
const rateLimit = environment === 'prod' ? 2000 : 1000;

rateBasedStatement: {
  limit: rateLimit,
  aggregateKeyType: 'IP',
}
```

#### Application Configuration

```typescript
// Environment-based rate limiting
const globalLimit = process.env.NODE_ENV === 'production' ? 100 : 50;
const authLimit = process.env.NODE_ENV === 'production' ? 10 : 5;
```

## Best Practices

### 1. Gradual Implementation

- Start with **warning mode** in non-production environments
- Monitor traffic patterns before enforcing strict limits
- Adjust limits based on actual usage patterns

### 2. User Experience

- Provide **clear error messages** with retry information
- Include **rate limit headers** for client-side handling
- Implement **exponential backoff** in client applications

### 3. Monitoring and Tuning

- **Regular review** of rate limit effectiveness
- **Adjustment** based on traffic patterns and business needs
- **Correlation** with application performance metrics

### 4. Emergency Procedures

- **Temporary rate limit increases** for legitimate traffic spikes
- **IP whitelisting** for trusted sources
- **Quick disable** mechanisms for false positives

## Future Enhancements

### 1. Advanced Rate Limiting

- **User-based rate limiting** (authenticated users)
- **API key-based limits** for different service tiers
- **Dynamic rate limiting** based on system load

### 2. Enhanced Monitoring

- **Real-time dashboards** for rate limiting metrics
- **Automated alerting** for anomalous patterns
- **Integration** with security incident response

### 3. Geographic Controls

- **Country-based rate limiting** for different regions
- **Time-zone aware** rate limiting
- **Regional traffic analysis**

## Conclusion

This multi-layered rate limiting solution provides comprehensive protection against various attack vectors while maintaining optimal user experience. The combination of edge-level and application-level controls ensures robust defense against both volumetric attacks and application-specific abuse patterns.

Regular monitoring and tuning of these limits will ensure continued effectiveness as the application scales and traffic patterns evolve.
