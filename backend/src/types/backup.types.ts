export interface Backup {
  id: string;
  nome: string;
  data: string;
  tamanho: number;
  tipo: 'automático' | 'manual';
  status: 'concluído' | 'em_andamento' | 'falha';
  arquivo: string;
  criadoPor: string;
  descricao: string | null;
}

export interface BackupConfig {
  automático: {
    ativo: boolean;
    frequencia: 'diário' | 'semanal' | 'mensal';
    horario: string;
    diaSemana?: number;
    diaMes?: number;
    manterCópias: number;
  };
  inclusoes: {
    banco: boolean;
    uploads: boolean;
    logs: boolean;
    configuracoes: boolean;
  };
  destino: {
    tipo: 'local' | 's3' | 'ftp';
    path: string;
    bucket?: string;
    host?: string;
    usuario?: string;
  };
  notificacoes: {
    emailSucesso: boolean;
    emailFalha: boolean;
    emailsDestino: string[];
  };
}

export interface BackupHistory {
  backups: Backup[];
  total: number;
  ultimoBackup: Backup | null;
  espacoUtilizado: number;
  espacoDisponivel: number;
}