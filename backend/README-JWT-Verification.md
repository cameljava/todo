# JWT Signature Verification

This document explains the JWT signature verification implementation for the Todo API backend.

## Overview

The authentication system now supports environment-based JWT signature verification:

- **Production environments** (`NODE_ENV=production` or `NODE_ENV=prod`): Full JWT signature verification against AWS Cognito's JWKS (JSON Web Key Set)
- **Development/Test environments**: JWT decoding without signature verification for easier development

## How It Works

### Production Mode (Signature Verification Enabled)

When `NODE_ENV` is set to `production` or `prod`, the system:

1. **Fetches JWKS**: Downloads AWS Cognito's public keys from the JWKS endpoint
2. **Verifies Signature**: Uses the appropriate public key to verify the JWT signature
3. **Validates Claims**: Checks issuer, audience, expiration, and token type
4. **Caches Keys**: Caches public keys for 10 minutes to improve performance

```typescript
// Production verification process
const key = await this.getSigningKey(decoded.header.kid);
const payload = jwt.verify(token, key, {
  issuer: this.issuer,
  audience: this.config.clientId,
  algorithms: ['RS256'],
}) as CognitoTokenPayload;
```

### Development Mode (Signature Verification Disabled)

When `NODE_ENV` is anything other than `production`/`prod`, the system:

1. **Decodes Token**: Extracts payload without signature verification
2. **Basic Validation**: Checks for required claims and expiration
3. **Logs Warning**: Indicates that signature verification is disabled

```typescript
// Development verification process
console.warn(
  `Environment: ${this.environment} - Skipping JWT signature verification (development mode)`
);
const decoded = jwt.decode(token, { complete: true });
```

## Configuration

### Environment Variables

| Variable               | Description                | Example                             |
| ---------------------- | -------------------------- | ----------------------------------- |
| `NODE_ENV`             | Controls verification mode | `production`, `development`, `test` |
| `COGNITO_USER_POOL_ID` | AWS Cognito User Pool ID   | `ap-southeast-2_XXXXXXXXX`          |
| `COGNITO_CLIENT_ID`    | AWS Cognito Client ID      | `abcdef1234567890`                  |
| `AWS_REGION`           | AWS region for Cognito     | `ap-southeast-2`                    |

### Example Configurations

**Production:**

```bash
NODE_ENV=production
COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
COGNITO_CLIENT_ID=abcdef1234567890
AWS_REGION=ap-southeast-2
```

**Development:**

```bash
NODE_ENV=development
COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
COGNITO_CLIENT_ID=abcdef1234567890
AWS_REGION=ap-southeast-2
```

## Security Features

### Production Security

- ✅ **Full signature verification** using AWS Cognito's public keys
- ✅ **Issuer validation** ensures tokens come from the correct Cognito User Pool
- ✅ **Audience validation** ensures tokens are for the correct application
- ✅ **Algorithm validation** only accepts RS256 signatures
- ✅ **Expiration checking** rejects expired tokens
- ✅ **Token type validation** only accepts access tokens

### Development Convenience

- ⚠️ **No signature verification** for easier testing
- ✅ **Basic claim validation** still performed
- ✅ **Expiration checking** still enforced
- ✅ **Clear logging** indicates when verification is disabled

## JWKS Configuration

The JWKS client is configured with:

```typescript
this.jwksClient = jwksClient({
  jwksUri: `${this.issuer}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  cacheMaxEntries: 5,
  timeout: 30000,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});
```

### Performance Optimizations

- **Caching**: Public keys cached for 10 minutes
- **Rate Limiting**: Maximum 10 JWKS requests per minute
- **Connection Timeout**: 30-second timeout for JWKS requests
- **Cache Size**: Maximum 5 keys cached simultaneously

## Error Handling

### Production Errors

- **Invalid Signature**: Token rejected, error logged
- **Missing Key ID**: Token rejected, error logged
- **JWKS Fetch Failure**: Token rejected, error logged
- **Claim Validation Failure**: Token rejected, error logged

### Development Errors

- **Malformed Token**: Token rejected, error logged
- **Missing Claims**: Token rejected, error logged
- **Expired Token**: Token rejected, error logged

## Logging

The system provides detailed logging for monitoring:

```
🔐 Authentication configured for environment: production
🔑 JWT signature verification: ENABLED
```

```
🔐 Authentication configured for environment: development
🔑 JWT signature verification: DISABLED (development mode)
```

## Testing

Run the test suite to verify functionality:

```bash
npm test
```

The tests cover:

- Environment-based verification mode selection
- Token validation in different environments
- Error handling for invalid tokens

## Migration Guide

### From Previous Version

No breaking changes - the system automatically detects the environment and applies appropriate verification.

### Deployment Checklist

1. ✅ Set `NODE_ENV=production` in production environments
2. ✅ Verify Cognito configuration is correct
3. ✅ Test authentication flow in staging environment
4. ✅ Monitor logs for verification mode confirmation
5. ✅ Ensure network access to Cognito JWKS endpoint

## Troubleshooting

### Common Issues

**JWKS Fetch Failures:**

- Check network connectivity to AWS Cognito
- Verify User Pool ID is correct
- Ensure region is properly configured

**Signature Verification Failures:**

- Verify token is from the correct Cognito User Pool
- Check that client ID matches the token audience
- Ensure token hasn't expired

**Development Mode Issues:**

- Verify `NODE_ENV` is not set to `production`
- Check that basic token structure is valid
- Ensure token contains required claims

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=jwks-rsa
```

This will provide detailed information about JWKS operations.

## Best Practices

1. **Always use production mode** in production environments
2. **Monitor JWKS cache performance** to ensure optimal response times
3. **Implement proper error handling** for authentication failures
4. **Use development mode only** for local development and testing
5. **Regularly rotate Cognito keys** as per AWS security recommendations
