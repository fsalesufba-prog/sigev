// backend/src/types/report.types.ts
export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  unitId?: string;
  professionalId?: string;
  status?: string;
  identificationForm?: string;
  violenceType?: string;
}

export interface KPIReport {
  totalProcesses: number;
  pendingProcesses: number;
  inProgressProcesses: number;
  completedProcesses: number;
  archivedProcesses: number;
  averageCompletionDays: number;
  byPriority: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };
}

export interface ProcessByCitizenReport {
  citizenId: string;
  citizenName: string;
  citizenCpf?: string;
  birthDate: string;
  totalProcesses: number;
  processes: Array<{
    id: string;
    date: string;
    unit: string;
    professional: string;
    identificationForm: string;
    violences: string[];
    status: string;
    priority: string;
  }>;
}

export interface PendingProcessesReport {
  unitId: string;
  unitName: string;
  totalPending: number;
  processes: Array<{
    id: string;
    citizenName: string;
    citizenAge: number;
    createdAt: string;
    deadline: string | null;
    priority: string;
    professional: string;
    professionalId: string;
    unit: string;
    unitId: string;
    daysOpen: number;
    violences: string[];
  }>;
}

export interface InactivityReport {
  units: Array<{
    id: string;
    name: string;
    daysWithoutAccess: number;
    totalProcesses: number;
    professionals: Array<{
      id: string;
      name: string;
      daysWithoutAccess: number;
      lastAccess: string | null;
      assignedProcesses: number;
    }>;
  }>;
}

export interface IdentificationFormReport {
  total: number;
  revelacaoEspontanea: number;
  suspeitaProfissional: number;
  denuncia: number;
  data: Array<{
    date: string;
    revelacao: number;
    suspeita: number;
    denuncia: number;
  }>;
  byUnit: Array<{
    unitId: string;
    unitName: string;
    revelacao: number;
    suspeita: number;
    denuncia: number;
  }>;
}

export interface ViolenceByGenderReport {
  masculine: {
    total: number;
    byType: Record<string, number>;
  };
  feminine: {
    total: number;
    byType: Record<string, number>;
  };
  other: {
    total: number;
    byType: Record<string, number>;
  };
  data: Array<{
    violenceType: string;
    violenceId: string;
    masculine: number;
    feminine: number;
    other: number;
    total: number;
  }>;
}

export interface ViolenceFrequencyReport {
  totalViolences: number;
  totalProcesses: number;
  averagePerProcess: number;
  mostFrequent: Array<{
    violenceId: string;
    violenceName: string;
    count: number;
    percentage: number;
  }>;
}

export interface TimelineReport {
  daily: Array<{
    date: string;
    created: number;
    completed: number;
    pending: number;
  }>;
  monthly: Array<{
    month: string;
    created: number;
    completed: number;
  }>;
}