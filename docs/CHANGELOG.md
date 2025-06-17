# Changelog

## [2024-03-XX] Infrastructure Simplification

### Removed

- AWS WAF configuration and Web ACL from CloudFront distribution
- Rate limiting configuration from App Runner service
- Rate limiting environment variables from backend application
- WAF-related IAM permissions and roles

### Changed

- Updated CloudWatch Synthetics canary runtime to latest supported version
- Simplified infrastructure deployment process
- Reduced complexity of the CDK stack

### Documentation Updates

- Updated deployment summary to reflect WAF and rate limiting removal
- Removed rate limiting configuration guides
- Simplified monitoring setup documentation

### Benefits

- Faster deployment process
- Reduced infrastructure costs
- Simplified maintenance and configuration
- Streamlined development workflow

### Note

If you need WAF protection or rate limiting in the future, please refer to the git history or raise a new feature request to re-implement these security features.
