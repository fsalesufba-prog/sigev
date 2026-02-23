// backend/src/routes/attachment.routes.ts
import { FastifyInstance } from 'fastify';
import { AttachmentController } from '../controllers/attachment.controller';
import multer from 'fastify-multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// Configurar o multer
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'video/mp4', 'video/mpeg', 'video/webm',
    'audio/mpeg', 'audio/wav', 'audio/webm'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

const controller = new AttachmentController();

export default async function attachmentRoutes(fastify: FastifyInstance) {
  // GET /attachments/process/:processId - Listar anexos do processo
  fastify.get('/process/:processId', {
    preHandler: [fastify.authenticate]
  }, controller.getByProcessId.bind(controller));

  // POST /attachments/process/:processId/upload - Upload de anexos
  fastify.post('/process/:processId/upload', {
    preHandler: [fastify.authenticate],
    preValidation: upload.array('files', 10) // ✅ Agora funciona com fastify-multer
  }, controller.upload.bind(controller));

  // GET /attachments/:id/download - Download de anexo
  fastify.get('/:id/download', {
    preHandler: [fastify.authenticate]
  }, controller.download.bind(controller));

  // DELETE /attachments/:id - Remover anexo
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate]
  }, controller.delete.bind(controller));
}