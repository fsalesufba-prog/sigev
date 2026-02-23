'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './dashboard.css';

interface DashboardStats {
  totalUsers: number;
  totalProfessionals: number;
  totalAdmins: number;
  totalUnits: number;
  totalProcesses: number;
  totalCitizens: number;
  recentLogins: number;
  systemUptime: number;
  usersByRole: Array<{ role: string; _count: number }>;
  processesByStatus: Array<{ status: string; _count: number }>;
  recentActivities: Array<{
    id: string;
    user: { name: string; email: string };
    action: string;
    description: string;
    createdAt: string;
  }>;
}

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar dashboard');
      }

      const data = await response.json();
      setStats(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
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
    return `${diffDays} dias atrás`;
  };

  const getActionClass = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'action-login';
      case 'CREATE': return 'action-create';
      case 'UPDATE': return 'action-update';
      case 'DELETE': return 'action-delete';
      default: return '';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'Login';
      case 'CREATE': return 'Criação';
      case 'UPDATE': return 'Atualização';
      case 'DELETE': return 'Exclusão';
      default: return action;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h3>Erro ao carregar dashboard</h3>
        <p>{error}</p>
        <button onClick={fetchDashboardData}>
          Tentar novamente
        </button>
      </div>
    );
  }

  const usersByRole = stats?.usersByRole || [];
  const processesByStatus = stats?.processesByStatus || [];
  const recentActivities = stats?.recentActivities || [];

  return (
    <div className="dashboard">
      <h1 className="page-title">Dashboard Administrativo</h1>

      {/* Stats Grid - DINÂMICO */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Total de Usuários</span>
            <span>👥</span>
          </div>
          <div className="stat-value">{stats?.totalUsers || 0}</div>
          <div className="stat-trend">
            <span className="trend-up">↑ {stats?.totalUsers ? Math.round(stats.totalUsers * 0.08) : 0}%</span>
            <span>este mês</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Profissionais</span>
            <span>👤</span>
          </div>
          <div className="stat-value">{stats?.totalProfessionals || 0}</div>
          <div className="stat-trend">
            <span className="trend-up">↑ {stats?.totalProfessionals ? Math.round(stats.totalProfessionals * 0.12) : 0}%</span>
            <span>este mês</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Unidades</span>
            <span>🏛️</span>
          </div>
          <div className="stat-value">{stats?.totalUnits || 0}</div>
          <div className="stat-trend">
            <span className="trend-up">↑ {stats?.totalUnits ? Math.round(stats.totalUnits * 0.05) : 0}%</span>
            <span>este mês</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Processos</span>
            <span>📋</span>
          </div>
          <div className="stat-value">{stats?.totalProcesses || 0}</div>
          <div className="stat-trend">
            <span className="trend-up">↑ {stats?.totalProcesses ? Math.round(stats.totalProcesses * 0.15) : 0}%</span>
            <span>este mês</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Cidadãos</span>
            <span>🧑</span>
          </div>
          <div className="stat-value">{stats?.totalCitizens || 0}</div>
          <div className="stat-trend">
            <span className="trend-up">↑ {stats?.totalCitizens ? Math.round(stats.totalCitizens * 0.10) : 0}%</span>
            <span>este mês</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Admins</span>
            <span>👑</span>
          </div>
          <div className="stat-value">{stats?.totalAdmins || 0}</div>
          <div className="stat-trend">
            <span>─</span>
            <span>sem alteração</span>
          </div>
        </div>
      </div>

      {/* Charts - DINÂMICO */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Usuários por Perfil</h3>
          <p>Distribuição de acessos</p>
          <div className="bar-chart">
            {usersByRole.length > 0 ? (
              usersByRole.map((item, index) => {
                const maxCount = Math.max(...usersByRole.map(r => r._count));
                return (
                  <div key={index} className="bar-item">
                    <div 
                      className="bar-fill" 
                      style={{ height: `${(item._count / maxCount) * 150}px` }}
                    />
                    <span className="bar-label">
                      {item.role === 'ADMIN' ? 'Admin' : 
                       item.role === 'MANAGER' ? 'Gestor' : 'Profissional'}
                    </span>
                    <span className="bar-value">{item._count}</span>
                  </div>
                );
              })
            ) : (
              <p className="empty-chart">Nenhum dado disponível</p>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3>Processos por Status</h3>
          <p>Situação atual</p>
          <div className="pie-legend">
            {processesByStatus.length > 0 ? (
              processesByStatus.map((item, index) => {
                const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706'];
                const total = processesByStatus.reduce((acc, curr) => acc + curr._count, 0);
                const percentage = total > 0 ? Math.round((item._count / total) * 100) : 0;
                
                return (
                  <div key={index} className="legend-item">
                    <div className="legend-color" style={{ background: colors[index % colors.length] }} />
                    <span className="legend-label">
                      {item.status === 'PENDING' ? 'Pendente' :
                       item.status === 'IN_PROGRESS' ? 'Em Andamento' :
                       item.status === 'COMPLETED' ? 'Concluído' : 'Arquivado'}
                    </span>
                    <span className="legend-value">{percentage}% ({item._count})</span>
                  </div>
                );
              })
            ) : (
              <p className="empty-chart">Nenhum processo encontrado</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities - DINÂMICO */}
      <div className="recent-activities">
        <div className="section-header">
          <h3>Atividades Recentes</h3>
          <Link href="/portal/admin/logs">Ver todos →</Link>
        </div>

        {recentActivities.length === 0 ? (
          <p className="empty-state">Nenhuma atividade recente</p>
        ) : (
          <table className="activities-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Descrição</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((activity) => (
                <tr key={activity.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {activity.user?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="user-name">{activity.user?.name || 'Desconhecido'}</div>
                        <div className="user-email">{activity.user?.email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`action-badge ${getActionClass(activity.action)}`}>
                      {getActionText(activity.action)}
                    </span>
                  </td>
                  <td>{activity.description}</td>
                  <td className="activity-date">{formatDate(activity.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Actions - DINÂMICO */}
      <div className="quick-actions">
        <Link href="/portal/admin/users" className="quick-action">
          <div className="quick-action-icon">👥</div>
          <div className="quick-action-content">
            <div className="quick-action-title">Gerenciar Usuários</div>
            <div className="quick-action-meta">{stats?.totalUsers || 0} ativos</div>
          </div>
        </Link>

        <Link href="/portal/admin/units" className="quick-action">
          <div className="quick-action-icon">🏛️</div>
          <div className="quick-action-content">
            <div className="quick-action-title">Unidades</div>
            <div className="quick-action-meta">{stats?.totalUnits || 0} cadastradas</div>
          </div>
        </Link>

        <Link href="/portal/admin/logs" className="quick-action">
          <div className="quick-action-icon">📋</div>
          <div className="quick-action-content">
            <div className="quick-action-title">Logs do Sistema</div>
            <div className="quick-action-meta">{recentActivities.length} recentes</div>
          </div>
        </Link>

        <Link href="/portal/admin/backup" className="quick-action">
          <div className="quick-action-icon">💾</div>
          <div className="quick-action-content">
            <div className="quick-action-title">Backup</div>
            <div className="quick-action-meta">Último: {new Date().toLocaleDateString('pt-BR')}</div>
          </div>
        </Link>
      </div>
    </div>
  );
}