'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import './FormTable.css';

interface FormTableProps {
  forms: Array<{
    id: string;
    name: string;
    type: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  isAdmin: boolean;
  getFormTypeText: (type: string) => string;
  onStatusToggle: () => void;
}

export default function FormTable({ forms, isAdmin, getFormTypeText, onStatusToggle }: FormTableProps) {
  const router = useRouter();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleRowClick = (formId: string) => {
    router.push(`/portal/forms/${formId}`);
  };

  const handleStatusToggle = async (e: React.MouseEvent, formId: string, currentStatus: boolean) => {
    e.stopPropagation();
    
    if (!isAdmin) return;
    
    try {
      setTogglingId(formId);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}/toggle-status`, {
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

  const handleEdit = (e: React.MouseEvent, formId: string) => {
    e.stopPropagation();
    router.push(`/portal/forms/${formId}/edit`);
  };

  const handleDuplicate = async (e: React.MouseEvent, formId: string, formName: string) => {
    e.stopPropagation();
    
    if (!isAdmin) return;
    
    if (!confirm(`Deseja duplicar o formulário "${formName}"?`)) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Erro ao duplicar formulário');
      } else {
        onStatusToggle();
      }
    } catch (error) {
      console.error('Erro ao duplicar formulário:', error);
      alert('Erro ao duplicar formulário');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (forms.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h3>Nenhum formulário encontrado</h3>
        <p>Tente ajustar os filtros ou criar um novo formulário</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="form-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Última Atualização</th>
            <th>Status</th>
            {isAdmin && <th className="action-col">Ações</th>}
            <th className="action-col"></th>
          </tr>
        </thead>
        <tbody>
          {forms.map((form) => (
            <tr 
              key={form.id}
              onClick={() => handleRowClick(form.id)}
              className="form-row"
            >
              <td className="form-name">{form.name}</td>
              <td>{getFormTypeText(form.type)}</td>
              <td className="form-description">{form.description || '-'}</td>
              <td>{formatDate(form.updatedAt)}</td>
              <td>
                <span className={`status-badge ${form.isActive ? 'status-active' : 'status-inactive'}`}>
                  {form.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              {isAdmin && (
                <td className="action-col">
                  <div className="action-buttons">
                    <button
                      className="action-btn edit-btn"
                      onClick={(e) => handleEdit(e, form.id)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="action-btn duplicate-btn"
                      onClick={(e) => handleDuplicate(e, form.id, form.name)}
                      title="Duplicar"
                    >
                      📋
                    </button>
                    <button
                      className={`action-btn status-btn ${form.isActive ? 'deactivate' : 'activate'}`}
                      onClick={(e) => handleStatusToggle(e, form.id, form.isActive)}
                      disabled={togglingId === form.id}
                      title={form.isActive ? 'Desativar' : 'Ativar'}
                    >
                      {togglingId === form.id ? '...' : form.isActive ? '❌' : '✓'}
                    </button>
                  </div>
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