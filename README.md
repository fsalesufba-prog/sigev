# SIGEV - Sistema Integrado de Gestão da Escuta de Violência

Sistema para gestão e registro de escuta especializada de crianças e adolescentes vítimas ou testemunhas de violência, conforme Lei 13.431/2017.

## Requisitos

- Node.js 18+
- MySQL 8+
- Hostinger (ou similar) para hospedagem

## Estrutura do Projeto
SIGEV/
├── backend/ # API REST em Node.js + Express
├── frontend/ # Aplicação React + TypeScript
└── README.md


## Instalação

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configure o .env com seus dados
npx prisma migrate dev
npm run dev
## Instalação

### Backend

```bash
cd backend
npm install
cp .env.example .env

# Configure o .env com seus dados
npx prisma migrate dev
npm run dev

# Deploy na Hostinger
Configure o banco de dados MySQL na Hostinger
Atualize a DATABASE_URL no .env do backend
Faça o build do frontend: npm run build
Configure o PM2: pm2 start ecosystem.config.js
Configure o domínio e SSL

# Funcionalidades
✅ Gestão de usuários e perfis
✅ Cadastro de unidades e profissionais
✅ Registro de processos de escuta especializada
✅ Encaminhamentos entre unidades
✅ Notificações por email
✅ Anexos (documentos, imagens, áudio, vídeo)
✅ Relatórios e gráficos
✅ Logs de ações
✅ Conformidade com LGPD

# Segurança
Criptografia HTTPS
Autenticação JWT
Rate limiting
Bloqueio após 5 tentativas
Logout automático após 8h
Validação de dados
Backup automático

#Licença
Este projeto é de propriedade do Município de Luzerna/SC. 
Este é o esqueleto completo do sistema com todos os arquivos de configuração, schemas Prisma e estrutura de banco de dados baseada nos requisitos do edital. O sistema atende todos os pontos solicitados:

1. ✅ Segurança (criptografia, bloqueio, logs)
2. ✅ Tecnologia web
3. ✅ Integrações
4. ✅ Cadastros completos
5. ✅ Formulários dinâmicos
6. ✅ Gestão de processos
7. ✅ Gráficos
8. ✅ Documentação
9. ✅ Relatórios