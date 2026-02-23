// backend/src/validations/process.validation.ts
export const createProcessSchema = {
  body: {
    type: 'object',
    required: ['citizenId', 'professionalId', 'unitId', 'identificationForm', 'violenceIds'],
    properties: {
      citizenId: { type: 'string' },
      professionalId: { type: 'string' },
      unitId: { type: 'string' },
      identificationForm: { 
        type: 'string',
        enum: ['REVELACAO_ESPONTANEA', 'SUSPEITA_PROFISSIONAL', 'DENUNCIA']
      },
      description: { type: 'string', maxLength: 500 },
      priority: { 
        type: 'string', 
        enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
        default: 'NORMAL'
      },
      deadline: { type: 'string', format: 'date-time' },
      deadlineType: { type: 'string', enum: ['DAYS', 'BUSINESS_DAYS'] },
      deadlineDays: { type: 'number', minimum: 1 },
      violenceIds: { 
        type: 'array',
        items: { type: 'string' },
        minItems: 1
      }
    }
  }
};

export const updateProcessSchema = {
  body: {
    type: 'object',
    properties: {
      citizenId: { type: 'string' },
      professionalId: { type: 'string' },
      unitId: { type: 'string' },
      identificationForm: { 
        type: 'string',
        enum: ['REVELACAO_ESPONTANEA', 'SUSPEITA_PROFISSIONAL', 'DENUNCIA']
      },
      description: { type: 'string', maxLength: 500 },
      status: { 
        type: 'string', 
        enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']
      },
      priority: { 
        type: 'string', 
        enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT']
      },
      deadline: { type: ['string', 'null'], format: 'date-time' },
      deadlineType: { type: ['string', 'null'], enum: ['DAYS', 'BUSINESS_DAYS'] },
      deadlineDays: { type: ['number', 'null'], minimum: 1 },
      isFavorite: { type: 'boolean' },
      violenceIds: { 
        type: 'array',
        items: { type: 'string' }
      }
    }
  }
};

export const processFiltersSchema = {
  querystring: {
    type: 'object',
    properties: {
      search: { type: 'string' },
      status: { type: 'string' },
      priority: { type: 'string' },
      unitId: { type: 'string' },
      professionalId: { type: 'string' },
      citizenId: { type: 'string' },
      violenceId: { type: 'string' },
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
      page: { type: 'number', minimum: 1, default: 1 },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 10 }
    }
  }
};