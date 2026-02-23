// backend/src/middleware/error.middleware.ts
import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log do erro
  request.log.error(error);

  // Erro de validação do Zod
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: 'Dados inválidos',
      details: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // Erros do Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return reply.status(409).send({
          error: 'Conflict',
          message: 'Registro duplicado',
          details: error.meta?.target
        });
      case 'P2025':
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Registro não encontrado'
        });
      default:
        return reply.status(400).send({
          error: 'Database Error',
          message: 'Erro no banco de dados'
        });
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: 'Dados inválidos para o banco de dados'
    });
  }

  // Erro de validação do Fastify
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation
    });
  }

  // Erro 404 - Rota não encontrada
  if (error.statusCode === 404) {
    return reply.status(404).send({
      error: 'Not Found',
      message: 'Rota não encontrada'
    });
  }

  // Erro 401 - Não autorizado
  if (error.statusCode === 401) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: error.message || 'Não autorizado'
    });
  }

  // Erro 403 - Proibido
  if (error.statusCode === 403) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: error.message || 'Acesso negado'
    });
  }

  // Erro 429 - Muitas requisições
  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: 'Too Many Requests',
      message: 'Muitas requisições. Tente novamente mais tarde.'
    });
  }

  // Erro padrão 500
  return reply.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Erro interno do servidor'
  });
}