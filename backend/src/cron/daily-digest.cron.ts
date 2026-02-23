// backend/src/cron/daily-digest.cron.ts
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../services/email.service';

const prisma = new PrismaClient();
const emailService = new EmailService();

/**
 * Job para enviar resumo diário - APENAS PARA QUEM TEM PENDÊNCIAS
 */
export async function sendDailyDigests() {
  console.log('📧 Iniciando envio de resumos diários (apenas pendências)...');
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);

  try {
    // Buscar profissionais que têm processos pendentes OU notificações não lidas
    const professionalsWithPending = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        role: { in: ['PROFESSIONAL', 'MANAGER', 'ADMIN'] },
        OR: [
          {
            processes: {
              some: {
                status: 'PENDING',
                deletedAt: null
              }
            }
          },
          {
            receivedNotifications: {
              some: {
                readAt: null
              }
            }
          }
        ]
      },
      include: {
        professionalUnits: {
          where: { isActive: true },
          include: { unit: true }
        },
        processes: {
          where: { status: 'PENDING', deletedAt: null },
          include: { 
            citizen: { 
              select: { name: true } 
            } 
          }
        },
        receivedNotifications: {
          where: { readAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      },
      take: 100 // 🔥 LIMITE MÁXIMO DE 100 POR EXECUÇÃO
    });

    console.log(`📊 Encontrados ${professionalsWithPending.length} profissionais com pendências`);

    if (professionalsWithPending.length === 0) {
      console.log('✅ Nenhuma pendência para notificar hoje');
      return;
    }

    let sentCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const professional of professionalsWithPending) {
      try {
        // Processos pendentes (já veio no include)
        const pendingProcesses = professional.processes || [];

        // Notificações não lidas
        const notifications = professional.receivedNotifications || [];

        // Verificar se realmente tem algo para notificar
        if (pendingProcesses.length === 0 && notifications.length === 0) {
          skippedCount++;
          console.log(`⏭️ Profissional ${professional.email} sem pendências (filtro inconsistente)`);
          continue;
        }

        console.log(`📧 Preparando resumo para ${professional.email}:`);
        console.log(`   - ${pendingProcesses.length} processos pendentes`);
        console.log(`   - ${notifications.length} notificações não lidas`);

        const result = await emailService.sendDailyDigest(
          professional,
          pendingProcesses.map(p => ({
            id: p.id,
            citizenName: p.citizen?.name || 'Não informado',
            priority: p.priority || 'NORMAL',
            deadline: p.deadline
          })),
          notifications.map(n => ({
            title: n.title || 'Notificação',
            message: n.message || ''
          }))
        );

        if (result) {
          sentCount++;
          console.log(`✅ Resumo enviado para ${professional.email}`);
        } else {
          errorCount++;
          console.log(`❌ Falha no envio para ${professional.email}`);
        }

        // Aguardar um pouco entre os envios
        await new Promise(resolve => setTimeout(resolve, 800));

      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao processar ${professional.email}:`, error);
      }
    }

    console.log(`
    📊 RESUMO DO ENVIO:
    ✅ Enviados: ${sentCount}
    ❌ Erros: ${errorCount}
    ⏭️ Pulados: ${skippedCount}
    📅 Data: ${new Date().toLocaleString('pt-BR')}
    `);

  } catch (error) {
    console.error('❌ Erro fatal no job de resumos diários:', error);
  } finally {
    await prisma.$disconnect();
  }
}