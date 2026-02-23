// backend/src/routes/ticket.routes.ts
import { FastifyInstance } from 'fastify';
import { TicketController } from '../controllers/ticket.controller';

const controller = new TicketController();

export default async function ticketRoutes(fastify: FastifyInstance) {
  // GET /tickets - Listar tickets
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, (request: any, reply: any) => controller.getAll(request, reply));

  // GET /tickets/unread-count - Contagem de tickets não lidos
  fastify.get('/unread-count', {
    preHandler: [fastify.authenticate]
  }, (request: any, reply: any) => controller.getUnreadCount(request, reply));

  // GET /tickets/:id - Detalhe do ticket
  fastify.get('/:id', {
    preHandler: [fastify.authenticate]
  }, (request: any, reply: any) => controller.getById(request, reply));

  // POST /tickets - Criar novo ticket
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, (request: any, reply: any) => controller.create(request, reply));

  // PUT /tickets/:id - Atualizar ticket
  fastify.put('/:id', {
    preHandler: [fastify.authenticate]
  }, (request: any, reply: any) => controller.update(request, reply));

  // POST /tickets/:id/comments - Adicionar comentário
  fastify.post('/:id/comments', {
    preHandler: [fastify.authenticate]
  }, (request: any, reply: any) => controller.addComment(request, reply));

  // PATCH /tickets/:id/close - Fechar ticket
  fastify.patch('/:id/close', {
    preHandler: [fastify.authenticate]
  }, (request: any, reply: any) => controller.closeTicket(request, reply));

  // PATCH /tickets/:id/assign - Atribuir ticket
  fastify.patch('/:id/assign', {
    preHandler: [fastify.authenticate]
  }, (request: any, reply: any) => controller.assignTicket(request, reply));
}