// backend/src/services/form.service.ts
import { FormRepository } from '../repositories/form.repository';
import { CreateFormDTO, UpdateFormDTO, FormFilters } from '../types/form.types';

const repository = new FormRepository();

export class FormService {
  async getAll(filters: FormFilters) {
    const { forms, total } = await repository.findAll(filters);

    const formatted = forms.map(form => ({
      id: form.id,
      name: form.name,
      type: form.type,
      description: form.description,
      isActive: form.isActive,
      config: form.config,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString()
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
    const form = await repository.findById(id);
    if (!form) {
      throw new Error('Formulário não encontrado');
    }
    return form;
  }

  async getByType(type: string) {
    return repository.findByType(type);
  }

  async create(data: CreateFormDTO, userId: string) {
    // Validar se já existe formulário com mesmo nome e tipo
    const { forms } = await repository.findAll({ 
      search: data.name
    });
    
    if (forms.length > 0) {
      const exactMatch = forms.find(f => 
        f.name.toLowerCase() === data.name.toLowerCase() && 
        f.type === data.type
      );
      if (exactMatch) {
        throw new Error('Já existe um formulário com este nome e tipo');
      }
    }

    // Não validar estrutura - deixar o Prisma lidar com Json
    return repository.create(data);
  }

  async update(id: string, data: UpdateFormDTO, userId: string) {
    const existing = await repository.findById(id);
    if (!existing) {
      throw new Error('Formulário não encontrado');
    }

    return repository.update(id, data);
  }

  async delete(id: string, userId: string) {
    const existing = await repository.findById(id);
    if (!existing) {
      throw new Error('Formulário não encontrado');
    }

    return repository.delete(id);
  }
}