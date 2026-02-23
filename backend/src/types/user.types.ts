// backend/src/types/user.types.ts
import { Prisma } from '@prisma/client';

// Tipos baseados no schema do Prisma (sem importar diretamente os modelos)
export interface UserPayload {
  id: string;
  name: string;
  email: string;
  cpf: string;
  role: 'ADMIN' | 'MANAGER' | 'PROFESSIONAL';
  isAdmin: boolean;
  units: Array<{
    id: string;
    name: string;
    position: string;
    registration: string;
  }>;
}

// Tipos para as relações (definidos manualmente)
export interface Unit {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface ProfessionalUnit {
  id: string;
  professionalId: string;
  unitId: string;
  position: string;
  registration: string;
  isActive: boolean;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  unit: Unit;
}

export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string | null;
  password: string;
  role: 'ADMIN' | 'MANAGER' | 'PROFESSIONAL';
  isAdmin: boolean;
  loginAttempts: number;
  lockedUntil: Date | null;
  lastLogin: Date | null;
  refreshToken: string | null;
  resetToken: string | null;
  resetTokenExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  professionalUnits: ProfessionalUnit[];
}

export interface UserWithRelations extends User {
  professionalUnits: (ProfessionalUnit & {
    unit: Unit;
  })[];
}

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  isAdmin: boolean;
}