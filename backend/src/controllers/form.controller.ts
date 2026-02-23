// backend/src/controllers/form.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { FormService } from '../services/form.service';
import { createLog, ActionType } from '../middleware/log.middleware';

const service = new FormService();

export class FormController {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const filters = {
        type: query.type,
        isActive: query.isActive === 'true' ? true : 
                  query.isActive === 'false' ? false : undefined,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 10
      };

      const result = await service.getAll(filters);
      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar formulários'
      });
    }
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const form = await service.getById(id);
      return reply.send(form);
    } catch (error: any) {
      if (error.message === 'Formulário não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar formulário'
      });
    }
  }

  async getByType(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { type } = request.params as { type: string };
      const forms = await service.getByType(type);
      return reply.send(forms);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar formulários por tipo'
      });
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const data = request.body as any;

      const createData = {
        name: data.name,
        type: data.type,
        description: data.description || undefined,
        config: data.config
      };

      const form = await service.create(createData, user.id);

      await createLog({
        userId: user.id,
        action: ActionType.CREATE,
        description: `Formulário ${form.name} criado`,
        entityType: 'Form',
        entityId: form.id,
        newValue: { name: form.name, type: form.type },
        req: request
      });

      return reply.status(201).send(form);
    } catch (error: any) {
      if (error.message.includes('já existe')) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message,
          code: 'DUPLICATE_ENTRY'
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message || 'Erro ao criar formulário'
      });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const data = request.body as any;

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description || undefined;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.config !== undefined) updateData.config = data.config;

      const oldForm = await service.getById(id);
      const form = await service.update(id, updateData, user.id);

      await createLog({
        userId: user.id,
        action: ActionType.UPDATE,
        description: `Formulário ${form.name} atualizado`,
        entityType: 'Form',
        entityId: id,
        oldValue: { name: oldForm.name, type: oldForm.type },
        newValue: { name: form.name, type: form.type },
        req: request
      });

      return reply.send(form);
    } catch (error: any) {
      if (error.message === 'Formulário não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message || 'Erro ao atualizar formulário'
      });
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;

      const oldForm = await service.getById(id);
      await service.delete(id, user.id);

      await createLog({
        userId: user.id,
        action: ActionType.DELETE,
        description: `Formulário ${oldForm.name} excluído`,
        entityType: 'Form',
        entityId: id,
        oldValue: { name: oldForm.name, type: oldForm.type },
        req: request
      });

      return reply.send({ 
        message: 'Formulário excluído com sucesso',
        id,
        name: oldForm.name
      });
    } catch (error: any) {
      if (error.message === 'Formulário não encontrado') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message || 'Erro ao excluir formulário'
      });
    }
  }

  async toggleStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const { active } = request.body as { active: boolean };

      const form = await service.getById(id);
      const updated = await service.update(id, { isActive: active }, user.id);

      // CORREÇÃO: Usar UPDATE em vez de ACTIVATE/DEACTIVATE
      await createLog({
        userId: user.id,
        action: ActionType.UPDATE,
        description: active ? `Formulário ${form.name} ativado` : `Formulário ${form.name} desativado`,
        entityType: 'Form',
        entityId: id,
        oldValue: { isActive: !active },
        newValue: { isActive: active },
        req: request
      });

      return reply.send({
        message: active ? 'Formulário ativado' : 'Formulário desativado',
        active: updated.isActive
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao alterar status do formulário'
      });
    }
  }

  async duplicate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;

      const original = await service.getById(id);
      const duplicateData = {
        name: `${original.name} (cópia)`,
        type: original.type,
        description: original.description || undefined,
        config: original.config
      };

      const form = await service.create(duplicateData, user.id);

      await createLog({
        userId: user.id,
        action: ActionType.CREATE,
        description: `Formulário duplicado de ${original.name}`,
        entityType: 'Form',
        entityId: form.id,
        req: request
      });

      return reply.status(201).send(form);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message || 'Erro ao duplicar formulário'
      });
    }
  }
}