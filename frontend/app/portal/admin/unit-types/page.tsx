'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import './unit-types.css';

interface UnitType {
  id: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  unitsCount: number;
}

interface UnitTypesResponse {
  unitTypes: UnitType[];
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
  createdToday: number;
  unitsDistribution: Array<{
    typeId: string;
    typeName: string;
    count: number;
  }>;
}

export default function AdminUnitTypesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [stats, setStats] = useState<StatsResponse>({
    total: 0,
    active: 0,
    inactive: 0,
    createdToday: 0,
    unitsDistribution: []
  });
  const [filters, setFilters] = useState({
    search: '',
    status: ''
  });
  const [selectedType, setSelectedType] = useState<UnitType | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [formData, setFormData] = useState({
    description: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const fetchUnitTypes = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status })
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unit-types?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar tipos de unidade');

      const data: UnitTypesResponse = await response.json();
      setUnitTypes(data.unitTypes);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unit-types/stats/summary`, {
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
      fetchUnitTypes();
      fetchStats();
    }
  }, [user, fetchUnitTypes, fetchStats]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: '', status: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRefresh = () => {
    fetchUnitTypes();
    fetchStats();
  };

  const handleCreateType = () => {
    setFormData({ description: '' });
    setModalMode('create');
    setShowModal(true);
  };

  const handleEditType = (type: UnitType) => {
    setFormData({ description: type.description });
    setSelectedType(type);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleViewType = (type: UnitType) => {
    setSelectedType(type);
    setModalMode('view');
    setShowModal(true);
  };

  const handleToggleStatus = async (typeId: string, currentActive: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unit-types/${typeId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: !currentActive })
      });

      if (response.ok) {
        fetchUnitTypes();
        fetchStats();
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  const handleDeleteType = async (typeId: string, typeName: string) => {
    if (!confirm(`Tem certeza que deseja deletar o tipo "${typeName}"?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unit-types/${typeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchUnitTypes();
        fetchStats();
        setShowModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao deletar tipo');
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar tipo');
    }
  };

  const handleSubmitForm = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const url = modalMode === 'create' 
        ? `${process.env.NEXT_PUBLIC_API_URL}/unit-types`
        : `${process.env.NEXT_PUBLIC_API_URL}/unit-types/${selectedType?.id}`;
      
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchUnitTypes();
        fetchStats();
        setShowModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao salvar tipo de unidade');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar tipo de unidade');
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

  const getStatusInfo = (type: UnitType) => {
    return type.isActive 
      ? { text: 'Ativo', class: 'status-active' }
      : { text: 'Inativo', class: 'status-inactive' };
  };

  if (authLoading) {
    return (
      <div className="unit-types-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="unit-types-page">
      <div className="unit-types-content-wrapper">
        <div className="unit-types-content">
          <div className="page-header">
            <h1>Tipos de Unidade</h1>
            <button className="btn-create" onClick={handleCreateType}>
              <span>+</span> Novo Tipo
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
            <div className="stat-card">
              <div className="stat-value">{stats.createdToday}</div>
              <div className="stat-label">Hoje</div>
            </div>
          </div>

          {/* Distribution Chart */}
          {stats.unitsDistribution.length > 0 && (
            <div className="chart-section">
              <h2>Unidades por Tipo</h2>
              <div className="distribution-chart">
                {stats.unitsDistribution.map((item, index) => (
                  <div key={item.typeId} className="chart-bar-item">
                    <div className="chart-bar-label">{item.typeName}</div>
                    <div className="chart-bar-container">
                      <div 
                        className="chart-bar-fill"
                        style={{ 
                          width: `${(item.count / Math.max(...stats.unitsDistribution.map(d => d.count))) * 100}%`,
                          backgroundColor: `hsl(${index * 45}, 70%, 50%)`
                        }}
                      >
                        <span className="chart-bar-value">{item.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="filters-section">
            <div className="filters-grid">
              <input
                type="text"
                placeholder="Buscar por descrição..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="filter-input search"
              />
              
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="filter-select"
              >
                <option value="">Todos status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
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
          {loading && unitTypes.length === 0 ? (
            <div className="unit-types-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <>
              {/* Types Table */}
              <div className="table-container">
                <table className="unit-types-table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Status</th>
                      <th>Unidades</th>
                      <th>Criado em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitTypes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="no-data">
                          Nenhum tipo de unidade encontrado
                        </td>
                      </tr>
                    ) : (
                      unitTypes.map((type) => {
                        const status = getStatusInfo(type);
                        return (
                          <tr key={type.id}>
                            <td>
                              <div className="type-cell">
                                <span className="type-icon">🏷️</span>
                                <span className="type-name">{type.description}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`status-badge ${status.class}`}>
                                {status.text}
                              </span>
                            </td>
                            <td className="count-cell">{type.unitsCount}</td>
                            <td className="date-cell">{formatDate(type.createdAt)}</td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="action-btn view"
                                  onClick={() => handleViewType(type)}
                                  title="Visualizar"
                                >
                                  👁️
                                </button>
                                <button
                                  className="action-btn edit"
                                  onClick={() => handleEditType(type)}
                                  title="Editar"
                                >
                                  ✏️
                                </button>
                                <button
                                  className={`action-btn ${type.isActive ? 'deactivate' : 'activate'}`}
                                  onClick={() => handleToggleStatus(type.id, type.isActive)}
                                  title={type.isActive ? 'Desativar' : 'Ativar'}
                                >
                                  {type.isActive ? '⏸️' : '▶️'}
                                </button>
                                <button
                                  className="action-btn delete"
                                  onClick={() => handleDeleteType(type.id, type.description)}
                                  title="Deletar"
                                  disabled={type.unitsCount > 0}
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
                {modalMode === 'create' ? 'Novo Tipo de Unidade' : 
                 modalMode === 'edit' ? 'Editar Tipo de Unidade' : 
                 'Detalhes do Tipo de Unidade'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {modalMode === 'view' && selectedType ? (
                <div className="type-details-view">
                  <div className="detail-row">
                    <span className="detail-label">ID:</span>
                    <span className="detail-value">{selectedType.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Descrição:</span>
                    <span className="detail-value">{selectedType.description}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`status-badge ${getStatusInfo(selectedType).class}`}>
                      {getStatusInfo(selectedType).text}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Unidades:</span>
                    <span className="detail-value">{selectedType.unitsCount}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Criado em:</span>
                    <span className="detail-value">{formatDate(selectedType.createdAt)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Atualizado em:</span>
                    <span className="detail-value">{formatDate(selectedType.updatedAt)}</span>
                  </div>
                </div>
              ) : (
                <div className="form-container">
                  <div className="form-group">
                    <label>Descrição *</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Ex: Conselho Tutelar, Assistência Social, Saúde..."
                      autoFocus
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