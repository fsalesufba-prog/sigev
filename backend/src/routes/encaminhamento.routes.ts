// backend/src/routes/encaminhamento.routes.ts
import { FastifyInstance } from 'fastify';
import { EncaminhamentoController } from '../controllers/encaminhamento.controller';
import { EmailService } from '../services/email.service';
import { PrismaClient } from '@prisma/client';
import { createLog, ActionType } from '../middleware/log.middleware';

const controller = new EncaminhamentoController();
const emailService = new EmailService();
const prisma = new PrismaClient();

export default async function encaminhamentoRoutes(fastify: FastifyInstance) {
  // ==================== GET / ====================
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, controller.getAll.bind(controller));

  // ==================== GET /process/:processId ====================
  fastify.get('/process/:processId', {
    preHandler: [fastify.authenticate]
  }, controller.getByProcessId.bind(controller));

  // ==================== GET /:id ====================
  fastify.get('/:id', {
    preHandler: [fastify.authenticate]
  }, controller.getById.bind(controller));

  // ==================== POST / ====================
  // CRIAR ENCAMINHAMENTO - Envia email para unidade destino (Itens 2.9 e 6.5)
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      // Chama o controller primeiro para criar o encaminhamento
      const result = await controller.create(request, reply);
      
      // Se o controller retornou o encaminhamento criado
      if (result && (result as any).id) {
        const encaminhamento = result as any;
        
        // Buscar dados completos do encaminhamento com relações
        const fullEncaminhamento = await prisma.encaminhamento.findUnique({
          where: { id: encaminhamento.id },
          include: {
            process: {
              include: {
                citizen: { select: { name: true } }
              }
            },
            fromUnit: true,
            toUnit: {
              include: {
                professionals: {
                  where: { isActive: true },
                  include: {
                    professional: {
                      select: {
                        id: true,
                        name: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        });

        if (fullEncaminhamento) {
          // Extrair emails dos profissionais da unidade de destino
          const targetEmails = fullEncaminhamento.toUnit.professionals
            .map(p => p.professional.email)
            .filter(Boolean);

          // Enviar email para todos os profissionais da unidade destino
          if (targetEmails.length > 0) {
            emailService.sendEncaminhamentoNotification(
              fullEncaminhamento.process,
              fullEncaminhamento,
              targetEmails
            ).catch(error => {
              console.error('❌ Erro ao enviar email de encaminhamento:', error);
            });

            // Log do envio
            await createLog({
              userId: (request as any).user?.id,
              action: 'EMAIL_SENT' as any,
              description: `Email de encaminhamento enviado para ${targetEmails.length} profissionais da unidade ${fullEncaminhamento.toUnit.name}`,
              entityType: 'Encaminhamento',
              entityId: fullEncaminhamento.id,
              req: request
            }).catch(() => {});
          }
        }
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  });

  // ==================== PATCH /:id/open ====================
  fastify.patch('/:id/open', {
    preHandler: [fastify.authenticate]
  }, controller.open.bind(controller));

  // ==================== PATCH /:id/complete ====================
  fastify.patch('/:id/complete', {
    preHandler: [fastify.authenticate]
  }, controller.complete.bind(controller));

  // ==================== PATCH /:id/cancel ====================
  fastify.patch('/:id/cancel', {
    preHandler: [fastify.authenticate]
  }, controller.cancel.bind(controller));
}