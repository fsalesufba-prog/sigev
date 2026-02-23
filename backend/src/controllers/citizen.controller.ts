// backend/src/controllers/citizen.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { CitizenService } from '../services/citizen.service';

const service = new CitizenService();

export class CitizenController {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      
      // 🔥 CORREÇÃO: Tratar search como string, mesmo que vazia
      const filters = {
        search: query.search || '',
        gender: query.gender,
        hasDisability: query.hasDisability === 'true' ? true : 
                       query.hasDisability === 'false' ? false : undefined,
        hasHealthProblem: query.hasHealthProblem === 'true' ? true : 
                          query.hasHealthProblem === 'false' ? false : undefined,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 10,
      };

      console.log('📋 Controller getAll - filters:', filters);

      const result = await service.getAll(filters);
      return reply.send(result);
    } catch (error) {
      console.error('❌ Erro no controller getAll:', error);
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar cidadãos'
      });
    }
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const citizen = await service.getById(id);
      return reply.send(citizen);
    } catch (error: any) {
      console.error('❌ Erro no controller getById:', error);
      if (error.message === 'Cidadão não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar cidadão'
      });
    }
  }

  async getByCpf(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { cpf } = request.params as { cpf: string };
      const citizen = await service.getByCpf(cpf);
      
      if (!citizen) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Cidadão não encontrado'
        });
      }

      return reply.send(citizen);
    } catch (error) {
      console.error('❌ Erro no controller getByCpf:', error);
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar cidadão por CPF'
      });
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const data = request.body as any;

      const citizen = await service.create(data, user.id);
      return reply.status(201).send(citizen);
    } catch (error: any) {
      console.error('❌ Erro no controller create:', error);
      if (error.message === 'CPF já cadastrado') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao criar cidadão'
      });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as any;
      const data = request.body as any;

      const citizen = await service.update(id, data, user.id);
      return reply.send(citizen);
    } catch (error: any) {
      console.error('❌ Erro no controller update:', error);
      if (error.message === 'Cidadão não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      if (error.message === 'CPF já cadastrado para outro cidadão') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao atualizar cidadão'
      });
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as any;

      const result = await service.delete(id, user.id);
      return reply.send(result);
    } catch (error: any) {
      console.error('❌ Erro no controller delete:', error);
      if (error.message === 'Cidadão não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      if (error.message === 'Não é possível excluir cidadão com processos vinculados') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao excluir cidadão'
      });
    }
  }
}