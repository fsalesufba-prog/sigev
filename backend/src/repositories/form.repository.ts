// backend/src/repositories/form.repository.ts
import { PrismaClient } from '@prisma/client';
import { CreateFormDTO, UpdateFormDTO, FormFilters } from '../types/form.types';

const prisma = new PrismaClient();

export class FormRepository {
  async findAll(filters: FormFilters = {}) {
    const where: any = {};

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } }
      ];
    }

    const skip = filters.page && filters.limit 
      ? (filters.page - 1) * filters.limit 
      : undefined;
    const take = filters.limit || undefined;

    const [forms, total] = await Promise.all([
      prisma.form.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take
      }),
      prisma.form.count({ where })
    ]);

    return { forms, total };
  }

  async findById(id: string) {
    return prisma.form.findUnique({
      where: { id }
    });
  }

  async findByType(type: string) {
    return prisma.form.findMany({
      where: { 
        type: type as any,
        isActive: true 
      },
      orderBy: { name: 'asc' }
    });
  }

  async create(data: CreateFormDTO) {
    return prisma.form.create({
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        config: data.config as any // Prisma aceita Json
      }
    });
  }

  async update(id: string, data: UpdateFormDTO) {
    return prisma.form.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        config: data.config as any
      }
    });
  }

  async delete(id: string) {
    return prisma.form.delete({
      where: { id }
    });
  }
}