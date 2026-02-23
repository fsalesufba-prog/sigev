export interface SystemParameters {
  id: string;
  sistema: {
    nome: string;
    versao: string;
    ambiente: 'development' | 'production' | 'homologation';
    url: string;
    manutencao: boolean;
    mensagemManutencao: string | null;
  };
  seguranca: {
    maxTentativasLogin: number;
    tempoBloqueioMinutos: number;
    sessaoExpiracaoHoras: number;
    exigirMfa: boolean;
    politicaSenha: {
      tamanhoMinimo: number;
      exigirMaiuscula: boolean;
      exigirMinuscula: boolean;
      exigirNumero: boolean;
      exigirEspecial: boolean;
      diasExpiracao: number;
      historicoSenhas: number;
    };
    bloqueioHorario: {
      ativo: boolean;
      inicio: string;
      fim: string;
    };
  };
  notificacoes: {
    emailAlertas: boolean;
    emailResumoDiario: boolean;
    diasParaAlertaPrazo: number;
    horarioResumoDiario: string;
  };
  processos: {
    prazoPadraoDias: number;
    tipoPrazoPadrao: 'DAYS' | 'BUSINESS_DAYS';
    prioridadePadrao: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    permitirExclusao: boolean;
  };
  upload: {
    tamanhoMaximoMB: number;
    tiposPermitidos: string[];
    path: string;
  };
  auditoria: {
    manterLogsDias: number;
    nivelLog: 'basico' | 'completo' | 'nenhum';
    logAcessos: boolean;
  };
}

export interface UpdateParametersDTO {
  sistema?: Partial<SystemParameters['sistema']>;
  seguranca?: Partial<SystemParameters['seguranca']>;
  notificacoes?: Partial<SystemParameters['notificacoes']>;
  processos?: Partial<SystemParameters['processos']>;
  upload?: Partial<SystemParameters['upload']>;
  auditoria?: Partial<SystemParameters['auditoria']>;
}