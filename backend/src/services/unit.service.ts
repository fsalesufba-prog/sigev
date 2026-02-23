// backend/src/services/unit.service.ts
import { UnitRepository } from '../repositories/unit.repository';
import { CreateUnitDTO, UpdateUnitDTO, UnitFilters } from '../types/unit.types';

const repository = new UnitRepository();

export class UnitService {
  async getAll(filters: UnitFilters) {
    const { units, total } = await repository.findAll(filters);

    const formatted = units.map(unit => ({
      id: unit.id,
      name: unit.name,
      description: unit.description,
      email: unit.email,
      phone: unit.phone,
      address: unit.address,
      type: unit.type.description,
      typeId: unit.typeId,
      isActive: unit.isActive,
      professionalsCount: unit.professionals.length,
      processesCount: unit.processes.length
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
    const unit = await repository.findById(id);
    if (!unit) {
      throw new Error('Unidade não encontrada');
    }
    return unit;
  }

  async create(data: CreateUnitDTO, userId: string) {
    return repository.create(data);
  }

  async update(id: string, data: UpdateUnitDTO, userId: string) {
    const existing = await repository.findById(id);
    if (!existing) {
      throw new Error('Unidade não encontrada');
    }
    return repository.update(id, data);
  }

  async delete(id: string, userId: string) {
    const existing = await repository.findById(id);
    if (!existing) {
      throw new Error('Unidade não encontrada');
    }
    return repository.delete(id);
  }

  async getTypes() {
    return repository.getTypes();
  }
}