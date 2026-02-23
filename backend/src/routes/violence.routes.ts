// backend/src/routes/violence.routes.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createLog, ActionType } from '../middleware/log.middleware';

const prisma = new PrismaClient();

export default async function violenceRoutes(fastify: FastifyInstance) {
  // ==================== GET / ====================
  fastify.get('/', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '',
        isActive = ''
      } = request.query as {
        page?: number;
        limit?: number;
        search?: string;
        isActive?: string;
      };

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { description: { contains: search } },
          { detailedDescription: { contains: search } }
        ];
      }

      if (isActive === 'true') {
        where.isActive = true;
      } else if (isActive === 'false') {
        where.isActive = false;
      }

      const [violences, total] = await Promise.all([
        prisma.violence.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            detailedDescription: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                processes: true
              }
            }
          },
          orderBy: { name: 'asc' },
          skip,
          take: Number(limit)
        }),
        prisma.violence.count({ where })
      ]);

      const formattedViolences = violences.map(v => ({
        id: v.id,
        name: v.name,
        description: v.description,
        detailedDescription: v.detailedDescription,
        isActive: v.isActive,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        processesCount: v._count.processes
      }));

      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.VIEW,
        description: `Visualizou lista de violências (página ${page})`,
        req: request
      });

      return reply.send({
        violences: formattedViolences,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        error: 'Erro ao carregar violências',
        violences: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 1 }
      });
    }
  });

  // ==================== GET /list/all ====================
  fastify.get('/list/all', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const violences = await prisma.violence.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true
        },
        orderBy: { name: 'asc' }
      });

      return reply.send(violences);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar lista de violências' });
    }
  });

  // ==================== GET /stats ====================
  fastify.get('/stats', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const total = await prisma.violence.count();
      
      const active = await prisma.violence.count({
        where: { isActive: true }
      });

      const inactive = await prisma.violence.count({
        where: { isActive: false }
      });

      const mostUsed = await prisma.processViolence.groupBy({
        by: ['violenceId'],
        _count: true,
        orderBy: {
          _count: {
            violenceId: 'desc'
          }
        },
        take: 5
      });

      const violenceDetails = await prisma.violence.findMany({
        where: {
          id: { in: mostUsed.map(m => m.violenceId) }
        },
        select: {
          id: true,
          name: true
        }
      });

      const mostUsedViolences = mostUsed.map(item => ({
        violenceId: item.violenceId,
        violenceName: violenceDetails.find(v => v.id === item.violenceId)?.name || 'Desconhecida',
        count: item._count
      }));

      return reply.send({
        total,
        active,
        inactive,
        mostUsed: mostUsedViolences
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        total: 0,
        active: 0,
        inactive: 0,
        mostUsed: []
      });
    }
  });

  // ==================== GET /:id ====================
  fastify.get('/:id', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const violence = await prisma.violence.findUnique({
        where: { id },
        include: {
          processes: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              process: {
                select: {
                  id: true,
                  description: true,
                  status: true,
                  createdAt: true,
                  citizen: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!violence) {
        return reply.status(404).send({ error: 'Tipo de violência não encontrado' });
      }

      const formatted = {
        id: violence.id,
        name: violence.name,
        description: violence.description,
        detailedDescription: violence.detailedDescription,
        isActive: violence.isActive,
        createdAt: violence.createdAt,
        updatedAt: violence.updatedAt,
        processesCount: violence.processes.length,
        recentProcesses: violence.processes.map(p => ({
          id: p.process.id,
          description: p.process.description,
          status: p.process.status,
          createdAt: p.process.createdAt,
          citizen: p.process.citizen
        }))
      };

      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.VIEW,
        description: `Visualizou tipo de violência ${violence.name}`,
        entityType: 'Violence',
        entityId: violence.id,
        req: request
      });

      return reply.send(formatted);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar tipo de violência' });
    }
  });

  // ==================== POST / ====================
  fastify.post('/', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin],
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 3 },
          description: { type: 'string', minLength: 5 },
          detailedDescription: { type: 'string' }
        },
        required: ['name', 'description']
      }
    }
  }, async (request, reply) => {
    try {
      const { name, description, detailedDescription } = request.body as any;

      // Verificar se já existe (alerta para evitar duplicado - item 1.8)
      const existing = await prisma.violence.findUnique({
        where: { name }
      });

      if (existing) {
        return reply.status(400).send({ 
          error: 'Já existe um tipo de violência com esta descrição',
          code: 'DUPLICATE_ENTRY'
        });
      }

      const violence = await prisma.violence.create({
        data: {
          name,
          description,
          detailedDescription,
          isActive: true
        }
      });

      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.CREATE,
        description: `Tipo de violência ${name} criado`,
        entityType: 'Violence',
        entityId: violence.id,
        newValue: { name, description },
        req: request
      });

      return reply.status(201).send(violence);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar tipo de violência' });
    }
  });

  // ==================== PUT /:id ====================
  fastify.put('/:id', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { name, description, detailedDescription, isActive } = request.body as any;

      const oldViolence = await prisma.violence.findUnique({
        where: { id }
      });

      if (!oldViolence) {
        return reply.status(404).send({ error: 'Tipo de violência não encontrado' });
      }

      // Verificar se nome já existe (se foi alterado)
      if (name && name !== oldViolence.name) {
        const nameExists = await prisma.violence.findUnique({
          where: { name }
        });
        if (nameExists) {
          return reply.status(400).send({ 
            error: 'Já existe um tipo de violência com este nome',
            code: 'DUPLICATE_ENTRY'
          });
        }
      }

      const violence = await prisma.violence.update({
        where: { id },
        data: {
          name,
          description,
          detailedDescription,
          isActive
        }
      });

      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.UPDATE,
        description: `Tipo de violência ${name} atualizado`,
        entityType: 'Violence',
        entityId: id,
        oldValue: { 
          name: oldViolence.name, 
          description: oldViolence.description 
        },
        newValue: { name, description },
        req: request
      });

      return reply.send(violence);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar tipo de violência' });
    }
  });

  // ==================== PATCH /:id/toggle-status ====================
  fastify.patch('/:id/toggle-status', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { active } = request.body as { active: boolean };

      const violence = await prisma.violence.findUnique({
        where: { id }
      });

      if (!violence) {
        return reply.status(404).send({ error: 'Tipo de violência não encontrado' });
      }

      // Verificar se pode inativar (não pode ter processos vinculados)
      if (!active) {
        const processesCount = await prisma.processViolence.count({
          where: { violenceId: id }
        });

        if (processesCount > 0) {
          return reply.status(400).send({ 
            error: 'Não é possível inativar este tipo de violência pois existem processos vinculados a ele' 
          });
        }
      }

      const updated = await prisma.violence.update({
        where: { id },
        data: { isActive: active }
      });

      await createLog({
        userId: (request as any).user?.id,
        action: active ? 'ACTIVATE' : 'DEACTIVATE',
        description: active ? `Tipo de violência ${violence.name} ativado` : `Tipo de violência ${violence.name} desativado`,
        entityType: 'Violence',
        entityId: id,
        req: request
      });

      return reply.send({
        message: active ? 'Tipo de violência ativado' : 'Tipo de violência desativado',
        active: updated.isActive
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao alterar status' });
    }
  });

  // ==================== DELETE /:id ====================
  fastify.delete('/:id', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const violence = await prisma.violence.findUnique({
        where: { id }
      });

      if (!violence) {
        return reply.status(404).send({ error: 'Tipo de violência não encontrado' });
      }

      // Verificar se existem processos vinculados
      const processesCount = await prisma.processViolence.count({
        where: { violenceId: id }
      });

      if (processesCount > 0) {
        return reply.status(400).send({ 
          error: 'Não é possível deletar este tipo de violência pois existem processos vinculados a ele' 
        });
      }

      await prisma.violence.delete({
        where: { id }
      });

      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.DELETE,
        description: `Tipo de violência ${violence.name} deletado`,
        entityType: 'Violence',
        entityId: id,
        oldValue: { name: violence.name, description: violence.description },
        req: request
      });

      return reply.send({ 
        message: 'Tipo de violência deletado com sucesso',
        id,
        name: violence.name
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao deletar tipo de violência' });
    }
  });
}