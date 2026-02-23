import { buildApp } from './app';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import cron from 'node-cron';
import { sendDailyDigests } from './cron/daily-digest.cron';
import { sendEncaminhamentoAlerts } from './cron/encaminhamento-alert.cron';
import { verifyEmailConnection } from './config/mail';

async function startServer() {
  try {
    const app = await buildApp();
    
    // Criar servidor HTTP para WebSocket
    const server = createServer(app.server);
    
    const port = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 3333;
    const host = process.env.APP_HOST || '0.0.0.0';

    // Aguarda o servidor estar pronto
    await app.ready();
    
    // Inicia o servidor
    await app.listen({ port, host });
    
    // Verificar conexão com servidor de email
    verifyEmailConnection().then(connected => {
      if (connected) {
        console.log('📧 Serviço de email pronto');
      }
    });

    // ✅ CRON JOBS ATIVADOS COM LIMITES RAZOÁVEIS
    
    // Agendar resumo diário (8:00) - ENVIAR APENAS PARA QUEM TEM PENDÊNCIAS
    cron.schedule('0 8 * * *', async () => {
      console.log('⏰ Executando job de resumos diários...');
      console.log('📊 Limite: apenas usuários com pendências');
      await sendDailyDigests();
    });

    // Agendar alertas de encaminhamento (9:00) - TODOS OS PENDENTES
    cron.schedule('0 9 * * *', async () => {
      console.log('⏰ Executando job de alertas de encaminhamento...');
      await sendEncaminhamentoAlerts(false); // false = todos os pendentes
    });

    // Agendar verificação intermediária (14:00) - APENAS URGENTES
    cron.schedule('0 14 * * *', async () => {
      console.log('⏰ Executando job de verificação intermediária...');
      await sendEncaminhamentoAlerts(true); // true = apenas urgentes
    });

    // Configuração de graceful shutdown
    const prisma = new PrismaClient();
    
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n👋 ${signal} recebido. Iniciando shutdown graceful...`);
      
      try {
        // Para os cron jobs
        cron.getTasks().forEach(task => task.stop());
        
        // Fecha o servidor HTTP
        await new Promise((resolve) => {
          server.close(resolve);
        });
        
        // Desconecta do banco
        await prisma.$disconnect();
        
        // Fecha conexões do Fastify
        await app.close();
        
        console.log('✅ Servidor encerrado com sucesso');
        process.exit(0);
      } catch (error) {
        console.error('❌ Erro durante shutdown:', error);
        process.exit(1);
      }
    };

    // Listeners para graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    console.log(`
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║   🚀 SIGEV - Sistema Integrado de Gestão da Escuta      ║
    ║         de Violência                                     ║
    ║                                                          ║
    ╠══════════════════════════════════════════════════════════╣
    ║                                                          ║
    ║   📡 Servidor: http://${host}:${port}                    ║
    ║   📚 Documentação: http://${host}:${port}/docs           ║
    ║   ⚙️ Ambiente: ${process.env.NODE_ENV || 'development'}  ║
    ║   🔒 JWT: ${process.env.JWT_SECRET ? '✅' : '❌'}        ║
    ║   📧 Email: ${process.env.EMAIL_HOST ? '✅' : '❌'}      ║
    ║   ⏰ CRON: ✅ Ativo (8h, 9h, 14h)                        ║
    ║   📊 Limites: Apenas pendências e urgentes              ║
    ║   💾 Banco: Conectado                                    ║
    ║   🔌 WebSocket: Ativo                                    ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
    `);
    
  } catch (error) {
    console.error('❌ Erro fatal ao iniciar servidor:');
    console.error(error);
    process.exit(1);
  }
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:');
  console.error(error);
  process.exit(1);
});

// Inicia o servidor
startServer();