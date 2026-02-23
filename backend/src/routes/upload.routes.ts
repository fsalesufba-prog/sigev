// backend/src/routes/upload.routes.ts
import { FastifyInstance } from 'fastify';
import { UploadController } from '../controllers/upload.controller';
import multer from 'fastify-multer';
import path from 'path';
import fs from 'fs';

const uploadController = new UploadController();

// Garantir que o diretório de upload existe
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const fullUploadPath = path.join(__dirname, '../../', uploadDir);

if (!fs.existsSync(fullUploadPath)) {
  fs.mkdirSync(fullUploadPath, { recursive: true });
}

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, fullUploadPath);
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
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mpeg',
      'audio/wav',
      'video/mp4',
      'video/mpeg'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido') as any, false);
    }
  }
});

export default async function uploadRoutes(fastify: FastifyInstance) {
  // Upload de arquivos para processo
  fastify.post('/process/:processId', {
    preHandler: upload.array('files', 10),
    schema: {
      params: {
        type: 'object',
        properties: {
          processId: { type: 'string' }
        },
        required: ['processId']
      }
    }
  }, uploadController.uploadProcessFile);

  // Upload de arquivo para documento
  fastify.post('/document/:documentId', {
    preHandler: upload.single('file'),
    schema: {
      params: {
        type: 'object',
        properties: {
          documentId: { type: 'string' }
        },
        required: ['documentId']
      }
    }
  }, uploadController.uploadDocument);

  // Upload de avatar
  fastify.post('/avatar', {
    preHandler: upload.single('avatar')
  }, uploadController.uploadAvatar);

  // Download de arquivo
  fastify.get('/download/:attachmentId', uploadController.downloadFile);

  // Deletar arquivo
  fastify.delete('/:attachmentId', uploadController.deleteFile);

  // Listar arquivos de um processo
  fastify.get('/process/:processId', uploadController.listProcessFiles);
}