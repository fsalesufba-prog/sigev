// backend/src/controllers/report.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ReportController {
  /**
   * GET /reports/kpi
   * Indicadores principais
   */
  async getKPI(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const { startDate, endDate, unitId } = query;

      const where: any = { deletedAt: null };
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }
      
      if (unitId) where.unitId = unitId;

      const [total, pending, completed] = await Promise.all([
        prisma.process.count({ where }),
        prisma.process.count({ where: { ...where, status: 'PENDING' } }),
        prisma.process.count({ where: { ...where, status: 'COMPLETED' } })
      ]);

      const completedProcesses = await prisma.process.findMany({
        where: { ...where, status: 'COMPLETED' },
        select: { createdAt: true, updatedAt: true }
      });

      const averageCompletionDays = completedProcesses.length > 0
        ? completedProcesses.reduce((acc, p) => {
            const days = Math.ceil(
              (p.updatedAt.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            return acc + days;
          }, 0) / completedProcesses.length
        : 0;

      return reply.send({
        totalProcesses: total,
        pendingProcesses: pending,
        completedProcesses: completed,
        averageCompletionDays: Number(averageCompletionDays.toFixed(1))
      });
    } catch (error) {
      console.error('Erro no KPI:', error);
      return reply.status(500).send({ error: 'Erro ao gerar KPI' });
    }
  }

  /**
   * GET /reports/processes-by-citizen
   * Item 9.1 - Processos por cidadão
   */
  async getProcessesByCitizen(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const { startDate, endDate, unitId, status } = query;

      const where: any = { deletedAt: null };
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }
      
      if (unitId) where.unitId = unitId;
      if (status) where.status = status;

      const processes = await prisma.process.findMany({
        where,
        include: {
          citizen: true,
          unit: true,
          professional: { select: { id: true, name: true } },
          violences: { include: { violence: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Agrupar por cidadão
      const citizenMap = new Map();

      for (const p of processes) {
        if (!citizenMap.has(p.citizen.id)) {
          citizenMap.set(p.citizen.id, {
            citizenId: p.citizen.id,
            citizenName: p.citizen.name,
            birthDate: p.citizen.birthDate.toISOString(),
            totalProcesses: 0,
            processes: []
          });
        }

        const citizenReport = citizenMap.get(p.citizen.id);
        citizenReport.totalProcesses++;

        citizenReport.processes.push({
          id: p.id,
          date: p.createdAt.toISOString(),
          unit: p.unit.name,
          professional: p.professional.name,
          identificationForm: p.identificationForm,
          violences: p.violences.map((v: any) => v.violence.name),
          status: p.status
        });
      }

      const result = Array.from(citizenMap.values());
      return reply.send(result);
    } catch (error) {
      console.error('Erro em processes-by-citizen:', error);
      return reply.status(500).send({ error: 'Erro ao gerar relatório' });
    }
  }

  /**
   * GET /reports/pending-processes
   * Item 9.2 - Processos pendentes por unidade
   */
  async getPendingProcesses(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const { unitId } = query;

      const where: any = { 
        status: 'PENDING', 
        deletedAt: null 
      };
      
      if (unitId) where.unitId = unitId;

      const processes = await prisma.process.findMany({
        where,
        include: {
          citizen: true,
          unit: true,
          professional: { select: { id: true, name: true } },
          violences: { include: { violence: true } }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      const result = processes.map(p => {
        const daysOpen = Math.ceil(
          (new Date().getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        const citizenAge = p.citizen.birthDate 
          ? Math.floor((new Date().getTime() - p.citizen.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
          : 0;

        return {
          id: p.id,
          citizenName: p.citizen.name,
          citizenAge,
          createdAt: p.createdAt.toISOString(),
          deadline: p.deadline?.toISOString() || null,
          priority: p.priority || 'NORMAL',
          professional: p.professional.name,
          unit: p.unit.name,
          daysOpen,
          violences: p.violences.map((v: any) => v.violence.name)
        };
      });

      return reply.send(result);
    } catch (error) {
      console.error('Erro em pending-processes:', error);
      return reply.status(500).send({ error: 'Erro ao gerar relatório' });
    }
  }

  /**
   * GET /reports/inactivity
   * Item 7.1 - Inatividade de unidade/profissional
   */
  async getInactivity(request: FastifyRequest, reply: FastifyReply) {
    try {
      const units = await prisma.unit.findMany({
        where: { isActive: true },
        include: {
          professionals: {
            where: { isActive: true },
            include: {
              professional: {
                select: {
                  id: true,
                  name: true,
                  lastLogin: true,
                  processes: {
                    where: { status: { not: 'COMPLETED' } },
                    select: { id: true }
                  }
                }
              }
            }
          },
          processes: {
            where: { status: { not: 'COMPLETED' } },
            select: { id: true }
          }
        }
      });

      const result = [];
      const now = new Date();

      for (const unit of units) {
        const unitProfessionals = unit.professionals.map((p: any) => p.professional);
        const lastUnitAccess = unitProfessionals
          .map((p: any) => p.lastLogin)
          .filter((d: any) => d !== null)
          .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];

        const daysWithoutAccess = lastUnitAccess
          ? Math.floor((now.getTime() - lastUnitAccess.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const unitData: any = {
          id: unit.id,
          name: unit.name,
          daysWithoutAccess,
          totalProcesses: unit.processes.length,
          professionals: []
        };

        for (const pu of unit.professionals) {
          const prof = pu.professional;
          const lastAccess = prof.lastLogin;
          const profDaysWithoutAccess = lastAccess
            ? Math.floor((now.getTime() - lastAccess.getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          unitData.professionals.push({
            id: prof.id,
            name: prof.name,
            daysWithoutAccess: profDaysWithoutAccess,
            lastAccess: lastAccess?.toISOString() || null,
            assignedProcesses: prof.processes.length
          });
        }

        unitData.professionals.sort((a: any, b: any) => b.daysWithoutAccess - a.daysWithoutAccess);
        result.push(unitData);
      }

      result.sort((a: any, b: any) => b.daysWithoutAccess - a.daysWithoutAccess);
      return reply.send({ units: result });
    } catch (error) {
      console.error('Erro em inactivity:', error);
      return reply.status(500).send({ error: 'Erro ao gerar relatório de inatividade' });
    }
  }

  /**
   * GET /reports/identification-form
   * Item 7.2 - Formas de identificação
   */
  async getIdentificationForm(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const { startDate, endDate } = query;

      const where: any = { deletedAt: null };
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const processes = await prisma.process.findMany({
        where,
        select: {
          identificationForm: true
        }
      });

      const total = processes.length;
      
      const revelacao = processes.filter(p => p.identificationForm === 'REVELACAO_ESPONTANEA').length;
      const suspeita = processes.filter(p => p.identificationForm === 'SUSPEITA_PROFISSIONAL').length;
      const denuncia = processes.filter(p => p.identificationForm === 'DENUNCIA').length;

      return reply.send({
        total,
        revelacaoEspontanea: revelacao,
        suspeitaProfissional: suspeita,
        denuncia
      });
    } catch (error) {
      console.error('Erro em identification-form:', error);
      return reply.status(500).send({ error: 'Erro ao gerar relatório' });
    }
  }

  /**
   * GET /reports/violence-by-gender
   * Item 7.3 - Violências por sexo
   */
  async getViolenceByGender(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const { startDate, endDate } = query;

      const where: any = { deletedAt: null };
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const processes = await prisma.process.findMany({
        where,
        include: {
          citizen: { select: { gender: true } },
          violences: { include: { violence: true } }
        }
      });

      const violenceMap = new Map();

      for (const p of processes) {
        const gender = p.citizen.gender;
        
        for (const pv of p.violences) {
          const violenceId = pv.violence.id;
          const violenceName = pv.violence.name;

          if (!violenceMap.has(violenceId)) {
            violenceMap.set(violenceId, {
              violenceType: violenceName,
              masculine: 0,
              feminine: 0,
              other: 0,
              total: 0
            });
          }

          const item = violenceMap.get(violenceId);
          
          if (gender === 'M') {
            item.masculine++;
          } else if (gender === 'F') {
            item.feminine++;
          } else {
            item.other++;
          }
          item.total++;
        }
      }

      const data = Array.from(violenceMap.values());
      return reply.send({ data });
    } catch (error) {
      console.error('Erro em violence-by-gender:', error);
      return reply.status(500).send({ error: 'Erro ao gerar relatório' });
    }
  }
}