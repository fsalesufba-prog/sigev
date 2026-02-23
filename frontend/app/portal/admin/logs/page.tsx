'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './logs.css';

interface Log {
  id: string;
  action: string;
  description: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface LogsResponse {
  logs: Log[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    actions: string[];
  };
  stats: {
    total: number;
    today: number;
  };
}

export default function AdminLogsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    action: '',
    search: ''
  });
  const [availableFilters, setAvailableFilters] = useState({
    actions: [] as string[],
    stats: { total: 0, today: 0 }
  });
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user, pagination.page, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.action && { action: filters.action }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar logs');
      }

      const data: LogsResponse = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
      setAvailableFilters({
        actions: data.filters.actions,
        stats: data.stats
      });

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      action: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours} h atrás`;
    if (diffDays < 7) return `${diffDays} dias atrás`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return '#10b981';
    if (action.includes('UPDATE')) return '#f59e0b';
    if (action.includes('DELETE')) return '#ef4444';
    if (action.includes('LOGIN')) return '#2563eb';
    return '#6b7280';
  };

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="logs-page">
      <div className="page-header">
        <h1>Logs do Sistema</h1>
        <div className="header-actions">
          <button 
            className="btn-refresh"
            onClick={fetchLogs}
          >
            ↻ Atualizar
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{availableFilters.stats.total}</div>
          <div className="stat-label">Total de Logs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{availableFilters.stats.today}</div>
          <div className="stat-label">Hoje</div>
        </div>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <input
            type="text"
            placeholder="Buscar..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="filter-input search"
          />
          
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="filter-input"
          />
          
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="filter-input"
          />
          
          <select
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className="filter-select"
          >
            <option value="">Todas ações</option>
            {availableFilters.actions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          
          <button 
            className="btn-clear-filters"
            onClick={clearFilters}
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Descrição</th>
              <th>Entidade</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-data">
                  Nenhum log encontrado
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id}>
                  <td className="log-date">{formatDate(log.createdAt)}</td>
                  <td>
                    {log.user ? (
                      <div className="user-info">
                        <span className="user-name">{log.user.name}</span>
                        <span className="user-email">{log.user.email}</span>
                      </div>
                    ) : (
                      <span className="system-badge">Sistema</span>
                    )}
                  </td>
                  <td>
                    <span 
                      className="action-badge"
                      style={{ 
                        background: `${getActionColor(log.action)}20`,
                        color: getActionColor(log.action),
                        borderColor: getActionColor(log.action)
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="log-description">{log.description || '-'}</td>
                  <td>
                    {log.entityType && (
                      <span className="entity-badge">
                        {log.entityType}
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() => {
                        setSelectedLog(log);
                        setShowDetails(true);
                      }}
                      title="Ver detalhes"
                    >
                      👁️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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

      {showDetails && selectedLog && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalhes do Log</h2>
              <button className="modal-close" onClick={() => setShowDetails(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">ID:</span>
                  <span className="detail-value">{selectedLog.id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Data/Hora:</span>
                  <span className="detail-value">
                    {new Date(selectedLog.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Usuário:</span>
                  <span className="detail-value">
                    {selectedLog.user ? `${selectedLog.user.name} (${selectedLog.user.email})` : 'Sistema'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Ação:</span>
                  <span className="detail-value">{selectedLog.action}</span>
                </div>
                {selectedLog.entityType && (
                  <div className="detail-item">
                    <span className="detail-label">Entidade:</span>
                    <span className="detail-value">{selectedLog.entityType}</span>
                  </div>
                )}
                {selectedLog.entityId && (
                  <div className="detail-item">
                    <span className="detail-label">ID Entidade:</span>
                    <span className="detail-value">{selectedLog.entityId}</span>
                  </div>
                )}
                <div className="detail-item full-width">
                  <span className="detail-label">Descrição:</span>
                  <span className="detail-value">{selectedLog.description || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}