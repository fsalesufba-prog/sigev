// backend/src/controllers/admin/parameters.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createLog, ActionType } from '../middleware/log.middleware';

const prisma = new PrismaClient();

export class ParametersController {
  /**
   * GET /admin/parameters
   * Buscar parâmetros do sistema
   */
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      
      // Usar query raw em vez do modelo
      const result = await prisma.$queryRaw`
        SELECT * FROM SystemParameters WHERE id = 'default' LIMIT 1
      ` as any[];
      
      let parameters;
      
      if (result && result.length > 0) {
        parameters = {
          id: result[0].id,
          sistema: JSON.parse(result[0].sistema),
          seguranca: JSON.parse(result[0].seguranca),
          notificacoes: JSON.parse(result[0].notificacoes),
          processos: JSON.parse(result[0].processos),
          upload: JSON.parse(result[0].upload),
          auditoria: JSON.parse(result[0].auditoria)
        };
      } else {
        // Valores padrão
        parameters = {
          id: 'default',
          sistema: {
            nome: 'SIGEV',
            versao: '1.0.0',
            ambiente: process.env.NODE_ENV || 'development',
            url: process.env.FRONTEND_URL || 'https://sigev.sqtecnologiadainformacao.com',
            manutencao: false,
            mensagemManutencao: null
          },
          seguranca: {
            maxTentativasLogin: 5,
            tempoBloqueioMinutos: 30,
            sessaoExpiracaoHoras: 8,
            exigirMfa: false,
            politicaSenha: {
              tamanhoMinimo: 6,
              exigirMaiuscula: false,
              exigirMinuscula: false,
              exigirNumero: false,
              exigirEspecial: false,
              diasExpiracao: 90,
              historicoSenhas: 5
            },
            bloqueioHorario: {
              ativo: false,
              inicio: '22:00',
              fim: '06:00'
            }
          },
          notificacoes: {
            emailAlertas: true,
            emailResumoDiario: true,
            diasParaAlertaPrazo: 2,
            horarioResumoDiario: '08:00'
          },
          processos: {
            prazoPadraoDias: 15,
            tipoPrazoPadrao: 'DAYS',
            prioridadePadrao: 'NORMAL',
            permitirExclusao: false
          },
          upload: {
            tamanhoMaximoMB: 50,
            tiposPermitidos: [
              'image/jpeg', 'image/png', 'image/gif',
              'application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'audio/mpeg', 'audio/wav',
              'video/mp4'
            ],
            path: '/uploads'
          },
          auditoria: {
            manterLogsDias: 90,
            nivelLog: 'completo',
            logAcessos: true
          }
        };
      }

      await createLog({
        userId: user?.id,
        action: ActionType.VIEW,
        description: 'Visualizou parâmetros do sistema',
        entityType: 'SystemParameters',
        entityId: parameters.id,
        req: request
      });

      return reply.send(parameters);
    } catch (error) {
      request.log.error(error);
      // Retornar valores padrão em caso de erro
      return reply.send({
        sistema: {
          nome: 'SIGEV',
          versao: '1.0.0',
          ambiente: process.env.NODE_ENV || 'development',
          url: process.env.FRONTEND_URL || 'https://sigev.sqtecnologiadainformacao.com',
          manutencao: false,
          mensagemManutencao: null
        },
        seguranca: {
          maxTentativasLogin: 5,
          tempoBloqueioMinutos: 30,
          sessaoExpiracaoHoras: 8,
          exigirMfa: false,
          politicaSenha: {
            tamanhoMinimo: 6,
            exigirMaiuscula: false,
            exigirMinuscula: false,
            exigirNumero: false,
            exigirEspecial: false,
            diasExpiracao: 90,
            historicoSenhas: 5
          },
          bloqueioHorario: { ativo: false, inicio: '22:00', fim: '06:00' }
        },
        notificacoes: {
          emailAlertas: true,
          emailResumoDiario: true,
          diasParaAlertaPrazo: 2,
          horarioResumoDiario: '08:00'
        },
        processos: {
          prazoPadraoDias: 15,
          tipoPrazoPadrao: 'DAYS',
          prioridadePadrao: 'NORMAL',
          permitirExclusao: false
        },
        upload: {
          tamanhoMaximoMB: 50,
          tiposPermitidos: [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'audio/mpeg', 'audio/wav',
            'video/mp4'
          ],
          path: '/uploads'
        },
        auditoria: {
          manterLogsDias: 90,
          nivelLog: 'completo',
          logAcessos: true
        }
      });
    }
  }

  /**
   * PUT /admin/parameters
   * Atualizar parâmetros do sistema
   */
  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const body = request.body as any;

      // Verificar se já existe
      const exists = await prisma.$queryRaw`
        SELECT id FROM SystemParameters WHERE id = 'default' LIMIT 1
      ` as any[];

      if (exists && exists.length > 0) {
        // Atualizar
        await prisma.$executeRaw`
          UPDATE SystemParameters 
          SET 
            sistema = ${JSON.stringify(body.sistema)},
            seguranca = ${JSON.stringify(body.seguranca)},
            notificacoes = ${JSON.stringify(body.notificacoes)},
            processos = ${JSON.stringify(body.processos)},
            upload = ${JSON.stringify(body.upload)},
            auditoria = ${JSON.stringify(body.auditoria)},
            updatedAt = NOW(),
            updatedBy = ${user?.id || null}
          WHERE id = 'default'
        `;
      } else {
        // Inserir
        await prisma.$executeRaw`
          INSERT INTO SystemParameters (
            id, sistema, seguranca, notificacoes, processos, upload, auditoria, updatedAt, updatedBy
          ) VALUES (
            'default',
            ${JSON.stringify(body.sistema)},
            ${JSON.stringify(body.seguranca)},
            ${JSON.stringify(body.notificacoes)},
            ${JSON.stringify(body.processos)},
            ${JSON.stringify(body.upload)},
            ${JSON.stringify(body.auditoria)},
            NOW(),
            ${user?.id || null}
          )
        `;
      }

      await createLog({
        userId: user?.id,
        action: ActionType.UPDATE,
        description: 'Atualizou parâmetros do sistema',
        entityType: 'SystemParameters',
        entityId: 'default',
        newValue: body,
        req: request
      });

      return reply.send({ 
        message: 'Parâmetros atualizados com sucesso',
        ...body 
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar parâmetros' });
    }
  }

  /**
   * PATCH /admin/parameters/maintenance
   * Ativar/desativar modo de manutenção
   */
  async toggleMaintenance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { ativo, mensagem } = request.body as any;

      // Buscar parâmetros atuais
      const result = await prisma.$queryRaw`
        SELECT sistema FROM SystemParameters WHERE id = 'default' LIMIT 1
      ` as any[];
      
      if (result && result.length > 0) {
        const sistema = JSON.parse(result[0].sistema);
        sistema.manutencao = ativo;
        sistema.mensagemManutencao = mensagem || null;
        
        await prisma.$executeRaw`
          UPDATE SystemParameters 
          SET sistema = ${JSON.stringify(sistema)},
              updatedAt = NOW(),
              updatedBy = ${user?.id || null}
          WHERE id = 'default'
        `;
      }

      await createLog({
        userId: user?.id,
        action: ActionType.UPDATE,
        description: ativo ? 'Ativou modo de manutenção' : 'Desativou modo de manutenção',
        req: request
      });

      return reply.send({ 
        message: ativo ? 'Modo de manutenção ativado' : 'Modo de manutenção desativado',
        manutencao: ativo,
        mensagem: mensagem || null
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao alternar modo de manutenção' });
    }
  }
}