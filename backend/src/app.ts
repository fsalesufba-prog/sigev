// backend/src/app.ts
import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import fastifyEnv from '@fastify/env';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import fastifyCookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import multer from 'fastify-multer';
import fastifyMultipart from '@fastify/multipart';


// Importação de rotas
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import processRoutes from './routes/process.routes';
import unitRoutes from './routes/unit.routes';
import violenceRoutes from './routes/violence.routes';
import formRoutes from './routes/form.routes';
import reportRoutes from './routes/report.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import uploadRoutes from './routes/upload.routes';
import documentRoutes from './routes/document.routes';
import citizenRoutes from './routes/citizen.routes';
import encaminhamentoRoutes from './routes/encaminhamento.routes';
import logRoutes from './routes/log.routes';
import helpRoutes from './routes/help.routes';
import professionalRoutes from './routes/professional.routes';
import adminRoutes from './routes/admin.routes';
import unitTypesRoutes from './routes/unit-types.routes';
import ticketRoutes from './routes/ticket.routes';

// Importação de middlewares
import { authenticate } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';
import { checkLoginAttempts } from './middleware/login-attempts.middleware';
import { sessionMonitor } from './middleware/session.middleware';

// Importação de configurações
import { initializeDatabase } from './config/database';

const envSchema = {
    type: 'object',
    required: ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL'],
    properties: {
        NODE_ENV: { type: 'string', default: 'development' },
        APP_PORT: { type: 'number', default: 3333 },
        APP_HOST: { type: 'string', default: '0.0.0.0' },
        APP_URL: { type: 'string', default: 'http://localhost:3333' },
        FRONTEND_URL: { type: 'string', default: 'http://localhost:3000' },
        DATABASE_URL: { type: 'string' },
        JWT_SECRET: { type: 'string' },
        JWT_EXPIRES_IN: { type: 'string', default: '7d' },
        MAX_FILE_SIZE: { type: 'number', default: 10485760 },
        UPLOAD_PATH: { type: 'string', default: './uploads' },
        RATE_LIMIT_MAX: { type: 'number', default: 100 },
        RATE_LIMIT_TIME_WINDOW: { type: 'number', default: 60000 }
    }
};

export async function buildApp() {
    const app = fastify({
        logger: process.env.NODE_ENV === 'development' ? {
            transport: {
                target: 'pino-pretty',
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname'
                }
            }
        } : true,
        trustProxy: true,
        bodyLimit: Number(process.env.MAX_FILE_SIZE) || 10485760
    });

    // ===========================================
    // 1️⃣ HOOKS E MANIPULADORES
    // ===========================================
    app.setErrorHandler(errorHandler);
    app.addHook('onRequest', sessionMonitor);

    // ===========================================
    // 2️⃣ ENV
    // ===========================================
    await app.register(fastifyEnv, {
        schema: envSchema,
        dotenv: true,
        data: process.env
    });

    // ===========================================
    // 3️⃣ COOKIES
    // ===========================================
    await app.register(fastifyCookie, {
        secret: process.env.JWT_SECRET,
        parseOptions: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        }
    });

    // ===========================================
    // 4️⃣ CORS
    // ===========================================
    await app.register(cors, {
        origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['set-cookie']
    });

    // ===========================================
    // 5️⃣ JWT
    // ===========================================
    await app.register(jwt, {
        secret: process.env.JWT_SECRET as string,
        sign: {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        },
        cookie: {
            cookieName: 'token',
            signed: false
        }
    });

    // ===========================================
    // 6️⃣ RATE LIMIT
    // ===========================================
    const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 100;
    const rateLimitTimeWindow = Number(process.env.RATE_LIMIT_TIME_WINDOW) || 60000;

    await app.register(rateLimit, {
        max: rateLimitMax,
        timeWindow: rateLimitTimeWindow,
        cache: 10000,
        allowList: ['127.0.0.1', '::1', 'localhost'],
        keyGenerator: (req) => {
            if (req.method === 'OPTIONS') return 'preflight';
            return req.headers['x-forwarded-for']?.toString() || req.ip || 'unknown';
        },
        errorResponseBuilder: (req, context) => {
            const after = typeof context.after === 'number' ? context.after : 0;
            const seconds = Math.ceil(after / 1000);
            return {
                statusCode: 429,
                error: 'Too Many Requests',
                message: `Muitas tentativas. Tente novamente em ${seconds} segundos.`
            };
        }
    });

    // ===========================================
    // 7️⃣ OUTROS PLUGINS
    // ===========================================
    await app.register(websocket);
    await app.register(multer.contentParser);

    if (process.env.NODE_ENV === 'development') {
        await app.register(swagger, {
            swagger: {
                info: {
                    title: 'SIGEV API',
                    description: 'API do Sistema Integrado de Gestão da Escuta de Violência',
                    version: '1.0.0'
                },
                host: new URL(process.env.APP_URL || 'http://localhost:3333').host,
                schemes: ['http', 'https'],
                consumes: ['application/json'],
                produces: ['application/json'],
                securityDefinitions: {
                    bearerAuth: {
                        type: 'apiKey',
                        name: 'Authorization',
                        in: 'header'
                    }
                }
            }
        });

        await app.register(swaggerUi, {
            routePrefix: '/docs'
        });
    }

    const uploadPath = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads');
    await app.register(fastifyStatic, {
        root: uploadPath,
        prefix: '/uploads/',
        decorateReply: true,
        setHeaders: (res) => {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
    });

    // ===========================================
    // 8️⃣ DECORATORS
    // ===========================================
    app.decorate('authenticate', async (request: any, reply: any) => {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.status(401).send({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Token inválido ou expirado'
            });
        }
    });

    app.decorate('isAdmin', async (request: any, reply: any) => {
        try {
            const user = request.user;
            if (!user?.isAdmin && user?.role !== 'ADMIN') {
                return reply.status(403).send({
                    statusCode: 403,
                    error: 'Forbidden',
                    message: 'Acesso negado. Apenas administradores.'
                });
            }
        } catch (err) {
            return reply.status(403).send({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Erro ao verificar permissões'
            });
        }
    });

    // ===========================================
    // 9️⃣ ROTAS - TUDO VIA REGISTRO
    // ===========================================
    
    // Rotas públicas (auth)
    app.register(authRoutes, { prefix: '/auth' });

    // Rotas privadas (todas protegidas por authenticate)
    app.register(async (privateRoutes) => {
        privateRoutes.addHook('preHandler', app.authenticate);
        privateRoutes.addHook('preHandler', checkLoginAttempts);

        privateRoutes.register(userRoutes, { prefix: '/users' });
        privateRoutes.register(professionalRoutes, { prefix: '/professionals' });
        privateRoutes.register(processRoutes, { prefix: '/processes' });
        privateRoutes.register(citizenRoutes, { prefix: '/citizens' });
        privateRoutes.register(unitRoutes, { prefix: '/units' });
        privateRoutes.register(violenceRoutes, { prefix: '/violences' });
        privateRoutes.register(formRoutes, { prefix: '/forms' });
        privateRoutes.register(encaminhamentoRoutes, { prefix: '/encaminhamentos' });
        privateRoutes.register(reportRoutes, { prefix: '/reports' });
        privateRoutes.register(notificationRoutes, { prefix: '/notifications' });
        privateRoutes.register(dashboardRoutes, { prefix: '/dashboard' });
        privateRoutes.register(uploadRoutes, { prefix: '/upload' });
        privateRoutes.register(documentRoutes, { prefix: '/documents' });
        privateRoutes.register(helpRoutes, { prefix: '/help' });
        privateRoutes.register(ticketRoutes, { prefix: '/tickets' });
        // 🔥 ROTA DE LOGS - COM PREFIXO CORRETO /admin/logs
        privateRoutes.register(logRoutes, { prefix: '/admin/logs' });
    });

    // Rotas admin (já tem suas próprias proteções)
    app.register(adminRoutes, { prefix: '/admin' });
    app.register(unitTypesRoutes, { prefix: '/unit-types' });
    // WebSocket
    app.register(async function (fastify) {
        fastify.get('/ws/chat', { websocket: true }, (connection) => {
            connection.socket.on('message', async (message: any) => {
                try {
                    const data = JSON.parse(message.toString());
                    if (data.type === 'chat_message') {
                        connection.socket.send(JSON.stringify({
                            type: 'chat_message',
                            user: data.user,
                            message: data.message,
                            timestamp: new Date().toISOString()
                        }));
                    }
                } catch (error) {
                    console.error('WebSocket error:', error);
                }
            });
        });
    });

    // Health check
    app.get('/health', async (request, reply) => {
        const prisma = new PrismaClient();
        try {
            const start = Date.now();
            await prisma.$queryRaw`SELECT 1`;
            const latency = Date.now() - start;

            await prisma.$disconnect();

            return reply.status(200).send({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: {
                    status: 'connected',
                    latency: `${latency}ms`
                },
                jwt: process.env.JWT_SECRET ? '✅' : '❌'
            });
        } catch (error) {
            await prisma.$disconnect();
            return reply.status(503).send({
                status: 'unhealthy',
                database: 'disconnected'
            });
        }
    });

    app.get('/', async () => {
        return {
            name: 'SIGEV API',
            version: '1.0.0',
            environment: process.env.NODE_ENV,
            jwt: process.env.JWT_SECRET ? '✅' : '❌',
            timestamp: new Date().toISOString()
        };
    });

    try {
        await initializeDatabase();
        app.log.info('✅ Banco de dados inicializado');
    } catch (error) {
        app.log.warn('⚠️ Banco não inicializado');
    }

    // LOG DE ROTAS PARA DEBUG
    app.ready(() => {
        console.log('\n' + '='.repeat(50));
        console.log('📌 ROTAS REGISTRADAS:');
        console.log('='.repeat(50));
        
        // Lista manual das rotas principais
        console.log('➜ /auth');
        console.log('➜ /users');
        console.log('➜ /professionals');
        console.log('➜ /processes');
        console.log('➜ /citizens');
        console.log('➜ /units');
        console.log('➜ /violences');
        console.log('➜ /forms');
        console.log('➜ /encaminhamentos');
        console.log('➜ /reports');
        console.log('➜ /notifications');
        console.log('➜ /dashboard');
        console.log('➜ /upload');
        console.log('➜ /documents');
        console.log('➜ /help');
        console.log('➜ /admin/logs ✓'); // ← TEM QUE APARECER ISSO
        console.log('➜ /admin');
        console.log('➜ /ws/chat');
        console.log('➜ /health');
        console.log('➜ /');
        console.log('='.repeat(50) + '\n');
    });

    return app;
}

export default buildApp;