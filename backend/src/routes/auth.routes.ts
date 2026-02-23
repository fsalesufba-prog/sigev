// backend/src/routes/auth.routes.ts
import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller';
import { createLog, ActionType } from '../middleware/log.middleware';
import { EmailService } from '../services/email.service';

const authController = new AuthController();
const emailService = new EmailService();

export default async function authRoutes(fastify: FastifyInstance) {
  // ==================== POST /login ====================
  // Realiza login do usuário
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          rememberMe: { type: 'boolean' }
        },
        required: ['email', 'password']
      }
    },
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    try {
      const result = await authController.login(request, reply);
      
      // Log de login bem-sucedido (item 1.9 do edital)
      if (result && (result as any).user) {
        await createLog({
          userId: (result as any).user.id,
          action: ActionType.LOGIN,
          description: `Usuário ${(result as any).user.email} realizou login`,
          entityType: 'User',
          entityId: (result as any).user.id,
          req: request
        }).catch(() => {}); // Silencia erro de log para não interromper fluxo
      }
      
      return result;
    } catch (error) {
      // Log de tentativa de login falha (item 1.9 do edital)
      const body = request.body as { email?: string };
      await createLog({
        action: ActionType.LOGIN_FAILED,
        description: `Tentativa de login falha para email: ${body.email || 'desconhecido'}`,
        req: request
      }).catch(() => {}); // Silencia erro de log
      
      throw error;
    }
  });

  // ==================== POST /refresh-token ====================
  // Renova o token de acesso usando refresh token
  fastify.post('/refresh-token', {
    schema: {
      body: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string' }
        },
        required: ['refreshToken']
      }
    }
  }, async (request, reply) => {
    try {
      const result = await authController.refreshToken(request, reply);
      return result;
    } catch (error) {
      throw error;
    }
  });

  // ==================== POST /forgot-password ====================
 fastify.post('/forgot-password', {
  schema: {
    body: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' }
      },
      required: ['email']
    }
  }
}, async (request, reply) => {
  try {
    const { email } = request.body as { email: string };
    
    // CHAMA O CONTROLLER - ele RETORNA o resultado, não usa reply
    const result = await authController.forgotPassword(request, reply);
    
    // AGORA result TEM user E resetToken se encontrou
    if (result && (result as any).user) {
      const user = (result as any).user;
      const resetToken = (result as any).resetToken;
      
      // ENVIA EMAIL REAL
      await emailService.sendPasswordResetEmail(user, resetToken);
      
      // CRIA LOG COM USUÁRIO REAL
      await createLog({
        userId: user.id,
        action: ActionType.FORGOT_PASSWORD,
        description: `Solicitação de recuperação de senha para email: ${email}`,
        entityType: 'User',
        entityId: user.id,
        req: request
      });
      
      console.log(`✅ Email enviado para ${email}`);
    } else {
      console.log(`📧 Email não cadastrado: ${email}`);
    }
    
    // MENSAGEM GENÉRICA (sempre a mesma)
    return reply.status(200).send({ 
      message: 'Se o email estiver cadastrado, você receberá instruções para recuperar sua senha.' 
    });
    
  } catch (error) {
    request.log.error(error);
    return reply.status(200).send({ 
      message: 'Se o email estiver cadastrado, você receberá instruções para recuperar sua senha.' 
    });
  }
});

  // ==================== POST /reset-password ====================
  // EFETIVAR A RECUPERAÇÃO DE SENHA (Item 1.5 do Edital)
  fastify.post('/reset-password', {
    schema: {
      body: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          password: { type: 'string', minLength: 6 },
          confirmPassword: { type: 'string' }
        },
        required: ['token', 'password', 'confirmPassword']
      }
    }
  }, async (request, reply) => {
    try {
      const result = await authController.resetPassword(request, reply);
      
      if (result && (result as any).user) {
        const user = (result as any).user;
        
        // Log de sucesso (item 1.9 do edital)
        await createLog({
          userId: user.id,
          action: ActionType.RESET_PASSWORD,
          description: `Senha redefinida com sucesso`,
          entityType: 'User',
          entityId: user.id,
          req: request
        }).catch(() => {}); // Silencia erro de log
      }
      
      return reply.status(200).send({ 
        message: 'Senha alterada com sucesso. Você já pode fazer login com sua nova senha.' 
      });
      
    } catch (error) {
      request.log.error(error);
      throw error;
    }
  });
  
  // ==================== POST /logout ====================
  // Realiza logout do usuário
  fastify.post('/logout', { 
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const result = await authController.logout(request, reply);
      
      // Log de logout (item 1.9 do edital)
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.LOGOUT,
        description: `Usuário realizou logout`,
        entityType: 'User',
        entityId: (request as any).user?.id,
        req: request
      }).catch(() => {}); // Silencia erro de log
      
      return result;
    } catch (error) {
      throw error;
    }
  });
  
  // ==================== POST /change-password ====================
  // Altera a senha do usuário logado
  fastify.post('/change-password', { 
    preHandler: [(fastify as any).authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 6 },
          confirmPassword: { type: 'string' }
        },
        required: ['currentPassword', 'newPassword', 'confirmPassword']
      }
    }
  }, async (request, reply) => {
    try {
      const result = await authController.changePassword(request, reply);
      
      // Log de alteração de senha (item 1.9 do edital)
      await createLog({
        userId: (request as any).user?.id,
        action: ActionType.CHANGE_PASSWORD,
        description: `Senha alterada com sucesso`,
        entityType: 'User',
        entityId: (request as any).user?.id,
        req: request
      }).catch(() => {}); // Silencia erro de log
      
      return result;
    } catch (error) {
      throw error;
    }
  });
  
  // ==================== GET /verify ====================
  // Verifica se o token é válido e retorna dados do usuário
  fastify.get('/verify', { 
    preHandler: [(fastify as any).authenticate]
  }, async (request, reply) => {
    try {
      const result = await authController.verifyToken(request, reply);
      return result;
    } catch (error) {
      throw error;
    }
  });

  // ==================== POST /register ====================
  // REGISTRO DE NOVO USUÁRIO POR ADMIN
  fastify.post('/register', { 
    preHandler: [(fastify as any).authenticate, (fastify as any).isAdmin],
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 3 },
          email: { type: 'string', format: 'email' },
          cpf: { type: 'string', pattern: '^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$' },
          phone: { type: 'string' },
          password: { type: 'string', minLength: 6 },
          confirmPassword: { type: 'string' },
          unitId: { type: 'string' },
          position: { type: 'string' },
          registration: { type: 'string' }
        },
        required: ['name', 'email', 'cpf', 'password', 'confirmPassword']
      }
    }
  }, async (request, reply) => {
    try {
      const result = await authController.register(request, reply);
      
      if (result && (result as any).user) {
        const user = (result as any).user;
        const plainPassword = (request.body as any).password;
        
        // Enviar email de boas-vindas (assíncrono)
        emailService.sendWelcomeEmail(user, plainPassword).catch(error => {
          console.error('❌ Erro ao enviar email de boas-vindas:', error);
        });
        
        // Log de criação de usuário (item 1.9 do edital)
        await createLog({
          userId: (request as any).user?.id,
          action: ActionType.CREATE,
          description: `Usuário ${user.email} criado por admin`,
          entityType: 'User',
          entityId: user.id,
          newValue: user,
          req: request
        }).catch(() => {}); // Silencia erro de log
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  });
}