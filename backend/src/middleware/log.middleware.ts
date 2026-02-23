// backend/src/middleware/log.middleware.ts
import { PrismaClient } from '@prisma/client';
import { ActionType } from '@prisma/client';

const prisma = new PrismaClient();

// Re-exportar o enum do Prisma
export { ActionType };

// Interface para criação de log
interface CreateLogParams {
  userId?: string | null;
  action: ActionType;
  description: string;
  entityType?: string | null;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
  req?: any;
}

/**
 * Função para criar log de ações
 * Atende item 1.9 do Edital - Manter registro de log dos eventos principais
 */
export async function createLog(params: CreateLogParams) {
  try {
    const { userId, action, description, entityType, entityId, oldValue, newValue, req } = params;

    // IMPORTANTE: No banco a coluna se chama 'userId' (campo direto), não é uma relação
    // Por isso usamos userId: userId || null, não user: { connect: { id: userId } }
    const logData = {
      action,
      description: description || '',
      userId: userId || null, // Campo direto, não objeto com connect
      entityType: entityType || null,
      entityId: entityId || null,
      oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
      newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || null
      // NOTA: userAgent NÃO EXISTE no schema ActionLog, por isso foi removido
    };

    console.log('📝 Criando log:', JSON.stringify(logData, null, 2));

    const result = await prisma.actionLog.create({
      data: logData,
      include: {
        user: { // Isso funciona porque a relação é baseada em userId
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log('✅ Log criado com sucesso. ID:', result.id);
    return result;
  } catch (error) {
    console.error('❌ Erro ao criar log:', error);
    // Retornar null em vez de lançar erro para não interromper o fluxo principal
    return null;
  }
}

/**
 * Função para buscar logs com filtros
 */
export async function getLogs(filters?: {
  userId?: string;
  action?: ActionType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  try {
    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const logs = await prisma.actionLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: filters?.limit || 100,
      skip: filters?.offset || 0
    });

    return logs;
  } catch (error) {
    console.error('❌ Erro ao buscar logs:', error);
    return [];
  }
}

/**
 * Função para contar logs
 */
export async function countLogs(filters?: {
  userId?: string;
  action?: ActionType;
  startDate?: Date;
  endDate?: Date;
}) {
  try {
    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const count = await prisma.actionLog.count({ where });
    return count;
  } catch (error) {
    console.error('❌ Erro ao contar logs:', error);
    return 0;
  }
}

/**
 * Função para limpar logs antigos (opcional)
 * @param daysToKeep Número de dias para manter os logs (padrão: 90)
 */
export async function cleanupOldLogs(daysToKeep: number = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.actionLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    console.log(`🧹 Logs antigos removidos: ${result.count}`);
    return result.count;
  } catch (error) {
    console.error('❌ Erro ao limpar logs antigos:', error);
    return 0;
  }
}