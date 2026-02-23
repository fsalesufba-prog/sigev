// backend/src/types/process.types.ts
export type ProcessStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type IdentificationForm = 'REVELACAO_ESPONTANEA' | 'SUSPEITA_PROFISSIONAL' | 'DENUNCIA';

export interface Process {
  id: string;
  citizenId: string;
  professionalId: string;
  unitId: string;
  identificationForm: IdentificationForm;
  description?: string | null;
  status: ProcessStatus;
  priority: Priority;
  deadline?: Date | null;
  deadlineType?: 'DAYS' | 'BUSINESS_DAYS' | null;
  deadlineDays?: number | null;
  isFavorite: boolean;
  readAt?: Date | null;
  readBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateProcessDTO {
  citizenId: string;
  professionalId: string;
  unitId: string;
  identificationForm: IdentificationForm;
  description?: string;
  priority?: Priority;
  deadline?: Date;
  deadlineType?: 'DAYS' | 'BUSINESS_DAYS';
  deadlineDays?: number;
  violenceIds: string[];
}

export interface UpdateProcessDTO {
  citizenId?: string;
  professionalId?: string;
  unitId?: string;
  identificationForm?: IdentificationForm;
  description?: string;
  status?: ProcessStatus;
  priority?: Priority;
  deadline?: Date | null;
  deadlineType?: 'DAYS' | 'BUSINESS_DAYS' | null;
  deadlineDays?: number | null;
  isFavorite?: boolean;
  violenceIds?: string[];
}

export interface ProcessFilters {
  search?: string;
  status?: string;
  priority?: string;
  unitId?: string;
  professionalId?: string;
  citizenId?: string;
  violenceId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface ProcessResponse {
  id: string;
  citizenName: string;
  citizenId: string;
  citizenCpf?: string;
  violence: string;
  violenceId?: string;
  status: string;
  priority: string;
  createdAt: string;
  unit: string;
  unitId: string;
  professional: string;
  professionalId: string;
  isFavorite: boolean;
  description?: string;
  identificationForm: string;
}