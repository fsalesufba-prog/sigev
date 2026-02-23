// backend/src/routes/professional.routes.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createLog, ActionType } from '../middleware/log.middleware';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export default async function professionalRoutes(fastify: FastifyInstance) {
  // ==================== GET / ====================
  fastify.get('/', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '',
        specialty = '',
        unitId = '',
        status = ''
      } = request.query as {
        page?: number;
        limit?: number;
        search?: string;
        specialty?: string;
        unitId?: string;
        status?: string;
      };

      const skip = (page - 1) * limit;

      // Construir filtros - usando os novos campos
      const where: any = { 
        role: 'PROFESSIONAL',
        deletedAt: null 
      };
      
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { cpf: { contains: search } },
          { registration: { contains: search } },
          { councilNumber: { contains: search } }
        ];
      }

      if (specialty) {
        where.specialty = { contains: specialty };
      }

      if (unitId) {
        where.professionalUnits = {
          some: {
            unitId: unitId,
            isActive: true
          }
        };
      }

      if (status === 'active') {
        where.isActive = true;
        where.lockedUntil = null;
      } else if (status === 'locked') {
        where.lockedUntil = { gt: new Date() };
      } else if (status === 'inactive') {
        where.isActive = false;
      }

      // Buscar profissionais com todos os campos novos
      const [professionals, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
            phone: true,
            role: true,
            isAdmin: true,
            registration: true,
            specialty: true,
            council: true,
            councilNumber: true,
            councilState: true,
            isActive: true,
            admissionDate: true,
            createdAt: true,
            lastLogin: true,
            loginAttempts: true,
            lockedUntil: true,
            professionalUnits: {
              where: {
                isActive: true
              },
              include: {
                unit: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { name: 'asc' },
          skip,
          take: Number(limit)
        }),
        prisma.user.count({ where })
      ]);

      // Formatar resposta
      const formattedProfessionals = professionals.map(prof => ({
        id: prof.id,
        name: prof.name,
        email: prof.email,
        cpf: prof.cpf,
        phone: prof.phone,
        registration: prof.registration,
        specialty: prof.specialty,
        council: prof.council,
        councilNumber: prof.councilNumber,
        councilState: prof.councilState,
        isActive: prof.isActive,
        admissionDate: prof.admissionDate,
        createdAt: prof.createdAt,
        lastLogin: prof.lastLogin,
        loginAttempts: prof.loginAttempts,
        lockedUntil: prof.lockedUntil,
        units: prof.professionalUnits.map(u => ({
          id: u.unit.id,
          name: u.unit.name,
          position: u.position,
          registration: u.registration
        }))
      }));

      // Log de visualização
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.VIEW,
        description: `Visualizou lista de profissionais (página ${page})`,
        req: request
      });

      return reply.send({
        professionals: formattedProfessionals,
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
        error: 'Erro ao carregar profissionais',
        professionals: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 1 }
      });
    }
  });

  // ==================== GET /specialties ====================
  fastify.get('/specialties', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const specialties = await prisma.user.findMany({
        where: { 
          role: 'PROFESSIONAL',
          specialty: { not: null },
          deletedAt: null 
        },
        select: {
          specialty: true
        },
        distinct: ['specialty']
      });

      return reply.send(specialties.map(s => s.specialty).filter(Boolean));

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
      const total = await prisma.user.count({ 
        where: { 
          role: 'PROFESSIONAL',
          deletedAt: null 
        } 
      });

      const active = await prisma.user.count({
        where: { 
          role: 'PROFESSIONAL',
          deletedAt: null,
          isActive: true,
          lockedUntil: null
        }
      });

      const locked = await prisma.user.count({
        where: { 
          role: 'PROFESSIONAL',
          deletedAt: null,
          lockedUntil: { gt: new Date() }
        }
      });

      const withUnits = await prisma.user.count({
        where: { 
          role: 'PROFESSIONAL',
          deletedAt: null,
          professionalUnits: {
            some: {
              isActive: true
            }
          }
        }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const createdToday = await prisma.user.count({
        where: { 
          role: 'PROFESSIONAL',
          createdAt: { gte: today },
          deletedAt: null
        }
      });

      // Estatísticas por especialidade
      const bySpecialty = await prisma.user.groupBy({
        by: ['specialty'],
        _count: true,
        where: {
          role: 'PROFESSIONAL',
          specialty: { not: null },
          deletedAt: null
        },
        orderBy: {
          _count: {
            specialty: 'desc'
          }
        },
        take: 10
      });

      return reply.send({
        total,
        active,
        locked,
        withUnits,
        createdToday,
        bySpecialty: bySpecialty.map(item => ({
          specialty: item.specialty || 'Não especificada',
          count: item._count
        }))
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        total: 0,
        active: 0,
        locked: 0,
        withUnits: 0,
        createdToday: 0,
        bySpecialty: []
      });
    }
  });

  // ==================== GET /units/list ====================
  fastify.get('/units/list', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const units = await prisma.unit.findMany({
        where: { deletedAt: null, isActive: true },
        select: {
          id: true,
          name: true
        },
        orderBy: { name: 'asc' }
      });

      return reply.send(units);

    } catch (error) {
      request.log.error(error);
      return reply.send([]);
    }
  });

  // ==================== GET /:id ====================
  fastify.get('/:id', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const professional = await prisma.user.findUnique({
        where: { 
          id, 
          role: 'PROFESSIONAL',
          deletedAt: null 
        },
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          phone: true,
          registration: true,
          specialty: true,
          council: true,
          councilNumber: true,
          councilState: true,
          isActive: true,
          admissionDate: true,
          createdAt: true,
          lastLogin: true,
          loginAttempts: true,
          lockedUntil: true,
          professionalUnits: {
            where: {
              isActive: true
            },
            include: {
              unit: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  city: true,
                  state: true,
                  phone: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!professional) {
        return reply.status(404).send({ error: 'Profissional não encontrado' });
      }

      const formatted = {
        id: professional.id,
        name: professional.name,
        email: professional.email,
        cpf: professional.cpf,
        phone: professional.phone,
        registration: professional.registration,
        specialty: professional.specialty,
        council: professional.council,
        councilNumber: professional.councilNumber,
        councilState: professional.councilState,
        isActive: professional.isActive,
        admissionDate: professional.admissionDate,
        createdAt: professional.createdAt,
        lastLogin: professional.lastLogin,
        loginAttempts: professional.loginAttempts,
        lockedUntil: professional.lockedUntil,
        units: professional.professionalUnits.map(u => ({
          id: u.unit.id,
          name: u.unit.name,
          address: u.unit.address,
          city: u.unit.city,
          state: u.unit.state,
          phone: u.unit.phone,
          email: u.unit.email,
          position: u.position,
          registration: u.registration,
          startDate: u.startDate,
          isActive: u.isActive
        }))
      };

      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.VIEW,
        description: `Visualizou profissional ${professional.name}`,
        entityType: 'Professional',
        entityId: professional.id,
        req: request
      });

      return reply.send(formatted);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar profissional' });
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
          email: { type: 'string', format: 'email' },
          cpf: { type: 'string' },
          phone: { type: 'string' },
          registration: { type: 'string' },
          specialty: { type: 'string' },
          council: { type: 'string' },
          councilNumber: { type: 'string' },
          councilState: { type: 'string', minLength: 2, maxLength: 2 },
          admissionDate: { type: 'string' },
          password: { type: 'string', minLength: 6 }
        },
        required: ['name', 'email', 'cpf', 'password']
      }
    }
  }, async (request, reply) => {
    try {
      const { 
        name, email, cpf, phone, registration, 
        specialty, council, councilNumber, councilState,
        admissionDate, password 
      } = request.body as any;

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { cpf }
          ]
        }
      });

      if (existingUser) {
        return reply.status(400).send({ 
          error: 'Profissional já existe com este email ou CPF' 
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newProfessional = await prisma.user.create({
        data: {
          name,
          email,
          cpf,
          phone,
          registration,
          specialty,
          council,
          councilNumber,
          councilState,
          admissionDate: admissionDate ? new Date(admissionDate) : null,
          password: hashedPassword,
          role: 'PROFESSIONAL',
          isActive: true,
          isAdmin: false
        },
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          phone: true,
          registration: true,
          specialty: true,
          council: true,
          councilNumber: true,
          councilState: true,
          isActive: true,
          admissionDate: true,
          createdAt: true
        }
      });

      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.CREATE,
        description: `Profissional ${name} criado`,
        entityType: 'Professional',
        entityId: newProfessional.id,
        newValue: { name, email, specialty, council: councilNumber },
        req: request
      });

      return reply.status(201).send(newProfessional);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar profissional' });
    }
  });

  // ==================== PUT /:id ====================
  fastify.put('/:id', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { 
        name, email, phone, registration, 
        specialty, council, councilNumber, councilState,
        isActive, admissionDate 
      } = request.body as any;

      const oldProfessional = await prisma.user.findUnique({
        where: { id, role: 'PROFESSIONAL', deletedAt: null }
      });

      if (!oldProfessional) {
        return reply.status(404).send({ error: 'Profissional não encontrado' });
      }

      if (email !== oldProfessional.email) {
        const emailExists = await prisma.user.findFirst({
          where: { 
            email,
            NOT: { id }
          }
        });
        if (emailExists) {
          return reply.status(400).send({ error: 'Email já está em uso' });
        }
      }

      const updatedProfessional = await prisma.user.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          registration,
          specialty,
          council,
          councilNumber,
          councilState,
          isActive,
          admissionDate: admissionDate ? new Date(admissionDate) : null
        },
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          phone: true,
          registration: true,
          specialty: true,
          council: true,
          councilNumber: true,
          councilState: true,
          isActive: true
        }
      });

      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.UPDATE,
        description: `Profissional ${name} atualizado`,
        entityType: 'Professional',
        entityId: id,
        oldValue: { 
          name: oldProfessional.name, 
          email: oldProfessional.email,
          specialty: oldProfessional.specialty 
        },
        newValue: { name, email, specialty },
        req: request
      });

      return reply.send(updatedProfessional);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar profissional' });
    }
  });

  // ==================== POST /:id/assign-unit ====================
  fastify.post('/:id/assign-unit', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { unitId, position, registration } = request.body as any;

      const professional = await prisma.user.findUnique({
        where: { id, role: 'PROFESSIONAL', deletedAt: null }
      });

      if (!professional) {
        return reply.status(404).send({ error: 'Profissional não encontrado' });
      }

      const unit = await prisma.unit.findUnique({
        where: { id: unitId, deletedAt: null, isActive: true }
      });

      if (!unit) {
        return reply.status(404).send({ error: 'Unidade não encontrada' });
      }

      const existing = await prisma.professionalUnit.findFirst({
        where: {
          professionalId: id,
          unitId: unitId,
          isActive: true
        }
      });

      if (existing) {
        return reply.status(400).send({ error: 'Profissional já vinculado a esta unidade' });
      }

      const assignment = await prisma.professionalUnit.create({
        data: {
          professionalId: id,
          unitId,
          position,
          registration,
          startDate: new Date(),
          isActive: true
        },
        include: {
          unit: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      await createLog({
        userId: (request as any).user?.id,
        action: 'ASSIGN',
        description: `Profissional ${professional.name} vinculado à unidade ${unit.name}`,
        entityType: 'Professional',
        entityId: id,
        req: request
      });

      return reply.send({
        message: 'Profissional vinculado com sucesso',
        assignment
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao vincular profissional' });
    }
  });

  // ==================== DELETE /:id/remove-unit/:unitId ====================
  fastify.delete('/:id/remove-unit/:unitId', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id, unitId } = request.params as { id: string; unitId: string };

      const assignment = await prisma.professionalUnit.findFirst({
        where: {
          professionalId: id,
          unitId: unitId,
          isActive: true
        }
      });

      if (!assignment) {
        return reply.status(404).send({ error: 'Vínculo não encontrado' });
      }

      // Soft delete - apenas marca como inativo
      await prisma.professionalUnit.update({
        where: { id: assignment.id },
        data: { 
          isActive: false,
          endDate: new Date()
        }
      });

      await createLog({
        userId: (request as any).user?.id,
        action: 'UNASSIGN',
        description: `Profissional desvinculado da unidade`,
        entityType: 'Professional',
        entityId: id,
        req: request
      });

      return reply.send({ message: 'Vínculo removido com sucesso' });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao remover vínculo' });
    }
  });

  // ==================== PATCH /:id/toggle-lock ====================
  fastify.patch('/:id/toggle-lock', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { lock } = request.body as { lock: boolean };

      const professional = await prisma.user.findUnique({
        where: { id, role: 'PROFESSIONAL', deletedAt: null }
      });

      if (!professional) {
        return reply.status(404).send({ error: 'Profissional não encontrado' });
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          lockedUntil: lock ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
          loginAttempts: lock ? 5 : 0
        }
      });

      await createLog({
        userId: (request as any).user?.id,
        action: lock ? 'LOCK' : 'UNLOCK',
        description: lock ? `Profissional ${professional.name} bloqueado` : `Profissional ${professional.name} desbloqueado`,
        entityType: 'Professional',
        entityId: id,
        req: request
      });

      return reply.send({
        message: lock ? 'Profissional bloqueado' : 'Profissional desbloqueado',
        locked: !!updated.lockedUntil
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao alterar status' });
    }
  });

  // ==================== PATCH /:id/toggle-active ====================
  fastify.patch('/:id/toggle-active', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { active } = request.body as { active: boolean };

      const professional = await prisma.user.findUnique({
        where: { id, role: 'PROFESSIONAL', deletedAt: null }
      });

      if (!professional) {
        return reply.status(404).send({ error: 'Profissional não encontrado' });
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: active }
      });

      await createLog({
        userId: (request as any).user?.id,
        action: active ? 'ACTIVATE' : 'DEACTIVATE',
        description: active ? `Profissional ${professional.name} ativado` : `Profissional ${professional.name} desativado`,
        entityType: 'Professional',
        entityId: id,
        req: request
      });

      return reply.send({
        message: active ? 'Profissional ativado' : 'Profissional desativado',
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

      const professional = await prisma.user.findUnique({
        where: { id, role: 'PROFESSIONAL', deletedAt: null }
      });

      if (!professional) {
        return reply.status(404).send({ error: 'Profissional não encontrado' });
      }

      await prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.DELETE,
        description: `Profissional ${professional.name} deletado`,
        entityType: 'Professional',
        entityId: id,
        oldValue: { name: professional.name, email: professional.email },
        req: request
      });

      return reply.send({ 
        message: 'Profissional deletado com sucesso',
        id,
        name: professional.name
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao deletar profissional' });
    }
  });
}