// backend/src/config/mail.ts
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

// Configuração do transporte SMTP para Google Workspace (Gmail)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // false para 587 (STARTTLS)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD?.replace(/\s/g, ''), // Remove espaços caso tenha
  },
  tls: {
    rejectUnauthorized: false,
    ciphers: 'SSLv3'
  }
} as SMTPTransport.Options);

// Verificar conexão
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ Servidor de email Google Workspace conectado com sucesso');
    console.log(`📧 Conta: ${process.env.EMAIL_USER}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar ao servidor de email:');
    console.error(error);
    return false;
  }
};

// Interface para opções de email
export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

// Função principal para envio de email
export const sendMail = async (options: MailOptions): Promise<boolean> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'SIGEV Sistema <contato@sqtecnologiadainformacao.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado: ${info.messageId}`);
    console.log(`📧 Para: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar email:');
    console.error(error);
    return false;
  }
};

export default transporter;