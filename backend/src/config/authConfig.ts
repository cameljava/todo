import { CognitoAuthService } from '../auth/cognitoAuth.js';
import {
  createJwtValidator,
  ProductionJwtValidator,
  DevelopmentJwtValidator,
  JwtValidator,
  CognitoConfig,
} from '../auth/jwtValidator.js';

export interface AuthConfig {
  cognitoConfig: CognitoConfig;
  environment?: string;
}

/**
 * Factory function to create CognitoAuthService with appropriate JWT validator
 * This is the recommended way to configure authentication for different environments
 */
export function createAuthService(config: AuthConfig): CognitoAuthService {
  const jwtValidator = createJwtValidator(config.cognitoConfig, config.environment);
  return new CognitoAuthService(config.cognitoConfig, jwtValidator);
}

/**
 * Create production authentication service with full JWT signature verification
 */
export function createProductionAuthService(cognitoConfig: CognitoConfig): CognitoAuthService {
  const jwtValidator = new ProductionJwtValidator(cognitoConfig);
  return new CognitoAuthService(cognitoConfig, jwtValidator);
}

/**
 * Create development authentication service with basic JWT validation
 */
export function createDevelopmentAuthService(cognitoConfig: CognitoConfig): CognitoAuthService {
  const jwtValidator = new DevelopmentJwtValidator(cognitoConfig);
  return new CognitoAuthService(cognitoConfig, jwtValidator);
}

/**
 * Create authentication service with custom JWT validator
 */
export function createCustomAuthService(
  cognitoConfig: CognitoConfig,
  jwtValidator: JwtValidator
): CognitoAuthService {
  return new CognitoAuthService(cognitoConfig, jwtValidator);
}

/**
 * Configuration examples for different deployment scenarios
 */
export const authConfigExamples = {
  /**
   * Production configuration - Full security
   */
  production: (cognitoConfig: CognitoConfig) => createProductionAuthService(cognitoConfig),

  /**
   * Staging configuration - Production-like but with more logging
   */
  staging: (cognitoConfig: CognitoConfig) => createProductionAuthService(cognitoConfig),

  /**
   * Development configuration - Relaxed validation for easier testing
   */
  development: (cognitoConfig: CognitoConfig) => createDevelopmentAuthService(cognitoConfig),

  /**
   * Test configuration - Minimal validation for unit tests
   */
  test: (cognitoConfig: CognitoConfig) => createDevelopmentAuthService(cognitoConfig),

  /**
   * Environment-based configuration (recommended)
   */
  auto: (cognitoConfig: CognitoConfig, environment?: string) =>
    createAuthService({ cognitoConfig, environment }),
};
