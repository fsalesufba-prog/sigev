// backend/src/types/form.types.ts
import { FormType } from '@prisma/client';

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'radio' | 'select' | 'email' | 'phone' | 'cpf' | 'address';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  order: number;
  options?: FieldOption[];
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: FormField[];
}

export interface FormConfig {
  sections: FormSection[];
}

export interface CreateFormDTO {
  name: string;
  type: FormType;
  description?: string;
  config: any;
}

export interface UpdateFormDTO {
  name?: string;
  description?: string;
  isActive?: boolean;
  config?: any;
}

export interface FormFilters {
  type?: FormType;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}