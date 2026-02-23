// frontend/app/portal/processes/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './processes.css';

interface Process {
  id: string;
  citizenName: string;
  citizenId: string;
  citizenCpf?: string;
  violence: string;
  violenceId?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  createdAt: string;
  unit: string;
  unitId: string;
  professional: string;
  professionalId: string;
  isFavorite: boolean;
  description?: string;
  identificationForm: string;
}

interface ProcessesResponse {
  data: Process[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Unit {
  id: string;
  name: string;
}

interface Professional {
  id: string;
  name: string;
}

interface Violence {
  id: string;
  name: string;
}

export default function ProcessesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [units, setUnits] = useState<Unit[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [violences, setViolences] = useState<Violence[]>([]);

  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    unitId: '',
    professionalId: '',
    violenceId: '',
    startDate: '',
    endDate: ''
  });

  const [showFilters, setShowFilters] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const statusOptions = [
    { value: 'PENDING', label: 'Pendente', color: '#FFA500' },
    { value: 'IN_PROGRESS', label: 'Em Andamento', color: '#00D4FF' },
    { value: 'COMPLETED', label: 'Concluído', color: '#10b981' },
    { value: 'ARCHIVED', label: 'Arquivado', color: '#6b7280' }
  ];

  const priorityOptions = [
    { value: 'LOW', label: 'Baixa', color: '#6b7280' },
    { value: 'NORMAL', label: 'Normal', color: '#00D4FF' },
    { value: 'HIGH', label: 'Alta', color: '#FFA500' },
    { value: 'URGENT', label: 'Urgente', color: '#FF1493' }
  ];

  const identificationFormOptions = [
    { value: 'REVELACAO_ESPONTANEA', label: 'Revelação Espontânea' },
    { value: 'SUSPEITA_PROFISSIONAL', label: 'Suspeita Profissional' },
    { value: 'DENUNCIA', label: 'Denúncia' }
  ];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnits();
      fetchProfessionals();
      fetchViolences();
    }
  }, [isAuthenticated]);

  const fetchUnits = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUnits(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar unidades:', error);
    }
  };

  const fetchProfessionals = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfessionals(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
    }
  };

  const fetchViolences = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/violences/list/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setViolences(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar violências:', error);
    }
  };

  const fetchProcesses = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(favoritesOnly && { isFavorite: 'true' }),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.unitId && { unitId: filters.unitId }),
        ...(filters.professionalId && { professionalId: filters.professionalId }),
        ...(filters.violenceId && { violenceId: filters.violenceId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/processes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar processos');

      const data: ProcessesResponse = await response.json();
      setProcesses(data.data);
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
  }, [isAuthenticated, pagination.page, pagination.limit, filters, favoritesOnly]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProcesses();
    }
  }, [isAuthenticated, fetchProcesses]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleToggleFavorite = async (processId: string, currentFavorite: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/processes/${processId}/favorite`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setProcesses(prev => prev.map(p => 
          p.id === processId ? { ...p, isFavorite: !currentFavorite } : p
        ));
      }
    } catch (error) {
      console.error('Erro ao favoritar:', error);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      unitId: '',
      professionalId: '',
      violenceId: '',
      startDate: '',
      endDate: ''
    });
    setFavoritesOnly(false);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'IN_PROGRESS': return 'status-progress';
      case 'COMPLETED': return 'status-completed';
      case 'ARCHIVED': return 'status-archived';
      default: return '';
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'priority-low';
      case 'NORMAL': return 'priority-normal';
      case 'HIGH': return 'priority-high';
      case 'URGENT': return 'priority-urgent';
      default: return '';
    }
  };

  const getIdentificationFormText = (form: string) => {
    const forms: Record<string, string> = {
      'REVELACAO_ESPONTANEA': 'Revelação Espontânea',
      'SUSPEITA_PROFISSIONAL': 'Suspeita Profissional',
      'DENUNCIA': 'Denúncia'
    };
    return forms[form] || form;
  };

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="dashboard-container">

      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

        
        <div className="content-wrapper">
          <div className="processes-header">
            <h1>Processos</h1>
            <div className="header-actions">
              <button 
                className={`btn-favorites ${favoritesOnly ? 'active' : ''}`}
                onClick={() => setFavoritesOnly(!favoritesOnly)}
              >
                ⭐ {favoritesOnly ? 'Todos' : 'Favoritos'}
              </button>
              <button 
                className="btn-new-process"
                onClick={() => router.push('/portal/processes/new')}
              >
                + Novo Processo
              </button>
              <button 
                className="btn-filters"
                onClick={() => setShowFilters(!showFilters)}
              >
                🔍 Filtros
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={fetchProcesses}>Tentar novamente</button>
            </div>
          )}

          {showFilters && (
            <div className="filters-panel">
              <div className="filters-grid">
                <div className="filter-group full-width">
                  <input
                    type="text"
                    placeholder="Buscar por cidadão, CPF ou descrição..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="search-input"
                  />
                </div>

                <div className="filter-group">
                  <label>Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Prioridade</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                  >
                    <option value="">Todas</option>
                    {priorityOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Unidade</label>
                  <select
                    value={filters.unitId}
                    onChange={(e) => handleFilterChange('unitId', e.target.value)}
                  >
                    <option value="">Todas</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Profissional</label>
                  <select
                    value={filters.professionalId}
                    onChange={(e) => handleFilterChange('professionalId', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {professionals.map(prof => (
                      <option key={prof.id} value={prof.id}>{prof.name}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Tipo de Violência</label>
                  <select
                    value={filters.violenceId}
                    onChange={(e) => handleFilterChange('violenceId', e.target.value)}
                  >
                    <option value="">Todas</option>
                    {violences.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Data Inicial</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <label>Data Final</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-actions">
                <button className="btn-clear" onClick={clearFilters}>
                  Limpar Filtros
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          ) : processes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>Nenhum processo encontrado</h3>
              <p>Tente ajustar os filtros ou criar um novo processo</p>
            </div>
          ) : (
            <>
              <div className="processes-grid">
                {processes.map((process) => (
                  <div 
                    key={process.id} 
                    className="process-card"
                    onClick={() => router.push(`/portal/processes/${process.id}`)}
                  >
                    <div className="card-header">
                      <div className="card-title">
                        <h3>{process.citizenName}</h3>
                        <button 
                          className={`favorite-btn ${process.isFavorite ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(process.id, process.isFavorite);
                          }}
                        >
                          {process.isFavorite ? '⭐' : '☆'}
                        </button>
                      </div>
                      <span className={`priority-badge ${getPriorityClass(process.priority)}`}>
                        {process.priority}
                      </span>
                    </div>

                    <div className="card-content">
                      <p className="citizen-info">
                        {process.citizenCpf && `CPF: ${process.citizenCpf}`}
                      </p>
                      <p className="violence-info">
                        <strong>Violência:</strong> {process.violence}
                      </p>
                      <p className="identification-info">
                        <strong>Identificação:</strong> {getIdentificationFormText(process.identificationForm)}
                      </p>
                      <p className="professional-info">
                        <strong>Profissional:</strong> {process.professional}
                      </p>
                      <p className="unit-info">
                        <strong>Unidade:</strong> {process.unit}
                      </p>
                      {process.description && (
                        <p className="description">{process.description}</p>
                      )}
                    </div>

                    <div className="card-footer">
                      <span className={`status-badge ${getStatusClass(process.status)}`}>
                        {process.status}
                      </span>
                      <span className="date">{formatDate(process.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Anterior
                  </button>
                  <span>
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
    </div>
  );
}