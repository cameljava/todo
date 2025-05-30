import { FastifyRequest, FastifyReply } from 'fastify';
import { CognitoAuthService, User } from '../auth/cognitoAuth.js';

// Extend FastifyRequest to include user property
declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

export function createAuthMiddleware(cognitoService: CognitoAuthService) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);
    const user = await cognitoService.authenticateUser(token);

    if (!user) {
      reply.status(401).send({ error: 'Invalid token' });
      return;
    }

    // Add user to request context
    request.user = user;
  };
}
