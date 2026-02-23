// backend/src/controllers/admin/email.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createLog, ActionType } from '../middleware/log.middleware';
import { EmailService } from '../services/email.service';

const prisma = new PrismaClient();
const emailService = new EmailService();

interface EmailTemplate {
  id: string;
  nome: string;
  tipo: string;
  assunto: string;
  corpo: string;
  variaveis: string[];
  ativo: boolean;
  ultimaAtualizacao: string;
}

export class EmailController {
  /**
   * GET /admin/email/config
   * Configuração de e-mail
   */
  async getConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const config = {
        servidor: {
          host: process.env.EMAIL_HOST || 'smtp.gmail.com',
          port: Number(process.env.EMAIL_PORT) || 587,
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER || '',
            pass: process.env.EMAIL_PASSWORD ? '********' : ''
          }
        },
        remetente: {
          nome: process.env.EMAIL_FROM_NAME || 'SIGEV',
          email: process.env.EMAIL_FROM || 'noreply@sigev.com'
        },
        templates: {
          boasVindas: true,
          recuperacaoSenha: true,
          notificacaoEncaminhamento: true,
          alertaPendencia: true,
          resumoDiario: true
        },
        limites: {
          maxEmailsPorDia: 1000,
          maxEmailsPorHora: 100,
          maxDestinatariosPorEmail: 50
        }
      };

      return reply.send(config);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar configuração de e-mail' });
    }
  }

  /**
   * PUT /admin/email/config
   * Atualizar configuração de e-mail
   */
  async updateConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const config = request.body as any;

      // Aqui você salvaria as configurações no banco
      // Por enquanto, apenas log

      await createLog({
        userId: user?.id,
        action: ActionType.UPDATE,
        description: 'Atualizou configurações de e-mail',
        req: request
      });

      return reply.send({ 
        message: 'Configurações atualizadas com sucesso',
        config: {
          ...config,
          servidor: {
            ...config.servidor,
            auth: {
              ...config.servidor.auth,
              pass: '********'
            }
          }
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar configuração' });
    }
  }

  /**
   * GET /admin/email/templates
   * Listar templates de e-mail
   */
async getTemplates(request: FastifyRequest, reply: FastifyReply) {
  try {
    const templates: EmailTemplate[] = [
      {
        id: 'boas_vindas',
        nome: 'Boas-vindas',
        tipo: 'boas_vindas',
        assunto: 'Bem-vindo ao SIGEV',
        corpo: this.getWelcomeTemplate(),
        variaveis: ['{{nome}}', '{{email}}', '{{senha}}', '{{link}}'],
        ativo: true,
        ultimaAtualizacao: new Date().toISOString()
      },
      {
        id: 'recuperacao_senha',
        nome: 'Recuperação de Senha',
        tipo: 'recuperacao_senha',
        assunto: 'Recuperação de Senha - SIGEV',
        corpo: this.getResetPasswordTemplate(),
        variaveis: ['{{nome}}', '{{link}}'],
        ativo: true,
        ultimaAtualizacao: new Date().toISOString()
      },
      {
        id: 'encaminhamento',
        nome: 'Novo Encaminhamento',
        tipo: 'encaminhamento',
        assunto: 'Novo encaminhamento - SIGEV',
        corpo: this.getEncaminhamentoTemplate(),
        variaveis: ['{{processo}}', '{{cidadao}}', '{{unidade}}', '{{data}}', '{{prazo}}', '{{link}}'],
        ativo: true,
        ultimaAtualizacao: new Date().toISOString()
      },
      {
        id: 'pendencia',
        nome: 'Alerta de Pendência',
        tipo: 'pendencia',
        assunto: 'Alerta de Pendência - SIGEV',
        corpo: this.getPendenciaTemplate(),
        variaveis: ['{{processo}}', '{{cidadao}}', '{{dias}}', '{{link}}'],
        ativo: true,
        ultimaAtualizacao: new Date().toISOString()
      },
      {
        id: 'resumo',
        nome: 'Resumo Diário',
        tipo: 'resumo',
        assunto: 'Resumo Diário - SIGEV',
        corpo: this.getResumoTemplate(),
        variaveis: ['{{nome}}', '{{pendentes}}', '{{notificacoes}}', '{{link}}'],
        ativo: true,
        ultimaAtualizacao: new Date().toISOString()
      }
    ];

    return reply.send(templates);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Erro ao buscar templates' });
  }
}

// Métodos auxiliares para retornar os templates diretamente
private getWelcomeTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0066FF, #00D4FF); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .credentials { background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #0066FF, #00D4FF); color: white; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bem-vindo ao SIGEV!</h1>
    </div>
    <div class="content">
      <p>Olá <strong>{{nome}}</strong>,</p>
      <p>Seu cadastro no SIGEV foi realizado com sucesso!</p>
      <div class="credentials">
        <h3 style="margin-top: 0;">🔐 Dados de Acesso</h3>
        <p><strong>E-mail:</strong> {{email}}</p>
        <p><strong>Senha temporária:</strong> {{senha}}</p>
      </div>
      <div style="text-align: center;">
        <a href="{{link}}" class="button">Acessar o Sistema</a>
      </div>
    </div>
    <div class="footer">
      <p>SIGEV - Sistema Integrado de Gestão da Escuta de Violência</p>
    </div>
  </div>
</body>
</html>`;
}

private getResetPasswordTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0066FF, #00D4FF); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; background: linear-gradient(135deg, #0066FF, #00D4FF); color: white; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 12px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Recuperação de Senha</h1>
    </div>
    <div class="content">
      <p>Olá <strong>{{nome}}</strong>,</p>
      <p>Recebemos uma solicitação de recuperação de senha.</p>
      <div style="text-align: center;">
        <a href="{{link}}" class="button">Redefinir Senha</a>
      </div>
      <p>Se o botão não funcionar, copie e cole o link abaixo:</p>
      <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">{{link}}</p>
      <div class="warning">⏰ Este link é válido por 1 hora.</div>
    </div>
    <div class="footer">
      <p>SIGEV - Sistema Integrado de Gestão da Escuta de Violência</p>
    </div>
  </div>
</body>
</html>`;
}

private getEncaminhamentoTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0066FF, #00D4FF); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .info { background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #0066FF, #00D4FF); color: white; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
    .deadline { color: #dc3545; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📨 Novo Encaminhamento</h1>
    </div>
    <div class="content">
      <p>Um novo processo foi encaminhado para sua unidade.</p>
      <div class="info">
        <h3 style="margin-top: 0;">📋 Detalhes</h3>
        <p><strong>Processo:</strong> {{processo}}</p>
        <p><strong>Cidadão:</strong> {{cidadao}}</p>
        <p><strong>Unidade de Origem:</strong> {{unidade}}</p>
        <p><strong>Data:</strong> {{data}}</p>
        <p><strong class="deadline">⏰ Prazo:</strong> {{prazo}}</p>
      </div>
      <div style="text-align: center;">
        <a href="{{link}}" class="button">Visualizar Processo</a>
      </div>
    </div>
    <div class="footer">
      <p>SIGEV - Sistema de Encaminhamentos</p>
    </div>
  </div>
</body>
</html>`;
}

private getPendenciaTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #dc3545, #ffc107); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #0066FF, #00D4FF); color: white; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Alerta de Pendência</h1>
    </div>
    <div class="content">
      <div class="warning">
        <strong>⏰ ATENÇÃO:</strong> Um encaminhamento está pendente há <strong>{{dias}} dia(s)</strong>.
      </div>
      <p><strong>Processo:</strong> {{processo}}</p>
      <p><strong>Cidadão:</strong> {{cidadao}}</p>
      <div style="text-align: center;">
        <a href="{{link}}" class="button">Visualizar Encaminhamento</a>
      </div>
    </div>
    <div class="footer">
      <p>Este é um alerta automático do SIGEV</p>
    </div>
  </div>
</body>
</html>`;
}

private getResumoTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0066FF, #00D4FF); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .summary { text-align: center; margin-bottom: 30px; }
    .summary-number { font-size: 48px; font-weight: 700; color: #0066FF; }
    .item { background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 10px 0; border-left: 4px solid #0066FF; }
    .button { display: inline-block; background: linear-gradient(135deg, #0066FF, #00D4FF); color: white; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Resumo Diário - SIGEV</h1>
    </div>
    <div class="content">
      <p>Olá <strong>{{nome}}</strong>,</p>
      <div class="summary">
        <span class="summary-number">{{pendentes}}</span> processos pendentes<br>
        <span class="summary-number">{{notificacoes}}</span> notificações
      </div>
      <div style="text-align: center;">
        <a href="{{link}}" class="button">Acessar Dashboard</a>
      </div>
    </div>
    <div class="footer">
      <p>© SIGEV - Sistema Integrado de Gestão da Escuta de Violência</p>
    </div>
  </div>
</body>
</html>`;
}

  /**
   * PUT /admin/email/templates/:id
   * Atualizar template
   */
  async updateTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const { assunto, corpo } = request.body as any;

      // Aqui você salvaria o template no banco
      // Por enquanto, apenas log

      await createLog({
        userId: user?.id,
        action: ActionType.UPDATE,
        description: `Atualizou template de email: ${id}`,
        req: request
      });

      return reply.send({ 
        message: 'Template atualizado com sucesso',
        template: { id, assunto, corpo }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar template' });
    }
  }

  /**
   * POST /admin/email/send
   * Enviar e-mail manualmente
   */
  async sendEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { to, subject, html, tipo } = request.body as any;

      if (!to || !subject || !html) {
        return reply.status(400).send({ error: 'Destinatário, assunto e conteúdo são obrigatórios' });
      }

      const result = await emailService.sendMail({
        to,
        subject,
        html
      });

      await createLog({
        userId: user?.id,
        action: ActionType.CREATE,
        description: `Enviou e-mail ${tipo || 'manual'} para ${to}`,
        req: request
      });

      if (result) {
        return reply.send({ 
          message: 'E-mail enviado com sucesso',
          destinatario: to,
          assunto: subject
        });
      } else {
        return reply.status(500).send({ error: 'Falha ao enviar e-mail' });
      }
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao enviar e-mail' });
    }
  }

  /**
   * POST /admin/email/send-welcome
   * Enviar e-mail de boas-vindas para um usuário
   */
  async sendWelcome(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { userId, temporaryPassword } = request.body as any;

      const targetUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!targetUser) {
        return reply.status(404).send({ error: 'Usuário não encontrado' });
      }

      const result = await emailService.sendWelcomeEmail(targetUser, temporaryPassword);

      await createLog({
        userId: user?.id,
        action: ActionType.CREATE,
        description: `Enviou e-mail de boas-vindas para ${targetUser.email}`,
        req: request
      });

      if (result) {
        return reply.send({ message: 'E-mail de boas-vindas enviado com sucesso' });
      } else {
        return reply.status(500).send({ error: 'Falha ao enviar e-mail' });
      }
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao enviar e-mail de boas-vindas' });
    }
  }

  /**
   * POST /admin/email/send-reset
   * Enviar e-mail de recuperação de senha
   */
  async sendReset(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { userId, resetToken } = request.body as any;

      const targetUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!targetUser) {
        return reply.status(404).send({ error: 'Usuário não encontrado' });
      }

      const result = await emailService.sendPasswordResetEmail(targetUser, resetToken);

      await createLog({
        userId: user?.id,
        action: ActionType.CREATE,
        description: `Enviou e-mail de recuperação para ${targetUser.email}`,
        req: request
      });

      if (result) {
        return reply.send({ message: 'E-mail de recuperação enviado com sucesso' });
      } else {
        return reply.status(500).send({ error: 'Falha ao enviar e-mail' });
      }
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao enviar e-mail de recuperação' });
    }
  }

  /**
   * GET /admin/email/logs
   * Logs de e-mail
   */
  async getLogs(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 20;

      // Em produção, buscaria de uma tabela de email_logs
      const logs: any[] = [];
      
      return reply.send({
        logs,
        total: 0,
        page,
        limit,
        totalPages: 1,
        estatisticas: {
          enviadosHoje: 0,
          falhasHoje: 0,
          pendentes: 0,
          limiteDiario: 1000
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar logs de e-mail' });
    }
  }

  /**
   * Helper para extrair corpo do template
   */
  private extractTemplateBody(emailPromise: Promise<any>): string {
    // Retorna um template básico - em produção, isso viria do banco
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #0066FF, #00D4FF); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 40px 30px; }
          .button { display: inline-block; background: linear-gradient(135deg, #0066FF, #00D4FF); color: white; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>{{titulo}}</h1>
          </div>
          <div class="content">
            {{conteudo}}
          </div>
          <div class="footer">
            <p>SIGEV - Sistema Integrado de Gestão da Escuta de Violência</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}