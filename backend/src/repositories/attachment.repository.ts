// backend/src/repositories/attachment.repository.ts
import { PrismaClient } from '@prisma/client';
import { CreateAttachmentDTO, AttachmentFilters } from '../types/attachment.types';
import fs from 'fs';

const prisma = new PrismaClient();

export class AttachmentRepository {
  async findByProcessId(processId: string) {
    return prisma.attachment.findMany({
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
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id: string) {
    return prisma.attachment.findUnique({
      where: { id },
      include: {
        user: { 
          select: { 
            id: true,
            name: true,
            email: true 
          } 
        },
        process: { 
          select: { 
            id: true,
            citizen: {
              select: { name: true }
            }
          } 
        }
      }
    });
  }

  async findByNotificationId(notificationId: string) {
    return prisma.attachment.findMany({
      where: { notificationId },
      include: {
        user: { select: { name: true } }
      }
    });
  }

  async findByUnitId(unitId: string) {
    return prisma.attachment.findMany({
      where: { unitId },
      include: {
        user: { select: { name: true } },
        process: { select: { id: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByDocumentId(documentId: string) {
    return prisma.attachment.findMany({
      where: { documentId },
      include: {
        user: { select: { name: true } }
      }
    });
  }

  async create(data: CreateAttachmentDTO, userId: string) {
    return prisma.attachment.create({
      data: {
        filename: data.filename,
        originalName: data.originalName,
        path: data.path,
        mimeType: data.mimeType,
        size: data.size,
        processId: data.processId,
        notificationId: data.notificationId,
        userId,
        unitId: data.unitId,
        documentId: data.documentId
      },
      include: {
        user: { 
          select: { 
            id: true,
            name: true,
            email: true 
          } 
        }
      }
    });
  }

  async delete(id: string) {
    // Primeiro buscar o attachment para pegar o caminho do arquivo
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      throw new Error('Anexo não encontrado');
    }

    // Remover arquivo físico
    try {
      if (fs.existsSync(attachment.path)) {
        fs.unlinkSync(attachment.path);
      }
    } catch (error) {
      console.error('Erro ao remover arquivo físico:', error);
      // Continua mesmo se não conseguir remover o arquivo físico
    }

    // Remover do banco
    return prisma.attachment.delete({
      where: { id }
    });
  }

  async deleteByProcessId(processId: string) {
    // Buscar todos os anexos do processo
    const attachments = await prisma.attachment.findMany({
      where: { processId }
    });

    // Remover arquivos físicos
    for (const attachment of attachments) {
      try {
        if (fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path);
        }
      } catch (error) {
        console.error('Erro ao remover arquivo físico:', error);
      }
    }

    // Remover do banco
    return prisma.attachment.deleteMany({
      where: { processId }
    });
  }
}