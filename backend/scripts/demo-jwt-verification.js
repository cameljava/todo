#!/usr/bin/env node

/**
 * Demo script to show JWT validation with dependency injection
 * Usage: node scripts/demo-jwt-verification.js
 */

import { CognitoAuthService } from '../dist/auth/cognitoAuth.js';
import {
  ProductionJwtValidator,
  DevelopmentJwtValidator,
  createJwtValidator,
} from '../dist/auth/jwtValidator.js';

const mockConfig = {
  userPoolId: 'ap-southeast-2_XXXXXXXXX',
  clientId: 'demo-client-id',
  region: 'ap-southeast-2',
};

// Sample JWT token (this is a fake token for demo purposes)
const sampleToken =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InNhbXBsZS1raWQifQ.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImNvZ25pdG86dXNlcm5hbWUiOiJ0ZXN0dXNlciIsImF1ZCI6ImRlbW8tY2xpZW50LWlkIiwiaXNzIjoiaHR0cHM6Ly9jb2duaXRvLWlkcC5hcC1zb3V0aGVhc3QtMi5hbWF6b25hd3MuY29tL2FwLXNvdXRoZWFzdC0yX1hYWFhYWFhYWCIsInRva2VuX3VzZSI6ImFjY2VzcyIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNjAwMDAwMDAwfQ.fake-signature';

async function demonstrateValidation() {
  console.log('🔐 JWT Validation with Dependency Injection Demo\n');

  // Test with Production Validator (Direct Injection)
  console.log('📋 Testing with ProductionJwtValidator (Direct Injection):');
  console.log('=========================================================');
  const prodValidator = new ProductionJwtValidator(mockConfig);
  const prodService = new CognitoAuthService(mockConfig, prodValidator);

  console.log(`Validator Type: ${prodService.getValidatorType()}`);
  console.log(`Production Validator: ${prodService.isProductionValidator()}`);

  try {
    const result = await prodService.authenticateUser(sampleToken);
    console.log(`Authentication Result: ${result ? 'SUCCESS' : 'FAILED'}`);
    if (result) {
      console.log(`User: ${JSON.stringify(result, null, 2)}`);
    }
  } catch (error) {
    console.log(`Authentication Error: ${error.message}`);
  }

  console.log('\n');

  // Test with Development Validator (Direct Injection)
  console.log('📋 Testing with DevelopmentJwtValidator (Direct Injection):');
  console.log('===========================================================');
  const devValidator = new DevelopmentJwtValidator(mockConfig);
  const devService = new CognitoAuthService(mockConfig, devValidator);

  console.log(`Validator Type: ${devService.getValidatorType()}`);
  console.log(`Production Validator: ${devService.isProductionValidator()}`);

  try {
    const result = await devService.authenticateUser(sampleToken);
    console.log(`Authentication Result: ${result ? 'SUCCESS' : 'FAILED'}`);
    if (result) {
      console.log(`User: ${JSON.stringify(result, null, 2)}`);
    }
  } catch (error) {
    console.log(`Authentication Error: ${error.message}`);
  }

  console.log('\n');

  // Test with Factory (Environment-based)
  console.log('📋 Testing with Factory (Environment-based):');
  console.log('=============================================');

  // Production via factory
  const factoryProdValidator = createJwtValidator(mockConfig, 'production');
  const factoryProdService = new CognitoAuthService(mockConfig, factoryProdValidator);
  console.log(`Factory (production): ${factoryProdService.getValidatorType()}`);

  // Development via factory
  const factoryDevValidator = createJwtValidator(mockConfig, 'development');
  const factoryDevService = new CognitoAuthService(mockConfig, factoryDevValidator);
  console.log(`Factory (development): ${factoryDevService.getValidatorType()}`);

  console.log('\n');

  // Test with Invalid Token
  console.log('📋 Testing Invalid Token:');
  console.log('=========================');
  const invalidToken = 'invalid.token.here';

  try {
    const result = await devService.authenticateUser(invalidToken);
    console.log(`Authentication Result: ${result ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.log(`Authentication Error: ${error.message}`);
  }

  console.log('\n');
  console.log('✅ Demo completed!');
  console.log('\nKey Benefits of Dependency Injection:');
  console.log('- ✅ No environment checks in production code');
  console.log('- ✅ Easy to test with different validators');
  console.log('- ✅ Clear separation of concerns');
  console.log('- ✅ Flexible configuration at startup');
  console.log('- ✅ Production: Full signature verification');
  console.log('- ✅ Development: Basic validation only');
}

// Run the demonstration
demonstrateValidation().catch(console.error);
