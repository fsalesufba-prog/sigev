'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './notifications.css';

interface Notification {
  id: string;
  type: 'ENCAMINHAMENTO' | 'PENDENCIA' | 'ALERTA' | 'SISTEMA';
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
  receiver?: {
    id: string;
    name: string;
    email: string;
  };
  receiverUnit?: {
    id: string;
    name: string;
  };
  encaminhamento?: {
    id: string;
    status: string;
    deadline: string;
  };
  process?: {
    id: string;
    description: string;
    citizen: {
      id: string;
      name: string;
    };
  };
}

interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

interface StatsResponse {
  total: number;
  unread: number;
  encaminhamentos: number;
  alertas: number;
  sistema: number;
}

export default function AdminNotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [stats, setStats] = useState<StatsResponse>({
    total: 0,
    unread: 0,
    encaminhamentos: 0,
    alertas: 0,
    sistema: 0
  });
  const [filters, setFilters] = useState({
    type: '',
    read: ''
  });
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.type && { type: filters.type }),
        ...(filters.read && { read: filters.read })
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar notificações');

      const data: NotificationsResponse = await response.json();
      setNotifications(data.notifications);
      setPagination(data.pagination);
      setStats(prev => ({ ...prev, unread: data.unreadCount }));
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/stats`, {
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
      fetchNotifications();
      fetchStats();
    }
  }, [user, fetchNotifications, fetchStats]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ type: '', read: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRefresh = () => {
    fetchNotifications();
    fetchStats();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, readAt: new Date().toISOString() } 
              : n
          )
        );
        fetchStats();
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/read-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, readAt: new Date().toISOString() }))
        );
        fetchStats();
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const handleViewNotification = async (notification: Notification) => {
    setSelectedNotification(notification);
    setShowModal(true);
    
    if (!notification.readAt) {
      await handleMarkAsRead(notification.id);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ENCAMINHAMENTO': return '📨';
      case 'PENDENCIA': return '⏰';
      case 'ALERTA': return '⚠️';
      case 'SISTEMA': return '⚙️';
      default: return '📌';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ENCAMINHAMENTO': return '#2563eb';
      case 'PENDENCIA': return '#f59e0b';
      case 'ALERTA': return '#ef4444';
      case 'SISTEMA': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  if (authLoading) {
    return (
      <div className="notifications-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="notifications-page">
      <div className="notifications-content-wrapper">
        <div className="notifications-content">
          <div className="page-header">
            <h1>Central de Notificações</h1>
            <div className="header-actions">
              {stats.unread > 0 && (
                <button className="btn-mark-all" onClick={handleMarkAllAsRead}>
                  ✓ Marcar todas como lidas
                </button>
              )}
              <button className="btn-refresh" onClick={handleRefresh}>
                <span className="refresh-icon">↻</span> Atualizar
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-value">{stats.unread}</div>
              <div className="stat-label">Não lidas</div>
            </div>
            <div className="stat-card encaminhamento">
              <div className="stat-value">{stats.encaminhamentos}</div>
              <div className="stat-label">Encaminhamentos</div>
            </div>
            <div className="stat-card alerta">
              <div className="stat-value">{stats.alertas}</div>
              <div className="stat-label">Alertas</div>
            </div>
            <div className="stat-card sistema">
              <div className="stat-value">{stats.sistema}</div>
              <div className="stat-label">Sistema</div>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <div className="filters-grid">
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="filter-select"
              >
                <option value="">Todos os tipos</option>
                <option value="ENCAMINHAMENTO">Encaminhamentos</option>
                <option value="PENDENCIA">Pendências</option>
                <option value="ALERTA">Alertas</option>
                <option value="SISTEMA">Sistema</option>
              </select>
              
              <select
                value={filters.read}
                onChange={(e) => handleFilterChange('read', e.target.value)}
                className="filter-select"
              >
                <option value="">Todas</option>
                <option value="unread">Não lidas</option>
                <option value="read">Lidas</option>
              </select>
              
              <button className="btn-clear" onClick={clearFilters}>
                Limpar
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
          {loading && notifications.length === 0 ? (
            <div className="notifications-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <>
              {/* Notifications List */}
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div className="no-notifications">
                    <div className="no-notifications-icon">📭</div>
                    <h3>Nenhuma notificação</h3>
                    <p>Você não tem notificações no momento</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`notification-item ${!notification.readAt ? 'unread' : ''}`}
                      onClick={() => handleViewNotification(notification)}
                    >
                      <div 
                        className="notification-icon"
                        style={{ backgroundColor: `${getTypeColor(notification.type)}20` }}
                      >
                        <span style={{ color: getTypeColor(notification.type) }}>
                          {getTypeIcon(notification.type)}
                        </span>
                      </div>
                      
                      <div className="notification-content">
                        <div className="notification-header">
                          <h3 className="notification-title">{notification.title}</h3>
                          <span className="notification-time">{formatDate(notification.createdAt)}</span>
                        </div>
                        
                        <p className="notification-message">{notification.message}</p>
                        
                        <div className="notification-footer">
                          <span className="notification-type" style={{ color: getTypeColor(notification.type) }}>
                            {notification.type}
                          </span>
                          
                          {notification.process && (
                            <Link 
                              href={`/portal/admin/processes/${notification.process.id}`}
                              className="notification-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Ver processo →
                            </Link>
                          )}
                          
                          {notification.encaminhamento && (
                            <Link 
                              href={`/portal/admin/encaminhamentos/${notification.encaminhamento.id}`}
                              className="notification-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Ver encaminhamento →
                            </Link>
                          )}
                        </div>
                      </div>
                      
                      {!notification.readAt && (
                        <div className="notification-unread-dot"></div>
                      )}
                    </div>
                  ))
                )}
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
      {showModal && selectedNotification && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalhes da Notificação</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="notification-detail-header">
                <div 
                  className="notification-detail-icon"
                  style={{ backgroundColor: `${getTypeColor(selectedNotification.type)}20` }}
                >
                  <span style={{ color: getTypeColor(selectedNotification.type), fontSize: '32px' }}>
                    {getTypeIcon(selectedNotification.type)}
                  </span>
                </div>
                <div>
                  <h3>{selectedNotification.title}</h3>
                  <span className="notification-detail-time">
                    {new Date(selectedNotification.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="notification-detail-message">
                <p>{selectedNotification.message}</p>
              </div>

              <div className="notification-detail-info">
                <div className="info-row">
                  <span className="info-label">Tipo:</span>
                  <span className="info-value" style={{ color: getTypeColor(selectedNotification.type) }}>
                    {selectedNotification.type}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">Remetente:</span>
                  <span className="info-value">
                    {selectedNotification.sender.name} ({selectedNotification.sender.email})
                  </span>
                </div>

                {selectedNotification.receiver && (
                  <div className="info-row">
                    <span className="info-label">Destinatário:</span>
                    <span className="info-value">
                      {selectedNotification.receiver.name}
                    </span>
                  </div>
                )}

                {selectedNotification.receiverUnit && (
                  <div className="info-row">
                    <span className="info-label">Unidade:</span>
                    <span className="info-value">
                      {selectedNotification.receiverUnit.name}
                    </span>
                  </div>
                )}

                {selectedNotification.readAt ? (
                  <div className="info-row">
                    <span className="info-label">Lida em:</span>
                    <span className="info-value">
                      {new Date(selectedNotification.readAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ) : (
                  <div className="info-row">
                    <span className="info-label">Status:</span>
                    <span className="info-value status-unread">Não lida</span>
                  </div>
                )}
              </div>

              {selectedNotification.process && (
                <div className="notification-detail-related">
                  <h4>Processo Relacionado</h4>
                  <div className="related-item">
                    <p><strong>ID:</strong> {selectedNotification.process.id}</p>
                    <p><strong>Descrição:</strong> {selectedNotification.process.description}</p>
                    <p><strong>Cidadão:</strong> {selectedNotification.process.citizen.name}</p>
                    <Link 
                      href={`/portal/admin/processes/${selectedNotification.process.id}`}
                      className="related-link"
                    >
                      Ver processo completo →
                    </Link>
                  </div>
                </div>
              )}

              {selectedNotification.encaminhamento && (
                <div className="notification-detail-related">
                  <h4>Encaminhamento Relacionado</h4>
                  <div className="related-item">
                    <p><strong>Status:</strong> {selectedNotification.encaminhamento.status}</p>
                    {selectedNotification.encaminhamento.deadline && (
                      <p><strong>Prazo:</strong> {new Date(selectedNotification.encaminhamento.deadline).toLocaleDateString('pt-BR')}</p>
                    )}
                    <Link 
                      href={`/portal/admin/encaminhamentos/${selectedNotification.encaminhamento.id}`}
                      className="related-link"
                    >
                      Ver encaminhamento →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {!selectedNotification.readAt && (
                <button 
                  className="btn-mark-read"
                  onClick={() => {
                    handleMarkAsRead(selectedNotification.id);
                    setShowModal(false);
                  }}
                >
                  Marcar como lida
                </button>
              )}
              <button className="btn-close" onClick={() => setShowModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}