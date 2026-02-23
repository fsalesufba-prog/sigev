// backend/src/controllers/unit.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { UnitService } from '../services/unit.service';
import { createLog } from '../middleware/log.middleware';

const service = new UnitService();

export class UnitController {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const filters = {
        search: query.search,
        typeId: query.typeId,
        isActive: query.isActive === 'true' ? true : 
                  query.isActive === 'false' ? false : undefined,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 10,
      };

      const result = await service.getAll(filters);
      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar unidades'
      });
    }
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const unit = await service.getById(id);
      return reply.send(unit);
    } catch (error: any) {
      if (error.message === 'Unidade não encontrada') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar unidade'
      });
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const data = request.body as any;

      const unit = await service.create(data, user.id);

      await createLog({
        userId: user.id,
        action: 'CREATE',
        description: `Unidade ${unit.name} criada`,
        entityType: 'Unit',
        entityId: unit.id,
        newValue: unit,
        req: request
      });

      return reply.status(201).send(unit);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao criar unidade'
      });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as any;
      const data = request.body as any;

      const oldUnit = await service.getById(id);
      const unit = await service.update(id, data, user.id);

      await createLog({
        userId: user.id,
        action: 'UPDATE',
        description: `Unidade ${unit.name} atualizada`,
        entityType: 'Unit',
        entityId: unit.id,
        oldValue: oldUnit,
        newValue: unit,
        req: request
      });

      return reply.send(unit);
    } catch (error: any) {
      if (error.message === 'Unidade não encontrada') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao atualizar unidade'
      });
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as any;

      const oldUnit = await service.getById(id);
      await service.delete(id, user.id);

      await createLog({
        userId: user.id,
        action: 'DELETE',
        description: `Unidade ${oldUnit.name} desativada`,
        entityType: 'Unit',
        entityId: id,
        oldValue: oldUnit,
        req: request
      });

      return reply.send({ message: 'Unidade desativada com sucesso' });
    } catch (error: any) {
      if (error.message === 'Unidade não encontrada') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao desativar unidade'
      });
    }
  }

  async getTypes(request: FastifyRequest, reply: FastifyReply) {
    try {
      const types = await service.getTypes();
      return reply.send(types);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar tipos de unidade'
      });
    }
  }
}