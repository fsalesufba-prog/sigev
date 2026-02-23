// backend/src/validations/citizen.validation.ts
export const createCitizenSchema = {
  body: {
    type: 'object',
    required: ['name', 'birthDate'],
    properties: {
      name: { type: 'string', minLength: 3, maxLength: 100 },
      birthDate: { type: 'string', format: 'date' },
      gender: { type: 'string', enum: ['M', 'F', 'OTHER'] },
      cpf: { type: 'string', pattern: '^[0-9]{3}\\.?[0-9]{3}\\.?[0-9]{3}-?[0-9]{2}$' },
      rg: { type: 'string' },
      motherName: { type: 'string' },
      fatherName: { type: 'string' },
      motherCpf: { type: 'string' },
      fatherCpf: { type: 'string' },
      address: { type: 'string' },
      phone: { type: 'string' },
      email: { type: 'string', format: 'email' },
      education: { type: 'string' },
      hasDisability: { type: 'boolean' },
      disabilityType: { type: 'string' },
      hasHealthProblem: { type: 'boolean' },
      healthProblemDesc: { type: 'string' },
      usesMedication: { type: 'boolean' },
      medicationDesc: { type: 'string' }
    }
  }
};

export const updateCitizenSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 3, maxLength: 100 },
      birthDate: { type: 'string', format: 'date' },
      gender: { type: 'string', enum: ['M', 'F', 'OTHER'] },
      cpf: { type: 'string', pattern: '^[0-9]{3}\\.?[0-9]{3}\\.?[0-9]{3}-?[0-9]{2}$' },
      rg: { type: 'string' },
      motherName: { type: 'string' },
      fatherName: { type: 'string' },
      motherCpf: { type: 'string' },
      fatherCpf: { type: 'string' },
      address: { type: 'string' },
      phone: { type: 'string' },
      email: { type: 'string', format: 'email' },
      education: { type: 'string' },
      hasDisability: { type: 'boolean' },
      disabilityType: { type: 'string' },
      hasHealthProblem: { type: 'boolean' },
      healthProblemDesc: { type: 'string' },
      usesMedication: { type: 'boolean' },
      medicationDesc: { type: 'string' }
    }
  }
};

export const citizenFiltersSchema = {
  querystring: {
    type: 'object',
    properties: {
      search: { type: 'string' },
      gender: { type: 'string', enum: ['M', 'F', 'OTHER'] },
      hasDisability: { type: 'string', enum: ['true', 'false'] },
      hasHealthProblem: { type: 'string', enum: ['true', 'false'] },
      page: { type: 'number', minimum: 1, default: 1 },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 10 }
    }
  }
};