// backend/src/routes/log.routes.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function logRoutes(fastify: FastifyInstance) {
  console.log('✅ ARQUIVO log.routes.ts CARREGADO COM SUCESSO!');

  // GET /admin/logs/test - Rota de teste
  fastify.get('/test', async (request, reply) => {
    console.log('🎯 Rota /test foi chamada!');
    return {
      success: true,
      message: 'Rota de logs funcionando!',
      timestamp: new Date().toISOString(),
      url: request.url
    };
  });

  // GET /admin/logs - Listar logs com paginação
  fastify.get('/', async (request, reply) => {
    console.log('🎯 Rota / (raiz) foi chamada!');
    try {
      // 🔥 CONVERTER STRING PARA NUMBER
      const queryPage = request.query && typeof request.query === 'object' ? (request.query as any).page : 1;
      const queryLimit = request.query && typeof request.query === 'object' ? (request.query as any).limit : 20;
      const queryStartDate = request.query && typeof request.query === 'object' ? (request.query as any).startDate : undefined;
      const queryEndDate = request.query && typeof request.query === 'object' ? (request.query as any).endDate : undefined;
      const queryUserId = request.query && typeof request.query === 'object' ? (request.query as any).userId : undefined;
      const queryAction = request.query && typeof request.query === 'object' ? (request.query as any).action : undefined;
      const querySearch = request.query && typeof request.query === 'object' ? (request.query as any).search : undefined;

      // Converter para número
      const page = parseInt(String(queryPage)) || 1;
      const limit = parseInt(String(queryLimit)) || 20;
      const startDate = queryStartDate;
      const endDate = queryEndDate;
      const userId = queryUserId;
      const action = queryAction;
      const search = querySearch;

      console.log(`📊 Paginação: page=${page}, limit=${limit}`);

      const skip = (page - 1) * limit;

      // Construir filtros
      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      if (userId) where.userId = userId;
      if (action) where.action = action;

      if (search) {
        where.OR = [
          { description: { contains: search } },
          { entityType: { contains: search } }
        ];
      }

      // Buscar logs
      const [logs, total] = await Promise.all([
        prisma.actionLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit // ← AGORA É NUMBER, NÃO STRING
        }),
        prisma.actionLog.count({ where })
      ]);

      // Buscar ações únicas para filtro
      const uniqueActions = await prisma.actionLog.groupBy({
        by: ['action'],
        _count: { action: true }
      });

      // Estatísticas
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalCount, todayCount] = await Promise.all([
        prisma.actionLog.count(),
        prisma.actionLog.count({ where: { createdAt: { gte: today } } })
      ]);

      return reply.send({
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        filters: {
          actions: uniqueActions.map(a => a.action)
        },
        stats: {
          total: totalCount,
          today: todayCount
        }
      });

    } catch (error) {
      console.error('❌ Erro ao buscar logs:', error);
      request.log.error(error);
      return reply.status(500).send({
        error: 'Erro ao carregar logs',
        logs: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 1 },
        filters: { actions: [] },
        stats: { total: 0, today: 0 }
      });
    }
  });

  // GET /admin/logs/stats - Estatísticas
  fastify.get('/stats', async (request, reply) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [total, today_count] = await Promise.all([
        prisma.actionLog.count(),
        prisma.actionLog.count({ where: { createdAt: { gte: today } } })
      ]);

      return reply.send({
        total,
        today: today_count,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        total: 0,
        today: 0
      });
    }
  });

  // GET /admin/logs/unread-count - Logs da última hora
  fastify.get('/unread-count', async (request, reply) => {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const count = await prisma.actionLog.count({
        where: {
          createdAt: { gte: oneHourAgo }
        }
      });

      // Log para debug
      console.log(`📊 Logs não lidos (última hora): ${count}`);

      return reply.send({ count });

    } catch (error) {
      request.log.error(error);
      return reply.send({ count: 0 });
    }
  });

  // GET /admin/logs/recent - Logs recentes
  fastify.get('/recent', async (request, reply) => {
    try {
      const logs = await prisma.actionLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      return reply.send(logs);

    } catch (error) {
      request.log.error(error);
      return reply.send([]);
    }
  });

  // GET /admin/logs/:id - Detalhes do log
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const log = await prisma.actionLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });

      if (!log) {
        return reply.status(404).send({ error: 'Log não encontrado' });
      }

      return reply.send(log);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar log' });
    }
  });
}