// backend/src/repositories/process.repository.ts
import { PrismaClient } from '@prisma/client';
import { CreateProcessDTO, UpdateProcessDTO, ProcessFilters } from '../types/process.types';

const prisma = new PrismaClient();

export class ProcessRepository {
  async findAll(filters: ProcessFilters = {}) {
    const where: any = { deletedAt: null };

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search } }, // ✅ REMOVIDO mode
        { citizen: { name: { contains: filters.search } } }, // ✅ REMOVIDO mode
        { citizen: { cpf: { contains: filters.search } } }, // ✅ REMOVIDO mode
      ];
    }

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.unitId) where.unitId = filters.unitId;
    if (filters.professionalId) where.professionalId = filters.professionalId;
    if (filters.citizenId) where.citizenId = filters.citizenId;
    
    if (filters.violenceId) {
      where.violences = {
        some: { violenceId: filters.violenceId }
      };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const skip = filters.page && filters.limit 
      ? (filters.page - 1) * filters.limit 
      : undefined;
    const take = filters.limit || undefined;

    const [processes, total] = await Promise.all([
      prisma.process.findMany({
        where,
        include: {
          citizen: {
            select: { id: true, name: true, birthDate: true, cpf: true }
          },
          professional: {
            select: { id: true, name: true, email: true }
          },
          unit: {
            select: { id: true, name: true }
          },
          violences: {
            include: {
              violence: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take
      }),
      prisma.process.count({ where })
    ]);

    return { processes, total };
  }

  async findById(id: string) {
    return prisma.process.findFirst({
      where: { id, deletedAt: null },
      include: {
        citizen: true,
        professional: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        unit: true,
        violences: {
          include: { violence: true }
        },
        notes: {
          include: {
            user: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        encaminhamentos: {
          include: {
            fromUnit: true,
            toUnit: true,
            opener: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        attachments: {
          include: {
            user: { select: { name: true } }
          }
        }
      }
    });
  }

  async findByCitizenId(citizenId: string) {
    return prisma.process.findMany({
      where: { citizenId, deletedAt: null },
      include: {
        unit: { select: { name: true } },
        professional: { select: { name: true } },
        violences: {
          include: { violence: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findPending() {
    return prisma.process.findMany({
      where: { status: 'PENDING', deletedAt: null },
      include: {
        citizen: { select: { name: true } },
        unit: { select: { name: true } },
        professional: { select: { name: true } },
        violences: {
          include: { violence: { select: { name: true } } }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });
  }

  async findFavorites(userId: string, unitIds: string[]) {
    return prisma.process.findMany({
      where: { 
        isFavorite: true, 
        deletedAt: null,
        OR: [
          { professionalId: userId },
          { unitId: { in: unitIds } }
        ]
      },
      include: {
        citizen: { select: { name: true } },
        unit: { select: { name: true } },
        professional: { select: { name: true } },
        violences: {
          include: { violence: { select: { name: true } } }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async create(data: CreateProcessDTO, userId: string) {
    return prisma.$transaction(async (tx) => {
      const process = await tx.process.create({
        data: {
          citizenId: data.citizenId,
          professionalId: data.professionalId,
          unitId: data.unitId,
          identificationForm: data.identificationForm,
          description: data.description,
          priority: data.priority || 'NORMAL',
          deadline: data.deadline,
          deadlineType: data.deadlineType,
          deadlineDays: data.deadlineDays,
          violences: {
            create: data.violenceIds.map(violenceId => ({
              violenceId
            }))
          }
        },
        include: {
          citizen: true,
          professional: true,
          unit: true,
          violences: { include: { violence: true } }
        }
      });

      await tx.actionLog.create({
        data: {
          userId,
          action: 'CREATE',
          description: `Processo criado para ${process.citizen.name}`,
          entityType: 'Process',
          entityId: process.id,
          newValue: JSON.stringify(process)
        }
      });

      return process;
    });
  }

  async update(id: string, data: UpdateProcessDTO, userId: string) {
    return prisma.$transaction(async (tx) => {
      const oldProcess = await tx.process.findUnique({ where: { id } });

      const process = await tx.process.update({
        where: { id },
        data: {
          citizenId: data.citizenId,
          professionalId: data.professionalId,
          unitId: data.unitId,
          identificationForm: data.identificationForm,
          description: data.description,
          status: data.status,
          priority: data.priority,
          deadline: data.deadline,
          deadlineType: data.deadlineType,
          deadlineDays: data.deadlineDays,
          isFavorite: data.isFavorite,
        },
        include: {
          citizen: true,
          professional: true,
          unit: true
        }
      });

      if (data.violenceIds) {
        await tx.processViolence.deleteMany({ where: { processId: id } });
        await tx.processViolence.createMany({
          data: data.violenceIds.map(violenceId => ({
            processId: id,
            violenceId
          }))
        });
      }

      await tx.actionLog.create({
        data: {
          userId,
          action: 'UPDATE',
          description: `Processo atualizado`,
          entityType: 'Process',
          entityId: process.id,
          oldValue: JSON.stringify(oldProcess),
          newValue: JSON.stringify(process)
        }
      });

      return process;
    });
  }

  async delete(id: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const process = await tx.process.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      await tx.actionLog.create({
        data: {
          userId,
          action: 'DELETE',
          description: `Processo arquivado`,
          entityType: 'Process',
          entityId: process.id,
          oldValue: JSON.stringify(process)
        }
      });

      return process;
    });
  }

  async markAsRead(id: string, userId: string) {
    return prisma.process.update({
      where: { id },
      data: {
        readAt: new Date(),
        readBy: userId
      }
    });
  }

  async toggleFavorite(id: string) {
    const process = await prisma.process.findUnique({
      where: { id },
      select: { isFavorite: true }
    });

    return prisma.process.update({
      where: { id },
      data: { isFavorite: !process?.isFavorite }
    });
  }
}