// backend/src/controllers/process.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { ProcessService } from '../services/process.service';

const service = new ProcessService();

export class ProcessController {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const query = request.query as any;

      const filters = {
        search: query.search,
        status: query.status,
        priority: query.priority,
        unitId: query.unitId,
        professionalId: query.professionalId,
        citizenId: query.citizenId,
        violenceId: query.violenceId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 10,
      };

      const result = await service.getAll(filters, user);
      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar processos'
      });
    }
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as any;

      const process = await service.getById(id);

      // Marcar como lido se não for o profissional que criou
      if (process.professionalId !== user.id && !process.readAt) {
        await service.markAsRead(id, user.id);
      }

      return reply.send(process);
    } catch (error: any) {
      if (error.message === 'Processo não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar processo'
      });
    }
  }

  async getByCitizenId(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { citizenId } = request.params as { citizenId: string };
      const processes = await service.getByCitizenId(citizenId);
      return reply.send(processes);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar processos do cidadão'
      });
    }
  }

  async getPending(request: FastifyRequest, reply: FastifyReply) {
    try {
      const processes = await service.getPending();
      return reply.send(processes);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar processos pendentes'
      });
    }
  }

  async getFavorites(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const unitIds = user.units?.map((u: any) => u.id) || [];
      const processes = await service.getFavorites(user.id, unitIds);
      return reply.send(processes);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar processos favoritos'
      });
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const data = request.body as any;

      const process = await service.create(data, user.id);
      return reply.status(201).send(process);
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
        message: 'Erro ao criar processo'
      });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as any;
      const data = request.body as any;

      const process = await service.update(id, data, user.id);
      return reply.send(process);
    } catch (error: any) {
      if (error.message === 'Processo não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao atualizar processo'
      });
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as any;

      await service.delete(id, user.id);
      return reply.send({ message: 'Processo removido com sucesso' });
    } catch (error: any) {
      if (error.message === 'Processo não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao remover processo'
      });
    }
  }

  async toggleFavorite(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const process = await service.toggleFavorite(id);
      return reply.send(process);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao atualizar favorito'
      });
    }
  }
}