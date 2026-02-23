// backend/src/middleware/login-attempts.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function checkLoginAttempts(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Esta função é executada antes de rotas protegidas
  // Se o usuário estiver logado, verifica se não está bloqueado
  const user = (request as any).user;
  
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { lockedUntil: true, loginAttempts: true }
    });
    
    if (dbUser?.lockedUntil && dbUser.lockedUntil > new Date()) {
      return reply.status(423).send({
        error: 'Locked',
        message: `Usuário bloqueado até ${dbUser.lockedUntil.toLocaleString()}`
      });
    }
  }
}