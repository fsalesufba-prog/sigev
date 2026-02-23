// backend/src/routes/notification.routes.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createLog, ActionType } from '../middleware/log.middleware';
import { EmailService } from '../services/email.service';

const prisma = new PrismaClient();
const emailService = new EmailService();

export default async function notificationRoutes(fastify: FastifyInstance) {
  // ==================== GET / ====================
  fastify.get('/', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        type = '',
        read = ''
      } = request.query as {
        page?: number;
        limit?: number;
        type?: string;
        read?: string;
      };

      const skip = (Number(page) - 1) * Number(limit);
      const userId = (request as any).user?.id;

      // Construir filtros
      const where: any = {
        OR: [
          { receiverId: userId }
        ]
      };

      if (type) {
        where.type = type;
      }

      if (read === 'unread') {
        where.readAt = null;
      } else if (read === 'read') {
        where.readAt = { not: null };
      }

      // Buscar notificações
      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            receiver: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            receiverUnit: {
              select: {
                id: true,
                name: true
              }
            },
            encaminhamento: {
              select: {
                id: true,
                status: true,
                deadline: true
              }
            },
            process: {
              select: {
                id: true,
                description: true,
                citizen: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit)
        }),
        prisma.notification.count({ where })
      ]);

      return reply.send({
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        },
        unreadCount: await prisma.notification.count({
          where: {
            ...where,
            readAt: null
          }
        })
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        error: 'Erro ao carregar notificações',
        notifications: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 1 },
        unreadCount: 0
      });
    }
  });

  // ==================== GET /unread-count ====================
  fastify.get('/unread-count', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.id;

      const count = await prisma.notification.count({
        where: {
          receiverId: userId,
          readAt: null
        }
      });

      return reply.send({ count });

    } catch (error) {
      request.log.error(error);
      return reply.send({ count: 0 });
    }
  });

  // ==================== GET /recent ====================
  fastify.get('/recent', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.id;

      const notifications = await prisma.notification.findMany({
        where: {
          receiverId: userId,
          readAt: null
        },
        include: {
          sender: {
            select: {
              name: true
            }
          },
          process: {
            select: {
              description: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      return reply.send(notifications);

    } catch (error) {
      request.log.error(error);
      return reply.send([]);
    }
  });

  // ==================== GET /:id ====================
  fastify.get('/:id', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user?.id;

      const notification = await prisma.notification.findFirst({
        where: {
          id,
          receiverId: userId
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          receiverUnit: {
            select: {
              id: true,
              name: true
            }
          },
          encaminhamento: {
            include: {
              process: {
                select: {
                  id: true,
                  description: true,
                  citizen: {
                    select: {
                      name: true
                    }
                  }
                }
              },
              fromUnit: {
                select: {
                  id: true,
                  name: true
                }
              },
              toUnit: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          process: {
            include: {
              citizen: {
                select: {
                  name: true
                }
              }
            }
          },
          attachments: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              mimeType: true,
              size: true
            }
          }
        }
      });

      if (!notification) {
        return reply.status(404).send({ error: 'Notificação não encontrada' });
      }

      // Marcar como lida se não estiver
      if (!notification.readAt) {
        await prisma.notification.update({
          where: { id },
          data: { readAt: new Date() }
        });
      }

      return reply.send(notification);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar notificação' });
    }
  });

  // ==================== POST /:id/read ====================
  fastify.post('/:id/read', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user?.id;

      const notification = await prisma.notification.findFirst({
        where: {
          id,
          receiverId: userId
        },
        include: {
          receiver: {
            select: {
              email: true,
              name: true
            }
          }
        }
      });

      if (!notification) {
        return reply.status(404).send({ error: 'Notificação não encontrada' });
      }

      await prisma.notification.update({
        where: { id },
        data: { readAt: new Date() }
      });

      return reply.send({ success: true });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao marcar como lida' });
    }
  });

  // ==================== POST /read-all ====================
  fastify.post('/read-all', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.id;

      await prisma.notification.updateMany({
        where: {
          receiverId: userId,
          readAt: null
        },
        data: { readAt: new Date() }
      });

      return reply.send({ success: true });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao marcar todas como lidas' });
    }
  });

  // ==================== GET /stats ====================
  fastify.get('/stats', {
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.id;

      const where = {
        receiverId: userId
      };

      const total = await prisma.notification.count({ where });
      const unread = await prisma.notification.count({ 
        where: { ...where, readAt: null }
      });
      const encaminhamentos = await prisma.notification.count({ 
        where: { ...where, type: 'ENCAMINHAMENTO' }
      });
      const alertas = await prisma.notification.count({ 
        where: { ...where, type: 'ALERTA' }
      });
      const sistema = await prisma.notification.count({ 
        where: { ...where, type: 'SISTEMA' }
      });

      return reply.send({
        total,
        unread,
        encaminhamentos,
        alertas,
        sistema
      });

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ 
        total: 0,
        unread: 0,
        encaminhamentos: 0,
        alertas: 0,
        sistema: 0
      });
    }
  });
}

// ==================== FUNÇÕES AUXILIARES PARA CRIAR NOTIFICAÇÕES ====================

export async function createNotification(data: {
  type: 'ENCAMINHAMENTO' | 'PENDENCIA' | 'ALERTA' | 'SISTEMA';
  title: string;
  message: string;
  senderId: string;
  receiverId: string;
  encaminhamentoId?: string;
  processId?: string;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        senderId: data.senderId,
        receiverId: data.receiverId,
        encaminhamentoId: data.encaminhamentoId || null,
        processId: data.processId || null
      },
      include: {
        sender: {
          select: {
            name: true,
            email: true
          }
        },
        receiver: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // 🔥 ENVIAR EMAIL PARA CADA NOTIFICAÇÃO CRIADA
    if (notification) {
      const receiverEmail = notification.receiver?.email;
      
      if (receiverEmail) {
        let emailSubject = '';
        let emailHtml = '';

        switch (data.type) {
          case 'ENCAMINHAMENTO':
            emailSubject = `📨 Novo Encaminhamento - ${data.title}`;
            emailHtml = `
              <h2>Novo Encaminhamento</h2>
              <p><strong>${data.title}</strong></p>
              <p>${data.message}</p>
              <p>Acesse o sistema para mais detalhes.</p>
            `;
            break;
          case 'PENDENCIA':
            emailSubject = `⏰ Pendência - ${data.title}`;
            emailHtml = `
              <h2>Pendência no Sistema</h2>
              <p><strong>${data.title}</strong></p>
              <p>${data.message}</p>
              <p>Regularize o mais breve possível.</p>
            `;
            break;
          case 'ALERTA':
            emailSubject = `⚠️ Alerta - ${data.title}`;
            emailHtml = `
              <h2>Alerta do Sistema</h2>
              <p><strong>${data.title}</strong></p>
              <p>${data.message}</p>
              <p>Este é um alerta importante.</p>
            `;
            break;
          case 'SISTEMA':
            emailSubject = `🔔 Notificação do Sistema - ${data.title}`;
            emailHtml = `
              <h2>Notificação do Sistema</h2>
              <p><strong>${data.title}</strong></p>
              <p>${data.message}</p>
              <p>Acesse o sistema para mais informações.</p>
            `;
            break;
        }

        // Enviar email (assíncrono - não esperar)
        emailService.sendMail({
          to: receiverEmail,
          subject: emailSubject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; }
                .header { background: linear-gradient(135deg, #0066FF, #00D4FF); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                .button { display: inline-block; background: #0066FF; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>SIGEV - Sistema de Notificações</h1>
                </div>
                ${emailHtml}
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL}/portal/notifications" class="button">Ver no Sistema</a>
                </div>
                <div class="footer">
                  <p>SIGEV - Sistema Integrado de Gestão da Escuta de Violência</p>
                  <p>© ${new Date().getFullYear()} - Todos os direitos reservados</p>
                </div>
              </div>
            </body>
            </html>
          `
        }).catch(error => {
          console.error('❌ Erro ao enviar email de notificação:', error);
        });
      }
    }

    return notification;
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return null;
  }
}

// Funções específicas para cada tipo de notificação

export async function notifyEncaminhamento(
  senderId: string,
  receiverId: string,
  encaminhamentoId: string,
  processId: string,
  processDescription: string
) {
  return createNotification({
    type: 'ENCAMINHAMENTO',
    title: 'Novo Encaminhamento',
    message: `Um novo processo foi encaminhado para você: ${processDescription}`,
    senderId,
    receiverId,
    encaminhamentoId,
    processId
  });
}

export async function notifyPendencia(
  senderId: string,
  receiverId: string,
  processId: string,
  processDescription: string,
  deadline: Date
) {
  const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  return createNotification({
    type: 'PENDENCIA',
    title: 'Prazo Próximo do Vencimento',
    message: `O processo "${processDescription}" vence em ${daysLeft} dia(s)`,
    senderId,
    receiverId,
    processId
  });
}

export async function notifyAlerta(
  senderId: string,
  receiverId: string,
  title: string,
  message: string
) {
  return createNotification({
    type: 'ALERTA',
    title,
    message,
    senderId,
    receiverId
  });
}

export async function notifySistema(
  receiverId: string,
  title: string,
  message: string
) {
  // Usar um ID de sistema (precisa existir no banco)
  const systemUserId = process.env.SYSTEM_USER_ID || '18f8e97b-0d0a-11f1-baa6-54455e060403'; // ID de um admin
  
  return createNotification({
    type: 'SISTEMA',
    title,
    message,
    senderId: systemUserId,
    receiverId
  });
}

export async function notifyUnidade(
  receiverId: string,
  title: string,
  message: string,
  type: 'ENCAMINHAMENTO' | 'PENDENCIA' | 'ALERTA' | 'SISTEMA' = 'ALERTA'
) {
  const systemUserId = process.env.SYSTEM_USER_ID || '18f8e97b-0d0a-11f1-baa6-54455e060403';
  
  return createNotification({
    type,
    title,
    message,
    senderId: systemUserId,
    receiverId
  });
}