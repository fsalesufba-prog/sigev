// backend/src/cron/encaminhamento-alert.cron.ts
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../services/email.service';

const prisma = new PrismaClient();
const emailService = new EmailService();

/**
 * Job para alertar sobre encaminhamentos não abertos
 * @param apenasUrgentes Se true, alerta apenas para encaminhamentos com prazo próximo
 */
export async function sendEncaminhamentoAlerts(apenasUrgentes: boolean = false) {
  const tipoAlerta = apenasUrgentes ? 'URGENTES' : 'TODOS OS PENDENTES';
  console.log(`🔔 Iniciando alertas de encaminhamentos (${tipoAlerta})...`);
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);

  try {
    const now = new Date();
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Buscar encaminhamentos pendentes
    const where: any = {
      status: 'PENDING',
      openedAt: null
    };

    if (apenasUrgentes) {
      // Apenas os mais antigos (mais de 3 dias) ou com prazo vencido
      where.OR = [
        { createdAt: { lt: threeDaysAgo } },
        { 
          deadline: { 
            lt: now 
          } 
        }
      ];
    } else {
      // Todos com mais de 1 dia
      where.createdAt = { lt: oneDayAgo };
    }

    const pendingEncaminhamentos = await prisma.encaminhamento.findMany({
      where,
      include: {
        process: {
          include: {
            citizen: { 
              select: { 
                name: true 
              } 
            }
          }
        },
        fromUnit: {
          select: {
            id: true,
            name: true
          }
        },
        toUnit: {
          select: {
            id: true,
            name: true,
            professionals: {
              where: { isActive: true },
              include: {
                professional: {
                  select: { 
                    id: true,
                    name: true,
                    email: true 
                  }
                }
              }
            }
          }
        }
      },
      take: 50 // 🔥 LIMITE MÁXIMO DE 50 POR EXECUÇÃO
    });

    console.log(`📊 Encontrados ${pendingEncaminhamentos.length} encaminhamentos pendentes`);

    if (pendingEncaminhamentos.length === 0) {
      console.log('✅ Nenhum encaminhamento pendente para alertar');
      return;
    }

    let sentCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const enc of pendingEncaminhamentos) {
      try {
        const createdAt = new Date(enc.createdAt);
        const daysOpen = Math.floor(
          (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Verificar se tem prazo próximo
        let prazoInfo = '';
        if (enc.deadline) {
          const deadlineDate = new Date(enc.deadline);
          const daysUntilDeadline = Math.ceil(
            (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysUntilDeadline < 0) {
            prazoInfo = ` (PRAZO VENCIDO há ${Math.abs(daysUntilDeadline)} dias)`;
          } else if (daysUntilDeadline <= 2) {
            prazoInfo = ` (PRAZO URGENTE: ${daysUntilDeadline} dias)`;
          }
        }

        // Extrair emails dos profissionais da unidade de destino
        const profissionais = enc.toUnit?.professionals || [];
        const emails = profissionais
          .map(p => p.professional?.email)
          .filter((email): email is string => !!email);

        if (emails.length === 0) {
          skippedCount++;
          console.log(`⏭️ Encaminhamento ${enc.id}: sem profissionais com email na unidade destino`);
          continue;
        }

        console.log(`📧 Preparando alerta para encaminhamento ${enc.id}:`);
        console.log(`   - Unidade destino: ${enc.toUnit?.name || 'N/A'}`);
        console.log(`   - Dias aberto: ${daysOpen}${prazoInfo}`);
        console.log(`   - Destinatários: ${emails.length} profissionais`);

        const result = await emailService.sendEncaminhamentoAbertoNotification(
          {
            id: enc.id,
            process: enc.process,
            fromUnit: enc.fromUnit,
            toUnit: enc.toUnit,
            createdAt: enc.createdAt,
            deadline: enc.deadline
          },
          daysOpen
        );

        if (result) {
          sentCount++;
          console.log(`✅ Alerta enviado para encaminhamento ${enc.id}`);
        } else {
          errorCount++;
          console.log(`❌ Falha no envio para encaminhamento ${enc.id}`);
        }

        // Aguardar um pouco entre os envios
        await new Promise(resolve => setTimeout(resolve, 600));

      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao processar encaminhamento ${enc.id}:`, error);
      }
    }

    console.log(`
    📊 RESUMO DOS ALERTAS (${tipoAlerta}):
    ✅ Enviados: ${sentCount}
    ❌ Erros: ${errorCount}
    ⏭️ Pulados: ${skippedCount}
    📅 Data: ${new Date().toLocaleString('pt-BR')}
    `);

  } catch (error) {
    console.error('❌ Erro fatal no job de alertas de encaminhamento:', error);
  } finally {
    await prisma.$disconnect();
  }
}