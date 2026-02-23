'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import './AdminSidebar.css';

interface AdminSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  user?: any;
}

interface MenuItem {
  name: string;
  path: string;
  icon: string;
  count?: number;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function AdminSidebar({ 
  collapsed, 
  mobileOpen, 
  onToggle, 
  onClose, 
  user 
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/logs/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Logs não lidos:', data.count); // Debug
        setUnreadCount(data.count || 0);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      setUnreadCount(0);
    }
  };

  // Formatar nome grande
  const formatName = (name: string) => {
    if (!name) return 'Admin';
    if (name.length > 20) {
      return name.substring(0, 18) + '...';
    }
    return name;
  };

  // Formatar email grande
  const formatEmail = (email: string) => {
    if (!email) return 'admin@sigev.com';
    if (email.length > 25) {
      return email.substring(0, 22) + '...';
    }
    return email;
  };

  const menuItems: MenuSection[] = [
    {
      title: 'PRINCIPAL',
      items: [
        { name: 'Dashboard', path: '/portal/admin/dashboard', icon: '📊' },
        { name: 'Logs do Sistema', path: '/portal/admin/logs', icon: '📋', count: unreadCount },
      ]
    },
    {
      title: 'GERENCIAMENTO',
      items: [
        { name: 'Usuários', path: '/portal/admin/users', icon: '👥' },
        { name: 'Profissionais', path: '/portal/admin/professionals', icon: '👤' },
        { name: 'Unidades', path: '/portal/admin/units', icon: '🏛️' },
      ]
    },
    {
      title: 'DADOS',
      items: [
        { name: 'Violências', path: '/portal/admin/violences', icon: '🔪' },
        { name: 'Formulários', path: '/portal/admin/forms', icon: '📝' },
        { name: 'Documentos', path: '/portal/admin/documents', icon: '📚' },
        { name: 'Relatórios', path: '/portal/admin/reports', icon: '📊' },
      ]
    },
    {
      title: 'SISTEMA',
      items: [
        { name: 'Parâmetros', path: '/portal/admin/parameters', icon: '⚙️' },
        { name: 'Backup', path: '/portal/admin/backup', icon: '💾' },
        { name: 'Segurança', path: '/portal/admin/security', icon: '🔐' },
        { name: 'E-mail', path: '/portal/admin/email', icon: '📧' },
      ]
    }
  ];

  const sidebarClass = `admin-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`;

  return (
    <div className={sidebarClass}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="logo">
          {collapsed ? 'S' : 'SIGEV'}
        </div>
        <button className="toggle-btn" onClick={onToggle} title={collapsed ? 'Expandir' : 'Recolher'}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* User Info - Corrigido para nome grande */}
      {!collapsed && user && (
        <div className="user-info">
          <div className="user-avatar">
            {user.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="user-details">
            <div className="user-name" title={user.name}>
              {formatName(user.name)}
            </div>
            <div className="user-email" title={user.email}>
              {formatEmail(user.email)}
            </div>
            <div className="user-role">Administrador</div>
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="sidebar-menu">
        {menuItems.map((section, idx) => (
          <div key={idx} className="menu-section">
            {!collapsed && <div className="menu-title">{section.title}</div>}
            {section.items.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`menu-item ${pathname === item.path ? 'active' : ''}`}
                onClick={() => mobileOpen && onClose()}
              >
                <span className="menu-icon">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="menu-label">{item.name}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="menu-badge">
                        {item.count > 99 ? '99+' : item.count}
                      </span>
                    )}
                  </>
                )}
              </Link>
            ))}
          </div>
        ))}

        {/* Divider */}
        {!collapsed && <div className="menu-divider"></div>}

        {/* Logout */}
        <div className="menu-section">
          {!collapsed && <div className="menu-title">SESSÃO</div>}
          <button className="menu-item logout-btn" onClick={logout}>
            <span className="menu-icon">🚪</span>
            {!collapsed && <span className="menu-label">Sair</span>}
          </button>
        </div>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="footer-item">
            <span className="footer-label">Versão</span>
            <span className="footer-value">2.0.0</span>
          </div>
          <div className="footer-item">
            <span className="footer-label">Ambiente</span>
            <span className="footer-value env-prod">PROD</span>
          </div>
        </div>
      )}
    </div>
  );
}