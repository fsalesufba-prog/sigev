// backend/src/services/ticket.service.ts
import { TicketRepository } from '../repositories/ticket.repository';
import { 
  CreateTicketDTO, 
  UpdateTicketDTO, 
  CreateCommentDTO,
  TicketFilters 
} from '../types/ticket.types';
import { createLog, ActionType } from '../middleware/log.middleware';

const repository = new TicketRepository();

export class TicketService {
  async getAll(filters: TicketFilters, user: any) {
    // Se não for admin, filtrar pelos tickets do usuário ou da unidade
    if (!user.isAdmin && user.role !== 'ADMIN') {
      filters.createdById = user.id;
    }

    const { tickets, total } = await repository.findAll(filters);

    const formatted = tickets.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      category: t.category,
      createdAt: t.createdAt.toISOString(),
      createdBy: {
        id: t.createdBy.id,
        name: t.createdBy.name
      },
      assignedTo: t.assignedTo ? {
        id: t.assignedTo.id,
        name: t.assignedTo.name
      } : null,
      unit: t.unit?.name,
      lastComment: t.comments[0]?.content,
      commentCount: t._count.comments
    }));

    return {
      data: formatted,
      total,
      page: filters.page || 1,
      limit: filters.limit || 10,
      totalPages: Math.ceil(total / (filters.limit || 10))
    };
  }

  async getById(id: string, user: any) {
    const ticket = await repository.findById(id);
    
    if (!ticket) {
      throw new Error('Ticket não encontrado');
    }

    // Verificar permissão
    if (!user.isAdmin && user.role !== 'ADMIN' && ticket.createdById !== user.id) {
      throw new Error('Acesso negado');
    }

    return ticket;
  }

  async getUnreadCount(userId: string) {
    return repository.findUnreadCount(userId);
  }

  async create(data: CreateTicketDTO, userId: string) {
    const ticket = await repository.create(data, userId);

    await createLog({
      userId,
      action: ActionType.CREATE,
      description: `Ticket criado: ${ticket.title}`,
      entityType: 'Ticket',
      entityId: ticket.id,
      newValue: ticket
    });

    return ticket;
  }

  async update(id: string, data: UpdateTicketDTO, userId: string) {
    const existing = await repository.findById(id);
    
    if (!existing) {
      throw new Error('Ticket não encontrado');
    }

    // Verificar permissão
    if (!user.isAdmin && user.role !== 'ADMIN' && existing.createdById !== userId) {
      throw new Error('Acesso negado');
    }

    const ticket = await repository.update(id, data);

    await createLog({
      userId,
      action: ActionType.UPDATE,
      description: `Ticket atualizado: ${ticket.title}`,
      entityType: 'Ticket',
      entityId: ticket.id,
      oldValue: existing,
      newValue: ticket
    });

    return ticket;
  }

  async addComment(ticketId: string, data: CreateCommentDTO, userId: string) {
    const ticket = await repository.findById(ticketId);
    
    if (!ticket) {
      throw new Error('Ticket não encontrado');
    }

    const comment = await repository.addComment(ticketId, data, userId);

    await createLog({
      userId,
      action: ActionType.CREATE,
      description: `Comentário adicionado ao ticket ${ticket.title}`,
      entityType: 'TicketComment',
      entityId: comment.id,
      newValue: comment
    });

    return comment;
  }

  async closeTicket(id: string, userId: string) {
    const ticket = await repository.findById(id);
    
    if (!ticket) {
      throw new Error('Ticket não encontrado');
    }

    return repository.closeTicket(id, userId);
  }

  async assignTicket(id: string, assignedToId: string, userId: string) {
    const ticket = await repository.findById(id);
    
    if (!ticket) {
      throw new Error('Ticket não encontrado');
    }

    return repository.assignTicket(id, assignedToId);
  }
}