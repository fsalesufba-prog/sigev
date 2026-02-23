// backend/src/utils/process.utils.ts
import { Process } from '@prisma/client';

export function formatProcessResponse(process: any) {
  return {
    id: process.id,
    citizenName: process.citizen?.name,
    citizenId: process.citizenId,
    violence: process.violences[0]?.violence?.name || 'Não especificado',
    status: process.status,
    priority: process.priority,
    createdAt: process.createdAt.toISOString(),
    unit: process.unit?.name,
    professional: process.professional?.name,
    isFavorite: process.isFavorite,
    description: process.description
  };
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'URGENT': return '#FF1493';
    case 'HIGH': return '#FFA500';
    case 'NORMAL': return '#00D4FF';
    case 'LOW': return '#6b7280';
    default: return '#FFFFFF';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING': return '#FFA500';
    case 'IN_PROGRESS': return '#00D4FF';
    case 'COMPLETED': return '#10b981';
    case 'ARCHIVED': return '#6b7280';
    default: return '#FFFFFF';
  }
}

export function calculateDeadline(startDate: Date, days: number, type: 'DAYS' | 'BUSINESS_DAYS'): Date {
  const result = new Date(startDate);
  
  if (type === 'DAYS') {
    result.setDate(result.getDate() + days);
  } else {
    // Dias úteis (simplificado)
    let addedDays = 0;
    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        addedDays++;
      }
    }
  }
  
  return result;
}