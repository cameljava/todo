export interface RateLimitConfig {
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

export interface RateLimitEnvironmentConfig {
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW?: string;
  RATE_LIMIT_AUTH_MAX?: string;
  RATE_LIMIT_AUTH_WINDOW?: string;
  RATE_LIMIT_HEADERS_ENABLED?: string;
}

/**
 * Creates rate limiting configuration from environment variables
 * with sensible defaults for different environments
 */
export function createRateLimitConfig(
  env: RateLimitEnvironmentConfig | Record<string, string | undefined> = process.env
): RateLimitConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Environment-based defaults
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

  const envDefaults = defaults[nodeEnv as keyof typeof defaults] || defaults.development;

  return {
    global: {
      max: parseInt(env.RATE_LIMIT_MAX || envDefaults.globalMax.toString()),
      timeWindow: env.RATE_LIMIT_WINDOW || '1 minute',
    },
    auth: {
      max: parseInt(env.RATE_LIMIT_AUTH_MAX || envDefaults.authMax.toString()),
      timeWindow: env.RATE_LIMIT_AUTH_WINDOW || '1 minute',
    },
    headers: {
      enabled: env.RATE_LIMIT_HEADERS_ENABLED !== 'false', // Default to true
    },
  };
}

/**
 * Validates rate limiting configuration
 */
export function validateRateLimitConfig(config: RateLimitConfig): void {
  if (config.global.max <= 0) {
    throw new Error('Global rate limit max must be greater than 0');
  }

  if (config.auth.max <= 0) {
    throw new Error('Auth rate limit max must be greater than 0');
  }

  if (config.auth.max > config.global.max) {
    console.warn('⚠️  Auth rate limit is higher than global rate limit. This may not be intended.');
  }

  // Validate time window format (basic check)
  const timeWindowRegex = /^\d+\s+(second|minute|hour)s?$/;
  if (!timeWindowRegex.test(config.global.timeWindow)) {
    throw new Error(`Invalid global time window format: ${config.global.timeWindow}`);
  }

  if (!timeWindowRegex.test(config.auth.timeWindow)) {
    throw new Error(`Invalid auth time window format: ${config.auth.timeWindow}`);
  }
}

/**
 * Logs rate limiting configuration for debugging
 */
export function logRateLimitConfig(config: RateLimitConfig): void {
  console.log('🚦 Rate limiting configuration:');
  console.log(`   Global: ${config.global.max} requests per ${config.global.timeWindow}`);
  console.log(`   Auth: ${config.auth.max} requests per ${config.auth.timeWindow}`);
  console.log(`   Headers enabled: ${config.headers.enabled}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
}
