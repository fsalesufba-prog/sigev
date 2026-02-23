// backend/src/services/citizen.service.ts
import { CitizenRepository } from '../repositories/citizen.repository';
import { CreateCitizenDTO, UpdateCitizenDTO, CitizenFilters } from '../types/citizen.types';
import { createLog, ActionType } from '../middleware/log.middleware';

const repository = new CitizenRepository();

export class CitizenService {
  async getAll(filters: CitizenFilters) {
    try {
      console.log('🔍 Service getAll - filters:', filters);
      
      const { citizens, total } = await repository.findAll(filters);

      const formatted = citizens.map(c => ({
        id: c.id,
        name: c.name,
        birthDate: c.birthDate.toISOString(),
        gender: c.gender,
        cpf: c.cpf,
        age: this.calculateAge(c.birthDate),
        address: c.address,
        phone: c.phone,
        processCount: c.processes?.length || 0
      }));

      return {
        data: formatted,
        total,
        page: filters.page || 1,
        limit: filters.limit || 10,
        totalPages: Math.ceil(total / (filters.limit || 10))
      };
    } catch (error) {
      console.error('❌ Erro no service getAll:', error);
      throw error;
    }
  }

  async getById(id: string) {
    try {
      const citizen = await repository.findById(id);
      if (!citizen) {
        throw new Error('Cidadão não encontrado');
      }

      return {
        ...citizen,
        age: this.calculateAge(citizen.birthDate),
        processes: citizen.processes.map(p => ({
          id: p.id,
          status: p.status,
          priority: p.priority,
          createdAt: p.createdAt,
          unit: p.unit?.name,
          professional: p.professional?.name,
          violence: p.violences[0]?.violence?.name || 'Não especificado'
        }))
      };
    } catch (error) {
      console.error('❌ Erro no service getById:', error);
      throw error;
    }
  }

  async getByCpf(cpf: string) {
    try {
      return await repository.findByCpf(cpf);
    } catch (error) {
      console.error('❌ Erro no service getByCpf:', error);
      throw error;
    }
  }

  async create(data: CreateCitizenDTO, userId: string) {
    try {
      // Validar CPF único
      if (data.cpf) {
        const existing = await repository.findByCpf(data.cpf);
        if (existing) {
          throw new Error('CPF já cadastrado');
        }
      }

      const citizen = await repository.create(data);

      await createLog({
        userId,
        action: ActionType.CREATE,
        description: `Cidadão ${citizen.name} criado`,
        entityType: 'Citizen',
        entityId: citizen.id,
        newValue: citizen,
        req: null
      });

      return citizen;
    } catch (error) {
      console.error('❌ Erro no service create:', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateCitizenDTO, userId: string) {
    try {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new Error('Cidadão não encontrado');
      }

      // Validar CPF único (se estiver mudando)
      if (data.cpf && data.cpf !== existing.cpf) {
        const cpfExists = await repository.findByCpf(data.cpf);
        if (cpfExists) {
          throw new Error('CPF já cadastrado para outro cidadão');
        }
      }

      const citizen = await repository.update(id, data);

      await createLog({
        userId,
        action: ActionType.UPDATE,
        description: `Cidadão ${citizen.name} atualizado`,
        entityType: 'Citizen',
        entityId: citizen.id,
        oldValue: existing,
        newValue: citizen,
        req: null
      });

      return citizen;
    } catch (error) {
      console.error('❌ Erro no service update:', error);
      throw error;
    }
  }

  async delete(id: string, userId: string) {
    try {
      const existing = await repository.findById(id);
      if (!existing) {
        throw new Error('Cidadão não encontrado');
      }

      // Verificar se tem processos ativos
      if (existing.processes && existing.processes.length > 0) {
        throw new Error('Não é possível excluir cidadão com processos vinculados');
      }

      await repository.delete(id);

      await createLog({
        userId,
        action: ActionType.DELETE,
        description: `Cidadão ${existing.name} excluído`,
        entityType: 'Citizen',
        entityId: id,
        oldValue: existing,
        req: null
      });

      return { message: 'Cidadão removido com sucesso' };
    } catch (error) {
      console.error('❌ Erro no service delete:', error);
      throw error;
    }
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}