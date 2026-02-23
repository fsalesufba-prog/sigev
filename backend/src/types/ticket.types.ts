// backend/src/types/ticket.types.ts
export type TicketStatus = 'ABERTO' | 'EM_ANDAMENTO' | 'AGUARDANDO' | 'RESOLVIDO' | 'FECHADO';
export type TicketPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type TicketCategory = 'DUVIDA' | 'PROBLEMA_TECNICO' | 'SOLICITACAO' | 'MELHORIA' | 'OUTRO';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  createdById: string;
  assignedToId?: string | null;
  unitId?: string | null;
  attachments?: any;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date | null;
  closedById?: string | null;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  attachments?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTicketDTO {
  title: string;
  description: string;
  priority?: TicketPriority;
  category: TicketCategory;
  unitId?: string;
  attachments?: any;
}

export interface UpdateTicketDTO {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedToId?: string | null;
}

export interface CreateCommentDTO {
  content: string;
  attachments?: any;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  createdById?: string;
  assignedToId?: string;
  unitId?: string;
  search?: string;
  page?: number;
  limit?: number;
}