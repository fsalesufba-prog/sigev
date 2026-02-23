// backend/src/controllers/admin/backup.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createLog, ActionType } from '../middleware/log.middleware';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import moment from 'moment';
import { exec } from 'child_process';
import { promisify } from 'util';

const prisma = new PrismaClient();
const execAsync = promisify(exec);

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

export class BackupController {
  /**
   * POST /admin/backup
   * Iniciar backup (rota existente)
   */
  async createSimple(request: FastifyRequest, reply: FastifyReply) {
    try {
      const backupId = `backup_${Date.now()}`;
      
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.CREATE,
        description: `Iniciou backup: ${backupId}`,
        entityType: 'Backup',
        req: request
      });

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
  }

  /**
   * GET /admin/backups
   * Listar backups
   */
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;

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

      backups.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const start = (page - 1) * limit;
      const paginatedBackups = backups.slice(start, start + limit);
      let espacoUtilizado = 0;
      backups.forEach(b => espacoUtilizado += b.tamanho);

      return reply.send({
        backups: paginatedBackups,
        total: backups.length,
        page,
        limit,
        totalPages: Math.ceil(backups.length / limit) || 1,
        espacoUtilizado,
        espacoDisponivel: 10 * 1024 * 1024 * 1024 // 10GB
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
  }

  /**
   * POST /admin/backups/manual
   * Criar backup manual
   */
  async createManual(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { descricao } = request.body as any;

      const timestamp = moment().format('YYYYMMDD_HHmmss');
      const nome = `backup_manual_${timestamp}`;
      const backupDir = path.join(process.cwd(), 'backups');
      const filename = `${nome}.zip`;
      const filepath = path.join(backupDir, filename);

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Backup do banco de dados
      const dbUrl = new URL(process.env.DATABASE_URL || '');
      const dbName = dbUrl.pathname.substring(1);
      const dbBackupFile = path.join(backupDir, `${nome}_db.sql`);
      
      try {
        const cmd = `mysqldump -h ${dbUrl.hostname} -P ${dbUrl.port || 3306} -u ${dbUrl.username} -p${dbUrl.password} ${dbName} > ${dbBackupFile}`;
        await execAsync(cmd);
      } catch (dbError) {
        console.error('Erro no mysqldump:', dbError);
      }

      // Criar arquivo zip
      const output = fs.createWriteStream(filepath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.pipe(output);

      // Adicionar backup do banco
      if (fs.existsSync(dbBackupFile)) {
        archive.file(dbBackupFile, { name: 'database.sql' });
      }

      // Adicionar uploads
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (fs.existsSync(uploadDir)) {
        archive.directory(uploadDir, 'uploads');
      }

      // Adicionar info
      archive.append(JSON.stringify({
        timestamp,
        usuario: user.name,
        descricao: descricao || null,
        data: new Date().toISOString()
      }, null, 2), { name: 'info.json' });
      
      await archive.finalize();

      // Limpar arquivo temporário
      if (fs.existsSync(dbBackupFile)) {
        fs.unlinkSync(dbBackupFile);
      }

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
  }

  /**
   * DELETE /admin/backups/:id
   * Deletar backup
   */
  async delete(request: FastifyRequest, reply: FastifyReply) {
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
  }

  /**
   * GET /admin/backups/download/:id
   * Download do backup
   */
  async download(request: FastifyRequest, reply: FastifyReply) {
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
  }
}