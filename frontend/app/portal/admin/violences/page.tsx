'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import './violences.css';

interface Violence {
  id: string;
  name: string;
  description: string;
  detailedDescription: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  processesCount: number;
}

interface ViolencesResponse {
  violences: Violence[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface StatsResponse {
  total: number;
  active: number;
  inactive: number;
  mostUsed: Array<{
    violenceId: string;
    violenceName: string;
    count: number;
  }>;
}

export default function AdminViolencesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [violences, setViolences] = useState<Violence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [stats, setStats] = useState<StatsResponse>({
    total: 0,
    active: 0,
    inactive: 0,
    mostUsed: []
  });
  const [filters, setFilters] = useState({
    search: '',
    isActive: ''
  });
  const [selectedViolence, setSelectedViolence] = useState<Violence | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    detailedDescription: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const fetchViolences = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.isActive && { isActive: filters.isActive })
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/violences?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar tipos de violência');

      const data: ViolencesResponse = await response.json();
      setViolences(data.violences);
      setPagination(data.pagination);
      setError(null);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [user, pagination.page, pagination.limit, filters]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/violences/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchViolences();
      fetchStats();
    }
  }, [user, fetchViolences, fetchStats]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: '', isActive: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRefresh = () => {
    fetchViolences();
    fetchStats();
  };

  const handleCreateViolence = () => {
    setFormData({ name: '', description: '', detailedDescription: '' });
    setModalMode('create');
    setShowModal(true);
  };

  const handleEditViolence = (violence: Violence) => {
    setFormData({
      name: violence.name,
      description: violence.description,
      detailedDescription: violence.detailedDescription || ''
    });
    setSelectedViolence(violence);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleViewViolence = (violence: Violence) => {
    setSelectedViolence(violence);
    setModalMode('view');
    setShowModal(true);
  };

  const handleToggleStatus = async (violenceId: string, currentActive: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/violences/${violenceId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: !currentActive })
      });

      if (response.ok) {
        fetchViolences();
        fetchStats();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao alterar status');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status');
    }
  };

  const handleDeleteViolence = async (violenceId: string, violenceName: string) => {
    if (!confirm(`Tem certeza que deseja deletar o tipo de violência "${violenceName}"?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/violences/${violenceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchViolences();
        fetchStats();
        setShowModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao deletar tipo de violência');
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar tipo de violência');
    }
  };

  const handleSubmitForm = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (modalMode === 'create') {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/violences`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          fetchViolences();
          fetchStats();
          setShowModal(false);
        } else {
          const error = await response.json();
          if (error.code === 'DUPLICATE_ENTRY') {
            alert('Já existe um tipo de violência com este nome');
          } else {
            alert(error.error || 'Erro ao criar tipo de violência');
          }
        }
      } else if (modalMode === 'edit' && selectedViolence) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/violences/${selectedViolence.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          fetchViolences();
          fetchStats();
          setShowModal(false);
        } else {
          const error = await response.json();
          if (error.code === 'DUPLICATE_ENTRY') {
            alert('Já existe um tipo de violência com este nome');
          } else {
            alert(error.error || 'Erro ao atualizar tipo de violência');
          }
        }
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar tipo de violência');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusInfo = (violence: Violence) => {
    return violence.isActive 
      ? { text: 'Ativo', class: 'status-active' }
      : { text: 'Inativo', class: 'status-inactive' };
  };

  if (authLoading) {
    return (
      <div className="violences-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="violences-page">
      <div className="violences-content-wrapper">
        <div className="violences-content">
          <div className="page-header">
            <h1>Tipos de Violência</h1>
            <button className="btn-create" onClick={handleCreateViolence}>
              <span>+</span> Nova Violência
            </button>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.active}</div>
              <div className="stat-label">Ativos</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.inactive}</div>
              <div className="stat-label">Inativos</div>
            </div>
          </div>

          {/* Most Used Chart */}
          {stats.mostUsed.length > 0 && (
            <div className="chart-section">
              <h2>Mais Utilizadas</h2>
              <div className="distribution-chart">
                {stats.mostUsed.map((item, index) => {
                  const maxCount = Math.max(...stats.mostUsed.map(i => i.count));
                  const percentage = (item.count / maxCount) * 100;
                  
                  return (
                    <div key={item.violenceId} className="chart-bar-item">
                      <div className="chart-bar-label">{item.violenceName}</div>
                      <div className="chart-bar-container">
                        <div 
                          className="chart-bar-fill"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: `hsl(${index * 72}, 70%, 50%)`
                          }}
                        >
                          <span className="chart-bar-value">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
          {loading && violences.length === 0 ? (
            <div className="violences-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <>
              {/* Violences Table */}
              <div className="table-container">
                <table className="violences-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Descrição</th>
                      <th>Detalhamento</th>
                      <th>Status</th>
                      <th>Processos</th>
                      <th>Criado em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {violences.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="no-data">
                          Nenhum tipo de violência encontrado
                        </td>
                      </tr>
                    ) : (
                      violences.map((violence) => {
                        const status = getStatusInfo(violence);
                        return (
                          <tr key={violence.id}>
                            <td>
                              <div className="violence-cell">
                                <span className="violence-icon">⚡</span>
                                <span className="violence-name">{violence.name}</span>
                              </div>
                            </td>
                            <td className="description-cell">{violence.description}</td>
                            <td className="description-cell">{violence.detailedDescription || '-'}</td>
                            <td>
                              <span className={`status-badge ${status.class}`}>
                                {status.text}
                              </span>
                            </td>
                            <td className="count-cell">{violence.processesCount}</td>
                            <td className="date-cell">{formatDate(violence.createdAt)}</td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="action-btn view"
                                  onClick={() => handleViewViolence(violence)}
                                  title="Visualizar"
                                >
                                  👁️
                                </button>
                                <button
                                  className="action-btn edit"
                                  onClick={() => handleEditViolence(violence)}
                                  title="Editar"
                                >
                                  ✏️
                                </button>
                                <button
                                  className={`action-btn ${violence.isActive ? 'deactivate' : 'activate'}`}
                                  onClick={() => handleToggleStatus(violence.id, violence.isActive)}
                                  title={violence.isActive ? 'Desativar' : 'Ativar'}
                                >
                                  {violence.isActive ? '⏸️' : '▶️'}
                                </button>
                                <button
                                  className="action-btn delete"
                                  onClick={() => handleDeleteViolence(violence.id, violence.name)}
                                  title="Deletar"
                                  disabled={violence.processesCount > 0}
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
              {pagination.pages > 1 && (
                <div className="pagination">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Anterior
                  </button>
                  <span className="page-info">
                    Página {pagination.page} de {pagination.pages}
                  </span>
                  <button
                    disabled={pagination.page === pagination.pages}
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalMode === 'create' ? 'Nova Violência' : 
                 modalMode === 'edit' ? 'Editar Violência' : 
                 'Detalhes da Violência'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {modalMode === 'view' && selectedViolence ? (
                <div className="violence-details-view">
                  <div className="detail-row">
                    <span className="detail-label">ID:</span>
                    <span className="detail-value">{selectedViolence.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Nome:</span>
                    <span className="detail-value">{selectedViolence.name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Descrição:</span>
                    <span className="detail-value">{selectedViolence.description}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Detalhamento:</span>
                    <span className="detail-value">{selectedViolence.detailedDescription || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`status-badge ${getStatusInfo(selectedViolence).class}`}>
                      {getStatusInfo(selectedViolence).text}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Processos:</span>
                    <span className="detail-value">{selectedViolence.processesCount}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Criado em:</span>
                    <span className="detail-value">{formatDate(selectedViolence.createdAt)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Atualizado em:</span>
                    <span className="detail-value">{formatDate(selectedViolence.updatedAt)}</span>
                  </div>
                </div>
              ) : (
                <div className="form-container">
                  <div className="form-group">
                    <label>Nome *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: Violência Física, Violência Psicológica..."
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>Descrição *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Descrição breve do tipo de violência"
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <label>Descrição Detalhada</label>
                    <textarea
                      value={formData.detailedDescription}
                      onChange={(e) => setFormData({...formData, detailedDescription: e.target.value})}
                      placeholder="Descrição detalhada (incluir exemplos, características, etc.)"
                      rows={5}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {modalMode !== 'view' && (
                <button className="btn-save" onClick={handleSubmitForm}>
                  Salvar
                </button>
              )}
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