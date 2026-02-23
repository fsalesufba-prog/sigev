// backend/src/middleware/auth.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface JWTPayload {
  id: string;
  email: string;
  role: string;
  isAdmin: boolean;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Verifica se o JWT está disponível
    if (!request.jwt) {
      request.log.error({ msg: 'JWT plugin não está disponível' });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro na configuração de autenticação'
      });
    }

    // Tenta pegar token do header Authorization
    const authHeader = request.headers.authorization;
    let token: string | undefined;
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Tenta pegar do cookie
      token = request.cookies?.token;
    }
    
    if (!token) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Token não fornecido'
      });
    }

    // Verifica token usando o JWT do Fastify
    let decoded: JWTPayload;
    try {
      decoded = request.jwt.verify<JWTPayload>(token);
    } catch (err) {
      // CORREÇÃO: Formato correto para log de erro
      request.log.error({ 
        msg: 'Erro ao verificar token', 
        error: err instanceof Error ? err.message : String(err)
      });
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Token inválido ou expirado'
      });
    }
    
    // Busca usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        professionalUnits: {
          where: { isActive: true },
          include: {
            unit: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Usuário não encontrado'
      });
    }

    // Verifica se usuário está bloqueado
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return reply.status(423).send({
        error: 'Locked',
        message: `Usuário bloqueado até ${user.lockedUntil.toLocaleString()}`
      });
    }

    // Verifica se usuário foi deletado (soft delete)
    if (user.deletedAt) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Usuário desativado'
      });
    }

    // Adiciona usuário à request
    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      role: user.role,
      isAdmin: user.isAdmin,
      units: user.professionalUnits.map(pu => ({
        id: pu.unit.id,
        name: pu.unit.name,
        position: pu.position,
        registration: pu.registration
      }))
    };

  } catch (error) {
    // CORREÇÃO: Formato correto para log de erro
    request.log.error({ 
      msg: 'Erro no middleware de autenticação', 
      error: error instanceof Error ? error.message : String(error)
    });
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Erro ao processar autenticação'
    });
  }
}

export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!request.jwt) return;

    const authHeader = request.headers.authorization;
    let token: string | undefined;
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = request.cookies?.token;
    }
    
    if (token) {
      try {
        const decoded = request.jwt.verify<JWTPayload>(token);
        
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          include: {
            professionalUnits: {
              where: { isActive: true },
              include: {
                unit: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    address: true
                  }
                }
              }
            }
          }
        });
        
        if (user && !user.deletedAt) {
          request.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            cpf: user.cpf,
            role: user.role,
            isAdmin: user.isAdmin,
            units: user.professionalUnits.map(pu => ({
              id: pu.unit.id,
              name: pu.unit.name,
              position: pu.position,
              registration: pu.registration
            }))
          };
        }
      } catch (err) {
        // Apenas ignora erro em auth opcional
        request.log.debug({ 
          msg: 'Erro ignorado em autenticação opcional',
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
  } catch (error) {
    // Apenas ignora erro em auth opcional
    request.log.debug({ 
      msg: 'Erro ignorado em autenticação opcional',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}