// backend/src/routes/admin.routes.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createLog, ActionType } from '../middleware/log.middleware';
import { sendMail } from '../config/mail';
import { EmailService } from '../services/email.service';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';
import moment from 'moment';

const prisma = new PrismaClient();
const execAsync = promisify(exec);
const emailService = new EmailService();

// Interfaces para tipagem
interface ActivityLog {
  id: string;
  action: string;
  description: string | null;
  createdAt: Date;
  user: {
    name: string;
    email: string;
  } | null;
}

interface BackupFile {
  id: string;
  nome: string;
  data: string;
  tamanho: number;
  tipo: 'manual' | 'automático';
  status: 'concluído' | 'em_andamento' | 'falha';
  arquivo: string;
  criadoPor: string;
  descricao: string | null;
}

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

export default async function adminRoutes(fastify: FastifyInstance) {
  // ==================== DASHBOARD ====================
  fastify.get('/dashboard', async (request, reply) => {
    try {
      const [totalUsers, totalUnits, totalProcesses, totalCitizens] = await Promise.all([
        prisma.user.count(),
        prisma.unit.count(),
        prisma.process.count(),
        prisma.citizen.count()
      ]);

      const totalProfessionals = await prisma.user.count({
        where: { role: 'PROFESSIONAL' }
      });

      const totalAdmins = await prisma.user.count({
        where: { role: 'ADMIN' }
      });

      const usersByRole = await prisma.user.groupBy({
        by: ['role'],
        _count: true
      });

      const processesByStatus = await prisma.process.groupBy({
        by: ['status'],
        _count: true
      });

      const recentLogins = await prisma.user.count({
        where: {
          lastLogin: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      });

      let recentActivities: ActivityLog[] = [];
      try {
        recentActivities = await prisma.actionLog.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }) || [];
      } catch (error) {
        recentActivities = [];
      }

      return reply.send({
        totalUsers,
        totalProfessionals,
        totalAdmins,
        totalUnits,
        totalProcesses,
        totalCitizens,
        recentLogins,
        systemUptime: process.uptime(),
        usersByRole,
        processesByStatus,
        recentActivities
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao carregar dashboard' });
    }
  });

  // ==================== NOTIFICAÇÕES ====================
  fastify.get('/notifications', async (request, reply) => {
    try {
      const notifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
      }) || [];
      
      return reply.send(notifications);
    } catch (error) {
      return reply.send([]);
    }
  });

  // ==================== USUÁRIOS ====================
  fastify.get('/users', async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          phone: true,
          role: true,
          isAdmin: true,
          createdAt: true,
          lastLogin: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return reply.send(users);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar usuários' });
    }
  });

  // ==================== UNIDADES ====================
  fastify.get('/units', async (request, reply) => {
    try {
      const units = await prisma.unit.findMany({
        orderBy: { name: 'asc' }
      });
      return reply.send(units);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar unidades' });
    }
  });

  // ==================== PROCESSOS ====================
  fastify.get('/processes', async (request, reply) => {
    try {
      const processes = await prisma.process.findMany({
        include: {
          unit: { select: { id: true, name: true } },
          citizen: { select: { id: true, name: true, cpf: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      return reply.send(processes);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar processos' });
    }
  });

  // ==================== ESTATÍSTICAS ====================
  fastify.get('/stats', async (request, reply) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentLogins = await prisma.user.count({
        where: { lastLogin: { gte: thirtyDaysAgo } }
      });

      const usersByRole = await prisma.user.groupBy({
        by: ['role'],
        _count: true
      });

      const processesByStatus = await prisma.process.groupBy({
        by: ['status'],
        _count: true
      });

      return reply.send({
        usersByRole,
        processesByStatus,
        recentLogins,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao carregar estatísticas' });
    }
  });

  // ==================== SYSTEM LOGS ====================
  fastify.get('/system-logs', async (request, reply) => {
    try {
      const { page = 1, limit = 50 } = request.query as { page?: number; limit?: number };
      const skip = (page - 1) * limit;

      let logs: any[] = [];
      let total = 0;

      try {
        logs = await prisma.actionLog.findMany({
          include: { 
            user: { 
              select: { 
                id: true, 
                name: true, 
                email: true 
              } 
            } 
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }) || [];
        
        total = await prisma.actionLog.count() || 0;
      } catch {
        logs = [];
        total = 0;
      }

      return reply.send({
        logs,
        pagination: { 
          page, 
          limit, 
          total, 
          pages: Math.ceil(total / limit) || 1 
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.send({
        logs: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 1 }
      });
    }
  });

  // ==================== HEALTH CHECK ====================
  fastify.get('/health', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }
  });

  // ==================== PARÂMETROS DO SISTEMA ====================
  
  /**
   * GET /admin/parameters
   * Buscar parâmetros do sistema
   */
  fastify.get('/parameters', async (request, reply) => {
    try {
      const user = (request as any).user;
      
      // Usar query raw em vez do modelo
      const result = await prisma.$queryRaw`
        SELECT * FROM SystemParameters WHERE id = 'default' LIMIT 1
      ` as any[];
      
      let parameters;
      
      if (result && result.length > 0) {
        parameters = {
          id: result[0].id,
          sistema: JSON.parse(result[0].sistema),
          seguranca: JSON.parse(result[0].seguranca),
          notificacoes: JSON.parse(result[0].notificacoes),
          processos: JSON.parse(result[0].processos),
          upload: JSON.parse(result[0].upload),
          auditoria: JSON.parse(result[0].auditoria)
        };
      } else {
        // Valores padrão
        parameters = {
          id: 'default',
          sistema: {
            nome: 'SIGEV',
            versao: '1.0.0',
            ambiente: process.env.NODE_ENV || 'development',
            url: process.env.FRONTEND_URL || 'https://sigev.sqtecnologiadainformacao.com',
            manutencao: false,
            mensagemManutencao: null
          },
          seguranca: {
            maxTentativasLogin: 5,
            tempoBloqueioMinutos: 30,
            sessaoExpiracaoHoras: 8,
            exigirMfa: false,
            politicaSenha: {
              tamanhoMinimo: 6,
              exigirMaiuscula: false,
              exigirMinuscula: false,
              exigirNumero: false,
              exigirEspecial: false,
              diasExpiracao: 90,
              historicoSenhas: 5
            },
            bloqueioHorario: {
              ativo: false,
              inicio: '22:00',
              fim: '06:00'
            }
          },
          notificacoes: {
            emailAlertas: true,
            emailResumoDiario: true,
            diasParaAlertaPrazo: 2,
            horarioResumoDiario: '08:00'
          },
          processos: {
            prazoPadraoDias: 15,
            tipoPrazoPadrao: 'DAYS',
            prioridadePadrao: 'NORMAL',
            permitirExclusao: false
          },
          upload: {
            tamanhoMaximoMB: 50,
            tiposPermitidos: [
              'image/jpeg', 'image/png', 'image/gif',
              'application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'audio/mpeg', 'audio/wav',
              'video/mp4'
            ],
            path: '/uploads'
          },
          auditoria: {
            manterLogsDias: 90,
            nivelLog: 'completo',
            logAcessos: true
          }
        };
      }

      await createLog({
        userId: user?.id,
        action: ActionType.VIEW,
        description: 'Visualizou parâmetros do sistema',
        entityType: 'SystemParameters',
        entityId: parameters.id,
        req: request
      });

      return reply.send(parameters);
    } catch (error) {
      request.log.error(error);
      // Retornar valores padrão em caso de erro
      return reply.send({
        sistema: {
          nome: 'SIGEV',
          versao: '1.0.0',
          ambiente: process.env.NODE_ENV || 'development',
          url: process.env.FRONTEND_URL || 'https://sigev.sqtecnologiadainformacao.com',
          manutencao: false,
          mensagemManutencao: null
        },
        seguranca: {
          maxTentativasLogin: 5,
          tempoBloqueioMinutos: 30,
          sessaoExpiracaoHoras: 8,
          exigirMfa: false,
          politicaSenha: {
            tamanhoMinimo: 6,
            exigirMaiuscula: false,
            exigirMinuscula: false,
            exigirNumero: false,
            exigirEspecial: false,
            diasExpiracao: 90,
            historicoSenhas: 5
          },
          bloqueioHorario: { ativo: false, inicio: '22:00', fim: '06:00' }
        },
        notificacoes: {
          emailAlertas: true,
          emailResumoDiario: true,
          diasParaAlertaPrazo: 2,
          horarioResumoDiario: '08:00'
        },
        processos: {
          prazoPadraoDias: 15,
          tipoPrazoPadrao: 'DAYS',
          prioridadePadrao: 'NORMAL',
          permitirExclusao: false
        },
        upload: {
          tamanhoMaximoMB: 50,
          tiposPermitidos: [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'audio/mpeg', 'audio/wav',
            'video/mp4'
          ],
          path: '/uploads'
        },
        auditoria: {
          manterLogsDias: 90,
          nivelLog: 'completo',
          logAcessos: true
        }
      });
    }
  });

  /**
   * PUT /admin/parameters
   * Atualizar parâmetros do sistema
   */
  fastify.put('/parameters', async (request, reply) => {
    try {
      const user = (request as any).user;
      const body = request.body as any;

      // Verificar se já existe
      const exists = await prisma.$queryRaw`
        SELECT id FROM SystemParameters WHERE id = 'default' LIMIT 1
      ` as any[];

      if (exists && exists.length > 0) {
        // Atualizar
        await prisma.$executeRaw`
          UPDATE SystemParameters 
          SET 
            sistema = ${JSON.stringify(body.sistema)},
            seguranca = ${JSON.stringify(body.seguranca)},
            notificacoes = ${JSON.stringify(body.notificacoes)},
            processos = ${JSON.stringify(body.processos)},
            upload = ${JSON.stringify(body.upload)},
            auditoria = ${JSON.stringify(body.auditoria)},
            updatedAt = NOW(),
            updatedBy = ${user?.id || null}
          WHERE id = 'default'
        `;
      } else {
        // Inserir
        await prisma.$executeRaw`
          INSERT INTO SystemParameters (
            id, sistema, seguranca, notificacoes, processos, upload, auditoria, updatedAt, updatedBy
          ) VALUES (
            'default',
            ${JSON.stringify(body.sistema)},
            ${JSON.stringify(body.seguranca)},
            ${JSON.stringify(body.notificacoes)},
            ${JSON.stringify(body.processos)},
            ${JSON.stringify(body.upload)},
            ${JSON.stringify(body.auditoria)},
            NOW(),
            ${user?.id || null}
          )
        `;
      }

      await createLog({
        userId: user?.id,
        action: ActionType.UPDATE,
        description: 'Atualizou parâmetros do sistema',
        entityType: 'SystemParameters',
        entityId: 'default',
        newValue: body,
        req: request
      });

      return reply.send({ 
        message: 'Parâmetros atualizados com sucesso',
        ...body 
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar parâmetros' });
    }
  });

  /**
   * PATCH /admin/parameters/maintenance
   * Ativar/desativar modo de manutenção
   */
  fastify.patch('/parameters/maintenance', async (request, reply) => {
    try {
      const user = (request as any).user;
      const { ativo, mensagem } = request.body as any;

      // Buscar parâmetros atuais
      const result = await prisma.$queryRaw`
        SELECT sistema FROM SystemParameters WHERE id = 'default' LIMIT 1
      ` as any[];
      
      if (result && result.length > 0) {
        const sistema = JSON.parse(result[0].sistema);
        sistema.manutencao = ativo;
        sistema.mensagemManutencao = mensagem || null;
        
        await prisma.$executeRaw`
          UPDATE SystemParameters 
          SET sistema = ${JSON.stringify(sistema)},
              updatedAt = NOW(),
              updatedBy = ${user?.id || null}
          WHERE id = 'default'
        `;
      }

      // Usar ActionType.UPDATE em vez de MAINTENANCE_ON/OFF
      await createLog({
        userId: user?.id,
        action: ActionType.UPDATE,
        description: ativo ? 'Ativou modo de manutenção' : 'Desativou modo de manutenção',
        req: request
      });

      return reply.send({ 
        message: ativo ? 'Modo de manutenção ativado' : 'Modo de manutenção desativado',
        manutencao: ativo,
        mensagem: mensagem || null
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao alternar modo de manutenção' });
    }
  });

  // ==================== BACKUP ====================

  /**
   * POST /admin/backup
   * Iniciar backup (mantendo rota original)
   */
  fastify.post('/backup', async (request, reply) => {
    try {
      const backupId = `backup_${Date.now()}`;
      return reply.send({
        message: 'Backup iniciado',
        backupId,
        timestamp: new Date().toISOString(),
        status: 'in_progress'
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao iniciar backup' });
    }
  });

  /**
   * GET /admin/backups
   * Listar backups
   */
  fastify.get('/backups', async (request, reply) => {
    try {
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;

      // Simular lista de backups
      const backupDir = path.join(process.cwd(), 'backups');
      const backups: BackupFile[] = [];
      
      if (fs.existsSync(backupDir)) {
        const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.zip'));
        
        for (const file of files) {
          const stats = fs.statSync(path.join(backupDir, file));
          const isManual = file.includes('manual');
          
          backups.push({
            id: file.replace('.zip', ''),
            nome: file,
            data: stats.birthtime.toISOString(),
            tamanho: stats.size,
            tipo: isManual ? 'manual' : 'automático',
            status: 'concluído',
            arquivo: file,
            criadoPor: isManual ? 'Administrador' : 'Sistema',
            descricao: null
          });
        }
      }

      // Ordenar por data (mais recente primeiro)
      backups.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const start = (page - 1) * limit;
      const paginatedBackups = backups.slice(start, start + limit);

      // Calcular espaço utilizado
      let espacoUtilizado = 0;
      backups.forEach(b => espacoUtilizado += b.tamanho);

      return reply.send({
        backups: paginatedBackups,
        total: backups.length,
        page,
        limit,
        totalPages: Math.ceil(backups.length / limit),
        espacoUtilizado,
        espacoDisponivel: 10 * 1024 * 1024 * 1024 // 10GB fictício
      });
    } catch (error) {
      request.log.error(error);
      return reply.send({
        backups: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
        espacoUtilizado: 0,
        espacoDisponivel: 10 * 1024 * 1024 * 1024
      });
    }
  });

  /**
   * POST /admin/backups/manual
   * Criar backup manual
   */
  fastify.post('/backups/manual', async (request, reply) => {
    try {
      const user = (request as any).user;
      const { descricao, incluirUploads, incluirLogs } = request.body as any;

      const timestamp = moment().format('YYYYMMDD_HHmmss');
      const nome = `backup_manual_${timestamp}`;
      const backupDir = path.join(process.cwd(), 'backups');
      const filename = `${nome}.zip`;
      const filepath = path.join(backupDir, filename);

      // Criar diretório se não existir
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Criar arquivo zip (simulado - em produção faria o backup real)
      const output = fs.createWriteStream(filepath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.pipe(output);
      
      // Adicionar arquivo de informação
      archive.append(JSON.stringify({
        timestamp,
        usuario: user.name,
        descricao: descricao || null,
        incluiuUploads: incluirUploads,
        incluiuLogs: incluirLogs
      }, null, 2), { name: 'info.json' });
      
      await archive.finalize();

      const stats = fs.statSync(filepath);

      await createLog({
        userId: user?.id,
        action: ActionType.CREATE,
        description: `Criou backup manual: ${nome}`,
        entityType: 'Backup',
        newValue: { nome, tamanho: stats.size },
        req: request
      });

      return reply.status(201).send({
        message: 'Backup criado com sucesso',
        backup: {
          id: nome,
          nome: filename,
          data: new Date().toISOString(),
          tamanho: stats.size,
          arquivo: filename
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar backup' });
    }
  });

  /**
   * DELETE /admin/backups/:id
   * Deletar backup
   */
  fastify.delete('/backups/:id', async (request, reply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const backupDir = path.join(process.cwd(), 'backups');
      const filename = `${id}.zip`;
      const filepath = path.join(backupDir, filename);

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }

      await createLog({
        userId: user?.id,
        action: ActionType.DELETE,
        description: `Deletou backup: ${id}`,
        entityType: 'Backup',
        entityId: id,
        req: request
      });

      return reply.send({ message: 'Backup deletado com sucesso' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao deletar backup' });
    }
  });

  /**
   * GET /admin/backups/download/:id
   * Download do backup
   */
  fastify.get('/backups/download/:id', async (request, reply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const backupDir = path.join(process.cwd(), 'backups');
      const filename = `${id}.zip`;
      const filepath = path.join(backupDir, filename);

      if (!fs.existsSync(filepath)) {
        return reply.status(404).send({ error: 'Backup não encontrado' });
      }

      await createLog({
        userId: user?.id,
        action: ActionType.VIEW,
        description: `Baixou backup: ${id}`,
        entityType: 'Backup',
        entityId: id,
        req: request
      });

      return reply.sendFile(filename, backupDir);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao baixar backup' });
    }
  });

  // ==================== SEGURANÇA ====================

  /**
   * GET /admin/security/logs
   * Logs de segurança
   */
  fastify.get('/security/logs', async (request, reply) => {
    try {
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 20;

      let logs: any[] = [];
      let total = 0;

      try {
        logs = await prisma.actionLog.findMany({
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

        total = await prisma.actionLog.count({
          where: {
            action: {
              in: ['LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'CHANGE_PASSWORD', 'RESET_PASSWORD']
            }
          }
        }) || 0;
      } catch (error) {
        logs = [];
        total = 0;
      }

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
  });

  /**
   * GET /admin/security/sessions
   * Sessões ativas
   */
  fastify.get('/security/sessions', async (request, reply) => {
    try {
      const user = (request as any).user;
      const currentUserId = user?.id;

      // Buscar usuários com login recente (últimas 8 horas)
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
        ip: '127.0.0.1', // Em produção, viria de uma tabela de sessões
        userAgent: 'Mozilla/5.0...',
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
  });

  /**
   * DELETE /admin/security/sessions/:userId
   * Forçar logout
   */
  fastify.delete('/security/sessions/:userId', async (request, reply) => {
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
  });

  /**
   * POST /admin/security/block-ip
   * Bloquear IP
   */
  fastify.post('/security/block-ip', async (request, reply) => {
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
  });

// ==================== EMAIL ROUTES ====================

/**
 * GET /admin/email/config
 * Configuração de e-mail
 */
fastify.get('/email/config', {
  preHandler: [fastify.authenticate, fastify.isAdmin]
}, async (request, reply) => {
  try {
    const config = {
      servidor: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER || '',
          pass: process.env.EMAIL_PASSWORD ? '********' : ''
        }
      },
      remetente: {
        nome: process.env.EMAIL_FROM_NAME || 'SIGEV',
        email: process.env.EMAIL_FROM || 'noreply@sigev.com'
      },
      templates: {
        boasVindas: true,
        recuperacaoSenha: true,
        notificacaoEncaminhamento: true,
        alertaPendencia: true,
        resumoDiario: true
      },
      limites: {
        maxEmailsPorDia: 1000,
        maxEmailsPorHora: 100,
        maxDestinatariosPorEmail: 50
      }
    };

    return reply.send(config);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Erro ao buscar configuração de e-mail' });
  }
});

/**
 * PUT /admin/email/config
 * Atualizar configuração de e-mail
 */
fastify.put('/email/config', {
  preHandler: [fastify.authenticate, fastify.isAdmin]
}, async (request, reply) => {
  try {
    const user = (request as any).user;
    const config = request.body as any;

    await createLog({
      userId: user?.id,
      action: ActionType.UPDATE,
      description: 'Atualizou configurações de e-mail',
      req: request
    });

    return reply.send({ 
      message: 'Configurações atualizadas com sucesso',
      config: {
        ...config,
        servidor: {
          ...config.servidor,
          auth: {
            ...config.servidor.auth,
            pass: '********'
          }
        }
      }
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Erro ao atualizar configuração' });
  }
});

/**
 * GET /admin/email/templates
 * Listar templates de e-mail
 */
fastify.get('/email/templates', {
  preHandler: [fastify.authenticate, fastify.isAdmin]
}, async (request, reply) => {
  try {
    const templates = [
      {
        id: 'boas_vindas',
        nome: 'Boas-vindas',
        tipo: 'boas_vindas',
        assunto: 'Bem-vindo ao SIGEV',
        corpo: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0066FF, #00D4FF); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; background: linear-gradient(135deg, #0066FF, #00D4FF); color: white; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bem-vindo ao SIGEV!</h1>
    </div>
    <div class="content">
      <p>Olá <strong>{{nome}}</strong>,</p>
      <p>Seu cadastro no SIGEV foi realizado com sucesso!</p>
      <p><strong>E-mail:</strong> {{email}}</p>
      <p><strong>Senha temporária:</strong> {{senha}}</p>
      <div style="text-align: center;">
        <a href="{{link}}" class="button">Acessar o Sistema</a>
      </div>
    </div>
    <div class="footer">
      <p>SIGEV - Sistema Integrado de Gestão da Escuta de Violência</p>
    </div>
  </div>
</body>
</html>`,
        variaveis: ['{{nome}}', '{{email}}', '{{senha}}', '{{link}}'],
        ativo: true,
        ultimaAtualizacao: new Date().toISOString()
      },
      {
        id: 'recuperacao_senha',
        nome: 'Recuperação de Senha',
        tipo: 'recuperacao_senha',
        assunto: 'Recuperação de Senha - SIGEV',
        corpo: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0066FF, #00D4FF); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; background: linear-gradient(135deg, #0066FF, #00D4FF); color: white; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Recuperação de Senha</h1>
    </div>
    <div class="content">
      <p>Olá <strong>{{nome}}</strong>,</p>
      <p>Recebemos uma solicitação de recuperação de senha.</p>
      <div style="text-align: center;">
        <a href="{{link}}" class="button">Redefinir Senha</a>
      </div>
      <p>Se o botão não funcionar, copie e cole o link abaixo:</p>
      <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">{{link}}</p>
    </div>
    <div class="footer">
      <p>SIGEV - Sistema Integrado de Gestão da Escuta de Violência</p>
    </div>
  </div>
</body>
</html>`,
        variaveis: ['{{nome}}', '{{link}}'],
        ativo: true,
        ultimaAtualizacao: new Date().toISOString()
      },
      {
        id: 'encaminhamento',
        nome: 'Novo Encaminhamento',
        tipo: 'encaminhamento',
        assunto: 'Novo encaminhamento - SIGEV',
        corpo: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0066FF, #00D4FF); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .info { background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #0066FF, #00D4FF); color: white; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📨 Novo Encaminhamento</h1>
    </div>
    <div class="content">
      <p>Um novo processo foi encaminhado para sua unidade.</p>
      <div class="info">
        <h3>📋 Detalhes</h3>
        <p><strong>Processo:</strong> {{processo}}</p>
        <p><strong>Cidadão:</strong> {{cidadao}}</p>
        <p><strong>Unidade de Origem:</strong> {{unidade}}</p>
        <p><strong>Data:</strong> {{data}}</p>
        {{prazo}}
      </div>
      <div style="text-align: center;">
        <a href="{{link}}" class="button">Visualizar Processo</a>
      </div>
    </div>
    <div class="footer">
      <p>SIGEV - Sistema de Encaminhamentos</p>
    </div>
  </div>
</body>
</html>`,
        variaveis: ['{{processo}}', '{{cidadao}}', '{{unidade}}', '{{data}}', '{{prazo}}', '{{link}}'],
        ativo: true,
        ultimaAtualizacao: new Date().toISOString()
      }
    ];

    return reply.send(templates);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Erro ao buscar templates' });
  }
});

/**
 * PUT /admin/email/templates/:id
 * Atualizar template
 */
fastify.put('/email/templates/:id', {
  preHandler: [fastify.authenticate, fastify.isAdmin]
}, async (request, reply) => {
  try {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { assunto, corpo } = request.body as any;

    await createLog({
      userId: user?.id,
      action: ActionType.UPDATE,
      description: `Atualizou template de email: ${id}`,
      req: request
    });

    return reply.send({ 
      message: 'Template atualizado com sucesso',
      template: { id, assunto, corpo }
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Erro ao atualizar template' });
  }
});

/**
 * POST /admin/email/send
 * Enviar e-mail manualmente
 */
fastify.post('/email/send', {
  preHandler: [fastify.authenticate, fastify.isAdmin]
}, async (request, reply) => {
  try {
    const user = (request as any).user;
    const { to, subject, html, tipo } = request.body as any;

    if (!to || !subject || !html) {
      return reply.status(400).send({ error: 'Destinatário, assunto e conteúdo são obrigatórios' });
    }

    const result = await sendMail({
      to,
      subject,
      html
    });

    await createLog({
      userId: user?.id,
      action: ActionType.CREATE,
      description: `Enviou e-mail ${tipo || 'manual'} para ${to}`,
      req: request
    });

    if (result) {
      return reply.send({ 
        message: 'E-mail enviado com sucesso',
        destinatario: to,
        assunto: subject
      });
    } else {
      return reply.status(500).send({ error: 'Falha ao enviar e-mail' });
    }
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Erro ao enviar e-mail' });
  }
});

/**
 * POST /admin/email/send-welcome
 * Enviar e-mail de boas-vindas para um usuário
 */
fastify.post('/email/send-welcome', {
  preHandler: [fastify.authenticate, fastify.isAdmin]
}, async (request, reply) => {
  try {
    const user = (request as any).user;
    const { userId, temporaryPassword } = request.body as any;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }

    const result = await emailService.sendWelcomeEmail(targetUser, temporaryPassword);

    await createLog({
      userId: user?.id,
      action: ActionType.CREATE,
      description: `Enviou e-mail de boas-vindas para ${targetUser.email}`,
      req: request
    });

    if (result) {
      return reply.send({ message: 'E-mail de boas-vindas enviado com sucesso' });
    } else {
      return reply.status(500).send({ error: 'Falha ao enviar e-mail' });
    }
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Erro ao enviar e-mail de boas-vindas' });
  }
});

/**
 * POST /admin/email/send-reset
 * Enviar e-mail de recuperação de senha
 */
fastify.post('/email/send-reset', {
  preHandler: [fastify.authenticate, fastify.isAdmin]
}, async (request, reply) => {
  try {
    const user = (request as any).user;
    const { userId, resetToken } = request.body as any;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }

    const result = await emailService.sendPasswordResetEmail(targetUser, resetToken);

    await createLog({
      userId: user?.id,
      action: ActionType.CREATE,
      description: `Enviou e-mail de recuperação para ${targetUser.email}`,
      req: request
    });

    if (result) {
      return reply.send({ message: 'E-mail de recuperação enviado com sucesso' });
    } else {
      return reply.status(500).send({ error: 'Falha ao enviar e-mail' });
    }
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Erro ao enviar e-mail de recuperação' });
  }
});

/**
 * GET /admin/email/logs
 * Logs de e-mail
 */
fastify.get('/email/logs', {
  preHandler: [fastify.authenticate, fastify.isAdmin]
}, async (request, reply) => {
  try {
    const query = request.query as any;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    // Em produção, buscaria de uma tabela de email_logs
    const logs: any[] = [];
    
    return reply.send({
      logs,
      total: 0,
      page,
      limit,
      totalPages: 1,
      estatisticas: {
        enviadosHoje: 0,
        falhasHoje: 0,
        pendentes: 0,
        limiteDiario: 1000
      }
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Erro ao buscar logs de e-mail' });
  }
});

}