import Fastify, { FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { createTodoApp, TodoAdd, TodoUpdate } from './app.js';
import { createInMemoryStore } from './store/inMemeoryStore.js';
import { createDynamoDbStore } from './store/dynamoDbStore.js';
import { CognitoAuthService } from './auth/cognitoAuth.js';
import { createJwtValidator } from './auth/jwtValidator.js';
import { createAuthMiddleware } from './middleware/auth.js';

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

// --- Startup Diagnostics ---
console.info('Starting backend server...');
console.info('Environment:', process.env.NODE_ENV);
console.info('Region:', process.env.AWS_REGION);
console.info('DynamoDB Table:', process.env.DYNAMODB_TABLE_NAME);
console.info('Cognito User Pool ID:', process.env.COGNITO_USER_POOL_ID);
console.info('Cognito Client ID:', process.env.COGNITO_CLIENT_ID);
console.info('Port:', process.env.PORT || '3000');

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
    // Check database connectivity - only if DynamoDB is configured
    if (process.env.DYNAMODB_TABLE_NAME) {
      try {
        await store.list('health-check');
        healthCheck.checks.database = 'ok';
        console.info('[HealthCheck] DynamoDB connectivity: OK');
      } catch (error) {
        console.error('[HealthCheck] Database health check failed:', error);
        healthCheck.checks.database = 'error';
        healthCheck.status = 'degraded';
      }
    } else {
      healthCheck.checks.database = 'not-configured';
      console.info('[HealthCheck] DynamoDB not configured');
    }

    // Check authentication service
    if (cognitoService) {
      healthCheck.checks.auth = 'ok';
      console.info('[HealthCheck] Cognito service: OK');
    } else {
      healthCheck.checks.auth = 'disabled';
      console.info('[HealthCheck] Cognito service: DISABLED');
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 512) {
      healthCheck.checks.memory = 'warning';
      healthCheck.status = 'degraded';
      console.warn('[HealthCheck] Memory usage high:', memoryUsageMB, 'MB');
    } else {
      console.info('[HealthCheck] Memory usage:', memoryUsageMB, 'MB');
    }

    reply.send(healthCheck);
  } catch (error) {
    console.error('[HealthCheck] Health check failed:', error);
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
      body: null,
    },
  },
  async (request, _reply) => {
    const userId = getUserId(request);
    await todoApp.remove(request.params.id, userId);
  }
);

// --- Startup Delay ---
const startupDelayMs = 5000; // 5 seconds
console.info(
  `Delaying server startup by ${startupDelayMs / 1000} seconds to allow resources to initialize...`
);

setTimeout(() => {
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
      console.info(`🚀 Server listening on http://0.0.0.0:${process.env.PORT || 3000}`);
    }
  );
}, startupDelayMs);

export { fastify };
