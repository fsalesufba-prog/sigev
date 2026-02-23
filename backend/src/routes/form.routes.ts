// backend/src/routes/form.routes.ts
import { FastifyInstance } from 'fastify';
import { FormController } from '../controllers/form.controller';

const controller = new FormController();

export default async function formRoutes(fastify: FastifyInstance) {
  // ==================== GET / ====================
  fastify.get('/', {
    preHandler: [(fastify as any).authenticate]
  }, controller.getAll.bind(controller));

  // ==================== GET /type/:type ====================
  fastify.get('/type/:type', {
    preHandler: [(fastify as any).authenticate]
  }, controller.getByType.bind(controller));

  // ==================== GET /:id ====================
  fastify.get('/:id', {
    preHandler: [(fastify as any).authenticate]
  }, controller.getById.bind(controller));

  // ==================== POST / ====================
  fastify.post('/', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, controller.create.bind(controller));

  // ==================== POST /:id/duplicate ====================
  fastify.post('/:id/duplicate', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, controller.duplicate.bind(controller));

  // ==================== PUT /:id ====================
  fastify.put('/:id', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, controller.update.bind(controller));

  // ==================== PATCH /:id/toggle-status ====================
  fastify.patch('/:id/toggle-status', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, controller.toggleStatus.bind(controller));

  // ==================== DELETE /:id ====================
  fastify.delete('/:id', {
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin]
  }, controller.delete.bind(controller));
}