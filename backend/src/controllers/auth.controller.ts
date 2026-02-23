// backend/src/controllers/auth.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const prisma = new PrismaClient();

// Interface para o payload do JWT
interface JWTPayload {
  id: string;
  email: string;
  role: string;
  isAdmin: boolean;
  type?: string;
}

// Schemas de validação
const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  rememberMe: z.boolean().optional().default(false)
});

const registerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
  unitId: z.string().optional(),
  position: z.string().optional(),
  registration: z.string().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"]
});

const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido')
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"]
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"]
});

const refreshTokenSchema = z.object({
  refreshToken: z.string()
});

export class AuthController {
  /**
   * Login do usuário
   */
  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = loginSchema.parse(request.body);
      
      const user = await prisma.user.findUnique({
        where: { email: body.email },
        include: {
          professionalUnits: {
            where: { isActive: true },
            include: { unit: true }
          }
        }
      });

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'E-mail ou senha inválidos'
        });
      }

      if (user.deletedAt) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Usuário desativado'
        });
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        return reply.status(423).send({
          error: 'Locked',
          message: `Usuário bloqueado por ${minutesLeft} minutos`
        });
      }

      const validPassword = await bcrypt.compare(body.password, user.password);
      
      if (!validPassword) {
        const attempts = user.loginAttempts + 1;
        let lockedUntil = null;
        
        if (attempts >= 5) {
          lockedUntil = new Date(Date.now() + 30 * 60000);
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: attempts, lockedUntil }
        });

        return reply.status(401).send({
          error: 'Unauthorized',
          message: attempts >= 5 
            ? 'Muitas tentativas. Usuário bloqueado por 30 minutos.'
            : `E-mail ou senha inválidos. Tentativa ${attempts}/5`
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, lockedUntil: null, lastLogin: new Date() }
      });

      const accessToken = request.server.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin
      }, { expiresIn: body.rememberMe ? '7d' : '8h' });

      const refreshToken = request.server.jwt.sign({
        id: user.id,
        type: 'refresh'
      }, { expiresIn: '7d' });

      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: hashedRefreshToken }
      });

      reply.setCookie('token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: body.rememberMe ? 604800 : 28800
      });

      await prisma.actionLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          description: 'Login realizado com sucesso',
          ipAddress: request.ip,
          entityType: 'User',
          entityId: user.id
        }
      });

      const units = user.professionalUnits.map(pu => ({
        id: pu.unit.id,
        name: pu.unit.name,
        position: pu.position,
        registration: pu.registration
      }));

      return reply.send({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          cpf: user.cpf,
          phone: user.phone,
          role: user.role,
          isAdmin: user.isAdmin,
          units
        },
        accessToken,
        refreshToken,
        expiresIn: body.rememberMe ? 604800 : 28800
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Dados inválidos',
          details: error.errors
        });
      }
      
      request.log.error({ msg: 'Erro no login', error });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao processar login'
      });
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { refreshToken } = refreshTokenSchema.parse(request.body);

      let decoded: any;
      try {
        decoded = request.server.jwt.verify(refreshToken);
      } catch (err) {
        request.log.error({ msg: 'Erro ao verificar refresh token', error: err });
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Refresh token inválido'
        });
      }

      if (!decoded || typeof decoded !== 'object') {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Refresh token inválido'
        });
      }

      const payload = decoded as { id?: string };
      
      if (!payload.id) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Refresh token inválido'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        include: {
          professionalUnits: {
            where: { isActive: true },
            include: { unit: true }
          }
        }
      });

      if (!user || !user.refreshToken || user.deletedAt) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Refresh token inválido'
        });
      }

      const validRefreshToken = await bcrypt.compare(refreshToken, user.refreshToken);
      
      if (!validRefreshToken) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Refresh token inválido'
        });
      }

      const accessToken = request.server.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin
      }, { expiresIn: '8h' });

      reply.setCookie('token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 28800
      });

      return reply.send({
        accessToken,
        expiresIn: 28800
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Dados inválidos',
          details: error.errors
        });
      }

      request.log.error({ msg: 'Erro no refresh token', error });
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Refresh token inválido'
      });
    }
  }

  /**
   * Resetar senha
   */
  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token, password } = resetPasswordSchema.parse(request.body);

      let decoded: any;
      try {
        decoded = request.server.jwt.verify(token);
      } catch (err) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Token inválido'
        });
      }

      if (!decoded || typeof decoded !== 'object') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Token inválido'
        });
      }

      const payload = decoded as { id?: string };
      
      if (!payload.id) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Token inválido'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.id }
      });

      if (!user || !user.resetToken || !user.resetTokenExpires) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Token inválido'
        });
      }

      if (user.resetTokenExpires < new Date()) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Token expirado'
        });
      }

      const validToken = await bcrypt.compare(token, user.resetToken);
      
      if (!validToken) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Token inválido'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpires: null,
          loginAttempts: 0,
          lockedUntil: null
        }
      });

      await prisma.actionLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          description: 'Senha redefinida com sucesso',
          ipAddress: request.ip,
          entityType: 'User',
          entityId: user.id
        }
      });

      return reply.send({ message: 'Senha redefinida com sucesso' });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Dados inválidos',
          details: error.errors
        });
      }

      request.log.error({ msg: 'Erro no reset password', error });
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Token inválido'
      });
    }
  }

/**
 * Esqueci senha - CORRIGIDO PARA RETORNAR USUÁRIO
 */
async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { email } = forgotPasswordSchema.parse(request.body);

    console.log('🔍 Buscando usuário com email:', email);

    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Se não encontrar, retorna null (a rota trata)
    if (!user) {
      console.log('❌ Usuário não encontrado:', email);
      return { user: null };
    }

    console.log('✅ Usuário encontrado:', user.id, user.email);

    const resetToken = request.server.jwt.sign(
      { id: user.id, type: 'reset' },
      { expiresIn: '1h' }
    );

    // Hash do token para salvar no banco
    const hashedToken = await bcrypt.hash(resetToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpires: new Date(Date.now() + 3600000) // 1 hora
      }
    });

    console.log('✅ Token salvo no banco para:', user.email);

    // Retorna o usuário e o token (NÃO USA reply.send AQUI!)
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      resetToken
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { user: null };
    }
    request.log.error({ msg: 'Erro no forgot password', error });
    return { user: null };
  }
}
  /**
   * Logout
   */
  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Usando fallback com any
      const user = (request as any).user;
      
      if (user && user.id) {
        await prisma.actionLog.create({
          data: {
            userId: user.id,
            action: 'LOGOUT',
            description: 'Logout realizado',
            ipAddress: request.ip,
            entityType: 'User',
            entityId: user.id
          }
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null }
        });
      }

      reply.clearCookie('token', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      return reply.send({ message: 'Logout realizado com sucesso' });

    } catch (error) {
      request.log.error({ msg: 'Erro no logout', error });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao fazer logout'
      });
    }
  }

  /**
   * Alterar senha - CORRIGIDO COM FALLBACK
   */
  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
      
      // FALLBACK: usar any para acessar o user
      const userReq = (request as any).user;
      
      if (!userReq || !userReq.id) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Usuário não autenticado'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userReq.id }
      });

      if (!user) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Usuário não encontrado'
        });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      
      if (!validPassword) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Senha atual incorreta'
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, loginAttempts: 0 }
      });

      await prisma.actionLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          description: 'Senha alterada',
          ipAddress: request.ip,
          entityType: 'User',
          entityId: user.id
        }
      });

      return reply.send({ message: 'Senha alterada com sucesso' });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Dados inválidos',
          details: error.errors
        });
      }

      request.log.error({ msg: 'Erro ao alterar senha', error });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao alterar senha'
      });
    }
  }

  /**
   * Verificar token - CORRIGIDO COM FALLBACK
   */
  async verifyToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      // FALLBACK: usar any para acessar o user
      const userReq = (request as any).user;
      
      if (!userReq || !userReq.id) {
        return reply.status(401).send({
          valid: false,
          error: 'Unauthorized',
          message: 'Usuário não autenticado'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userReq.id },
        include: {
          professionalUnits: {
            where: { isActive: true },
            include: { unit: true }
          }
        }
      });

      if (!user || user.deletedAt) {
        return reply.status(401).send({
          valid: false,
          error: 'Unauthorized',
          message: 'Usuário não encontrado'
        });
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return reply.status(401).send({
          valid: false,
          error: 'Locked',
          message: 'Usuário bloqueado'
        });
      }

      const units = user.professionalUnits.map(pu => ({
        id: pu.unit.id,
        name: pu.unit.name,
        position: pu.position,
        registration: pu.registration
      }));

      return reply.send({
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          cpf: user.cpf,
          phone: user.phone,
          role: user.role,
          isAdmin: user.isAdmin,
          units
        }
      });

    } catch (error) {
      request.log.error({ msg: 'Erro ao verificar token', error });
      return reply.status(500).send({
        valid: false,
        error: 'Internal Server Error',
        message: 'Erro ao verificar token'
      });
    }
  }

  /**
   * Registro de novo usuário
   */
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = registerSchema.parse(request.body);
      
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: body.email },
            { cpf: body.cpf }
          ]
        }
      });

      if (existingUser) {
        return reply.status(409).send({
          error: 'Conflict',
          message: existingUser.email === body.email 
            ? 'E-mail já cadastrado' 
            : 'CPF já cadastrado'
        });
      }

      const hashedPassword = await bcrypt.hash(body.password, 10);

      const user = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          cpf: body.cpf,
          phone: body.phone,
          password: hashedPassword,
          role: 'PROFESSIONAL'
        }
      });

      // FALLBACK para o usuário admin que está fazendo o registro
      const adminUser = (request as any).user;
      
      if (body.unitId && body.position && body.registration) {
        await prisma.professionalUnit.create({
          data: {
            professionalId: user.id,
            unitId: body.unitId,
            startDate: new Date(),
            position: body.position,
            registration: body.registration,
            isActive: true
          }
        });
      }

      if (adminUser && adminUser.id) {
        await prisma.actionLog.create({
          data: {
            userId: adminUser.id,
            action: 'CREATE',
            description: `Usuário criado: ${user.email}`,
            entityType: 'User',
            entityId: user.id
          }
        });
      }

      return reply.status(201).send({
        message: 'Usuário criado com sucesso',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          cpf: user.cpf,
          role: user.role
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Dados inválidos',
          details: error.errors
        });
      }
      
      request.log.error({ msg: 'Erro ao criar usuário', error });
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao criar usuário'
      });
    }
  }
}