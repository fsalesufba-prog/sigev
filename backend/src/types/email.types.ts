export interface EmailConfig {
  servidor: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  remetente: {
    nome: string;
    email: string;
  };
  templates: {
    boasVindas: boolean;
    recuperacaoSenha: boolean;
    notificacaoEncaminhamento: boolean;
    alertaPendencia: boolean;
    resumoDiario: boolean;
  };
  limites: {
    maxEmailsPorDia: number;
    maxEmailsPorHora: number;
    maxDestinatariosPorEmail: number;
  };
}

export interface EmailTemplate {
  id: string;
  nome: string;
  tipo: 'boas_vindas' | 'recuperacao_senha' | 'encaminhamento' | 'pendencia' | 'resumo';
  assunto: string;
  corpo: string;
  variaveis: string[];
  ativo: boolean;
  ultimaAtualizacao: string;
}

export interface EmailLog {
  id: string;
  data: string;
  destinatario: string;
  assunto: string;
  tipo: string;
  status: 'enviado' | 'falha' | 'pendente';
  erro: string | null;
  tentativas: number;
}

export interface EmailQueue {
  pendentes: number;
  falhas: number;
  enviadosHoje: number;
  limiteDiario: number;
}