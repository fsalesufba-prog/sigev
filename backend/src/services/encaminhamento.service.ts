// backend/src/services/encaminhamento.service.ts
import { EncaminhamentoRepository } from '../repositories/encaminhamento.repository';
import { CreateEncaminhamentoDTO, UpdateEncaminhamentoDTO, EncaminhamentoFilters } from '../types/encaminhamento.types';
import { prisma } from '../config/database';

const repository = new EncaminhamentoRepository();

export class EncaminhamentoService {
  async getAll(filters: EncaminhamentoFilters, user: any) {
    const { encaminhamentos, total } = await repository.findAll(filters);

    const formatted = encaminhamentos.map(e => ({
      id: e.id,
      processId: e.processId,
      citizenName: e.process?.citizen?.name,
      fromUnit: e.fromUnit.name,
      toUnit: e.toUnit.name,
      description: e.description,
      status: e.status,
      createdAt: e.createdAt,
      deadline: e.deadline
    }));

    return {
      data: formatted,
      total,
      page: filters.page || 1,
      limit: filters.limit || 10,
      totalPages: Math.ceil(total / (filters.limit || 10))
    };
  }

  async getById(id: string) {
    const encaminhamento = await repository.findById(id);
    if (!encaminhamento) {
      throw new Error('Encaminhamento não encontrado');
    }
    return encaminhamento;
  }

  async getByProcessId(processId: string) {
    return repository.findByProcessId(processId);
  }

  async create(data: CreateEncaminhamentoDTO, user: any) {
    // Validar processo
    const process = await prisma.process.findFirst({
      where: { id: data.processId, deletedAt: null }
    });
    if (!process) {
      throw new Error('Processo não encontrado');
    }

    // Validar unidade de destino
    const toUnit = await prisma.unit.findFirst({
      where: { id: data.toUnitId, isActive: true }
    });
    if (!toUnit) {
      throw new Error('Unidade de destino não encontrada');
    }

    // Validar se a unidade de destino é diferente da origem
    if (data.toUnitId === user.unitId) {
      throw new Error('A unidade de destino deve ser diferente da unidade de origem');
    }

    return repository.create(data, user.unitId, user.id);
  }

  async open(id: string, userId: string) {
    const encaminhamento = await repository.findById(id);
    if (!encaminhamento) {
      throw new Error('Encaminhamento não encontrado');
    }

    if (encaminhamento.status !== 'PENDING') {
      throw new Error('Este encaminhamento não pode ser aberto');
    }

    return repository.updateStatus(id, {
      status: 'OPENED',
      openedAt: new Date(),
      openedBy: userId
    });
  }

  async complete(id: string) {
    const encaminhamento = await repository.findById(id);
    if (!encaminhamento) {
      throw new Error('Encaminhamento não encontrado');
    }

    return repository.updateStatus(id, { status: 'COMPLETED' });
  }

  async cancel(id: string) {
    const encaminhamento = await repository.findById(id);
    if (!encaminhamento) {
      throw new Error('Encaminhamento não encontrado');
    }

    return repository.updateStatus(id, { status: 'CANCELLED' });
  }
}