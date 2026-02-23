// backend/src/routes/document.routes.ts
import { FastifyInstance } from 'fastify';
import { DocumentController } from '../controllers/document.controller';
import multer from 'fastify-multer';
import path from 'path';
import fs from 'fs';

const controller = new DocumentController();

// Garantir que o diretório de upload existe
const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'audio/mpeg',
      'audio/wav',
      'video/mp4',
      'video/mpeg',
      'text/plain'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido') as any, false);
    }
  }
});

export default async function documentRoutes(fastify: FastifyInstance) {
  // Listar documentos
  fastify.get('/', { 
    preHandler: [fastify.authenticate] 
  }, (request: any, reply: any) => controller.getAll(request, reply));

  // Buscar documento por ID
  fastify.get('/:id', { 
    preHandler: [fastify.authenticate] 
  }, (request: any, reply: any) => controller.getById(request, reply));

  // Download de anexo
  fastify.get('/download/:attachmentId', { 
    preHandler: [fastify.authenticate] 
  }, (request: any, reply: any) => controller.downloadAttachment(request, reply));

  // Criar documento (admin)
  fastify.post('/', { 
    preHandler: [fastify.authenticate, fastify.isAdmin, upload.array('attachments', 10)]
  }, (request: any, reply: any) => controller.create(request, reply));

  // Atualizar documento (admin)
  fastify.put('/:id', { 
    preHandler: [fastify.authenticate, fastify.isAdmin] 
  }, (request: any, reply: any) => controller.update(request, reply));

  // Adicionar anexos (admin)
  fastify.post('/:id/attachments', { 
    preHandler: [fastify.authenticate, fastify.isAdmin, upload.array('attachments', 10)]
  }, (request: any, reply: any) => controller.addAttachments(request, reply));

  // Excluir documento (admin)
  fastify.delete('/:id', { 
    preHandler: [fastify.authenticate, fastify.isAdmin] 
  }, (request: any, reply: any) => controller.delete(request, reply));

  // Excluir anexo (admin)
  fastify.delete('/:id/attachments/:attachmentId', { 
    preHandler: [fastify.authenticate, fastify.isAdmin] 
  }, (request: any, reply: any) => controller.deleteAttachment(request, reply));
}