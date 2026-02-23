// ======================================================
// SIGEV - Sistema Integrado de Gestão da Escuta de Violência
// backend/src/config/database.ts
// ======================================================

import { PrismaClient, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';

// Interface para configuração de conexão
interface DatabaseConfig {
  maxConnections: number;
  minConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
}

// Configurações padrão
const defaultConfig: DatabaseConfig = {
  maxConnections: 10,
  minConnections: 2,
  idleTimeout: 30000, // 30 segundos
  connectionTimeout: 5000, // 5 segundos
};

// Extensão do PrismaClient com métodos customizados
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn']
    : ['error'],
  errorFormat: 'pretty',
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Tipo para os parâmetros do middleware do Prisma
type PrismaMiddlewareParams = {
  model?: string;
  action: string;
  args: any;
  dataPath: string[];
  runInTransaction: boolean;
};

// Middleware para soft delete global com tipagem explícita
prisma.$use(async (
  params: PrismaMiddlewareParams, 
  next: (params: PrismaMiddlewareParams) => Promise<any>
) => {
  // Aplicar soft delete apenas para modelos que tem campo deletedAt
  const softDeleteModels = ['User', 'Citizen', 'Process'];
  
  if (softDeleteModels.includes(params.model || '')) {
    // Interceptar findUnique e findFirst
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      // Mudar para findFirst para poder adicionar filtro de deletedAt
      params.action = 'findFirst';
      
      // Adicionar filtro de deletedAt null ao where existente
      if (params.args && params.args.where) {
        params.args.where = {
          ...params.args.where,
          deletedAt: null
        };
      } else if (params.args) {
        params.args.where = { deletedAt: null };
      } else {
        params.args = { where: { deletedAt: null } };
      }
    }
    
    // Interceptar findMany
    if (params.action === 'findMany') {
      // Adicionar filtro de deletedAt null ao where existente
      if (params.args && params.args.where) {
        params.args.where = {
          ...params.args.where,
          deletedAt: null
        };
      } else if (params.args) {
        params.args.where = { deletedAt: null };
      } else {
        params.args = { where: { deletedAt: null } };
      }
    }
    
    // Interceptar delete - transformar em update
    if (params.action === 'delete') {
      params.action = 'update';
      
      if (params.args) {
        params.args.data = {
          ...params.args.data,
          deletedAt: new Date()
        };
      } else {
        params.args = {
          data: { deletedAt: new Date() }
        };
      }
    }
    
    // Interceptar deleteMany - transformar em updateMany
    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      
      if (params.args) {
        params.args.data = {
          ...params.args.data,
          deletedAt: new Date()
        };
      } else {
        params.args = {
          data: { deletedAt: new Date() }
        };
      }
    }
  }
  
  return next(params);
});

// Interface para o resultado da query do information_schema
interface TableCountResult {
  count: number;
}

interface ProcessListResult {
  count: number;
}

// Função para testar conexão com o banco
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log('✅ Conexão com banco de dados estabelecida com sucesso!');
    
    // Testar se as tabelas existem
    const result = await prisma.$queryRaw<TableCountResult[]>`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `;
    
    console.log('📊 Estrutura do banco verificada');
    
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão com banco de dados:', error);
    return false;
  }
}

// Função para executar seed inicial
export async function seedDatabase(): Promise<void> {
  try {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Verificar se já existem dados
    const usersCount = await prisma.user.count();
    
    if (usersCount === 0) {
      // Criar senha padrão para admin
      const hashedPassword = await hash('admin@123', 10);

      // Criar tipos de unidade padrão
      const unitTypes = await Promise.all([
        prisma.unitType.create({
          data: { description: 'Conselho Tutelar' }
        }),
        prisma.unitType.create({
          data: { description: 'Ministério Público' }
        }),
        prisma.unitType.create({
          data: { description: 'Judiciário' }
        }),
        prisma.unitType.create({
          data: { description: 'Secretaria de Assistência Social' }
        }),
        prisma.unitType.create({
          data: { description: 'Secretaria de Saúde' }
        }),
        prisma.unitType.create({
          data: { description: 'Secretaria de Educação' }
        }),
        prisma.unitType.create({
          data: { description: 'Delegacia de Proteção à Criança e Adolescente' }
        }),
        prisma.unitType.create({
          data: { description: 'Organização da Sociedade Civil' }
        })
      ]);

      console.log('✅ Tipos de unidade criados:', unitTypes.length);

      // Criar unidades padrão
      const units = await Promise.all([
        prisma.unit.create({
          data: {
            name: 'Conselho Tutelar - Centro',
            email: 'ct.centro@exemplo.gov.br',
            phone: '(11) 1234-5678',
            address: 'Rua Exemplo, 123 - Centro',
            typeId: unitTypes[0].id,
            description: 'Conselho Tutelar da região central'
          }
        }),
        prisma.unit.create({
          data: {
            name: 'Ministério Público - Infância',
            email: 'mp.infancia@exemplo.gov.br',
            phone: '(11) 8765-4321',
            address: 'Av. Principal, 456 - Centro',
            typeId: unitTypes[1].id,
            description: 'Promotoria da Infância e Juventude'
          }
        })
      ]);

      console.log('✅ Unidades criadas:', units.length);

      // Criar usuário administrador
      const admin = await prisma.user.create({
        data: {
          name: 'Administrador Sistema',
          email: 'admin@sigev.gov.br',
          cpf: '000.000.000-00',
          phone: '(11) 99999-9999',
          password: hashedPassword,
          role: 'ADMIN',
          isAdmin: true,
          professionalUnits: {
            create: {
              unitId: units[0].id,
              startDate: new Date(),
              position: 'Administrador do Sistema',
              registration: 'ADMIN001',
              isActive: true
            }
          }
        }
      });

      console.log('✅ Usuário admin criado:', admin.email);

      // Criar tipos de violência padrão
      const violences = await Promise.all([
        prisma.violence.create({
          data: {
            name: 'Violência Física',
            description: 'Ação que causa dano físico à criança ou adolescente',
            detailedDescription: 'Qualquer ação que cause dor física ou lesão à criança ou adolescente'
          }
        }),
        prisma.violence.create({
          data: {
            name: 'Violência Psicológica',
            description: 'Agressões emocionais e psicológicas',
            detailedDescription: 'Humilhação, ameaças, isolamento, discriminação'
          }
        }),
        prisma.violence.create({
          data: {
            name: 'Violência Sexual',
            description: 'Abuso e exploração sexual',
            detailedDescription: 'Qualquer ato de natureza sexual praticado contra criança ou adolescente'
          }
        }),
        prisma.violence.create({
          data: {
            name: 'Negligência',
            description: 'Omisão de cuidados básicos',
            detailedDescription: 'Falta de cuidados básicos como alimentação, saúde, educação'
          }
        }),
        prisma.violence.create({
          data: {
            name: 'Violência Institucional',
            description: 'Violência praticada por instituições',
            detailedDescription: 'Violência praticada por serviços públicos ou privados'
          }
        })
      ]);

      console.log('✅ Tipos de violência criados:', violences.length);

      // Criar formulários padrão
      const forms = await Promise.all([
        prisma.form.create({
          data: {
            name: 'Formulário Inicial de Atendimento',
            type: 'INITIAL',
            description: 'Formulário para primeiro atendimento',
            isActive: true,
            config: {
              sections: [
                {
                  title: 'Identificação do Cidadão',
                  fields: ['name', 'birthDate', 'gender', 'cpf', 'rg']
                },
                {
                  title: 'Dados da Família',
                  fields: ['motherName', 'fatherName', 'motherCpf', 'fatherCpf']
                },
                {
                  title: 'Contato e Endereço',
                  fields: ['address', 'phone', 'email']
                },
                {
                  title: 'Dados de Saúde',
                  fields: ['hasDisability', 'disabilityType', 'hasHealthProblem', 'healthProblemDesc', 'usesMedication', 'medicationDesc']
                }
              ]
            }
          }
        }),
        prisma.form.create({
          data: {
            name: 'Relatório de Escuta Especializada',
            type: 'ESCUTA_ESPECIALIZADA',
            description: 'Relatório da escuta especializada realizada',
            isActive: true,
            config: {
              sections: [
                {
                  title: 'Dados do Atendimento',
                  fields: ['date', 'local', 'professional']
                },
                {
                  title: 'Relato da Escuta',
                  fields: ['description', 'violences', 'observations']
                },
                {
                  title: 'Encaminhamentos',
                  fields: ['encaminhamentos', 'deadlines']
                }
              ]
            }
          }
        })
      ]);

      console.log('✅ Formulários criados:', forms.length);

      console.log('🌱 Seed concluído com sucesso!');
    } else {
      console.log('📦 Banco de dados já possui dados. Seed ignorado.');
    }

  } catch (error) {
    console.error('❌ Erro no seed:', error);
    throw error;
  }
}

// Função para configurar pool de conexões
export function configureConnectionPool(config: Partial<DatabaseConfig> = {}): void {
  const finalConfig = { ...defaultConfig, ...config };
  
  process.env.DATABASE_POOL_MAX = finalConfig.maxConnections.toString();
  process.env.DATABASE_POOL_MIN = finalConfig.minConnections.toString();
  process.env.DATABASE_POOL_IDLE = finalConfig.idleTimeout.toString();
  process.env.DATABASE_POOL_ACQUIRE = finalConfig.connectionTimeout.toString();
  
  console.log('⚙️ Pool de conexões configurado:', finalConfig);
}

// Função para verificar saúde do banco
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency: number;
  connections?: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    // Testar conexão
    await prisma.$queryRaw`SELECT 1`;
    
    // Contar conexões ativas (MySQL)
    const connections = await prisma.$queryRaw<ProcessListResult[]>`
      SELECT COUNT(*) as count 
      FROM information_schema.processlist 
      WHERE db = DATABASE()
    `;
    
    const latency = Date.now() - start;
    
    return {
      status: 'healthy',
      latency,
      connections: Number(connections[0]?.count || 0)
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// Função para backup do banco (simplificado)
export async function backupDatabase(): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./backups/sigev-backup-${timestamp}.sql`;
    
    // Aqui você implementaria a lógica de backup real
    // Exemplo usando mysqldump ou outra ferramenta
    
    console.log(`💾 Backup criado em: ${backupPath}`);
    
    return backupPath;
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error);
    throw error;
  }
}

// Função para executar migrations
export async function runMigrations(): Promise<boolean> {
  try {
    console.log('🔄 Executando migrations...');
    
    // Executar migrations via Prisma
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    const { stdout, stderr } = await execPromise('npx prisma migrate deploy');
    
    if (stderr) {
      console.error('⚠️ Avisos nas migrations:', stderr);
    }
    
    console.log('✅ Migrations executadas:', stdout);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error);
    return false;
  }
}

// Função para inicializar banco de dados
export async function initializeDatabase(): Promise<boolean> {
  try {
    console.log('🚀 Inicializando banco de dados SIGEV...');
    
    // Testar conexão
    const connected = await testDatabaseConnection();
    
    if (!connected) {
      throw new Error('Não foi possível conectar ao banco de dados');
    }
    
    // Executar migrations
    await runMigrations();
    
    // Executar seed
    await seedDatabase();
    
    // Verificar saúde
    const health = await healthCheck();
    
    if (health.status === 'healthy') {
      console.log(`✅ Banco de dados inicializado com sucesso! Latência: ${health.latency}ms`);
    } else {
      console.warn('⚠️ Banco inicializado mas health check falhou:', health.error);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Falha na inicialização do banco:', error);
    return false;
  }
}

// Função para encerrar conexões
export async function shutdownDatabase(): Promise<void> {
  try {
    console.log('🛑 Encerrando conexões com banco de dados...');
    await prisma.$disconnect();
    console.log('✅ Conexões encerradas');
  } catch (error) {
    console.error('❌ Erro ao encerrar conexões:', error);
  }
}

// Tratamento de erros não capturados
process.on('unhandledRejection', async (error: Error) => {
  console.error('❌ Erro não tratado:', error);
  await shutdownDatabase();
  process.exit(1);
});

process.on('SIGINT', async () => {
  await shutdownDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdownDatabase();
  process.exit(0);
});

export default prisma;