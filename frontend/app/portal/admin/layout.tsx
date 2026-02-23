'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import './admin.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [unreadLogs, setUnreadLogs] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Buscar número real de logs não lidos
  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/logs/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadLogs(data.count || 0);
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    }
  }, []);

  // Buscar notificações (logs não lidos)
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/logs?limit=5&unread=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.logs || data.data || []);
      } else {
        // Fallback para dados de exemplo
        setNotifications([
          {
            id: 1,
            action: 'LOGIN',
            description: 'Novo login no sistema',
            timestamp: new Date().toISOString(),
            read: false,
            user: { name: 'Admin' }
          },
          {
            id: 2,
            action: 'CREATE',
            description: 'Novo usuário criado',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            read: false,
            user: { name: 'Sistema' }
          }
        ]);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, fetchNotifications]);

  // Fechar notificações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-container')) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Formatar badge
  const getLogsBadge = useCallback(() => {
    if (unreadLogs === 0) return null;
    return unreadLogs > 99 ? '99+' : unreadLogs.toString();
  }, [unreadLogs]);

  // Formatar nome grande
  const formatName = useCallback((name: string) => {
    if (!name) return 'Admin';
    if (name.length > 20) {
      return name.substring(0, 18) + '...';
    }
    return name;
  }, []);

  // Formatar email grande
  const formatEmail = useCallback((email: string) => {
    if (!email) return 'admin@sigev.com';
    if (email.length > 25) {
      return email.substring(0, 22) + '...';
    }
    return email;
  }, []);

  // Formatar timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours} h atrás`;
    return `${diffDays} d atrás`;
  };

  // Menu items COMPLETO com badge DINÂMICO
  const menuItems = [
    {
      section: 'PRINCIPAL',
      items: [
        { name: 'Dashboard', href: '/portal/admin/dashboard', icon: '📊' },
        { 
          name: 'Logs do Sistema', 
          href: '/portal/admin/logs', 
          icon: '📋', 
          badge: getLogsBadge() 
        },
      ]
    },
    {
      section: 'GERENCIAMENTO',
      items: [
        { name: 'Usuários', href: '/portal/admin/users', icon: '👥' },
        { name: 'Profissionais', href: '/portal/admin/professionals', icon: '👤' },
        { name: 'Unidades', href: '/portal/admin/units', icon: '🏛️' },
        { name: 'Tipos de Unidade', href: '/portal/admin/unit-types', icon: '🏷️' },
      ]
    },
    {
      section: 'DADOS',
      items: [
        { name: 'Violências', href: '/portal/admin/violences', icon: '⚠️' },
        { name: 'Formulários', href: '/portal/admin/forms', icon: '📝' },
        { name: 'Documentos', href: '/portal/admin/documents', icon: '📄' },
        { name: 'Relatórios', href: '/portal/admin/reports', icon: '📈' },
      ]
    },
    {
      section: 'SISTEMA',
      items: [
        { name: 'Parâmetros', href: '/portal/admin/parameters', icon: '⚙️' },
        { name: 'Backup', href: '/portal/admin/backup', icon: '💾' },
        { name: 'Segurança', href: '/portal/admin/security', icon: '🔒' },
        { name: 'E-mail', href: '/portal/admin/email', icon: '✉️' },
      ]
    }
  ];

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">⚙️</span>
            {sidebarOpen && <span className="logo-text">SIGEV Admin</span>}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Recolher sidebar' : 'Expandir sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <div className="sidebar-content">
          {menuItems.map((section, idx) => (
            <div key={idx} className="menu-section">
              {sidebarOpen && <div className="menu-section-title">{section.section}</div>}
              <div className="menu-items">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`menu-item ${isActive ? 'active' : ''}`}
                    >
                      <span className="menu-icon">{item.icon}</span>
                      {sidebarOpen && (
                        <>
                          <span className="menu-label">{item.name}</span>
                          {item.badge && <span className="menu-badge">{item.badge}</span>}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            {sidebarOpen && (
              <div className="user-details">
                <div className="user-name" title={user?.name}>
                  {formatName(user?.name || 'Admin')}
                </div>
                <div className="user-email" title={user?.email}>
                  {formatEmail(user?.email || 'admin@sigev.com')}
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={logout} 
            className="logout-button" 
            title="Sair"
            aria-label="Sair do sistema"
          >
            {sidebarOpen ? 'Sair' : '🚪'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="main-header">
          <div className="header-left">
            <h1>Painel Administrativo</h1>
          </div>
          <div className="header-right">
            <div className="notification-container" style={{ position: 'relative' }}>
              <div 
                className="notification-bell"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <span aria-label="Notificações">🔔</span>
                {unreadLogs > 0 && (
                  <span className="notification-badge" aria-label={`${unreadLogs} notificações não lidas`}>
                    {unreadLogs > 99 ? '99+' : unreadLogs}
                  </span>
                )}
              </div>

              {/* Dropdown de Notificações */}
              {notificationsOpen && (
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <h3>Notificações</h3>
                    <span className="notifications-count">{unreadLogs} não lidas</span>
                  </div>
                  <div className="notifications-list">
                    {loading ? (
                      <div className="notifications-loading">Carregando...</div>
                    ) : notifications.length > 0 ? (
                      notifications.map((notif, index) => (
                        <Link 
                          key={notif.id || index} 
                          href="/portal/admin/logs"
                          className="notification-item"
                          onClick={() => setNotificationsOpen(false)}
                        >
                          <div className="notification-icon">
                            {notif.action === 'LOGIN' ? '🔐' : 
                             notif.action === 'CREATE' ? '➕' : 
                             notif.action === 'UPDATE' ? '✏️' : 
                             notif.action === 'DELETE' ? '🗑️' : '📋'}
                          </div>
                          <div className="notification-content">
                            <div className="notification-title">
                              {notif.action || 'Log do Sistema'}
                            </div>
                            <div className="notification-desc">
                              {notif.description || `${notif.user?.name || 'Usuário'} realizou uma ação`}
                            </div>
                            <div className="notification-time">
                              {formatTimestamp(notif.timestamp || notif.createdAt)}
                            </div>
                          </div>
                          {!notif.read && <span className="notification-unread"></span>}
                        </Link>
                      ))
                    ) : (
                      <div className="notifications-empty">
                        Nenhuma notificação
                      </div>
                    )}
                  </div>
                  <div className="notifications-footer">
                    <Link href="/portal/admin/logs" onClick={() => setNotificationsOpen(false)}>
                      Ver todas as notificações
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <div className="header-divider" aria-hidden="true"></div>
            <div className="version-info">
              <span className="version-label">Versão</span>
              <span className="version-number">2.0.0</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}