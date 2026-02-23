'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import './ProcessTable.css';

interface ProcessTableProps {
  processes: Array<{
    id: string;
    citizenName: string;
    violence: string;
    status: string;
    priority: string;
    createdAt: string;
    unit: string;
    professional: string;
    isFavorite: boolean;
  }>;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
}

export default function ProcessTable({ processes, onToggleFavorite }: ProcessTableProps) {
  const router = useRouter();

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'IN_PROGRESS': return 'status-progress';
      case 'COMPLETED': return 'status-completed';
      case 'ARCHIVED': return 'status-archived';
      default: return '';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'IN_PROGRESS': return 'Em Andamento';
      case 'COMPLETED': return 'Concluído';
      case 'ARCHIVED': return 'Arquivado';
      default: return status;
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'priority-urgent';
      case 'HIGH': return 'priority-high';
      case 'NORMAL': return 'priority-normal';
      case 'LOW': return 'priority-low';
      default: return '';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'Urgente';
      case 'HIGH': return 'Alta';
      case 'NORMAL': return 'Normal';
      case 'LOW': return 'Baixa';
      default: return priority;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleRowClick = (processId: string) => {
    router.push(`/portal/processes/${processId}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent, processId: string, isFavorite: boolean) => {
    e.stopPropagation(); // Impede que o clique no botão ative o clique na linha
    onToggleFavorite(processId, isFavorite);
  };

  if (processes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h3>Nenhum processo encontrado</h3>
        <p>Tente ajustar os filtros ou criar um novo processo</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="process-table">
        <thead>
          <tr>
            <th className="favorite-col"></th>
            <th>Cidadão</th>
            <th>Violência</th>
            <th>Unidade</th>
            <th>Profissional</th>
            <th>Status</th>
            <th>Prioridade</th>
            <th>Data</th>
            <th className="action-col"></th>
          </tr>
        </thead>
        <tbody>
          {processes.map((process) => (
            <tr 
              key={process.id}
              onClick={() => handleRowClick(process.id)}
              className="process-row"
            >
              <td className="favorite-col">
                <button 
                  className={`favorite-btn ${process.isFavorite ? 'active' : ''}`}
                  onClick={(e) => handleFavoriteClick(e, process.id, process.isFavorite)}
                  title={process.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  {process.isFavorite ? '★' : '☆'}
                </button>
              </td>
              <td className="citizen-name">{process.citizenName}</td>
              <td>{process.violence}</td>
              <td>{process.unit}</td>
              <td>{process.professional}</td>
              <td>
                <span className={`status-badge ${getStatusClass(process.status)}`}>
                  {getStatusText(process.status)}
                </span>
              </td>
              <td>
                <span className={`priority-badge ${getPriorityClass(process.priority)}`}>
                  {getPriorityText(process.priority)}
                </span>
              </td>
              <td>{formatDate(process.createdAt)}</td>
              <td className="action-col">
                <span className="view-details" title="Ver detalhes">→</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}