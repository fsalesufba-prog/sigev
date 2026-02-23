// backend/src/controllers/encaminhamento.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { EncaminhamentoService } from '../services/encaminhamento.service';

const service = new EncaminhamentoService();

export class EncaminhamentoController {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const query = request.query as any;

      const filters = {
        processId: query.processId,
        fromUnitId: user.isAdmin ? query.fromUnitId : user.unitId,
        toUnitId: query.toUnitId,
        status: query.status,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 10
      };

      const result = await service.getAll(filters, user);
      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar encaminhamentos'
      });
    }
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const encaminhamento = await service.getById(id);
      return reply.send(encaminhamento);
    } catch (error: any) {
      if (error.message === 'Encaminhamento não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar encaminhamento'
      });
    }
  }

  async getByProcessId(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { processId } = request.params as { processId: string };
      const encaminhamentos = await service.getByProcessId(processId);
      return reply.send(encaminhamentos);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar encaminhamentos do processo'
      });
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const data = request.body as any;

      const encaminhamento = await service.create(data, user);
      return reply.status(201).send(encaminhamento);
    } catch (error: any) {
      if (error.message.includes('não encontrado')) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao criar encaminhamento'
      });
    }
  }

  async open(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as any;
      const encaminhamento = await service.open(id, user.id);
      return reply.send(encaminhamento);
    } catch (error: any) {
      if (error.message === 'Encaminhamento não encontrado' || 
          error.message === 'Este encaminhamento não pode ser aberto') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao abrir encaminhamento'
      });
    }
  }

  async complete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const encaminhamento = await service.complete(id);
      return reply.send(encaminhamento);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao concluir encaminhamento'
      });
    }
  }

  async cancel(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const encaminhamento = await service.cancel(id);
      return reply.send(encaminhamento);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao cancelar encaminhamento'
      });
    }
  }
}