// backend/src/types/fastify.d.ts
import { JWT } from '@fastify/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      name: string;
      email: string;
      cpf: string;
      role: 'ADMIN' | 'MANAGER' | 'PROFESSIONAL';
      isAdmin: boolean;
      units: Array<{
        id: string;
        name: string;
        position: string;
        registration: string;
      }>;
    };
    jwt: JWT;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    isAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}