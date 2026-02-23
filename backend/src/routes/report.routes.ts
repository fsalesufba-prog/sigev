// backend/src/routes/report.routes.ts
import { FastifyInstance } from 'fastify';
import { ReportController } from '../controllers/report.controller';

const controller = new ReportController();

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.get('/kpi', { preHandler: [fastify.authenticate] }, 
    (request: any, reply: any) => controller.getKPI(request, reply));

  fastify.get('/processes-by-citizen', { preHandler: [fastify.authenticate] }, 
    (request: any, reply: any) => controller.getProcessesByCitizen(request, reply));

  fastify.get('/pending-processes', { preHandler: [fastify.authenticate] }, 
    (request: any, reply: any) => controller.getPendingProcesses(request, reply));

  fastify.get('/inactivity', { preHandler: [fastify.authenticate] }, 
    (request: any, reply: any) => controller.getInactivity(request, reply));

  fastify.get('/identification-form', { preHandler: [fastify.authenticate] }, 
    (request: any, reply: any) => controller.getIdentificationForm(request, reply));

  fastify.get('/violence-by-gender', { preHandler: [fastify.authenticate] }, 
    (request: any, reply: any) => controller.getViolenceByGender(request, reply));
}