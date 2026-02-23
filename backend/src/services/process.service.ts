// backend/src/services/process.service.ts
import { ProcessRepository } from '../repositories/process.repository';
import { CreateProcessDTO, UpdateProcessDTO, ProcessFilters, ProcessResponse } from '../types/process.types';
import { prisma } from '../config/database';

const repository = new ProcessRepository();

export class ProcessService {
  async getAll(filters: ProcessFilters, user: any) {
    // Aplicar filtro de unidade baseado no usuário
    if (!user.isAdmin && user.units?.length) {
      filters.unitId = filters.unitId || user.units[0]?.id;
    }

    const { processes, total } = await repository.findAll(filters);

    // Formatar para resposta
    const formatted = processes.map(p => ({
      id: p.id,
      citizenName: p.citizen.name,
      citizenId: p.citizen.id,
      citizenCpf: p.citizen.cpf,
      violence: p.violences[0]?.violence?.name || 'Não especificado',
      violenceId: p.violences[0]?.violence?.id,
      status: p.status,
      priority: p.priority,
      createdAt: p.createdAt.toISOString(),
      unit: p.unit.name,
      unitId: p.unit.id,
      professional: p.professional.name,
      professionalId: p.professional.id,
      isFavorite: p.isFavorite,
      identificationForm: p.identificationForm
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
    const process = await repository.findById(id);
    if (!process) {
      throw new Error('Processo não encontrado');
    }
    return process;
  }

  async getByCitizenId(citizenId: string) {
    return repository.findByCitizenId(citizenId);
  }

  async getPending() {
    return repository.findPending();
  }

  async getFavorites(userId: string, unitIds: string[]) {
    return repository.findFavorites(userId, unitIds);
  }

  async create(data: CreateProcessDTO, userId: string) {
    // Validar se citizen existe
    const citizen = await prisma.citizen.findUnique({
      where: { id: data.citizenId }
    });
    if (!citizen) {
      throw new Error('Cidadão não encontrado');
    }

    // Validar se professional existe
    const professional = await prisma.user.findUnique({
      where: { id: data.professionalId }
    });
    if (!professional) {
      throw new Error('Profissional não encontrado');
    }

    // Validar se unit existe
    const unit = await prisma.unit.findUnique({
      where: { id: data.unitId }
    });
    if (!unit) {
      throw new Error('Unidade não encontrada');
    }

    // Validar violências
    if (data.violenceIds?.length) {
      const violences = await prisma.violence.findMany({
        where: { id: { in: data.violenceIds } }
      });
      if (violences.length !== data.violenceIds.length) {
        throw new Error('Uma ou mais violências não foram encontradas');
      }
    }

    return repository.create(data, userId);
  }

  async update(id: string, data: UpdateProcessDTO, userId: string) {
    const existing = await repository.findById(id);
    if (!existing) {
      throw new Error('Processo não encontrado');
    }

    return repository.update(id, data, userId);
  }

  async delete(id: string, userId: string) {
    const existing = await repository.findById(id);
    if (!existing) {
      throw new Error('Processo não encontrado');
    }

    return repository.delete(id, userId);
  }

  async markAsRead(id: string, userId: string) {
    return repository.markAsRead(id, userId);
  }

  async toggleFavorite(id: string) {
    return repository.toggleFavorite(id);
  }
}