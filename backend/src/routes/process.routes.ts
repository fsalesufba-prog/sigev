// backend/src/routes/process.routes.ts
import { FastifyInstance } from 'fastify';
import { ProcessController } from '../controllers/process.controller';

const controller = new ProcessController();

export default async function processRoutes(fastify: FastifyInstance) {
  // GET /processes - Listar processos com filtros
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, controller.getAll.bind(controller));

  // GET /processes/pending - Processos pendentes
  fastify.get('/pending', {
    preHandler: [fastify.authenticate]
  }, controller.getPending.bind(controller));

  // GET /processes/favorites - Processos favoritos
  fastify.get('/favorites', {
    preHandler: [fastify.authenticate]
  }, controller.getFavorites.bind(controller));

  // GET /processes/citizen/:citizenId - Processos por cidadão
  fastify.get('/citizen/:citizenId', {
    preHandler: [fastify.authenticate]
  }, controller.getByCitizenId.bind(controller));

  // GET /processes/:id - Detalhe do processo
  fastify.get('/:id', {
    preHandler: [fastify.authenticate]
  }, controller.getById.bind(controller));

  // POST /processes - Criar novo processo
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, controller.create.bind(controller));

  // PUT /processes/:id - Atualizar processo
  fastify.put('/:id', {
    preHandler: [fastify.authenticate]
  }, controller.update.bind(controller));

  // DELETE /processes/:id - Remover processo (soft delete)
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate]
  }, controller.delete.bind(controller));

  // PATCH /processes/:id/favorite - Favoritar/desfavoritar
  fastify.patch('/:id/favorite', {
    preHandler: [fastify.authenticate]
  }, controller.toggleFavorite.bind(controller));
}