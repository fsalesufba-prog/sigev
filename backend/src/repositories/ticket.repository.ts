// backend/src/repositories/ticket.repository.ts
import { PrismaClient } from '@prisma/client';
import { 
  CreateTicketDTO, 
  UpdateTicketDTO, 
  CreateCommentDTO,
  TicketFilters 
} from '../types/ticket.types';

const prisma = new PrismaClient();

export class TicketRepository {
  async findAll(filters: TicketFilters = {}) {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.category) where.category = filters.category;
    if (filters.createdById) where.createdById = filters.createdById;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.unitId) where.unitId = filters.unitId;

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const skip = filters.page && filters.limit 
      ? (filters.page - 1) * filters.limit 
      : undefined;
    const take = filters.limit || undefined;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          closedBy: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true } },
          comments: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { name: true } }
            }
          },
          _count: {
            select: { comments: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take
      }),
      prisma.ticket.count({ where })
    ]);

    return { tickets, total };
  }

  async findById(id: string) {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        closedBy: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  async findUnreadCount(userId: string) {
    // Tickets não lidos: abertos, não atribuídos a ninguém, ou atribuídos ao usuário
    const count = await prisma.ticket.count({
      where: {
        status: { in: ['ABERTO', 'EM_ANDAMENTO'] },
        OR: [
          { assignedToId: null },
          { assignedToId: userId }
        ]
      }
    });
    return count;
  }

  async create(data: CreateTicketDTO, userId: string) {
    return prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority || 'MEDIA',
        category: data.category,
        unitId: data.unitId,
        attachments: data.attachments,
        createdById: userId
      },
      include: {
        createdBy: { select: { name: true, email: true } }
      }
    });
  }

  async update(id: string, data: UpdateTicketDTO) {
    return prisma.ticket.update({
      where: { id },
      data
    });
  }

  async addComment(ticketId: string, data: CreateCommentDTO, userId: string) {
    return prisma.ticketComment.create({
      data: {
        ticketId,
        userId,
        content: data.content,
        attachments: data.attachments
      },
      include: {
        user: { select: { name: true, email: true } }
      }
    });
  }

  async closeTicket(id: string, userId: string) {
    return prisma.ticket.update({
      where: { id },
      data: {
        status: 'FECHADO',
        closedAt: new Date(),
        closedById: userId
      }
    });
  }

  async assignTicket(id: string, assignedToId: string) {
    return prisma.ticket.update({
      where: { id },
      data: { assignedToId }
    });
  }
}