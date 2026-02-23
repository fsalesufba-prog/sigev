// backend/src/types/encaminhamento.types.ts
export type EncaminhamentoStatus = 'PENDING' | 'OPENED' | 'COMPLETED' | 'CANCELLED';
export type DeadlineType = 'DAYS' | 'BUSINESS_DAYS';

export interface Encaminhamento {
  id: string;
  processId: string;
  fromUnitId: string;
  toUnitId: string;
  description?: string | null;
  deadline?: Date | null;
  deadlineType?: DeadlineType | null;
  deadlineDays?: number | null;
  openedAt?: Date | null;
  openedBy?: string | null;
  status: EncaminhamentoStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEncaminhamentoDTO {
  processId: string;
  toUnitId: string;
  description?: string;
  deadline?: Date;
  deadlineType?: DeadlineType;
  deadlineDays?: number;
}

export interface UpdateEncaminhamentoDTO {
  status?: EncaminhamentoStatus;
  openedAt?: Date;
  openedBy?: string;
}

export interface EncaminhamentoFilters {
  processId?: string;
  fromUnitId?: string;
  toUnitId?: string;
  status?: EncaminhamentoStatus;
  page?: number;
  limit?: number;
}