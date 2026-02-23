// backend/src/routes/unit.routes.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createLog, ActionType } from '../middleware/log.middleware';

const prisma = new PrismaClient();

export default async function unitRoutes(fastify: FastifyInstance) {
  // ==================== GET / ====================
  fastify.get('/', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '',
        typeId = '',
        status = ''
      } = request.query as {
        page?: number;
        limit?: number;
        search?: string;
        typeId?: string;
        status?: string;
      };

      const skip = (page - 1) * limit;

      // 🔥 REMOVIDO deletedAt - usando isActive para soft delete
      const where: any = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { address: { contains: search } }
        ];
      }

      if (typeId) {
        where.typeId = typeId;
      }

      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }

      // Buscar unidades com contagens
      const [units, total] = await Promise.all([
        prisma.unit.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            email: true,
            phone: true,
            address: true,
            isActive: true,
            createdAt: true,
            type: {
              select: {
                id: true,
                description: true
              }
            },
            _count: {
              select: {
                professionals: true,
                processes: true
              }
            }
          },
          orderBy: { name: 'asc' },
          skip,
          take: Number(limit)
        }),
        prisma.unit.count({ where })
      ]);

      // Formatar resposta
      const formattedUnits = units.map(unit => ({
        id: unit.id,
        name: unit.name,
        description: unit.description,
        email: unit.email,
        phone: unit.phone,
        address: unit.address,
        isActive: unit.isActive,
        createdAt: unit.createdAt,
        type: unit.type,
        professionalsCount: unit._count.professionals,
        processesCount: unit._count.processes
      }));

      // Log de visualização
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.VIEW,
        description: `Visualizou lista de unidades (página ${page})`,
        req: request
      });

      return reply.send({
        units: formattedUnits,
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
        error: 'Erro ao carregar unidades',
        units: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 1 }
      });
    }
  });

  // ==================== GET /types ====================
  fastify.get('/types', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const types = await prisma.unitType.findMany({
        where: { isActive: true },
        select: {
          id: true,
          description: true
        },
        orderBy: { description: 'asc' }
      });

      return reply.send(types);

    } catch (error) {
      request.log.error(error);
      return reply.send([]);
    }
  });

  // ==================== GET /stats/summary ====================
  fastify.get('/stats/summary', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const total = await prisma.unit.count();
      
      const active = await prisma.unit.count({
        where: { isActive: true }
      });

      const inactive = await prisma.unit.count({
        where: { isActive: false }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const createdToday = await prisma.unit.count({
        where: { 
          createdAt: { gte: today }
        }
      });

      // Unidades por tipo
      const byType = await prisma.unit.groupBy({
        by: ['typeId'],
        _count: true
      });

      const types = await prisma.unitType.findMany({
        where: {
          id: { in: byType.map(t => t.typeId) }
        }
      });

      const unitsByType = byType.map(item => ({
        typeId: item.typeId,
        typeName: types.find(t => t.id === item.typeId)?.description || 'Desconhecido',
        count: item._count
      }));

      // Total de profissionais alocados
      const totalProfessionals = await prisma.professionalUnit.count({
        where: {
          isActive: true
        }
      });

      // Total de processos
      const totalProcesses = await prisma.process.count();

      return reply.send({
        total,
        active,
        inactive,
        createdToday,
        byType: unitsByType,
        totalProfessionals,
        totalProcesses
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        total: 0,
        active: 0,
        inactive: 0,
        createdToday: 0,
        byType: [],
        totalProfessionals: 0,
        totalProcesses: 0
      });
    }
  });

  // ==================== GET /:id ====================
  fastify.get('/:id', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const unit = await prisma.unit.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          email: true,
          phone: true,
          address: true,
          isActive: true,
          createdAt: true,
          type: {
            select: {
              id: true,
              description: true
            }
          },
          professionals: {
            where: { isActive: true },
            include: {
              professional: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  specialty: true
                }
              }
            }
          },
          processes: {
            where: {},
            select: {
              id: true,
              description: true,
              status: true,
              priority: true,
              createdAt: true,
              citizen: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!unit) {
        return reply.status(404).send({ error: 'Unidade não encontrada' });
      }

      const formattedUnit = {
        id: unit.id,
        name: unit.name,
        description: unit.description,
        email: unit.email,
        phone: unit.phone,
        address: unit.address,
        isActive: unit.isActive,
        createdAt: unit.createdAt,
        type: unit.type,
        professionals: unit.professionals.map(p => ({
          id: p.professional.id,
          name: p.professional.name,
          email: p.professional.email,
          role: p.professional.role,
          specialty: p.professional.specialty,
          position: p.position,
          registration: p.registration,
          startDate: p.startDate
        })),
        recentProcesses: unit.processes.map(p => ({
          id: p.id,
          description: p.description,
          status: p.status,
          priority: p.priority,
          createdAt: p.createdAt,
          citizen: p.citizen
        }))
      };

      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.VIEW,
        description: `Visualizou unidade ${unit.name}`,
        entityType: 'Unit',
        entityId: unit.id,
        req: request
      });

      return reply.send(formattedUnit);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar unidade' });
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
          description: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          address: { type: 'string' },
          typeId: { type: 'string' }
        },
        required: ['name', 'email', 'phone', 'address', 'typeId']
      }
    }
  }, async (request, reply) => {
    try {
      const { name, description, email, phone, address, typeId } = request.body as any;

      // Verificar se já existe
      const existingUnit = await prisma.unit.findFirst({
        where: {
          name
        }
      });

      if (existingUnit) {
        return reply.status(400).send({ 
          error: 'Unidade já existe com este nome' 
        });
      }

      // Verificar se tipo existe
      const typeExists = await prisma.unitType.findUnique({
        where: { id: typeId }
      });

      if (!typeExists) {
        return reply.status(400).send({ 
          error: 'Tipo de unidade não encontrado' 
        });
      }

      // Criar unidade
      const newUnit = await prisma.unit.create({
        data: {
          name,
          description,
          email,
          phone,
          address,
          typeId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          description: true,
          email: true,
          phone: true,
          address: true,
          isActive: true,
          createdAt: true,
          type: {
            select: {
              id: true,
              description: true
            }
          }
        }
      });

      // Log de criação
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.CREATE,
        description: `Unidade ${name} criada`,
        entityType: 'Unit',
        entityId: newUnit.id,
        newValue: { name, email, typeId },
        req: request
      });

      return reply.status(201).send(newUnit);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar unidade' });
    }
  });

  // ==================== PUT /:id ====================
  fastify.put('/:id', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { name, description, email, phone, address, typeId, isActive } = request.body as any;

      // Buscar unidade atual
      const oldUnit = await prisma.unit.findUnique({
        where: { id }
      });

      if (!oldUnit) {
        return reply.status(404).send({ error: 'Unidade não encontrada' });
      }

      // Verificar se tipo existe
      if (typeId) {
        const typeExists = await prisma.unitType.findUnique({
          where: { id: typeId }
        });

        if (!typeExists) {
          return reply.status(400).send({ 
            error: 'Tipo de unidade não encontrado' 
          });
        }
      }

      // Verificar se nome já existe (se foi alterado)
      if (name && name !== oldUnit.name) {
        const nameExists = await prisma.unit.findFirst({
          where: { 
            name,
            NOT: { id }
          }
        });
        if (nameExists) {
          return reply.status(400).send({ error: 'Nome já está em uso' });
        }
      }

      // Atualizar unidade
      const updatedUnit = await prisma.unit.update({
        where: { id },
        data: {
          name,
          description,
          email,
          phone,
          address,
          typeId,
          isActive
        },
        select: {
          id: true,
          name: true,
          description: true,
          email: true,
          phone: true,
          address: true,
          isActive: true,
          type: {
            select: {
              id: true,
              description: true
            }
          }
        }
      });

      // Log de atualização
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.UPDATE,
        description: `Unidade ${name} atualizada`,
        entityType: 'Unit',
        entityId: id,
        oldValue: { 
          name: oldUnit.name, 
          email: oldUnit.email,
          typeId: oldUnit.typeId 
        },
        newValue: { name, email, typeId },
        req: request
      });

      return reply.send(updatedUnit);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar unidade' });
    }
  });

  // ==================== DELETE /:id ====================
  fastify.delete('/:id', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const unit = await prisma.unit.findUnique({
        where: { id }
      });

      if (!unit) {
        return reply.status(404).send({ error: 'Unidade não encontrada' });
      }

      // Verificar se existem profissionais vinculados
      const hasProfessionals = await prisma.professionalUnit.count({
        where: { 
          unitId: id,
          isActive: true
        }
      });

      if (hasProfessionals > 0) {
        return reply.status(400).send({ 
          error: 'Não é possível deletar unidade com profissionais vinculados' 
        });
      }

      // Verificar se existem processos vinculados
      const hasProcesses = await prisma.process.count({
        where: { 
          unitId: id
        }
      });

      if (hasProcesses > 0) {
        return reply.status(400).send({ 
          error: 'Não é possível deletar unidade com processos vinculados' 
        });
      }

      // 🔥 AO INVÉS DE DELETAR, APENAS DESATIVA
      await prisma.unit.update({
        where: { id },
        data: { isActive: false }
      });

      // Log de exclusão (desativação)
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.DELETE,
        description: `Unidade ${unit.name} desativada`,
        entityType: 'Unit',
        entityId: id,
        oldValue: { name: unit.name, email: unit.email, isActive: unit.isActive },
        newValue: { isActive: false },
        req: request
      });

      return reply.send({ 
        message: 'Unidade desativada com sucesso',
        id,
        name: unit.name
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao desativar unidade' });
    }
  });

  // ==================== PATCH /:id/toggle-status ====================
  fastify.patch('/:id/toggle-status', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { active } = request.body as { active: boolean };

      const unit = await prisma.unit.findUnique({
        where: { id }
      });

      if (!unit) {
        return reply.status(404).send({ error: 'Unidade não encontrada' });
      }

      const updated = await prisma.unit.update({
        where: { id },
        data: { isActive: active }
      });

      await createLog({
        userId: (request as any).user?.id,
        action: active ? 'ACTIVATE' : 'DEACTIVATE',
        description: active ? `Unidade ${unit.name} ativada` : `Unidade ${unit.name} desativada`,
        entityType: 'Unit',
        entityId: id,
        req: request
      });

      return reply.send({
        message: active ? 'Unidade ativada' : 'Unidade desativada',
        active: updated.isActive
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao alterar status' });
    }
  });

  // ==================== GET /:id/professionals ====================
  fastify.get('/:id/professionals', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const professionals = await prisma.professionalUnit.findMany({
        where: { 
          unitId: id,
          isActive: true
        },
        include: {
          professional: {
            select: {
              id: true,
              name: true,
              email: true,
              specialty: true,
              registration: true
            }
          }
        },
        orderBy: { startDate: 'desc' }
      });

      return reply.send(professionals.map(p => ({
        id: p.professional.id,
        name: p.professional.name,
        email: p.professional.email,
        specialty: p.professional.specialty,
        registration: p.professional.registration,
        position: p.position,
        unitRegistration: p.registration,
        startDate: p.startDate
      })));

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar profissionais' });
    }
  });
}