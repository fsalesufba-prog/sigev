// backend/src/controllers/document.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class DocumentController {
  /**
   * GET /documents
   * Listar todos os documentos com filtros e paginação
   */
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 12;
      const search = query.search || '';
      const skip = (page - 1) * limit;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { description: { contains: search } }
        ];
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          include: {
            creator: { select: { id: true, name: true } },
            attachments: {
              orderBy: { createdAt: 'desc' }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.document.count({ where })
      ]);

      return reply.send({
        data: documents.map(doc => ({
          id: doc.id,
          name: doc.name,
          description: doc.description,
          createdBy: { id: doc.creator.id, name: doc.creator.name },
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
          attachments: doc.attachments.map(att => ({
            id: att.id,
            originalName: att.originalName,
            size: att.size,
            mimeType: att.mimeType,
            createdAt: att.createdAt.toISOString()
          }))
        })),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Erro ao listar documentos:', error);
      return reply.status(500).send({ 
        error: 'Erro ao listar documentos',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * GET /documents/:id
   * Buscar documento por ID
   */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as any;
      const { id } = params;

      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          creator: { select: { id: true, name: true } },
          attachments: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!document) {
        return reply.status(404).send({ 
          error: 'Documento não encontrado' 
        });
      }

      return reply.send({
        id: document.id,
        name: document.name,
        description: document.description,
        createdBy: { id: document.creator.id, name: document.creator.name },
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
        attachments: document.attachments.map(att => ({
          id: att.id,
          originalName: att.originalName,
          size: att.size,
          mimeType: att.mimeType,
          createdAt: att.createdAt.toISOString()
        }))
      });
    } catch (error) {
      console.error('Erro ao buscar documento:', error);
      return reply.status(500).send({ 
        error: 'Erro ao buscar documento',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * GET /documents/download/:attachmentId
   * Download de anexo
   */
  async downloadAttachment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as any;
      const { attachmentId } = params;

      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        include: { document: true }
      });

      if (!attachment) {
        return reply.status(404).send({ 
          error: 'Anexo não encontrado' 
        });
      }

      const filePath = path.join(process.cwd(), attachment.path);
      
      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ 
          error: 'Arquivo não encontrado no servidor' 
        });
      }

      const file = fs.createReadStream(filePath);
      
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`);
      reply.header('Content-Type', attachment.mimeType);
      reply.header('Content-Length', attachment.size);
      
      return reply.send(file);
    } catch (error) {
      console.error('Erro ao baixar anexo:', error);
      return reply.status(500).send({ 
        error: 'Erro ao baixar arquivo',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * POST /documents
   * Criar novo documento com anexos (somente admin)
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      
      // Verificar permissão
      if (!user.isAdmin && user.role !== 'ADMIN') {
        return reply.status(403).send({ 
          error: 'Apenas administradores podem criar documentos' 
        });
      }

      // Multer já processou os arquivos
      const body = request.body as any;
      const files = (request as any).files || [];

      console.log('📝 Criando documento:', {
        name: body.name,
        description: body.description,
        filesCount: files.length
      });

      // Validar nome
      if (!body.name) {
        return reply.status(400).send({ 
          error: 'Nome do documento é obrigatório' 
        });
      }

      // Criar documento no banco
      const document = await prisma.document.create({
        data: {
          name: body.name,
          description: body.description || null,
          createdBy: user.id
        }
      });

      console.log('✅ Documento criado:', document.id);

      // Processar anexos
      const attachments = [];
      for (const file of files) {
        // Gerar nome único para o arquivo
        const fileExt = path.extname(file.originalname);
        const fileName = `${crypto.randomBytes(16).toString('hex')}${fileExt}`;
        const filePath = path.join('uploads', 'documents', fileName);
        const fullPath = path.join(process.cwd(), filePath);

        // Mover arquivo do local temporário do multer
        fs.renameSync(file.path, fullPath);

        // Obter tamanho do arquivo
        const stats = fs.statSync(fullPath);

        // Salvar no banco
        const attachment = await prisma.attachment.create({
          data: {
            filename: fileName,
            originalName: file.originalname,
            path: filePath,
            mimeType: file.mimetype,
            size: stats.size,
            userId: user.id,
            documentId: document.id
          }
        });

        attachments.push(attachment);
        console.log('✅ Anexo salvo:', attachment.originalName);
      }

      return reply.status(201).send({
        id: document.id,
        name: document.name,
        description: document.description,
        attachments: attachments.map(a => ({
          id: a.id,
          originalName: a.originalName,
          size: a.size,
          mimeType: a.mimeType
        }))
      });
    } catch (error) {
      console.error('❌ Erro ao criar documento:', error);
      return reply.status(500).send({ 
        error: 'Erro ao criar documento',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * PUT /documents/:id
   * Atualizar metadados do documento (somente admin)
   */
  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as any;
      const { id } = params;
      const user = (request as any).user;
      const body = request.body as any;

      // Verificar permissão
      if (!user.isAdmin && user.role !== 'ADMIN') {
        return reply.status(403).send({ 
          error: 'Apenas administradores podem editar documentos' 
        });
      }

      // Buscar documento
      const document = await prisma.document.findUnique({
        where: { id }
      });

      if (!document) {
        return reply.status(404).send({ 
          error: 'Documento não encontrado' 
        });
      }

      // Preparar dados para update
      const data: any = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.description !== undefined) data.description = body.description || null;

      // Atualizar
      const updated = await prisma.document.update({
        where: { id },
        data
      });

      return reply.send({
        id: updated.id,
        name: updated.name,
        description: updated.description
      });
    } catch (error) {
      console.error('Erro ao atualizar documento:', error);
      return reply.status(500).send({ 
        error: 'Erro ao atualizar documento',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * POST /documents/:id/attachments
   * Adicionar anexos a documento existente (somente admin)
   */
  async addAttachments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as any;
      const { id } = params;
      const user = (request as any).user;
      const files = (request as any).files || [];

      // Verificar permissão
      if (!user.isAdmin && user.role !== 'ADMIN') {
        return reply.status(403).send({ 
          error: 'Apenas administradores podem adicionar anexos' 
        });
      }

      // Buscar documento
      const document = await prisma.document.findUnique({
        where: { id }
      });

      if (!document) {
        return reply.status(404).send({ 
          error: 'Documento não encontrado' 
        });
      }

      if (files.length === 0) {
        return reply.status(400).send({ 
          error: 'Nenhum arquivo enviado' 
        });
      }

      console.log('📝 Adicionando anexos ao documento:', document.name, files.length);

      // Processar anexos
      const attachments = [];
      for (const file of files) {
        const fileExt = path.extname(file.originalname);
        const fileName = `${crypto.randomBytes(16).toString('hex')}${fileExt}`;
        const filePath = path.join('uploads', 'documents', fileName);
        const fullPath = path.join(process.cwd(), filePath);

        // Mover arquivo
        fs.renameSync(file.path, fullPath);
        const stats = fs.statSync(fullPath);

        const attachment = await prisma.attachment.create({
          data: {
            filename: fileName,
            originalName: file.originalname,
            path: filePath,
            mimeType: file.mimetype,
            size: stats.size,
            userId: user.id,
            documentId: document.id
          }
        });

        attachments.push(attachment);
      }

      return reply.status(201).send({
        message: `${attachments.length} anexo(s) adicionado(s) com sucesso`,
        attachments: attachments.map(a => ({
          id: a.id,
          originalName: a.originalName,
          size: a.size,
          mimeType: a.mimeType
        }))
      });
    } catch (error) {
      console.error('Erro ao adicionar anexos:', error);
      return reply.status(500).send({ 
        error: 'Erro ao adicionar anexos',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * DELETE /documents/:id
   * Excluir documento e todos os anexos (somente admin)
   */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as any;
      const { id } = params;
      const user = (request as any).user;

      // Verificar permissão
      if (!user.isAdmin && user.role !== 'ADMIN') {
        return reply.status(403).send({ 
          error: 'Apenas administradores podem excluir documentos' 
        });
      }

      // Buscar documento com anexos
      const document = await prisma.document.findUnique({
        where: { id },
        include: { attachments: true }
      });

      if (!document) {
        return reply.status(404).send({ 
          error: 'Documento não encontrado' 
        });
      }

      // Excluir arquivos físicos
      for (const attachment of document.attachments) {
        const filePath = path.join(process.cwd(), attachment.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('🗑️ Arquivo excluído:', attachment.originalName);
        }
      }

      // Excluir do banco (cascade vai excluir anexos)
      await prisma.document.delete({
        where: { id }
      });

      return reply.send({
        message: 'Documento excluído com sucesso',
        id,
        name: document.name
      });
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      return reply.status(500).send({ 
        error: 'Erro ao excluir documento',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * DELETE /documents/:id/attachments/:attachmentId
   * Excluir anexo específico (somente admin)
   */
  async deleteAttachment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as any;
      const { id, attachmentId } = params;
      const user = (request as any).user;

      // Verificar permissão
      if (!user.isAdmin && user.role !== 'ADMIN') {
        return reply.status(403).send({ 
          error: 'Apenas administradores podem excluir anexos' 
        });
      }

      // Buscar anexo
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        include: { document: true }
      });

      if (!attachment || attachment.documentId !== id) {
        return reply.status(404).send({ 
          error: 'Anexo não encontrado' 
        });
      }

      // Excluir arquivo físico
      const filePath = path.join(process.cwd(), attachment.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ Arquivo excluído:', attachment.originalName);
      }

      // Excluir do banco
      await prisma.attachment.delete({
        where: { id: attachmentId }
      });

      return reply.send({
        message: 'Anexo excluído com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir anexo:', error);
      return reply.status(500).send({ 
        error: 'Erro ao excluir anexo',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}