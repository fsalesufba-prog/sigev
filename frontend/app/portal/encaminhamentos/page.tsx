// frontend/app/portal/encaminhamentos/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './encaminhamentos.css';

// INTERFACES
interface Encaminhamento {
  id: string;
  processId: string;
  citizenName?: string;
  fromUnit: string;
  toUnit: string;
  description?: string;
  status: string;
  createdAt: string;
  deadline?: string;
  openedAt?: string;
  openedBy?: {
    name: string;
  };
}

interface Unit {
  id: string;
  name: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Filters {
  status: string;
  fromUnitId: string;
  toUnitId: string;
}

export default function EncaminhamentosPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [encaminhamentos, setEncaminhamentos] = useState<Encaminhamento[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [units, setUnits] = useState<Unit[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const [filters, setFilters] = useState<Filters>({
    status: '',
    fromUnitId: '',
    toUnitId: ''
  });

  const statusOptions = [
    { value: 'PENDING', label: 'Pendente' },
    { value: 'OPENED', label: 'Aberto' },
    { value: 'COMPLETED', label: 'Concluído' },
    { value: 'CANCELLED', label: 'Cancelado' }
  ];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/auth/login';
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      carregarUnidades();
      carregarEncaminhamentos();
    }
  }, [isAuthenticated]);

  const carregarUnidades = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('accessToken');
      const resposta = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (resposta.ok) {
        const dados = await resposta.json();
        let listaUnidades: Unit[] = [];

        if (Array.isArray(dados)) {
          listaUnidades = dados;
        } else if (dados.data && Array.isArray(dados.data)) {
          listaUnidades = dados.data;
        }

        setUnits(listaUnidades);
      }
    } catch {
      // Silêncio
    }
  };

  const carregarEncaminhamentos = async (): Promise<void> => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const params = new URLSearchParams();
      params.append('page', String(pagination.page));
      params.append('limit', String(pagination.limit));

      if (filters.status) params.append('status', filters.status);
      if (filters.fromUnitId) params.append('fromUnitId', filters.fromUnitId);
      if (filters.toUnitId) params.append('toUnitId', filters.toUnitId);

      const resposta = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/encaminhamentos?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!resposta.ok) throw new Error('Erro ao carregar encaminhamentos');

      const dados = await resposta.json();

      setEncaminhamentos(dados.data || []);
      setPagination({
        page: dados.page || 1,
        limit: dados.limit || 10,
        total: dados.total || 0,
        totalPages: dados.totalPages || 1
      });

      setError('');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (campo: keyof Filters, valor: string): void => {
    const novosFiltros = { ...filters, [campo]: valor };
    setFilters(novosFiltros);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const aplicarFiltros = (): void => {
    carregarEncaminhamentos();
  };

  const limparFiltros = (): void => {
    setFilters({
      status: '',
      fromUnitId: '',
      toUnitId: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    setTimeout(() => carregarEncaminhamentos(), 100);
  };

  const formatarData = (dataString?: string): string => {
    if (!dataString) return '-';

    try {
      const data = new Date(dataString);
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const getStatusClass = (status: string): string => {
    if (status === 'PENDING') return 'status-pending';
    if (status === 'OPENED') return 'status-opened';
    if (status === 'COMPLETED') return 'status-completed';
    if (status === 'CANCELLED') return 'status-cancelled';
    return '';
  };

  const getStatusText = (status: string): string => {
    if (status === 'PENDING') return 'Pendente';
    if (status === 'OPENED') return 'Aberto';
    if (status === 'COMPLETED') return 'Concluído';
    if (status === 'CANCELLED') return 'Cancelado';
    return status;
  };

  const getStatusIcon = (status: string): string => {
    if (status === 'PENDING') return '⏳';
    if (status === 'OPENED') return '📂';
    if (status === 'COMPLETED') return '✅';
    if (status === 'CANCELLED') return '❌';
    return '❓';
  };

  const calcularDiasRestantes = (prazo?: string): number | null => {
    if (!prazo) return null;

    try {
      const hoje = new Date();
      const dataPrazo = new Date(prazo);
      const diff = dataPrazo.getTime() - hoje.getTime();
      const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return dias;
    } catch {
      return null;
    }
  };

  const irParaDetalhe = (id: string): void => {
    if (id) {
      window.location.href = `/portal/encaminhamentos/${id}`;
    }
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
    <div className="encaminhamentos-page dashboard-container">



      <div className="content-wrapper">
        <div className="encaminhamentos-header">
          <h1 className="page-title">Encaminhamentos</h1>
          <div className="header-actions">
            <button
              className="btn-new"
              onClick={() => {
                const processId = prompt('Digite o ID do processo:');
                if (processId) {
                  window.location.href = `/portal/encaminhamentos/new?processId=${processId}`;
                }
              }}
            >
              + Novo Encaminhamento
            </button>
            <button
              className="btn-filters"
              onClick={() => setShowFilters(!showFilters)}
            >
              🔍 Filtros
            </button>
            <button
              className="btn-refresh"
              onClick={carregarEncaminhamentos}
            >
              ↻ Atualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={carregarEncaminhamentos}>Tentar novamente</button>
          </div>
        )}

        {showFilters && (
          <div className="filters-panel">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">Todos</option>
                  {statusOptions.map((opcao, index) => (
                    <option key={index} value={opcao.value}>{opcao.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Unidade de Origem</label>
                <select
                  value={filters.fromUnitId}
                  onChange={(e) => handleFilterChange('fromUnitId', e.target.value)}
                >
                  <option value="">Todas</option>
                  {units.map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>{unidade.name}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Unidade de Destino</label>
                <select
                  value={filters.toUnitId}
                  onChange={(e) => handleFilterChange('toUnitId', e.target.value)}
                >
                  <option value="">Todas</option>
                  {units.map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>{unidade.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="filter-actions">
              <button className="btn-apply" onClick={aplicarFiltros}>
                Aplicar Filtros
              </button>
              <button className="btn-clear" onClick={limparFiltros}>
                Limpar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : encaminhamentos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📤</div>
            <h3>Nenhum encaminhamento encontrado</h3>
            <p>Tente ajustar os filtros</p>
          </div>
        ) : (
          <>
            <div className="encaminhamentos-list">
              {encaminhamentos.map((item) => {
                const dias = calcularDiasRestantes(item.deadline);

                return (
                  <div
                    key={item.id}
                    className="encaminhamento-card"
                    onClick={() => irParaDetalhe(item.id)}
                  >
                    <div className="card-header">
                      <div className="process-info">
                        <span className="process-id">
                          Processo #{item.processId ? item.processId.slice(0, 8) : 'N/A'}
                        </span>
                        {item.citizenName && (
                          <span className="citizen-name">{item.citizenName}</span>
                        )}
                      </div>
                      <span className={`status-badge ${getStatusClass(item.status)}`}>
                        {getStatusIcon(item.status)} {getStatusText(item.status)}
                      </span>
                    </div>

                    <div className="card-units">
                      <div className="unit from">
                        <span className="unit-label">Origem:</span>
                        <span className="unit-name">{item.fromUnit || 'N/A'}</span>
                      </div>
                      <div className="unit-arrow">→</div>
                      <div className="unit to">
                        <span className="unit-label">Destino:</span>
                        <span className="unit-name">{item.toUnit || 'N/A'}</span>
                      </div>
                    </div>

                    {item.description && (
                      <p className="description">{item.description}</p>
                    )}

                    <div className="card-footer">
                      <div className="date-info">
                        <span className="date-label">Enviado:</span>
                        <span className="date-value">{formatarData(item.createdAt)}</span>
                      </div>

                      {item.deadline && (
                        <div className={`deadline-info ${dias !== null && dias < 0 ? 'expired' : dias !== null && dias <= 2 ? 'urgent' : ''}`}>
                          <span className="deadline-label">Prazo:</span>
                          <span className="deadline-value">{formatarData(item.deadline)}</span>
                          {dias !== null && (
                            <span className="days-left">
                              {dias < 0 ? `${Math.abs(dias)} dias atrasado` : `${dias} dias restantes`}
                            </span>
                          )}
                        </div>
                      )}

                      {item.openedAt && (
                        <div className="opened-info">
                          <span className="opened-label">Aberto em:</span>
                          <span className="opened-value">{formatarData(item.openedAt)}</span>
                          {item.openedBy && <span className="opened-by">por {item.openedBy.name}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
  );
}