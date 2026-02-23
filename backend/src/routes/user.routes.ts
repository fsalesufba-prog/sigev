// backend/src/routes/user.routes.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createLog, ActionType } from '../middleware/log.middleware';
import * as bcrypt from 'bcryptjs';
import { EmailService } from '../services/email.service';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();
const emailService = new EmailService();

export default async function userRoutes(fastify: FastifyInstance) {
  // ==================== GET / ====================
  // Listar usuários com paginação e filtros
  fastify.get('/', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        role = '' 
      } = request.query as {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
      };

      const skip = (Number(page) - 1) * Number(limit);

      // Construir filtros
      const where: any = { deletedAt: null };
      
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { cpf: { contains: search } }
        ];
      }
      
      if (role) {
        where.role = role;
      }

      // Buscar usuários
      const [users, total] = await Promise.all([
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
            createdAt: true,
            lastLogin: true,
            loginAttempts: true,
            lockedUntil: true,
            isActive: true,
            registration: true,
            specialty: true,
            council: true,
            councilNumber: true,
            councilState: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit)
        }),
        prisma.user.count({ where })
      ]);

      // Log de visualização de lista
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.VIEW,
        description: `Visualizou lista de usuários (página ${page})`,
        req: request
      });

      return reply.send({
        users,
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
        error: 'Erro ao buscar usuários',
        users: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 1 }
      });
    }
  });

  // ==================== GET /stats/summary ====================
  // Estatísticas resumidas para os cards
  fastify.get('/stats/summary', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const total = await prisma.user.count({ where: { deletedAt: null } });
      const admins = await prisma.user.count({ 
        where: { 
          role: 'ADMIN',
          deletedAt: null 
        } 
      });
      const managers = await prisma.user.count({ 
        where: { 
          role: 'MANAGER',
          deletedAt: null 
        } 
      });
      const professionals = await prisma.user.count({ 
        where: { 
          role: 'PROFESSIONAL',
          deletedAt: null 
        } 
      });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const createdToday = await prisma.user.count({
        where: { 
          createdAt: { gte: today },
          deletedAt: null 
        }
      });

      const locked = await prisma.user.count({
        where: { 
          lockedUntil: { gt: new Date() },
          deletedAt: null 
        }
      });

      const active = await prisma.user.count({
        where: { 
          isActive: true,
          deletedAt: null 
        }
      });

      return reply.send({
        total,
        admins,
        managers,
        professionals,
        createdToday,
        locked,
        active
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        error: 'Erro ao carregar estatísticas',
        total: 0,
        admins: 0,
        managers: 0,
        professionals: 0,
        createdToday: 0,
        locked: 0,
        active: 0
      });
    }
  });

  // ==================== GET /:id ====================
  // Buscar usuário por ID
  fastify.get('/:id', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const user = await prisma.user.findUnique({
        where: { id, deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          phone: true,
          role: true,
          isAdmin: true,
          createdAt: true,
          lastLogin: true,
          loginAttempts: true,
          lockedUntil: true,
          isActive: true,
          registration: true,
          specialty: true,
          council: true,
          councilNumber: true,
          councilState: true,
          admissionDate: true
        }
      });

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado' });
      }

      // Log de visualização
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.VIEW,
        description: `Visualizou usuário ${user.email}`,
        entityType: 'User',
        entityId: user.id,
        req: request
      });

      return reply.send(user);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar usuário' });
    }
  });

  // ==================== POST / ====================
  // Criar usuário (apenas admin) - COM ENVIO DE EMAIL
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
          role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'PROFESSIONAL'] },
          isAdmin: { type: 'boolean', default: false },
          registration: { type: 'string' },
          specialty: { type: 'string' },
          council: { type: 'string' },
          councilNumber: { type: 'string' },
          councilState: { type: 'string', minLength: 2, maxLength: 2 },
          admissionDate: { type: 'string' }
        },
        required: ['name', 'email', 'cpf', 'role']
      }
    }
  }, async (request, reply) => {
    try {
      const { 
        name, 
        email, 
        cpf, 
        phone, 
        role, 
        isAdmin,
        registration,
        specialty,
        council,
        councilNumber,
        councilState,
        admissionDate
      } = request.body as any;

      // Verificar se usuário já existe
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
          error: 'Usuário já existe com este email ou CPF' 
        });
      }

      // Gerar senha temporária aleatória (8 caracteres)
      const temporaryPassword = randomBytes(4).toString('hex'); // 8 caracteres hex
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      // Criar usuário
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          cpf,
          phone,
          password: hashedPassword,
          role,
          isAdmin: isAdmin || role === 'ADMIN',
          registration,
          specialty,
          council,
          councilNumber,
          councilState,
          admissionDate: admissionDate ? new Date(admissionDate) : null,
          isActive: true,
          loginAttempts: 0
        },
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          phone: true,
          role: true,
          isAdmin: true,
          createdAt: true,
          registration: true,
          specialty: true
        }
      });

      // Log de criação
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.CREATE,
        description: `Usuário ${email} criado`,
        entityType: 'User',
        entityId: newUser.id,
        newValue: { name, email, role, isAdmin },
        req: request
      });

      // ENVIAR EMAIL DE BOAS-VINDAS (não bloqueante - não esperar)
      emailService.sendWelcomeEmail(newUser, temporaryPassword).catch(error => {
        console.error('❌ Erro ao enviar email de boas-vindas:', error);
      });

      return reply.status(201).send({
        ...newUser,
        message: 'Usuário criado com sucesso. Um email com as credenciais foi enviado.'
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar usuário' });
    }
  });

  // ==================== PUT /:id ====================
  // Atualizar usuário
  fastify.put('/:id', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { 
        name, 
        email, 
        phone, 
        role, 
        isAdmin,
        registration,
        specialty,
        council,
        councilNumber,
        councilState,
        isActive,
        admissionDate 
      } = request.body as any;

      // Verificar permissão (apenas admin ou próprio usuário)
      if ((request as any).user?.id !== id && !(request as any).user?.isAdmin) {
        return reply.status(403).send({ error: 'Sem permissão para editar este usuário' });
      }

      // Buscar usuário atual para log
      const oldUser = await prisma.user.findUnique({
        where: { id, deletedAt: null }
      });

      if (!oldUser) {
        return reply.status(404).send({ error: 'Usuário não encontrado' });
      }

      // Verificar se email já existe (se foi alterado)
      if (email && email !== oldUser.email) {
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

      // Atualizar usuário
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          role,
          isAdmin: isAdmin !== undefined ? isAdmin : oldUser.isAdmin,
          registration,
          specialty,
          council,
          councilNumber,
          councilState,
          isActive,
          admissionDate: admissionDate ? new Date(admissionDate) : undefined
        },
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
          admissionDate: true
        }
      });

      // Log de atualização
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.UPDATE,
        description: `Usuário ${email} atualizado`,
        entityType: 'User',
        entityId: id,
        oldValue: {
          name: oldUser.name,
          email: oldUser.email,
          role: oldUser.role,
          isAdmin: oldUser.isAdmin
        },
        newValue: { name, email, role, isAdmin },
        req: request
      });

      return reply.send(updatedUser);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar usuário' });
    }
  });

  // ==================== PATCH /:id/reset-password ====================
  // Resetar senha do usuário (admin) - COM ENVIO DE EMAIL
  fastify.patch('/:id/reset-password', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const user = await prisma.user.findUnique({
        where: { id, deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado' });
      }

      // Gerar nova senha temporária
      const temporaryPassword = randomBytes(4).toString('hex');
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      await prisma.user.update({
        where: { id },
        data: {
          password: hashedPassword,
          loginAttempts: 0,
          lockedUntil: null
        }
      });

      // Enviar email com nova senha
      emailService.sendWelcomeEmail(user, temporaryPassword).catch(error => {
        console.error('❌ Erro ao enviar email de reset:', error);
      });

      await createLog({
        userId: (request as any).user?.id,
        action: 'RESET_PASSWORD',
        description: `Senha do usuário ${user.email} resetada`,
        entityType: 'User',
        entityId: id,
        req: request
      });

      return reply.send({
        message: 'Senha resetada com sucesso. Um email com a nova senha foi enviado.',
        email: user.email
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao resetar senha' });
    }
  });

  // ==================== DELETE /:id ====================
  // Soft delete
  fastify.delete('/:id', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Buscar usuário para log
      const user = await prisma.user.findUnique({
        where: { id, deletedAt: null },
        select: {
          name: true,
          email: true,
          role: true
        }
      });

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado' });
      }

      // Soft delete
      await prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date()
        }
      });

      // Log de exclusão
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.DELETE,
        description: `Usuário ${user.email} deletado`,
        entityType: 'User',
        entityId: id,
        oldValue: user,
        req: request
      });

      return reply.send({ 
        message: 'Usuário deletado com sucesso',
        id,
        email: user.email
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao deletar usuário' });
    }
  });

  // ==================== PATCH /:id/restore ====================
  // Restaurar usuário deletado
  fastify.patch('/:id/restore', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const user = await prisma.user.update({
        where: { id },
        data: {
          deletedAt: null
        },
        select: {
          id: true,
          email: true
        }
      });

      // Log de restauração
      await createLog({
        userId: (request as any).user?.id,
        action: 'RESTORE',
        description: `Usuário ${user.email} restaurado`,
        entityType: 'User',
        entityId: id,
        req: request
      });

      return reply.send({ 
        message: 'Usuário restaurado com sucesso',
        id: user.id,
        email: user.email
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao restaurar usuário' });
    }
  });

  // ==================== PATCH /:id/toggle-lock ====================
  // Bloquear/desbloquear usuário
  fastify.patch('/:id/toggle-lock', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { lock } = request.body as { lock: boolean };

      const user = await prisma.user.findUnique({
        where: { id, deletedAt: null }
      });

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado' });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          lockedUntil: lock ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
          loginAttempts: lock ? 5 : 0
        },
        select: {
          id: true,
          email: true,
          lockedUntil: true
        }
      });

      // Log de bloqueio/desbloqueio
      await createLog({
        userId: (request as any).user?.id,
        action: lock ? 'LOCK' : 'UNLOCK',
        description: lock ? `Usuário ${user.email} bloqueado` : `Usuário ${user.email} desbloqueado`,
        entityType: 'User',
        entityId: id,
        req: request
      });

      return reply.send({ 
        message: lock ? 'Usuário bloqueado' : 'Usuário desbloqueado',
        id: user.id,
        email: user.email,
        locked: !!updatedUser.lockedUntil
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao alterar status do usuário' });
    }
  });

  // ==================== POST /:id/assign-unit ====================
  // Vincular usuário a uma unidade
  fastify.post('/:id/assign-unit', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { unitId, position, registration } = request.body as any;

      const user = await prisma.user.findUnique({
        where: { id, deletedAt: null }
      });

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado' });
      }

      const unit = await prisma.unit.findUnique({
        where: { id: unitId, isActive: true }
      });

      if (!unit) {
        return reply.status(404).send({ error: 'Unidade não encontrada' });
      }

      // Verificar se já existe vínculo ativo
      const existing = await prisma.professionalUnit.findFirst({
        where: {
          professionalId: id,
          unitId,
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
        description: `Usuário ${user.name} vinculado à unidade ${unit.name}`,
        entityType: 'User',
        entityId: id,
        req: request
      });

      return reply.send({
        message: 'Usuário vinculado com sucesso',
        assignment
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao vincular usuário' });
    }
  });
}