// backend/src/types/unit.types.ts
export interface Unit {
  id: string;
  name: string;
  description?: string | null;
  email: string;
  phone: string;
  address: string;
  typeId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUnitDTO {
  name: string;
  description?: string;
  email: string;
  phone: string;
  address: string;
  typeId: string;
}

export interface UpdateUnitDTO extends Partial<CreateUnitDTO> {
  isActive?: boolean;
}

export interface UnitFilters {
  search?: string;
  typeId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface UnitResponse {
  id: string;
  name: string;
  description?: string;
  email: string;
  phone: string;
  address: string;
  type: string;
  typeId: string;
  isActive: boolean;
  professionalsCount?: number;
  processesCount?: number;
}