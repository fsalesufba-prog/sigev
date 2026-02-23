// backend/src/types/citizen.types.ts
export type Gender = 'M' | 'F' | 'OTHER';

export interface Citizen {
  id: string;
  name: string;
  birthDate: Date;
  gender?: Gender | null;
  cpf?: string | null;
  rg?: string | null;
  motherName?: string | null;
  fatherName?: string | null;
  motherCpf?: string | null;
  fatherCpf?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  education?: string | null;
  hasDisability: boolean;
  disabilityType?: string | null;
  hasHealthProblem: boolean;
  healthProblemDesc?: string | null;
  usesMedication: boolean;
  medicationDesc?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateCitizenDTO {
  name: string;
  birthDate: Date;
  gender?: Gender;
  cpf?: string;
  rg?: string;
  motherName?: string;
  fatherName?: string;
  motherCpf?: string;
  fatherCpf?: string;
  address?: string;
  phone?: string;
  email?: string;
  education?: string;
  hasDisability?: boolean;
  disabilityType?: string;
  hasHealthProblem?: boolean;
  healthProblemDesc?: string;
  usesMedication?: boolean;
  medicationDesc?: string;
}

export interface UpdateCitizenDTO extends Partial<CreateCitizenDTO> {}

export interface CitizenFilters {
  search?: string;
  gender?: Gender;
  hasDisability?: boolean;
  hasHealthProblem?: boolean;
  page?: number;
  limit?: number;
}