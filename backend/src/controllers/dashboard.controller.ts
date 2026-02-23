// backend/src/controllers/dashboard.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DashboardController {
  /**
   * Dashboard principal com todos os dados (itens 7.1, 7.2, 7.3)
   */
  async getDashboardData(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      
      // Pega os IDs das unidades do usuário
      const userUnitIds = user?.units?.map((unit: any) => unit.id) || [];
      
      // Se for admin, pode ver tudo
      const where = user.isAdmin ? {} : 
                   userUnitIds.length > 0 ? { unitId: { in: userUnitIds } } : {};

      // Estatísticas gerais
      const stats = await this.getStats(where);
      
      // Dados dos gráficos
      const charts = await this.getChartsData(where, user);
      
      // Processos recentes
      const recentProcesses = await this.getRecentProcesses(where);

      return reply.send({
        stats,
        charts,
        recentProcesses
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao carregar dashboard'
      });
    }
  }

  /**
   * Estatísticas gerais
   */
  private async getStats(where: any) {
    const [
      totalProcesses,
      pendingProcesses,
      inProgressProcesses,
      completedProcesses,
      urgentProcesses,
      totalProfessionals,
      totalUnits
    ] = await Promise.all([
      prisma.process.count({ where }),
      prisma.process.count({ where: { ...where, status: 'PENDING' } }),
      prisma.process.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.process.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.process.count({ where: { ...where, priority: { in: ['HIGH', 'URGENT'] } } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.unit.count({ where: { isActive: true } })
    ]);

    // Calcular tempo médio de resposta - CORRIGIDO com tipagem explícita
    const completedProcessesWithDates = await prisma.process.findMany({
      where: { ...where, status: 'COMPLETED' },
      select: {
        createdAt: true,
        updatedAt: true
      }
    });

    const averageResponseTime = completedProcessesWithDates.length > 0
      ? completedProcessesWithDates.reduce((acc: number, p: { createdAt: Date; updatedAt: Date }) => {
          const diff = (p.updatedAt.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return acc + diff;
        }, 0) / completedProcessesWithDates.length
      : 0;

    return {
      totalProcesses,
      pendingProcesses,
      inProgressProcesses,
      completedProcesses,
      urgentProcesses,
      averageResponseTime: Math.round(averageResponseTime * 10) / 10,
      totalProfessionals,
      totalUnits
    };
  }

  /**
   * Dados dos gráficos
   */
  private async getChartsData(where: any, user: any) {
    // Formas de identificação (item 7.2)
    const identificationForms = await prisma.process.groupBy({
      by: ['identificationForm'],
      where,
      _count: true
    });

    const identificationData = {
      revelacao: 0,
      suspeita: 0,
      denuncia: 0,
      total: 0
    };

    identificationForms.forEach((item: { identificationForm: any; _count: number }) => {
      const count = item._count;
      identificationData.total += count;
      
      switch (item.identificationForm) {
        case 'REVELACAO_ESPONTANEA':
          identificationData.revelacao = count;
          break;
        case 'SUSPEITA_PROFISSIONAL':
          identificationData.suspeita = count;
          break;
        case 'DENUNCIA':
          identificationData.denuncia = count;
          break;
      }
    });

    // Violências por sexo (item 7.3)
    const violenceByGender = await this.getViolenceByGender(where);

    // Inatividade (item 7.1)
    const inactivity = await this.getInactivityData(where, user);

    return {
      identificationForms: identificationData,
      violenceByGender,
      inactivity
    };
  }

  /**
   * Dados de violência por sexo
   */
  private async getViolenceByGender(where: any) {
    const processes = await prisma.process.findMany({
      where,
      include: {
        citizen: true,
        violences: {
          include: {
            violence: true
          }
        }
      }
    });

    const violenceMap = new Map();

    processes.forEach((process: any) => {
      const gender = process.citizen.gender || 'OTHER';
      process.violences.forEach((pv: any) => {
        const violenceName = pv.violence.name;
        
        if (!violenceMap.has(violenceName)) {
          violenceMap.set(violenceName, {
            violence: violenceName,
            masculino: 0,
            feminino: 0,
            other: 0
          });
        }

        const data = violenceMap.get(violenceName);
        if (gender === 'M') data.masculino++;
        else if (gender === 'F') data.feminino++;
        else data.other++;
      });
    });

    const violenceArray = Array.from(violenceMap.values());

    return {
      masculino: violenceArray.map((v: any) => ({ violence: v.violence, count: v.masculino }))
        .filter((v: any) => v.count > 0)
        .sort((a: any, b: any) => b.count - a.count),
      feminino: violenceArray.map((v: any) => ({ violence: v.violence, count: v.feminino }))
        .filter((v: any) => v.count > 0)
        .sort((a: any, b: any) => b.count - a.count)
    };
  }

  /**
   * Dados de inatividade
   */
  private async getInactivityData(where: any, user: any) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Para admin, mostrar todas as unidades
    // Para profissional, mostrar apenas suas unidades
    const userUnitIds = user?.units?.map((u: any) => u.id) || [];
    const unitWhere = user.isAdmin ? {} : 
                     { id: { in: userUnitIds } };

    // Unidades inativas
    const units = await prisma.unit.findMany({
      where: unitWhere,
      select: {
        id: true,
        name: true,
        processes: {
          where: {
            updatedAt: {
              gte: thirtyDaysAgo
            }
          },
          orderBy: {
            updatedAt: 'desc'
          },
          take: 1
        }
      }
    });

    const inactiveUnits = units
      .map((unit: any) => {
        const lastProcess = unit.processes[0];
        const daysInactive = lastProcess 
          ? Math.floor((Date.now() - lastProcess.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
          : 30;

        return {
          id: unit.id,
          name: unit.name,
          days: daysInactive,
          status: daysInactive > 20 ? 'critical' : daysInactive > 10 ? 'warning' : 'normal'
        };
      })
      .filter((unit: any) => unit.days > 0)
      .sort((a: any, b: any) => b.days - a.days)
      .slice(0, 5);

    // Profissionais inativos
    const professionals = await prisma.user.findMany({
      where: {
        deletedAt: null,
        professionalUnits: {
          some: unitWhere.id ? unitWhere : {}
        }
      },
      select: {
        id: true,
        name: true,
        professionalUnits: {
          where: { isActive: true },
          include: { unit: true },
          take: 1
        },
        processes: {
          where: {
            updatedAt: {
              gte: thirtyDaysAgo
            }
          },
          orderBy: {
            updatedAt: 'desc'
          },
          take: 1
        }
      }
    });

    const inactiveProfessionals = professionals
      .map((prof: any) => {
        const unit = prof.professionalUnits[0]?.unit;
        const lastProcess = prof.processes[0];
        const daysInactive = lastProcess 
          ? Math.floor((Date.now() - lastProcess.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
          : 30;

        return {
          id: prof.id,
          name: prof.name,
          unit: unit?.name || 'Sem unidade',
          days: daysInactive,
          status: daysInactive > 20 ? 'critical' : daysInactive > 10 ? 'warning' : 'normal'
        };
      })
      .filter((prof: any) => prof.days > 0)
      .sort((a: any, b: any) => b.days - a.days)
      .slice(0, 5);

    return {
      units: inactiveUnits,
      professionals: inactiveProfessionals
    };
  }

  /**
   * Processos recentes
   */
  private async getRecentProcesses(where: any) {
    const processes = await prisma.process.findMany({
      where,
      include: {
        citizen: true,
        unit: true,
        professional: true,
        violences: {
          include: {
            violence: true
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    return processes.map((p: any) => ({
      id: p.id,
      citizenName: p.citizen.name,
      violence: p.violences[0]?.violence.name || 'Não especificado',
      status: p.status,
      priority: p.priority,
      createdAt: p.createdAt.toISOString(),
      unit: p.unit.name,
      professional: p.professional.name
    }));
  }

  /**
   * Dados para o gráfico de inatividade (item 7.1)
   */
  async getInactivityChart(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { type } = request.query as { type?: 'unit' | 'professional' };
      const user = request.user as any;
      
      // Pega os IDs das unidades do usuário
      const userUnitIds = user?.units?.map((u: any) => u.id) || [];
      
      // Para admin, ver tudo; para profissional, apenas suas unidades
      const where = user.isAdmin ? {} : 
                   { unitId: { in: userUnitIds } };

      const inactivityData = await this.getInactivityData(where, user);

      if (type === 'unit') {
        return reply.send(inactivityData.units);
      } else if (type === 'professional') {
        return reply.send(inactivityData.professionals);
      }

      return reply.send(inactivityData);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao carregar dados de inatividade'
      });
    }
  }

  /**
   * Dados para o gráfico de formas de identificação (item 7.2)
   */
  async getIdentificationChart(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const userUnitIds = user?.units?.map((u: any) => u.id) || [];
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

      const where: any = user.isAdmin ? {} : 
                        { unitId: { in: userUnitIds } };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const identificationForms = await prisma.process.groupBy({
        by: ['identificationForm'],
        where,
        _count: true
      });

      const result = {
        revelacao: 0,
        suspeita: 0,
        denuncia: 0,
        total: 0
      };

      identificationForms.forEach((item: any) => {
        const count = item._count;
        result.total += count;
        
        switch (item.identificationForm) {
          case 'REVELACAO_ESPONTANEA':
            result.revelacao = count;
            break;
          case 'SUSPEITA_PROFISSIONAL':
            result.suspeita = count;
            break;
          case 'DENUNCIA':
            result.denuncia = count;
            break;
        }
      });

      return reply.send(result);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao carregar dados de identificação'
      });
    }
  }

  /**
   * Dados para o gráfico de violências por sexo (item 7.3)
   */
  async getViolenceByGenderChart(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const userUnitIds = user?.units?.map((u: any) => u.id) || [];
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

      const where: any = user.isAdmin ? {} : 
                        { unitId: { in: userUnitIds } };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const violenceByGender = await this.getViolenceByGender(where);

      return reply.send(violenceByGender);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao carregar dados de violência por sexo'
      });
    }
  }
}