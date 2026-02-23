// backend/src/controllers/upload.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

interface UploadFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  filename: string;
  path: string;
  size: number;
}

export class UploadController {
  /**
   * Upload de arquivo para um processo
   */
  async uploadProcessFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { processId } = request.params as { processId: string };
      const files = request.files as UploadFile[];
      
      if (!files || files.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Nenhum arquivo enviado'
        });
      }

      const userId = (request as any).user.id;
      const unitId = (request as any).user.units[0]?.id;

      const attachments = await Promise.all(
        files.map(async (file) => {
          return prisma.attachment.create({
            data: {
              filename: file.filename,
              originalName: file.originalname,
              path: file.path,
              mimeType: file.mimetype,
              size: file.size,
              processId,
              userId,
              unitId
            }
          });
        })
      );

      return reply.send({
        message: 'Arquivos enviados com sucesso',
        files: attachments
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao fazer upload'
      });
    }
  }

  /**
   * Upload de documento do sistema
   */
  async uploadDocument(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { documentId } = request.params as { documentId: string };
      const file = (request.files as UploadFile[])[0];
      
      if (!file) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Nenhum arquivo enviado'
        });
      }

      const userId = (request as any).user.id;

      const attachment = await prisma.attachment.create({
        data: {
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          mimeType: file.mimetype,
          size: file.size,
          documentId,
          userId
        }
      });

      return reply.send({
        message: 'Arquivo enviado com sucesso',
        file: attachment
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao fazer upload'
      });
    }
  }

  /**
   * Upload de avatar do usuário
   */
  async uploadAvatar(request: FastifyRequest, reply: FastifyReply) {
    try {
      const file = (request.files as UploadFile[])[0];
      const userId = (request as any).user.id;
      
      if (!file) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Nenhum arquivo enviado'
        });
      }

      // Remove avatar antigo se existir
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true }
      });

      if (user?.avatar) {
        try {
          await fs.unlink(user.avatar);
        } catch (err) {
          // Ignora erro se arquivo não existir
        }
      }

      // Atualiza usuário com novo avatar
      await prisma.user.update({
        where: { id: userId },
        data: { avatar: file.path }
      });

      return reply.send({
        message: 'Avatar atualizado com sucesso',
        avatar: file.path
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao fazer upload'
      });
    }
  }

  /**
   * Download de arquivo
   */
  async downloadFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { attachmentId } = request.params as { attachmentId: string };
      
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId }
      });

      if (!attachment) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Arquivo não encontrado'
        });
      }

      return reply.sendFile(attachment.filename, path.dirname(attachment.path));

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao baixar arquivo'
      });
    }
  }

  /**
   * Deletar arquivo
   */
  async deleteFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { attachmentId } = request.params as { attachmentId: string };
      const userId = (request as any).user.id;
      
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId }
      });

      if (!attachment) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Arquivo não encontrado'
        });
      }

      // Verifica permissão (apenas quem fez upload ou admin)
      if (attachment.userId !== userId && !(request as any).user.isAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Sem permissão para deletar este arquivo'
        });
      }

      // Remove arquivo do disco
      try {
        await fs.unlink(attachment.path);
      } catch (err) {
        // Ignora erro se arquivo não existir
      }

      // Remove registro do banco
      await prisma.attachment.delete({
        where: { id: attachmentId }
      });

      return reply.send({
        message: 'Arquivo deletado com sucesso'
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao deletar arquivo'
      });
    }
  }

  /**
   * Listar arquivos de um processo
   */
  async listProcessFiles(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { processId } = request.params as { processId: string };
      
      const attachments = await prisma.attachment.findMany({
        where: { processId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return reply.send(attachments);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao listar arquivos'
      });
    }
  }
}