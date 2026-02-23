'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import './AdminHeader.css';

interface Notification {
  id: string;
  type: 'ENCAMINHAMENTO' | 'PENDENCIA' | 'ALERTA' | 'SISTEMA';
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

interface HeaderStats {
  notificationCount: number;
  unreadLogs: number;
  systemAlerts: number;
  currentTime: string;
  currentDate: string;
}

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [stats, setStats] = useState<HeaderStats>({
    notificationCount: 0,
    unreadLogs: 0,
    systemAlerts: 0,
    currentTime: '',
    currentDate: ''
  });
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

  // Atualizar relógio em tempo real
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setStats(prev => ({
        ...prev,
        currentTime: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        currentDate: now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
      }));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Buscar dados dinâmicos
  useEffect(() => {
    fetchHeaderData();
    fetchNotifications();
  }, []);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node) &&
          notificationButtonRef.current && !notificationButtonRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchHeaderData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const [notificationsRes, logsRes, alertsRes] = await Promise.allSettled([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/unread-count`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/logs/unread-count`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/alerts/active`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (notificationsRes.status === 'fulfilled' && notificationsRes.value.ok) {
        const data = await notificationsRes.value.json();
        setStats(prev => ({ ...prev, notificationCount: data.count || 0 }));
      }

      if (logsRes.status === 'fulfilled' && logsRes.value.ok) {
        const data = await logsRes.value.json();
        setStats(prev => ({ ...prev, unreadLogs: data.count || 0 }));
      }

      if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
        const data = await alertsRes.value.json();
        setStats(prev => ({ ...prev, systemAlerts: data.count || 0 }));
      }

    } catch (error) {
      console.error('Erro ao buscar dados do header:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/recent`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setStats(prev => ({ ...prev, notificationCount: Math.max(0, prev.notificationCount - 1) }));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/read-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications([]);
      setStats(prev => ({ ...prev, notificationCount: 0 }));
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const formatTime = (dateString: string) => {
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
    return date.toLocaleDateString('pt-BR');
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

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowProfileMenu(false); // Fecha o menu do perfil se estiver aberto
  };

  const totalNotifications = stats.notificationCount + stats.unreadLogs + stats.systemAlerts;

  return (
    <header className="admin-header">
      <div className="header-left">
        <button className="menu-btn">☰</button>
        <div className="header-title">
          <span className="header-title-main">Painel Administrativo</span>
          <span className="header-title-sub">SIGEV</span>
        </div>
      </div>
      
      <div className="header-right">
        {/* Data e Hora Dinâmicas */}
        <div className="datetime">
          <div className="date">{stats.currentDate}</div>
          <div className="time">{stats.currentTime}</div>
        </div>

        {/* Notificações */}
        <div className="notifications" ref={notificationRef}>
          <button 
            ref={notificationButtonRef}
            className="notifications-btn"
            onClick={toggleNotifications}
            aria-label="Notificações"
          >
            🔔
            {totalNotifications > 0 && (
              <span className="notifications-badge">
                {totalNotifications > 99 ? '99+' : totalNotifications}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-dropdown-header">
                <h3>Notificações</h3>
                {notifications.length > 0 && (
                  <button onClick={markAllAsRead} className="mark-all-read">
                    Marcar todas como lidas
                  </button>
                )}
              </div>
              
              <div className="notification-dropdown-list">
                {/* Logs não lidos */}
                {stats.unreadLogs > 0 && (
                  <Link href="/portal/admin/logs" className="notification-item" onClick={() => setShowNotifications(false)}>
                    <div className="notification-icon" style={{ background: '#2563eb20' }}>
                      <span style={{ color: '#2563eb' }}>📋</span>
                    </div>
                    <div className="notification-content">
                      <p>{stats.unreadLogs} novo{stats.unreadLogs > 1 ? 's' : ''} log{stats.unreadLogs > 1 ? 's' : ''} do sistema</p>
                      <small>Agora mesmo</small>
                    </div>
                  </Link>
                )}

                {/* Alertas do sistema */}
                {stats.systemAlerts > 0 && (
                  <Link href="/portal/admin/alerts" className="notification-item" onClick={() => setShowNotifications(false)}>
                    <div className="notification-icon" style={{ background: '#ef444420' }}>
                      <span style={{ color: '#ef4444' }}>⚠️</span>
                    </div>
                    <div className="notification-content">
                      <p>{stats.systemAlerts} alerta{stats.systemAlerts > 1 ? 's' : ''} de sistema ativo{stats.systemAlerts > 1 ? 's' : ''}</p>
                      <small>Requer atenção</small>
                    </div>
                  </Link>
                )}

                {/* Notificações do banco */}
                {notifications.map(notif => (
                  <div key={notif.id} className="notification-item">
                    <div className="notification-icon" style={{ background: `${getTypeColor(notif.type)}20` }}>
                      <span style={{ color: getTypeColor(notif.type) }}>{getTypeIcon(notif.type)}</span>
                    </div>
                    <div className="notification-content">
                      <p>{notif.message}</p>
                      <small>{formatTime(notif.createdAt)}</small>
                    </div>
                    <button 
                      className="notification-mark-read"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notif.id);
                      }}
                      title="Marcar como lida"
                    >
                      ✓
                    </button>
                  </div>
                ))}

                {/* Nenhuma notificação */}
                {totalNotifications === 0 && (
                  <div className="notification-empty">
                    <span>📭</span>
                    <p>Nenhuma notificação</p>
                  </div>
                )}
              </div>

              <div className="notification-dropdown-footer">
                <Link href="/portal/admin/notifications" onClick={() => setShowNotifications(false)}>
                  Ver todas as notificações
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Perfil do Usuário */}
        <div className="profile" ref={profileRef}>
          <button 
            className="profile-btn"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
          >
            <div className="profile-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="profile-info">
              <span className="profile-name">{user?.name || 'Administrador'}</span>
              <span className="profile-role">{user?.role || 'Admin'}</span>
            </div>
            <span className="profile-arrow">▼</span>
          </button>

          {showProfileMenu && (
            <div className="profile-menu">
              <div className="profile-menu-header">
                <div className="profile-menu-avatar">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="profile-menu-info">
                  <div className="profile-menu-name">{user?.name || 'Administrador'}</div>
                  <div className="profile-menu-email">{user?.email || 'admin@sigev.com'}</div>
                </div>
              </div>

              <div className="profile-menu-items">
                <Link href="/portal/admin/profile" className="profile-menu-item" onClick={() => setShowProfileMenu(false)}>
                  <span className="profile-menu-icon">👤</span>
                  Meu Perfil
                </Link>
                <Link href="/portal/admin/settings" className="profile-menu-item" onClick={() => setShowProfileMenu(false)}>
                  <span className="profile-menu-icon">⚙️</span>
                  Configurações
                </Link>
                <Link href="/portal/admin/security" className="profile-menu-item" onClick={() => setShowProfileMenu(false)}>
                  <span className="profile-menu-icon">🔐</span>
                  Segurança
                </Link>
                
                <div className="profile-menu-divider"></div>

                <button className="profile-menu-item logout" onClick={handleLogout}>
                  <span className="profile-menu-icon">🚪</span>
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}