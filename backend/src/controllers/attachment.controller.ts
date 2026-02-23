// backend/src/controllers/attachment.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AttachmentRepository } from '../repositories/attachment.repository';
import { createLog } from '../middleware/log.middleware';
import fs from 'fs';
import path from 'path';

const repository = new AttachmentRepository();

export class AttachmentController {
  async getByProcessId(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { processId } = request.params as { processId: string };
      const attachments = await repository.findByProcessId(processId);
      
      // Garantir que todos os campos necessários estão presentes
      const formattedAttachments = attachments.map(att => ({
        id: att.id,
        filename: att.filename,
        originalName: att.originalName,
        mimeType: att.mimeType,
        size: att.size,
        createdAt: att.createdAt,
        user: att.user ? { name: att.user.name } : undefined
      }));
      
      return reply.send(formattedAttachments);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar anexos'
      });
    }
  }

  async upload(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const { processId } = request.params as { processId: string };
      
      // Com fastify-multer, os arquivos ficam em request.files
      const files = (request as any).files;

      if (!files || files.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Nenhum arquivo enviado'
        });
      }

      const attachments = [];

      for (const file of files) {
        const attachment = await repository.create({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          mimeType: file.mimetype,
          size: file.size,
          processId
        }, user.id);

        attachments.push(attachment);
      }

      await createLog({
        userId: user.id,
        action: 'CREATE',
        description: `${attachments.length} anexo(s) adicionado(s) ao processo`,
        entityType: 'Attachment',
        entityId: processId,
        req: request
      });

      // Formatar resposta
      const formattedAttachments = attachments.map(att => ({
        id: att.id,
        filename: att.filename,
        originalName: att.originalName,
        mimeType: att.mimeType,
        size: att.size,
        createdAt: att.createdAt,
        user: att.user ? { name: att.user.name } : undefined
      }));

      return reply.status(201).send(formattedAttachments);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message || 'Erro ao fazer upload'
      });
    }
  }

  async download(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const attachment = await repository.findById(id);

      if (!attachment) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Arquivo não encontrado'
        });
      }

      // Verificar se o arquivo existe
      if (!fs.existsSync(attachment.path)) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Arquivo físico não encontrado'
        });
      }

      // Enviar arquivo
      const fileStream = fs.createReadStream(attachment.path);
      reply.type(attachment.mimeType || 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`);
      
      return reply.send(fileStream);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao baixar arquivo'
      });
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as any;

      await repository.delete(id);

      await createLog({
        userId: user.id,
        action: 'DELETE',
        description: 'Anexo removido',
        entityType: 'Attachment',
        entityId: id,
        req: request
      });

      return reply.send({ message: 'Arquivo removido com sucesso' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao remover arquivo'
      });
    }
  }
}