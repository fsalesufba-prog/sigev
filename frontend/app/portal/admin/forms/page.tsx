'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import FormBuilder from '../../../../components/forms/FormBuilder';
import type { FormSection } from '../../../../components/forms/FormBuilder';
import './forms.css';

interface Form {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  config?: {
    sections: FormSection[];
  };
}

interface FormsResponse {
  data: Form[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminFormsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    isActive: ''
  });
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [formData, setFormData] = useState({
    name: '',
    type: 'INITIAL' as const,
    description: '',
    config: {
      sections: [] as FormSection[]
    }
  });

  const formTypes = [
    { value: 'INITIAL', label: 'Formulário Inicial' },
    { value: 'ESCUTA_ESPECIALIZADA', label: 'Escuta Especializada' },
    { value: 'RELATORIO_ENCAMINHAMENTO', label: 'Relatório de Encaminhamento' },
    { value: 'RELATORIO_ESCUTA', label: 'Relatório da Escuta' }
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const fetchForms = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type }),
        ...(filters.isActive && { isActive: filters.isActive })
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar formulários');

      const data: FormsResponse = await response.json();
      setForms(data.data);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages
      });
      setError(null);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [user, pagination.page, pagination.limit, filters]);

  useEffect(() => {
    if (user) {
      fetchForms();
    }
  }, [user, fetchForms]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: '', type: '', isActive: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRefresh = () => {
    fetchForms();
  };

  const handleCreateForm = () => {
    // Redirecionar para página de criação com builder visual
    router.push('/portal/admin/forms/new/edit');
  };

  const handleEditForm = (form: Form) => {
    // Redirecionar para página de edição com builder visual
    router.push(`/portal/admin/forms/${form.id}/edit`);
  };

  const handleViewForm = (form: Form) => {
    setSelectedForm(form);
    setModalMode('view');
    setShowModal(true);
  };

  const handleDuplicateForm = async (formId: string, formName: string) => {
    if (!confirm(`Deseja duplicar o formulário "${formName}"?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}/duplicate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchForms();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao duplicar formulário');
      }
    } catch (error) {
      console.error('Erro ao duplicar:', error);
      alert('Erro ao duplicar formulário');
    }
  };

  const handleToggleStatus = async (formId: string, currentActive: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: !currentActive })
      });

      if (response.ok) {
        fetchForms();
        setShowModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao alterar status');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status');
    }
  };

  const handleDeleteForm = async (formId: string, formName: string) => {
    if (!confirm(`Tem certeza que deseja deletar o formulário "${formName}"?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchForms();
        setShowModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao deletar formulário');
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar formulário');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFormTypeText = (type: string) => {
    const types: Record<string, string> = {
      'INITIAL': 'Formulário Inicial',
      'ESCUTA_ESPECIALIZADA': 'Escuta Especializada',
      'RELATORIO_ENCAMINHAMENTO': 'Relatório de Encaminhamento',
      'RELATORIO_ESCUTA': 'Relatório da Escuta'
    };
    return types[type] || type;
  };

  const getStatusInfo = (form: Form) => {
    return form.isActive
      ? { text: 'Ativo', class: 'status-active' }
      : { text: 'Inativo', class: 'status-inactive' };
  };

  if (authLoading) {
    return (
      <div className="forms-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="forms-page">
      <div className="forms-content-wrapper">
        <div className="forms-content">
          <div className="page-header">
            <h1>Formulários Dinâmicos</h1>
            <button className="btn-create" onClick={handleCreateForm}>
              <span>+</span> Novo Formulário
            </button>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <div className="filters-grid">
              <input
                type="text"
                placeholder="Buscar por nome ou descrição..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="filter-input search"
              />

              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="filter-select"
              >
                <option value="">Todos os tipos</option>
                {formTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              <select
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
                className="filter-select"
              >
                <option value="">Todos os status</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>

              <button className="btn-clear" onClick={clearFilters}>
                Limpar
              </button>

              <button className="btn-refresh" onClick={handleRefresh}>
                <span className="refresh-icon">↻</span> Atualizar
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={handleRefresh}>Tentar novamente</button>
            </div>
          )}

          {/* Loading */}
          {loading && forms.length === 0 ? (
            <div className="forms-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <>
              {/* Forms Table */}
              <div className="table-container">
                <table className="forms-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Descrição</th>
                      <th>Status</th>
                      <th>Criado em</th>
                      <th>Atualizado em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forms.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="no-data">
                          Nenhum formulário encontrado
                        </td>
                      </tr>
                    ) : (
                      forms.map((form) => {
                        const status = getStatusInfo(form);
                        return (
                          <tr key={form.id}>
                            <td>
                              <div className="form-cell">
                                <span className="form-icon">📋</span>
                                <span className="form-name">{form.name}</span>
                              </div>
                            </td>
                            <td>{getFormTypeText(form.type)}</td>
                            <td className="description-cell">{form.description || '-'}</td>
                            <td>
                              <span className={`status-badge ${status.class}`}>
                                {status.text}
                              </span>
                            </td>
                            <td className="date-cell">{formatDate(form.createdAt)}</td>
                            <td className="date-cell">{formatDate(form.updatedAt)}</td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="action-btn view"
                                  onClick={() => handleViewForm(form)}
                                  title="Visualizar"
                                >
                                  👁️
                                </button>
                                <button
                                  className="action-btn edit"
                                  onClick={() => handleEditForm(form)}
                                  title="Editar"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="action-btn duplicate"
                                  onClick={() => handleDuplicateForm(form.id, form.name)}
                                  title="Duplicar"
                                >
                                  📋
                                </button>
                                <button
                                  className={`action-btn ${form.isActive ? 'deactivate' : 'activate'}`}
                                  onClick={() => handleToggleStatus(form.id, form.isActive)}
                                  title={form.isActive ? 'Desativar' : 'Ativar'}
                                >
                                  {form.isActive ? '⏸️' : '▶️'}
                                </button>
                                <button
                                  className="action-btn delete"
                                  onClick={() => handleDeleteForm(form.id, form.name)}
                                  title="Deletar"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Anterior
                  </button>
                  <span className="page-info">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <button
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Visualização (apenas visualização, sem edição) */}
      {showModal && modalMode === 'view' && selectedForm && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalhes do Formulário</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-details-view">
                <div className="detail-row">
                  <span className="detail-label">ID:</span>
                  <span className="detail-value">{selectedForm.id}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Nome:</span>
                  <span className="detail-value">{selectedForm.name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Tipo:</span>
                  <span className="detail-value">{getFormTypeText(selectedForm.type)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Descrição:</span>
                  <span className="detail-value">{selectedForm.description || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`status-badge ${getStatusInfo(selectedForm).class}`}>
                    {getStatusInfo(selectedForm).text}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Criado em:</span>
                  <span className="detail-value">{formatDate(selectedForm.createdAt)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Atualizado em:</span>
                  <span className="detail-value">{formatDate(selectedForm.updatedAt)}</span>
                </div>
                <div className="detail-row config-row">
                  <span className="detail-label">Estrutura:</span>
                  <div className="config-summary">
                    {selectedForm.config?.sections?.map((section, idx) => (
                      <div key={section.id} className="section-summary">
                        <h4>{section.title}</h4>
                        <p>{section.fields?.length || 0} campos</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}