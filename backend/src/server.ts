import Fastify, { FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { createTodoApp, TodoAdd, TodoUpdate } from './app.js';
import { createInMemoryStore } from './store/inMemeoryStore.js';
import { createDynamoDbStore } from './store/dynamoDbStore.js';
import { CognitoAuthService } from './auth/cognitoAuth.js';
import { createJwtValidator } from './auth/jwtValidator.js';
import { createAuthMiddleware } from './middleware/auth.js';
import {
  createRateLimitConfig,
  validateRateLimitConfig,
  logRateLimitConfig,
} from './config/rateLimitConfig.js';

// Rate limiting configuration
const rateLimitConfig = createRateLimitConfig();

// Validate and log configuration
validateRateLimitConfig(rateLimitConfig);
logRateLimitConfig(rateLimitConfig);

// Configure store - use DynamoDB if configured, otherwise in-memory
const store = process.env.DYNAMODB_TABLE_NAME
  ? createDynamoDbStore({
      tableName: process.env.DYNAMODB_TABLE_NAME,
      region: process.env.AWS_REGION,
      endpoint: process.env.DYNAMODB_ENDPOINT,
    })
  : createInMemoryStore();

const todoApp = createTodoApp({ store });

// Configure authentication if Cognito is configured
const cognitoService =
  process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID
    ? (() => {
        const config = {
          userPoolId: process.env.COGNITO_USER_POOL_ID!,
          clientId: process.env.COGNITO_CLIENT_ID!,
          region: process.env.AWS_REGION || 'ap-southeast-2',
        };

        // Create appropriate JWT validator based on environment
        const jwtValidator = createJwtValidator(config, process.env.NODE_ENV);

        return new CognitoAuthService(config, jwtValidator);
      })()
    : null;

// Log authentication configuration
if (cognitoService) {
  console.log(`🔐 Authentication configured with: ${cognitoService.getValidatorType()}`);
  console.log(
    `🔑 Production-grade validation: ${cognitoService.isProductionValidator() ? 'ENABLED' : 'DISABLED'}`
  );
} else {
  console.log('⚠️  Authentication disabled - no Cognito configuration found');
}

const authMiddleware = cognitoService ? createAuthMiddleware(cognitoService) : null;

const fastify = Fastify({
  logger: { level: 'error' },
});

fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'DELETE'],
});

// Global rate limiting - conservative default
await fastify.register(rateLimit, {
  max: rateLimitConfig.global.max,
  timeWindow: rateLimitConfig.global.timeWindow,
  errorResponseBuilder: function (request, context) {
    return {
      code: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. You can make ${context.max} requests per minute. Try again in ${Math.round(context.ttl / 1000)} seconds.`,
      retryAfter: Math.round(context.ttl / 1000),
    };
  },
  addHeaders: rateLimitConfig.headers.enabled
    ? {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
      }
    : {},
});

// Stricter rate limiting for authentication-related endpoints
await fastify.register(async function (fastify) {
  await fastify.register(rateLimit, {
    max: rateLimitConfig.auth.max,
    timeWindow: rateLimitConfig.auth.timeWindow,
    keyGenerator: function (request) {
      return request.ip; // Rate limit by IP for auth operations
    },
    errorResponseBuilder: function (request, context) {
      return {
        code: 429,
        error: 'Authentication Rate Limit Exceeded',
        message: `Too many authentication attempts. Try again in ${Math.round(context.ttl / 1000)} seconds.`,
        retryAfter: Math.round(context.ttl / 1000),
      };
    },
  });

  // This will apply stricter limits to any auth-related endpoints
  // Currently no explicit auth endpoints, but ready for future implementation
});

// Helper function to get user ID from request
function getUserId(request: FastifyRequest): string | undefined {
  return authMiddleware ? request.user?.id : undefined;
}

// Optional authentication hook - only apply if auth is configured
if (authMiddleware) {
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip auth for health check or if no auth header provided
    if (request.url === '/health' || !request.headers.authorization) {
      return;
    }
    await authMiddleware(request, reply);
  });
}

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: 'ok',
      auth: 'ok',
      memory: 'ok',
    },
  };

  try {
    // Check database connectivity
    try {
      await store.list('health-check');
      healthCheck.checks.database = 'ok';
    } catch (error) {
      console.error('Database health check failed:', error);
      healthCheck.checks.database = 'error';
      healthCheck.status = 'degraded';
    }

    // Check authentication service
    if (cognitoService) {
      // Simple check - if cognito service is configured, consider it healthy
      healthCheck.checks.auth = 'ok';
    } else {
      healthCheck.checks.auth = 'disabled';
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 512) {
      // Alert if using more than 512MB
      healthCheck.checks.memory = 'warning';
      healthCheck.status = 'degraded';
    }

    reply.send(healthCheck);
  } catch (error) {
    console.error('Health check failed:', error);
    healthCheck.status = 'error';
    reply.status(503).send(healthCheck);
  }
});

// Detailed health endpoint for deeper diagnostics
fastify.get('/health/detailed', async (request, reply) => {
  const memoryUsage = process.memoryUsage();

  const detailedHealth = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
    },
    config: {
      port: process.env.PORT || '3000',
      nodeEnv: process.env.NODE_ENV || 'development',
      dynamodbConfigured: !!process.env.DYNAMODB_TABLE_NAME,
      cognitoConfigured: !!(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID),
      awsRegion: process.env.AWS_REGION || 'ap-southeast-2',
    },
  };

  reply.send(detailedHealth);
});

// GET / for list
fastify.get('/', async (request, reply) => {
  if (request.headers['x-detonator'] === 'armed') {
    throw new Error('Boom!');
  }
  const userId = getUserId(request);
  const todos = await todoApp.list(userId);
  reply.send(todos);
});

// POST / for create
fastify.post(
  '/',
  {
    schema: {
      body: {
        type: 'object',
        required: ['summary', 'done'],
        properties: {
          summary: { type: 'string' },
          done: { type: 'boolean' },
        },
      },
    },
  },
  async (request, reply) => {
    const userId = getUserId(request);
    const todo = await todoApp.add(request.body as TodoAdd, userId);
    reply.send(todo);
  }
);

// POST /id for update
fastify.post<{ Params: { id: string } }>(
  '/:id',
  {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          done: { type: 'boolean' },
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const userId = getUserId(request);
      const todo = await todoApp.update(request.params.id, request.body as TodoUpdate, userId);
      reply.send(todo);
    } catch (e) {
      if (e instanceof Error && e.name === 'ClientError') {
        reply.status(400);
      }
      throw e;
    }
  }
);

// DELETE /id
fastify.delete<{ Params: { id: string } }>(
  '/:id',
  {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  },
  async (request, _reply) => {
    const userId = getUserId(request);
    await todoApp.remove(request.params.id, userId);
  }
);

fastify.listen(
  {
    port: parseInt(process.env.PORT || '3000'),
    host: '0.0.0.0',
  },
  function (err) {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    console.log(`🚀 Server listening on http://0.0.0.0:${process.env.PORT || 3000}`);
  }
);

export { fastify };
