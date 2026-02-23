// backend/src/routes/dashboard.routes.ts
import { FastifyInstance } from 'fastify';
import { DashboardController } from '../controllers/dashboard.controller';

const dashboardController = new DashboardController();

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // Dashboard principal - agora usando o controller
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, dashboardController.getDashboardData.bind(dashboardController));

  // Gráfico de inatividade (item 7.1)
  fastify.get('/inactivity', {
    preHandler: [fastify.authenticate]
  }, dashboardController.getInactivityChart.bind(dashboardController));

  // Gráfico de formas de identificação (item 7.2)
  fastify.get('/identification', {
    preHandler: [fastify.authenticate]
  }, dashboardController.getIdentificationChart.bind(dashboardController));

  // Gráfico de violências por sexo (item 7.3)
  fastify.get('/violence-by-gender', {
    preHandler: [fastify.authenticate]
  }, dashboardController.getViolenceByGenderChart.bind(dashboardController));
}