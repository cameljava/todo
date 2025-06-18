import jwt from 'jsonwebtoken';
import { createRequire } from 'module';

// Import jwks-rsa using CommonJS require for compatibility
const require = createRequire(import.meta.url);
const jwksClient = require('jwks-rsa');

export interface User {
  id: string;
  email: string;
  username: string;
}

export interface CognitoTokenPayload {
  sub: string;
  email: string;
  'cognito:username': string;
  aud: string;
  iss: string;
  token_use: string;
  exp: number;
  iat: number;
}

export interface JwtValidator {
  validateToken(token: string): Promise<User | null>;
  getValidatorType(): string;
}

export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
}

/**
 * Production JWT Validator - Full signature verification
 */
export class ProductionJwtValidator implements JwtValidator {
  private jwksClient: any;
  private issuer: string;

  constructor(private config: CognitoConfig) {
    this.issuer = `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`;

    // Initialize JWKS client for production signature verification
    this.jwksClient = jwksClient({
      jwksUri: `${this.issuer}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
      cacheMaxEntries: 5,
      timeout: 30000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      // Decode token header to get key ID
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.header.kid) {
        console.error('Invalid token: missing key ID');
        return null;
      }

      // Get signing key from JWKS
      const key = await this.getSigningKey(decoded.header.kid);

      // Verify token signature and claims (skip audience check here)
      const payload = jwt.verify(token, key, {
        issuer: this.issuer,
        algorithms: ['RS256'],
      }) as CognitoTokenPayload & { client_id?: string };

      // Validate token type
      if (payload.token_use !== 'access') {
        console.error('Invalid token: not an access token');
        return null;
      }

      // Accept either aud or client_id as audience
      if (payload.aud !== this.config.clientId && payload.client_id !== this.config.clientId) {
        console.error('Invalid token: audience/client_id does not match');
        return null;
      }

      // Extract user information
      return this.extractUserFromPayload(payload);
    } catch (error) {
      console.error('Production JWT validation failed:', error);
      return null;
    }
  }

  private async getSigningKey(kid: string): Promise<string> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      console.error('Failed to get signing key:', error);
      throw new Error('Unable to retrieve signing key');
    }
  }

  private extractUserFromPayload(payload: CognitoTokenPayload): User {
    return {
      id: payload.sub,
      email: payload.email || '',
      username: payload['cognito:username'] || payload.sub,
    };
  }

  getValidatorType(): string {
    return 'ProductionJwtValidator';
  }
}

/**
 * Development JWT Validator - Basic validation without signature verification
 */
export class DevelopmentJwtValidator implements JwtValidator {
  constructor(private config: CognitoConfig) {}

  async validateToken(token: string): Promise<User | null> {
    try {
      console.warn('🔓 Development mode: Skipping JWT signature verification');

      // Decode without verification for development
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.payload) {
        console.error('Invalid token: unable to decode');
        return null;
      }

      const payload = decoded.payload as CognitoTokenPayload & { client_id?: string };

      // Basic validation: accept either aud or client_id
      if (!payload.sub || (!payload.aud && !payload.client_id)) {
        console.error('Invalid token: missing required claims');
        return null;
      }

      // Check if token is expired (basic check)
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        console.error('Token expired');
        return null;
      }

      // Accept either aud or client_id as audience
      if (payload.aud !== this.config.clientId && payload.client_id !== this.config.clientId) {
        console.error('Invalid token: audience/client_id does not match');
        return null;
      }

      // Extract user information
      return this.extractUserFromPayload(payload);
    } catch (error) {
      console.error('Development JWT validation failed:', error);
      return null;
    }
  }

  private extractUserFromPayload(payload: CognitoTokenPayload): User {
    return {
      id: payload.sub,
      email: payload.email || '',
      username: payload['cognito:username'] || payload.sub,
    };
  }

  getValidatorType(): string {
    return 'DevelopmentJwtValidator';
  }
}

/**
 * Factory function to create appropriate JWT validator based on environment
 */
export function createJwtValidator(config: CognitoConfig, environment?: string): JwtValidator {
  const env = environment || process.env.NODE_ENV || 'development';

  if (env === 'production' || env === 'prod') {
    return new ProductionJwtValidator(config);
  } else {
    return new DevelopmentJwtValidator(config);
  }
}
