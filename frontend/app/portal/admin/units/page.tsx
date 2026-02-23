'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import './units.css';

interface Unit {
  id: string;
  name: string;
  description: string | null;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  type: {
    id: string;
    description: string;
  };
  professionalsCount: number;
  processesCount: number;
}

interface UnitType {
  id: string;
  description: string;
}

interface UnitsResponse {
  units: Unit[];
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
  byType: Array<{
    typeId: string;
    typeName: string;
    count: number;
  }>;
  totalProfessionals: number;
  totalProcesses: number;
}

export default function AdminUnitsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [stats, setStats] = useState<StatsResponse>({
    total: 0,
    active: 0,
    inactive: 0,
    createdToday: 0,
    byType: [],
    totalProfessionals: 0,
    totalProcesses: 0
  });
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    typeId: '',
    status: ''
  });
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    address: '',
    typeId: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const fetchUnits = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.typeId && { typeId: filters.typeId }),
        ...(filters.status && { status: filters.status })
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar unidades');

      const data: UnitsResponse = await response.json();
      setUnits(data.units);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units/stats/summary`, {
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

  const fetchUnitTypes = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units/types`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUnitTypes(data);
      }
    } catch (error) {
      console.error('Erro ao buscar tipos:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUnits();
      fetchStats();
      fetchUnitTypes();
    }
  }, [user, fetchUnits, fetchStats, fetchUnitTypes]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: '', typeId: '', status: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRefresh = () => {
    fetchUnits();
    fetchStats();
  };

  const handleCreateUnit = () => {
    setFormData({
      name: '',
      description: '',
      email: '',
      phone: '',
      address: '',
      typeId: ''
    });
    setModalMode('create');
    setShowModal(true);
  };

  const handleEditUnit = (unit: Unit) => {
    setFormData({
      name: unit.name,
      description: unit.description || '',
      email: unit.email,
      phone: unit.phone,
      address: unit.address,
      typeId: unit.type.id
    });
    setSelectedUnit(unit);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleViewUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setModalMode('view');
    setShowModal(true);
  };

  const handleToggleStatus = async (unitId: string, currentActive: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units/${unitId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: !currentActive })
      });

      if (response.ok) {
        fetchUnits();
        fetchStats();
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta unidade?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units/${unitId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchUnits();
        fetchStats();
        setShowModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao deletar unidade');
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar unidade');
    }
  };

  const handleSubmitForm = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const url = modalMode === 'create' 
        ? `${process.env.NEXT_PUBLIC_API_URL}/units`
        : `${process.env.NEXT_PUBLIC_API_URL}/units/${selectedUnit?.id}`;
      
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
        fetchUnits();
        fetchStats();
        setShowModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao salvar unidade');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar unidade');
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

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
  };

  const getStatusInfo = (unit: Unit) => {
    return unit.isActive 
      ? { text: 'Ativo', class: 'status-active' }
      : { text: 'Inativo', class: 'status-inactive' };
  };

  if (authLoading) {
    return (
      <div className="units-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="units-page">
      <div className="units-content-wrapper">
        <div className="units-content">
          <div className="page-header">
            <h1>Gerenciar Unidades</h1>
            <button className="btn-create" onClick={handleCreateUnit}>
              <span>+</span> Nova Unidade
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
              <div className="stat-label">Ativas</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.inactive}</div>
              <div className="stat-label">Inativas</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalProfessionals}</div>
              <div className="stat-label">Profissionais</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalProcesses}</div>
              <div className="stat-label">Processos</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.createdToday}</div>
              <div className="stat-label">Hoje</div>
            </div>
          </div>

          {/* Charts Section */}
          {stats.byType.length > 0 && (
            <div className="charts-section">
              <h2>Unidades por Tipo</h2>
              <div className="type-chart">
                {stats.byType.map((item, index) => (
                  <div key={item.typeId} className="chart-bar-item">
                    <div className="chart-bar-label">{item.typeName}</div>
                    <div className="chart-bar-container">
                      <div 
                        className="chart-bar-fill"
                        style={{ 
                          width: `${(item.count / Math.max(...stats.byType.map(t => t.count))) * 100}%`,
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
                placeholder="Buscar por nome, email ou endereço..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="filter-input search"
              />
              
              <select
                value={filters.typeId}
                onChange={(e) => handleFilterChange('typeId', e.target.value)}
                className="filter-select"
              >
                <option value="">Todos os tipos</option>
                {unitTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.description}</option>
                ))}
              </select>
              
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="filter-select"
              >
                <option value="">Todos status</option>
                <option value="active">Ativas</option>
                <option value="inactive">Inativas</option>
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
          {loading && units.length === 0 ? (
            <div className="units-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <>
              {/* Units Table */}
              <div className="table-container">
                <table className="units-table">
                  <thead>
                    <tr>
                      <th>Unidade</th>
                      <th>Contato</th>
                      <th>Endereço</th>
                      <th>Tipo</th>
                      <th>Profissionais</th>
                      <th>Processos</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="no-data">
                          Nenhuma unidade encontrada
                        </td>
                      </tr>
                    ) : (
                      units.map((unit) => {
                        const status = getStatusInfo(unit);
                        return (
                          <tr key={unit.id}>
                            <td>
                              <div className="unit-cell">
                                <div className="unit-icon">🏛️</div>
                                <div>
                                  <div className="unit-name">{unit.name}</div>
                                  {unit.description && (
                                    <div className="unit-description">{unit.description}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="contact-info">
                                <div className="unit-email">{unit.email}</div>
                                <div className="unit-phone">{formatPhone(unit.phone)}</div>
                              </div>
                            </td>
                            <td>
                              <div className="unit-address" title={unit.address}>
                                {unit.address}
                              </div>
                            </td>
                            <td>
                              <span className="type-badge">
                                {unit.type.description}
                              </span>
                            </td>
                            <td className="count-cell">{unit.professionalsCount}</td>
                            <td className="count-cell">{unit.processesCount}</td>
                            <td>
                              <span className={`status-badge ${status.class}`}>
                                {status.text}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="action-btn view"
                                  onClick={() => handleViewUnit(unit)}
                                  title="Visualizar"
                                >
                                  👁️
                                </button>
                                <button
                                  className="action-btn edit"
                                  onClick={() => handleEditUnit(unit)}
                                  title="Editar"
                                >
                                  ✏️
                                </button>
                                <button
                                  className={`action-btn ${unit.isActive ? 'deactivate' : 'activate'}`}
                                  onClick={() => handleToggleStatus(unit.id, unit.isActive)}
                                  title={unit.isActive ? 'Desativar' : 'Ativar'}
                                >
                                  {unit.isActive ? '⏸️' : '▶️'}
                                </button>
                                <button
                                  className="action-btn delete"
                                  onClick={() => handleDeleteUnit(unit.id)}
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
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalMode === 'create' ? 'Nova Unidade' : 
                 modalMode === 'edit' ? 'Editar Unidade' : 
                 'Detalhes da Unidade'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {modalMode === 'view' && selectedUnit ? (
                <div className="unit-details-view">
                  <div className="detail-row">
                    <span className="detail-label">Nome:</span>
                    <span className="detail-value">{selectedUnit.name}</span>
                  </div>
                  {selectedUnit.description && (
                    <div className="detail-row">
                      <span className="detail-label">Descrição:</span>
                      <span className="detail-value">{selectedUnit.description}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedUnit.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Telefone:</span>
                    <span className="detail-value">{formatPhone(selectedUnit.phone)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Endereço:</span>
                    <span className="detail-value">{selectedUnit.address}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Tipo:</span>
                    <span className="type-badge">{selectedUnit.type.description}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Profissionais:</span>
                    <span className="detail-value">{selectedUnit.professionalsCount}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Processos:</span>
                    <span className="detail-value">{selectedUnit.processesCount}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Criado em:</span>
                    <span className="detail-value">{formatDate(selectedUnit.createdAt)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`status-badge ${getStatusInfo(selectedUnit).class}`}>
                      {getStatusInfo(selectedUnit).text}
                    </span>
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
                      placeholder="Nome da unidade"
                    />
                  </div>

                  <div className="form-group">
                    <label>Descrição</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Descrição da unidade"
                      rows={3}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="email@unidade.gov.br"
                      />
                    </div>
                    <div className="form-group">
                      <label>Telefone *</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="(49) 3523-1000"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Endereço *</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="Rua, número, bairro, cidade/UF"
                    />
                  </div>

                  <div className="form-group">
                    <label>Tipo de Unidade *</label>
                    <select
                      value={formData.typeId}
                      onChange={(e) => setFormData({...formData, typeId: e.target.value})}
                    >
                      <option value="">Selecione um tipo</option>
                      {unitTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.description}</option>
                      ))}
                    </select>
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