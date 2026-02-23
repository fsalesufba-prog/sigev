'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import './Header.css';

interface HeaderProps {
  user?: any;
  onMenuClick: () => void;
  unreadNotifications?: number;
}

export default function Header({ user, onMenuClick, unreadNotifications = 0 }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = () => {
    return currentTime.toLocaleDateString('pt-BR', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'MANAGER':
        return 'Gestor';
      default:
        return 'Profissional';
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn" onClick={onMenuClick} aria-label="Menu">
          ☰
        </button>
        <div className="date-time">
          {formatDateTime()}
        </div>
      </div>

      <div className="header-right">
        <div className="header-actions">
          <Link href="/portal/notifications" className="notification-btn">
            <span className="notification-icon">🔔</span>
            {unreadNotifications > 0 && (
              <span className="notification-badge">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </Link>

          <div 
            className="profile-container"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="profile-btn">
              <div className="profile-avatar">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="profile-info">
                <span className="profile-name">
                  {user?.name?.split(' ')[0] || 'Usuário'}
                </span>
                <span className="profile-role">
                  {getRoleLabel(user?.role)}
                </span>
              </div>
              <span className="profile-arrow">▼</span>
            </div>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <Link href="/portal/profile" className="dropdown-item">
                  <span className="dropdown-icon">👤</span>
                  <span>Meu Perfil</span>
                </Link>
                <Link href="/portal/settings" className="dropdown-item">
                  <span className="dropdown-icon">⚙️</span>
                  <span>Configurações</span>
                </Link>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout-item">
                  <span className="dropdown-icon">🚪</span>
                  <span>Sair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}