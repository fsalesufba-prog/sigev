// backend/src/middleware/session.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export async function sessionMonitor(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Verifica se há token e se a sessão está válida
  const token = request.cookies?.token || request.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = request.jwt.verify(token);
      const exp = (decoded as any).exp * 1000; // exp está em segundos
      const now = Date.now();
      const timeLeft = exp - now;
      
      // Se a sessão estiver perto de expirar (menos de 5 minutos)
      if (timeLeft > 0 && timeLeft < 5 * 60 * 1000) {
        reply.header('X-Session-Expiring', Math.ceil(timeLeft / 1000).toString());
      }
      
      // Se a sessão expirou
      if (timeLeft <= 0) {
        reply.clearCookie('token');
      }
    } catch (error) {
      // Token inválido, ignora
    }
  }
}