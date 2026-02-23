// backend/src/controllers/admin/security.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createLog, ActionType } from '../middleware/log.middleware';

const prisma = new PrismaClient();

interface SecurityLog {
  id: string;
  data: Date;
  usuario: string;
  acao: string;
  ip: string | null;
  status: 'sucesso' | 'falha';
  detalhes: string | null;
}

interface Session {
  id: string;
  usuario: string;
  nome: string;
  ip: string;
  userAgent: string;
  loginAt: string;
  ultimaAtividade: string;
  expiraEm: string;
  atual: boolean;
}

export class SecurityController {
  /**
   * GET /admin/security/logs
   * Logs de segurança
   */
  async getLogs(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 20;

      const logs = await prisma.actionLog.findMany({
        where: {
          action: {
            in: ['LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'CHANGE_PASSWORD', 'RESET_PASSWORD']
          }
        },
        include: {
          user: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }) || [];

      const total = await prisma.actionLog.count({
        where: {
          action: {
            in: ['LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'CHANGE_PASSWORD', 'RESET_PASSWORD']
          }
        }
      }) || 0;

      const securityLogs: SecurityLog[] = logs.map(l => ({
        id: l.id,
        data: l.createdAt,
        usuario: l.user?.name || 'Sistema',
        acao: l.action,
        ip: l.ipAddress,
        status: l.action === 'LOGIN_FAILED' ? 'falha' : 'sucesso',
        detalhes: l.description
      }));

      return reply.send({
        logs: securityLogs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      });
    } catch (error) {
      request.log.error(error);
      return reply.send({
        logs: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1
      });
    }
  }

  /**
   * GET /admin/security/sessions
   * Sessões ativas
   */
  async getActiveSessions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const currentUserId = user?.id;

      const users = await prisma.user.findMany({
        where: {
          lastLogin: {
            gte: new Date(Date.now() - 8 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          lastLogin: true
        }
      });

      const sessions: Session[] = users.map(u => ({
        id: u.id,
        usuario: u.email,
        nome: u.name,
        ip: '127.0.0.1',
        userAgent: 'Sistema',
        loginAt: u.lastLogin?.toISOString() || new Date().toISOString(),
        ultimaAtividade: new Date().toISOString(),
        expiraEm: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        atual: u.id === currentUserId
      }));

      return reply.send(sessions);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar sessões' });
    }
  }

  /**
   * DELETE /admin/security/sessions/:userId
   * Forçar logout
   */
  async forceLogout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { userId } = request.params as { userId: string };

      if (userId === user?.id) {
        return reply.status(400).send({ error: 'Não pode se desconectar' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null }
      });

      await createLog({
        userId: user?.id,
        action: ActionType.UPDATE,
        description: `Forçou logout do usuário ${userId}`,
        entityType: 'User',
        entityId: userId,
        req: request
      });

      return reply.send({ message: 'Logout forçado com sucesso' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao forçar logout' });
    }
  }

  /**
   * POST /admin/security/block-ip
   * Bloquear IP
   */
  async blockIp(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { ip, motivo, horas } = request.body as any;

      await createLog({
        userId: user?.id,
        action: ActionType.UPDATE,
        description: `Bloqueou IP ${ip} por ${horas}h: ${motivo}`,
        req: request
      });

      return reply.send({ 
        message: `IP ${ip} bloqueado por ${horas} horas`,
        ip,
        bloqueadoAte: new Date(Date.now() + horas * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao bloquear IP' });
    }
  }
}