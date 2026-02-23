// backend/src/repositories/unit.repository.ts
import { PrismaClient } from '@prisma/client';
import { CreateUnitDTO, UpdateUnitDTO, UnitFilters } from '../types/unit.types';

const prisma = new PrismaClient();

export class UnitRepository {
  async findAll(filters: UnitFilters = {}) {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
        { email: { contains: filters.search } },
        { phone: { contains: filters.search } },
      ];
    }

    if (filters.typeId) where.typeId = filters.typeId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    const skip = filters.page && filters.limit 
      ? (filters.page - 1) * filters.limit 
      : undefined;
    const take = filters.limit || undefined;

    const [units, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        include: {
          type: { select: { id: true, description: true } },
          professionals: {
            where: { isActive: true },
            select: { id: true }
          },
          processes: {
            where: { deletedAt: null },
            select: { id: true }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take
      }),
      prisma.unit.count({ where })
    ]);

    return { units, total };
  }

  async findById(id: string) {
    return prisma.unit.findUnique({
      where: { id },
      include: {
        type: true,
        professionals: {
          where: { isActive: true },
          include: {
            professional: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        processes: {
          where: { deletedAt: null },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            citizen: { select: { name: true } }
          }
        }
      }
    });
  }

  async create(data: CreateUnitDTO) {
    return prisma.unit.create({
      data: {
        name: data.name,
        description: data.description,
        email: data.email,
        phone: data.phone,
        address: data.address,
        typeId: data.typeId
      },
      include: {
        type: true
      }
    });
  }

  async update(id: string, data: UpdateUnitDTO) {
    return prisma.unit.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        email: data.email,
        phone: data.phone,
        address: data.address,
        typeId: data.typeId,
        isActive: data.isActive
      },
      include: {
        type: true
      }
    });
  }

  async delete(id: string) {
    return prisma.unit.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async getTypes() {
    return prisma.unitType.findMany({
      where: { isActive: true },
      orderBy: { description: 'asc' }
    });
  }
}