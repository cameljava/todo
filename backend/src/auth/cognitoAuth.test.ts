import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CognitoAuthService } from './cognitoAuth.js';
import {
  createJwtValidator,
  ProductionJwtValidator,
  DevelopmentJwtValidator,
} from './jwtValidator.js';

describe('CognitoAuthService with Dependency Injection', () => {
  const mockConfig = {
    userPoolId: 'ap-southeast-2_XXXXXXXXX',
    clientId: 'test-client-id',
    region: 'ap-southeast-2',
  };

  describe('JWT Validator Factory', () => {
    it('should create ProductionJwtValidator for production environment', () => {
      const validator = createJwtValidator(mockConfig, 'production');
      assert.strictEqual(validator.getValidatorType(), 'ProductionJwtValidator');
    });

    it('should create ProductionJwtValidator for prod environment', () => {
      const validator = createJwtValidator(mockConfig, 'prod');
      assert.strictEqual(validator.getValidatorType(), 'ProductionJwtValidator');
    });

    it('should create DevelopmentJwtValidator for development environment', () => {
      const validator = createJwtValidator(mockConfig, 'development');
      assert.strictEqual(validator.getValidatorType(), 'DevelopmentJwtValidator');
    });

    it('should create DevelopmentJwtValidator for test environment', () => {
      const validator = createJwtValidator(mockConfig, 'test');
      assert.strictEqual(validator.getValidatorType(), 'DevelopmentJwtValidator');
    });

    it('should default to DevelopmentJwtValidator when no environment specified', () => {
      const validator = createJwtValidator(mockConfig);
      assert.strictEqual(validator.getValidatorType(), 'DevelopmentJwtValidator');
    });
  });

  describe('CognitoAuthService with injected validators', () => {
    it('should use ProductionJwtValidator when injected', () => {
      const validator = new ProductionJwtValidator(mockConfig);
      const service = new CognitoAuthService(mockConfig, validator);

      assert.strictEqual(service.getValidatorType(), 'ProductionJwtValidator');
      assert.strictEqual(service.isProductionValidator(), true);
    });

    it('should use DevelopmentJwtValidator when injected', () => {
      const validator = new DevelopmentJwtValidator(mockConfig);
      const service = new CognitoAuthService(mockConfig, validator);

      assert.strictEqual(service.getValidatorType(), 'DevelopmentJwtValidator');
      assert.strictEqual(service.isProductionValidator(), false);
    });
  });

  describe('Token validation with different validators', () => {
    it('should reject invalid tokens with DevelopmentJwtValidator', async () => {
      const validator = new DevelopmentJwtValidator(mockConfig);
      const service = new CognitoAuthService(mockConfig, validator);

      const result = await service.authenticateUser('invalid-token');
      assert.strictEqual(result, null);
    });

    it('should reject empty tokens with DevelopmentJwtValidator', async () => {
      const validator = new DevelopmentJwtValidator(mockConfig);
      const service = new CognitoAuthService(mockConfig, validator);

      const result = await service.authenticateUser('');
      assert.strictEqual(result, null);
    });

    it('should handle malformed JWT tokens with DevelopmentJwtValidator', async () => {
      const validator = new DevelopmentJwtValidator(mockConfig);
      const service = new CognitoAuthService(mockConfig, validator);

      const result = await service.authenticateUser('not.a.jwt');
      assert.strictEqual(result, null);
    });

    it('should reject invalid tokens with ProductionJwtValidator', async () => {
      const validator = new ProductionJwtValidator(mockConfig);
      const service = new CognitoAuthService(mockConfig, validator);

      const result = await service.authenticateUser('invalid-token');
      assert.strictEqual(result, null);
    });
  });
});
