import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { JwtValidator, User, CognitoConfig } from './jwtValidator.js';

export interface CognitoAuthConfig extends CognitoConfig {
  // Additional auth-specific config can go here
}

export { User, CognitoConfig } from './jwtValidator.js';

export class CognitoAuthService {
  private client: CognitoIdentityProviderClient;
  private jwtValidator: JwtValidator;

  constructor(
    private config: CognitoAuthConfig,
    jwtValidator: JwtValidator
  ) {
    this.client = new CognitoIdentityProviderClient({ region: config.region });
    this.jwtValidator = jwtValidator;
  }

  async authenticateUser(token: string): Promise<User | null> {
    try {
      return await this.jwtValidator.validateToken(token);
    } catch (error) {
      console.error('Token authentication failed:', error);
      return null;
    }
  }

  /**
   * Get the validator type being used
   */
  public getValidatorType(): string {
    return this.jwtValidator.getValidatorType();
  }

  /**
   * Check if this is using production-grade validation
   */
  public isProductionValidator(): boolean {
    return this.jwtValidator.getValidatorType() === 'ProductionJwtValidator';
  }
}
