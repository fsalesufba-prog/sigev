// backend/src/services/email.service.ts
import { sendMail, MailOptions } from '../config/mail';
import { createLog, ActionType } from '../middleware/log.middleware';

export class EmailService {
  // URL base do frontend (configurada no .env)
  private getFrontendUrl(): string {
    return process.env.FRONTEND_URL || 'https://sigev.sqtecnologiadainformacao.com';
  }

  /**
   * Método genérico para enviar email
   */
  async sendMail(options: MailOptions): Promise<boolean> {
    return sendMail(options);
  }

  /**
   * Enviar email de boas-vindas para novo usuário
   * (Atende item 1.5 - recuperação de senha e criação)
   */
  async sendWelcomeEmail(user: any, temporaryPassword: string) {
    const frontendUrl = this.getFrontendUrl();
    const loginLink = `${frontendUrl}/auth/login`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Inter', Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #0066FF, #00D4FF);
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
            background: white;
          }
          .content p {
            color: #333;
            line-height: 1.6;
            margin: 0 0 20px;
            font-size: 16px;
          }
          .credentials {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            border: 1px solid #e9ecef;
          }
          .credentials div {
            margin: 10px 0;
            font-size: 15px;
          }
          .credentials strong {
            color: #0066FF;
            min-width: 100px;
            display: inline-block;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #0066FF, #00D4FF);
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 30px;
            font-weight: 600;
            margin-top: 20px;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e9ecef;
          }
          .footer p {
            color: #6c757d;
            font-size: 14px;
            margin: 0;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bem-vindo ao SIGEV!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${user.name}</strong>,</p>
            <p>Seu cadastro no Sistema Integrado de Gestão da Escuta de Violência foi realizado com sucesso! Agora você faz parte da Rede de Proteção à Criança e ao Adolescente do Município de Luzerna.</p>
            
            <div class="credentials">
              <h3 style="margin-top: 0; color: #333;">🔐 Dados de Acesso</h3>
              <div><strong>E-mail:</strong> ${user.email}</div>
              <div><strong>Senha temporária:</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px;">${temporaryPassword}</code></div>
            </div>

            <p><strong>⚠️ Importante:</strong> Por segurança, você deverá trocar esta senha no primeiro acesso.</p>

            <div style="text-align: center;">
              <a href="${loginLink}" class="button">Acessar o Sistema</a>
            </div>

            <div class="warning">
              <strong>🔒 Segurança:</strong> Este é um sistema sigiloso que contém informações sensíveis. O acesso é restrito a profissionais autorizados da rede. Não compartilhe suas credenciais.
            </div>
          </div>
          <div class="footer">
            <p>SIGEV - Sistema Integrado de Gestão da Escuta de Violência</p>
            <p>Secretaria de Assistência Social - Município de Luzerna/SC</p>
            <p>© ${new Date().getFullYear()} - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Olá ${user.name},

      Seu cadastro no SIGEV foi realizado com sucesso!

      Dados de acesso:
      E-mail: ${user.email}
      Senha temporária: ${temporaryPassword}

      Acesse: ${loginLink}

      Por segurança, troque sua senha no primeiro acesso.

      SIGEV - Sistema Integrado de Gestão da Escuta de Violência
    `;

    return await sendMail({
      to: user.email,
      subject: '🎉 Bem-vindo ao SIGEV - Seu acesso foi criado',
      html,
      text
    });
  }

  /**
   * Enviar email de recuperação de senha
   * (Atende item 1.5 do Edital)
   */
  async sendPasswordResetEmail(user: any, resetToken: string) {
    const frontendUrl = this.getFrontendUrl();
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    const html = `
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
          .warning { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 12px; border-radius: 8px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Recuperação de Senha</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${user.name}</strong>,</p>
            <p>Recebemos uma solicitação de recuperação de senha para sua conta no SIGEV.</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Redefinir Senha</a>
            </div>

            <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">${resetLink}</p>

            <div class="warning">
              ⏰ Este link é válido por 1 hora. Se você não solicitou esta recuperação, ignore este email.
            </div>
          </div>
          <div class="footer">
            <p>SIGEV - Sistema Integrado de Gestão da Escuta de Violência</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendMail({
      to: user.email,
      subject: '🔐 Recuperação de Senha - SIGEV',
      html
    });
  }

  /**
   * Notificar novo encaminhamento
   * (Atende itens 2.9 e 6.5 do Edital)
   */
  async sendEncaminhamentoNotification(
    process: any,
    encaminhamento: any,
    targetEmails: string[]
  ) {
    const frontendUrl = this.getFrontendUrl();
    const processLink = `${frontendUrl}/portal/processes/${process.id}`;

    const html = `
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
          .info { background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .info div { margin: 10px 0; }
          .info strong { color: #0066FF; min-width: 150px; display: inline-block; }
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
            <p>Prezado(a),</p>
            <p>Um novo processo foi encaminhado para sua unidade.</p>
            
            <div class="info">
              <h3 style="margin-top: 0;">📋 Detalhes do Encaminhamento</h3>
              <div><strong>Processo ID:</strong> ${process.id}</div>
              <div><strong>Cidadão:</strong> ${process.citizen?.name || 'N/A'}</div>
              <div><strong>Unidade de Origem:</strong> ${encaminhamento.fromUnit?.name || 'N/A'}</div>
              <div><strong>Data:</strong> ${new Date(encaminhamento.createdAt).toLocaleString('pt-BR')}</div>
              ${encaminhamento.deadline ? `<div><strong class="deadline">⏰ Prazo:</strong> ${new Date(encaminhamento.deadline).toLocaleString('pt-BR')}</div>` : ''}
            </div>

            <div style="text-align: center;">
              <a href="${processLink}" class="button">Visualizar Processo</a>
            </div>
          </div>
          <div class="footer">
            <p>SIGEV - Sistema de Encaminhamentos</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendMail({
      to: targetEmails,
      subject: `📨 Novo encaminhamento - Processo #${process.id?.substring(0, 8) || 'N/A'}`,
      html
    });
  }

  /**
   * Notificar pendências diárias
   * (Atende item 2.10 do Edital)
   */
  async sendDailyDigest(user: any, pendingProcesses: any[], notifications: any[]) {
    const frontendUrl = this.getFrontendUrl();
    const dashboardLink = `${frontendUrl}/portal/dashboard`;
    const hasItems = pendingProcesses.length > 0 || notifications.length > 0;
    
    const html = `
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
          .summary { text-align: center; margin-bottom: 30px; }
          .summary-number { font-size: 48px; font-weight: 700; color: #0066FF; }
          .summary-label { color: #6c757d; font-size: 14px; }
          .item { background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 10px 0; border-left: 4px solid #0066FF; }
          .item.pending { border-left-color: #ffc107; }
          .item.urgent { border-left-color: #dc3545; }
          .item-title { font-weight: 600; color: #333; margin-bottom: 5px; }
          .item-meta { color: #6c757d; font-size: 13px; }
          .deadline-warning { color: #dc3545; font-size: 12px; font-weight: 600; }
          .button { display: inline-block; background: linear-gradient(135deg, #0066FF, #00D4FF); color: white; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; margin-top: 20px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
          .no-items { color: #6c757d; text-align: center; padding: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Resumo Diário - SIGEV</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${user.name}</strong>,</p>
            <p>Aqui está seu resumo diário do SIGEV:</p>

            <div class="summary">
              <div>
                <span class="summary-number">${pendingProcesses.length}</span>
                <span class="summary-label"> processos pendentes</span>
              </div>
              <div style="margin-top: 10px;">
                <span class="summary-number">${notifications.length}</span>
                <span class="summary-label"> notificações não lidas</span>
              </div>
            </div>

            ${!hasItems ? `
              <div class="no-items">
                🎉 Nenhuma pendência ou notificação no momento!
              </div>
            ` : ''}

            ${pendingProcesses.length > 0 ? `
              <h3 style="margin-bottom: 15px;">⏳ Processos Pendentes</h3>
              ${pendingProcesses.slice(0, 5).map(p => `
                <div class="item pending">
                  <div class="item-title">${p.citizenName || 'N/A'}</div>
                  <div class="item-meta">Processo #${p.id?.substring(0, 8)} • Prioridade: ${p.priority || 'N/A'}</div>
                  ${p.deadline ? `<div class="deadline-warning">⏰ Prazo: ${new Date(p.deadline).toLocaleDateString('pt-BR')}</div>` : ''}
                </div>
              `).join('')}
              ${pendingProcesses.length > 5 ? `<p style="color: #6c757d;">... e mais ${pendingProcesses.length - 5} processos</p>` : ''}
            ` : ''}

            ${notifications.length > 0 ? `
              <h3 style="margin: 20px 0 15px;">🔔 Notificações</h3>
              ${notifications.slice(0, 5).map(n => `
                <div class="item">
                  <div class="item-title">${n.title || 'N/A'}</div>
                  <div class="item-meta">${n.message || ''}</div>
                </div>
              `).join('')}
              ${notifications.length > 5 ? `<p style="color: #6c757d;">... e mais ${notifications.length - 5} notificações</p>` : ''}
            ` : ''}

            <div style="text-align: center;">
              <a href="${dashboardLink}" class="button">Acessar Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>Você está recebendo este email porque é cadastrado no SIGEV.</p>
            <p>© ${new Date().getFullYear()} - SIGEV</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendMail({
      to: user.email,
      subject: `📊 Resumo Diário SIGEV - ${new Date().toLocaleDateString('pt-BR')}`,
      html
    });
  }

  /**
   * Notificar quando encaminhamento não for aberto
   * (Atende item 6.5 do Edital - alerta diário)
   */
  async sendEncaminhamentoAbertoNotification(encaminhamento: any, daysOpen: number) {
    const frontendUrl = this.getFrontendUrl();
    const encaminhamentoLink = `${frontendUrl}/portal/encaminhamentos/${encaminhamento.id}`;

    const html = `
      <!DOCTYPE html>
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
            <h1>⚠️ Encaminhamento Pendente</h1>
          </div>
          <div class="content">
            <p>Prezado(a),</p>
            
            <div class="warning">
              <strong>⏰ ATENÇÃO:</strong> Um encaminhamento está pendente há <strong>${daysOpen} dia(s)</strong> e ainda não foi aberto.
            </div>

            <p><strong>Detalhes:</strong></p>
            <ul>
              <li>Processo: ${encaminhamento.process?.id || 'N/A'}</li>
              <li>Cidadão: ${encaminhamento.process?.citizen?.name || 'N/A'}</li>
              <li>Unidade de Origem: ${encaminhamento.fromUnit?.name || 'N/A'}</li>
              <li>Data do Encaminhamento: ${new Date(encaminhamento.createdAt).toLocaleDateString('pt-BR')}</li>
              ${encaminhamento.deadline ? `<li>Prazo: ${new Date(encaminhamento.deadline).toLocaleDateString('pt-BR')}</li>` : ''}
            </ul>

            <div style="text-align: center;">
              <a href="${encaminhamentoLink}" class="button">Visualizar Encaminhamento</a>
            </div>
          </div>
          <div class="footer">
            <p>Este é um alerta automático do SIGEV</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emails = encaminhamento.toUnit?.professionals?.map((p: any) => p.professional?.email).filter(Boolean) || [];
    
    return await sendMail({
      to: emails,
      subject: `⚠️ Encaminhamento pendente há ${daysOpen} dia(s) - SIGEV`,
      html
    });
  }
}