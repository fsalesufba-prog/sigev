// backend/src/repositories/encaminhamento.repository.ts
import { PrismaClient } from '@prisma/client';
import { CreateEncaminhamentoDTO, UpdateEncaminhamentoDTO, EncaminhamentoFilters } from '../types/encaminhamento.types';

const prisma = new PrismaClient();

export class EncaminhamentoRepository {
  async findAll(filters: EncaminhamentoFilters = {}) {
    const where: any = {};

    if (filters.processId) where.processId = filters.processId;
    if (filters.fromUnitId) where.fromUnitId = filters.fromUnitId;
    if (filters.toUnitId) where.toUnitId = filters.toUnitId;
    if (filters.status) where.status = filters.status;

    const skip = filters.page && filters.limit
      ? (filters.page - 1) * filters.limit
      : undefined;
    const take = filters.limit || undefined;

    const [encaminhamentos, total] = await Promise.all([
      prisma.encaminhamento.findMany({
        where,
        include: {
          process: {
            include: {
              citizen: { select: { name: true } }
            }
          },
          fromUnit: { select: { id: true, name: true } },
          toUnit: { select: { id: true, name: true } },
          opener: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.encaminhamento.count({ where })
    ]);

    return { encaminhamentos, total };
  }

  async findById(id: string) {
    return prisma.encaminhamento.findUnique({
      where: { id },
      include: {
        process: {
          include: {
            citizen: true
          }
        },
        fromUnit: true,
        toUnit: true,
        opener: { select: { id: true, name: true } }
      }
    });
  }

  async findByProcessId(processId: string) {
    return prisma.encaminhamento.findMany({
      where: { processId },
      include: {
        fromUnit: { select: { name: true } },
        toUnit: { select: { name: true } },
        opener: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: CreateEncaminhamentoDTO, fromUnitId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const encaminhamento = await tx.encaminhamento.create({
        data: {
          processId: data.processId,
          fromUnitId,
          toUnitId: data.toUnitId,
          description: data.description,
          deadline: data.deadline,
          deadlineType: data.deadlineType,
          deadlineDays: data.deadlineDays,
          status: 'PENDING'
        },
        include: {
          process: {
            include: {
              citizen: { select: { name: true } }
            }
          },
          fromUnit: true,
          toUnit: true
        }
      });

      // Buscar usuários da unidade de destino para enviar notificação
      const targetUsers = await tx.user.findMany({
        where: {
          professionalUnits: {
            some: {
              unitId: data.toUnitId,
              isActive: true
            }
          },
          isActive: true,
          deletedAt: null
        },
        select: { id: true }
      });

      // Criar notificações para cada usuário da unidade de destino
      if (targetUsers.length > 0) {
        await tx.notification.createMany({
          data: targetUsers.map(user => ({
            type: 'ENCAMINHAMENTO',
            title: 'Novo Encaminhamento',
            message: `Processo encaminhado para sua unidade`,
            senderId: userId,
            receiverId: user.id,           // ✅ receiverId é obrigatório
            receiverUnitId: data.toUnitId,
            encaminhamentoId: encaminhamento.id,
            processId: data.processId
          }))
        });
      }

      await tx.actionLog.create({
        data: {
          userId,
          action: 'ENCAMINHAR',
          description: `Processo encaminhado para ${encaminhamento.toUnit.name}`,
          entityType: 'Encaminhamento',
          entityId: encaminhamento.id,
          newValue: JSON.stringify(encaminhamento)
        }
      });

      return encaminhamento;
    });
  }

  async updateStatus(id: string, data: UpdateEncaminhamentoDTO) {
    return prisma.encaminhamento.update({
      where: { id },
      data: {
        status: data.status,
        openedAt: data.openedAt,
        openedBy: data.openedBy
      }
    });
  }
}