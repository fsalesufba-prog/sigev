export interface SecurityLog {
  id: string;
  data: string;
  usuario: string;
  acao: string;
  ip: string;
  userAgent: string;
  status: 'sucesso' | 'falha';
  detalhes: string | null;
}

export interface ActiveSession {
  id: string;
  usuario: string;
  nome: string;
  ip: string;
  userAgent: string;
  loginAt: string;
  ultimaAtividade: string;
  expiraEm: string;
  atual: boolean;
}

export interface SecuritySettings {
  bloqueiosAtivos: Array<{
    id: string;
    usuario: string;
    motivo: string;
    bloqueadoAte: string;
    bloqueadoPor: string;
  }>;
  ipsBloqueados: Array<{
    ip: string;
    motivo: string;
    bloqueadoAte: string;
  }>;
  tentativasSuspeitas: Array<{
    id: string;
    ip: string;
    usuario?: string;
    tentativas: number;
    ultimaTentativa: string;
    acao: string;
  }>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  usuario: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  valoresAntigos: any;
  valoresNovos: any;
  ip: string;
}