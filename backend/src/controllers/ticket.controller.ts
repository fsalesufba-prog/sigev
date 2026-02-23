// backend/src/controllers/ticket.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { TicketService } from '../services/ticket.service';

const service = new TicketService();

export class TicketController {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const query = request.query as any;

      const filters = {
        status: query.status,
        priority: query.priority,
        category: query.category,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 10
      };

      const result = await service.getAll(filters, user);
      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar tickets'
      });
    }
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;

      const ticket = await service.getById(id, user);
      return reply.send(ticket);
    } catch (error: any) {
      if (error.message === 'Ticket não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      if (error.message === 'Acesso negado') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar ticket'
      });
    }
  }

  async getUnreadCount(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const count = await service.getUnreadCount(user.id);
      return reply.send({ count });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar contagem de tickets'
      });
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const data = request.body as any;

      const ticket = await service.create(data, user.id);
      return reply.status(201).send(ticket);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao criar ticket'
      });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const data = request.body as any;

      const ticket = await service.update(id, data, user);
      return reply.send(ticket);
    } catch (error: any) {
      if (error.message === 'Ticket não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      if (error.message === 'Acesso negado') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao atualizar ticket'
      });
    }
  }

  async addComment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const data = request.body as any;

      const comment = await service.addComment(id, data, user.id);
      return reply.status(201).send(comment);
    } catch (error: any) {
      if (error.message === 'Ticket não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao adicionar comentário'
      });
    }
  }

  async closeTicket(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;

      const ticket = await service.closeTicket(id, user.id);
      return reply.send({ message: 'Ticket fechado com sucesso', ticket });
    } catch (error: any) {
      if (error.message === 'Ticket não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao fechar ticket'
      });
    }
  }

  async assignTicket(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { assignedToId } = request.body as { assignedToId: string };
      const user = (request as any).user;

      const ticket = await service.assignTicket(id, assignedToId, user.id);
      return reply.send({ message: 'Ticket atribuído com sucesso', ticket });
    } catch (error: any) {
      if (error.message === 'Ticket não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao atribuir ticket'
      });
    }
  }
}