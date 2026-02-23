'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import './ViolenceTable.css';

interface ViolenceTableProps {
  violences: Array<{
    id: string;
    name: string;
    description: string;
    detailedDescription: string | null;
    isActive: boolean;
    processesCount: number;
  }>;
  isAdmin: boolean;
  onStatusToggle: () => void;
}

export default function ViolenceTable({ violences, isAdmin, onStatusToggle }: ViolenceTableProps) {
  const router = useRouter();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleRowClick = (violenceId: string) => {
    router.push(`/portal/violences/${violenceId}`);
  };

  const handleStatusToggle = async (e: React.MouseEvent, violenceId: string, currentStatus: boolean) => {
    e.stopPropagation();
    
    if (!isAdmin) return;
    
    try {
      setTogglingId(violenceId);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/violences/${violenceId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: !currentStatus })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Erro ao alterar status');
      } else {
        onStatusToggle();
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status');
    } finally {
      setTogglingId(null);
    }
  };

  if (violences.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h3>Nenhum tipo de violência encontrado</h3>
        <p>Tente ajustar os filtros ou criar um novo tipo de violência</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="violence-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Descrição</th>
            <th>Processos</th>
            <th>Status</th>
            {isAdmin && <th className="action-col">Ações</th>}
            <th className="action-col"></th>
          </tr>
        </thead>
        <tbody>
          {violences.map((violence) => (
            <tr 
              key={violence.id}
              onClick={() => handleRowClick(violence.id)}
              className="violence-row"
            >
              <td className="violence-name">{violence.name}</td>
              <td className="violence-description">{violence.description}</td>
              <td className="count-cell">{violence.processesCount}</td>
              <td>
                <span className={`status-badge ${violence.isActive ? 'status-active' : 'status-inactive'}`}>
                  {violence.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              {isAdmin && (
                <td className="action-col">
                  <button
                    className={`status-toggle-btn ${violence.isActive ? 'deactivate' : 'activate'}`}
                    onClick={(e) => handleStatusToggle(e, violence.id, violence.isActive)}
                    disabled={togglingId === violence.id}
                    title={violence.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {togglingId === violence.id ? '...' : violence.isActive ? '❌' : '✓'}
                  </button>
                </td>
              )}
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