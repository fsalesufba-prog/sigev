// backend/src/repositories/citizen.repository.ts
import { PrismaClient } from '@prisma/client';
import { CreateCitizenDTO, UpdateCitizenDTO, CitizenFilters } from '../types/citizen.types';

const prisma = new PrismaClient();

export class CitizenRepository {
  async findAll(filters: CitizenFilters = {}) {
    try {
      const where: any = { deletedAt: null };

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search } },
          { cpf: { contains: filters.search } },
          { rg: { contains: filters.search } },
          { motherName: { contains: filters.search } },
        ];
      }

      if (filters.gender) where.gender = filters.gender;
      if (filters.hasDisability !== undefined) where.hasDisability = filters.hasDisability;
      if (filters.hasHealthProblem !== undefined) where.hasHealthProblem = filters.hasHealthProblem;

      const skip = filters.page && filters.limit 
        ? (filters.page - 1) * filters.limit 
        : undefined;
      const take = filters.limit || undefined;

      const [citizens, total] = await Promise.all([
        prisma.citizen.findMany({
          where,
          include: {
            processes: {
              where: { deletedAt: null },
              select: { id: true }
            }
          },
          orderBy: { name: 'asc' },
          skip,
          take
        }),
        prisma.citizen.count({ where })
      ]);

      return { citizens, total };
    } catch (error) {
      console.error('❌ Erro no repository findAll:', error);
      throw error;
    }
  }

  async findById(id: string) {
    try {
      return await prisma.citizen.findFirst({
        where: { id, deletedAt: null },
        include: {
          processes: {
            where: { deletedAt: null },
            include: {
              unit: { select: { name: true } },
              professional: { select: { name: true } },
              violences: {
                include: { violence: { select: { name: true } } }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    } catch (error) {
      console.error('❌ Erro no repository findById:', error);
      throw error;
    }
  }

  async findByCpf(cpf: string) {
    try {
      return await prisma.citizen.findFirst({
        where: { cpf, deletedAt: null }
      });
    } catch (error) {
      console.error('❌ Erro no repository findByCpf:', error);
      throw error;
    }
  }

  async create(data: CreateCitizenDTO) {
    try {
      return await prisma.citizen.create({
        data: {
          name: data.name,
          birthDate: data.birthDate,
          gender: data.gender,
          cpf: data.cpf,
          rg: data.rg,
          motherName: data.motherName,
          fatherName: data.fatherName,
          motherCpf: data.motherCpf,
          fatherCpf: data.fatherCpf,
          address: data.address,
          phone: data.phone,
          email: data.email,
          education: data.education,
          hasDisability: data.hasDisability || false,
          disabilityType: data.disabilityType,
          hasHealthProblem: data.hasHealthProblem || false,
          healthProblemDesc: data.healthProblemDesc,
          usesMedication: data.usesMedication || false,
          medicationDesc: data.medicationDesc,
        }
      });
    } catch (error) {
      console.error('❌ Erro no repository create:', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateCitizenDTO) {
    try {
      return await prisma.citizen.update({
        where: { id },
        data: {
          name: data.name,
          birthDate: data.birthDate,
          gender: data.gender,
          cpf: data.cpf,
          rg: data.rg,
          motherName: data.motherName,
          fatherName: data.fatherName,
          motherCpf: data.motherCpf,
          fatherCpf: data.fatherCpf,
          address: data.address,
          phone: data.phone,
          email: data.email,
          education: data.education,
          hasDisability: data.hasDisability,
          disabilityType: data.disabilityType,
          hasHealthProblem: data.hasHealthProblem,
          healthProblemDesc: data.healthProblemDesc,
          usesMedication: data.usesMedication,
          medicationDesc: data.medicationDesc,
        }
      });
    } catch (error) {
      console.error('❌ Erro no repository update:', error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      return await prisma.citizen.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
    } catch (error) {
      console.error('❌ Erro no repository delete:', error);
      throw error;
    }
  }
}