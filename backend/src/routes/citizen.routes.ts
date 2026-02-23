// backend/src/routes/citizen.routes.ts
import { FastifyInstance } from 'fastify';
import { CitizenController } from '../controllers/citizen.controller';

const controller = new CitizenController();

export default async function citizenRoutes(fastify: FastifyInstance) {
  // GET /citizens - Listar cidadãos
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, (request: any, reply: any) => controller.getAll(request, reply));

  // GET /citizens/cpf/:cpf - Buscar por CPF
  fastify.get('/cpf/:cpf', {
    preHandler: [fastify.authenticate]
  }, (request: any, reply: any) => controller.getByCpf(request, reply));

  // GET /citizens/:id - Detalhe do cidadão
  fastify.get('/:id', {
    preHandler: [fastify.authenticate]
  }, (request: any, reply: any) => controller.getById(request, reply));

  // POST /citizens - Criar novo cidadão
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, (request: any, reply: any) => controller.create(request, reply));

  // PUT /citizens/:id - Atualizar cidadão
  fastify.put('/:id', {
    preHandler: [fastify.authenticate]
  }, (request: any, reply: any) => controller.update(request, reply));

  // DELETE /citizens/:id - Remover cidadão (soft delete)
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate]
  }, (request: any, reply: any) => controller.delete(request, reply));
}