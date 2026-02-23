// frontend/components/layout/Sidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import './Sidebar.css';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen?: boolean;
  onToggle: () => void;
  onClose?: () => void;
  user?: any;
}

interface MenuItem {
  icon: string;
  label: string;
  path: string;
  badge?: string;
  adminOnly?: boolean;
}

export default function Sidebar({ collapsed, mobileOpen, onToggle, onClose, user }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  // 🔴 REMOVIDO o estado e fetch de tickets

  const menuItems: MenuItem[] = [
    { icon: '📊', label: 'Dashboard', path: '/portal/dashboard' },
    { icon: '📋', label: 'Processos', path: '/portal/processes' },
    { icon: '👥', label: 'Cidadãos', path: '/portal/citizens' },
    { icon: '🏛️', label: 'Unidades', path: '/portal/units' },
    { icon: '👤', label: 'Profissionais', path: '/portal/professionals' },
    { icon: '⚠', label: 'Violências', path: '/portal/violences' },
    { icon: '📝', label: 'Formulários', path: '/portal/forms' },
    { icon: '📤', label: 'Encaminhamentos', path: '/portal/encaminhamentos' },


    // 🔴 REMOVIDO a aba de Chamados
  ];

  const adminItems: MenuItem[] = [
    { icon: '⚙️', label: 'Dashboard Admin', path: '/portal/admin/dashboard' },
    { icon: '👥', label: 'Usuários', path: '/portal/admin/users' },
    { icon: '👤', label: 'Profissionais', path: '/portal/admin/professionals' },
    { icon: '🏛️', label: 'Unidades', path: '/portal/admin/units' },
    { icon: '📋', label: 'Logs', path: '/portal/admin/logs' },
    // 🔴 REMOVIDO a aba de Chamados admin
  ];

  const isAdmin = user?.isAdmin || user?.role === 'ADMIN';
  const itemsToShow = isAdmin ? adminItems : menuItems;

  const sidebarClass = `sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`;

  return (
    <div className={sidebarClass}>
      <div className="sidebar-header">
        {!collapsed && <span className="logo">SIGEV</span>}
        <button className="toggle-btn" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {!collapsed && user && (
        <div className="user-info">
          <div className="user-avatar">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-details">
            <div className="user-name">{user.name || 'Usuário'}</div>
            <div className="user-role">
              {user.role === 'ADMIN' ? 'Administrador' : 
               user.role === 'MANAGER' ? 'Gestor' : 'Profissional'}
            </div>
          </div>
        </div>
      )}

      <nav className="nav-menu">
        {itemsToShow.map((item, index) => (
          <Link
            key={index}
            href={item.path}
            className={`nav-item ${pathname === item.path ? 'active' : ''}`}
            onClick={() => mobileOpen && onClose && onClose()}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="nav-label">{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </>
            )}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout}>
          <span className="nav-icon">🚪</span>
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );
}