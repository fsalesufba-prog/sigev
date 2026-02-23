// backend/src/routes/help.routes.ts
import { FastifyInstance } from 'fastify';

export default async function helpRoutes(fastify: FastifyInstance) {
  // Central de ajuda
  fastify.get('/', async (request, reply) => {
    return { message: 'Central de ajuda' };
  });

  // Buscar artigo de ajuda
  fastify.get('/article/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: `Artigo ${id}` };
  });

  // Buscar tutoriais
  fastify.get('/tutorials', async (request, reply) => {
    return { message: 'Lista de tutoriais' };
  });

  // FAQ
  fastify.get('/faq', async (request, reply) => {
    return { message: 'Perguntas frequentes' };
  });

  // Contatar suporte
  fastify.post('/contact', async (request, reply) => {
    return { message: 'Mensagem enviada ao suporte' };
  });
}