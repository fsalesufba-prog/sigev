// backend/src/routes/unit-types.routes.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createLog, ActionType } from '../middleware/log.middleware';

const prisma = new PrismaClient();

export default async function unitTypesRoutes(fastify: FastifyInstance) {
  // ==================== GET / ====================
  fastify.get('/', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '',
        status = ''
      } = request.query as {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
      };

      const skip = (page - 1) * limit;

      // Construir filtros
      const where: any = {};
      
      if (search) {
        where.description = { contains: search };
      }

      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }

      // Buscar tipos de unidade com contagem de unidades
      const [unitTypes, total] = await Promise.all([
        prisma.unitType.findMany({
          where,
          select: {
            id: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                units: true
              }
            }
          },
          orderBy: { description: 'asc' },
          skip,
          take: Number(limit)
        }),
        prisma.unitType.count({ where })
      ]);

      // Formatar resposta
      const formattedUnitTypes = unitTypes.map(type => ({
        id: type.id,
        description: type.description,
        isActive: type.isActive,
        createdAt: type.createdAt,
        updatedAt: type.updatedAt,
        unitsCount: type._count.units
      }));

      // Log de visualização
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.VIEW,
        description: `Visualizou lista de tipos de unidade (página ${page})`,
        req: request
      });

      return reply.send({
        unitTypes: formattedUnitTypes,
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
        error: 'Erro ao carregar tipos de unidade',
        unitTypes: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 1 }
      });
    }
  });

  // ==================== GET /stats/summary ====================
  fastify.get('/stats/summary', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const total = await prisma.unitType.count();
      
      const active = await prisma.unitType.count({
        where: { isActive: true }
      });

      const inactive = await prisma.unitType.count({
        where: { isActive: false }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const createdToday = await prisma.unitType.count({
        where: { 
          createdAt: { gte: today }
        }
      });

      // Total de unidades por tipo
      const unitsByType = await prisma.unit.groupBy({
        by: ['typeId'],
        _count: true
      });

      const typesWithUnits = await prisma.unitType.findMany({
        where: {
          id: { in: unitsByType.map(u => u.typeId) }
        }
      });

      const unitsDistribution = unitsByType.map(item => ({
        typeId: item.typeId,
        typeName: typesWithUnits.find(t => t.id === item.typeId)?.description || 'Desconhecido',
        count: item._count
      }));

      return reply.send({
        total,
        active,
        inactive,
        createdToday,
        unitsDistribution
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        total: 0,
        active: 0,
        inactive: 0,
        createdToday: 0,
        unitsDistribution: []
      });
    }
  });

  // ==================== GET /:id ====================
  fastify.get('/:id', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const unitType = await prisma.unitType.findUnique({
        where: { id },
        select: {
          id: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          units: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true
            },
            take: 10
          }
        }
      });

      if (!unitType) {
        return reply.status(404).send({ error: 'Tipo de unidade não encontrado' });
      }

      const formatted = {
        id: unitType.id,
        description: unitType.description,
        isActive: unitType.isActive,
        createdAt: unitType.createdAt,
        updatedAt: unitType.updatedAt,
        units: unitType.units,
        unitsCount: unitType.units.length
      };

      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.VIEW,
        description: `Visualizou tipo de unidade ${unitType.description}`,
        entityType: 'UnitType',
        entityId: unitType.id,
        req: request
      });

      return reply.send(formatted);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar tipo de unidade' });
    }
  });

  // ==================== POST / ====================
  fastify.post('/', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin],
    schema: {
      body: {
        type: 'object',
        properties: {
          description: { type: 'string', minLength: 3 }
        },
        required: ['description']
      }
    }
  }, async (request, reply) => {
    try {
      const { description } = request.body as any;

      // Verificar se já existe
      const existingType = await prisma.unitType.findUnique({
        where: { description }
      });

      if (existingType) {
        return reply.status(400).send({ 
          error: 'Tipo de unidade já existe com esta descrição' 
        });
      }

      // Criar tipo de unidade
      const newUnitType = await prisma.unitType.create({
        data: {
          description,
          isActive: true
        },
        select: {
          id: true,
          description: true,
          isActive: true,
          createdAt: true
        }
      });

      // Log de criação
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.CREATE,
        description: `Tipo de unidade ${description} criado`,
        entityType: 'UnitType',
        entityId: newUnitType.id,
        newValue: { description },
        req: request
      });

      return reply.status(201).send(newUnitType);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar tipo de unidade' });
    }
  });

  // ==================== PUT /:id ====================
  fastify.put('/:id', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { description, isActive } = request.body as any;

      // Buscar tipo atual
      const oldUnitType = await prisma.unitType.findUnique({
        where: { id }
      });

      if (!oldUnitType) {
        return reply.status(404).send({ error: 'Tipo de unidade não encontrado' });
      }

      // Verificar se descrição já existe (se foi alterada)
      if (description && description !== oldUnitType.description) {
        const descriptionExists = await prisma.unitType.findUnique({
          where: { description }
        });
        if (descriptionExists) {
          return reply.status(400).send({ error: 'Descrição já está em uso' });
        }
      }

      // Atualizar tipo
      const updatedUnitType = await prisma.unitType.update({
        where: { id },
        data: {
          description,
          isActive
        },
        select: {
          id: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // Log de atualização
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.UPDATE,
        description: `Tipo de unidade ${description} atualizado`,
        entityType: 'UnitType',
        entityId: id,
        oldValue: { 
          description: oldUnitType.description, 
          isActive: oldUnitType.isActive 
        },
        newValue: { description, isActive },
        req: request
      });

      return reply.send(updatedUnitType);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar tipo de unidade' });
    }
  });

  // ==================== DELETE /:id ====================
  fastify.delete('/:id', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Buscar tipo
      const unitType = await prisma.unitType.findUnique({
        where: { id },
        include: {
          units: {
            select: { id: true }
          }
        }
      });

      if (!unitType) {
        return reply.status(404).send({ error: 'Tipo de unidade não encontrado' });
      }

      // Verificar se existem unidades vinculadas
      if (unitType.units.length > 0) {
        return reply.status(400).send({ 
          error: 'Não é possível deletar tipo de unidade com unidades vinculadas' 
        });
      }

      // Deletar tipo (ou desativar)
      await prisma.unitType.delete({
        where: { id }
      });

      // Log de exclusão
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.DELETE,
        description: `Tipo de unidade ${unitType.description} deletado`,
        entityType: 'UnitType',
        entityId: id,
        oldValue: { description: unitType.description },
        req: request
      });

      return reply.send({ 
        message: 'Tipo de unidade deletado com sucesso',
        id,
        description: unitType.description
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao deletar tipo de unidade' });
    }
  });

  // ==================== PATCH /:id/toggle-status ====================
  fastify.patch('/:id/toggle-status', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { active } = request.body as { active: boolean };

      const unitType = await prisma.unitType.findUnique({
        where: { id }
      });

      if (!unitType) {
        return reply.status(404).send({ error: 'Tipo de unidade não encontrado' });
      }

      const updated = await prisma.unitType.update({
        where: { id },
        data: { isActive: active }
      });

      await createLog({
        userId: (request as any).user?.id,
        action: active ? 'ACTIVATE' : 'DEACTIVATE',
        description: active ? `Tipo de unidade ${unitType.description} ativado` : `Tipo de unidade ${unitType.description} desativado`,
        entityType: 'UnitType',
        entityId: id,
        req: request
      });

      return reply.send({
        message: active ? 'Tipo ativado' : 'Tipo desativado',
        active: updated.isActive
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao alterar status' });
    }
  });
}