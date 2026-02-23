'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './dashboard.css';

interface DashboardData {
  stats: {
    totalProcesses: number;
    pendingProcesses: number;
    inProgressProcesses: number;
    completedProcesses: number;
    urgentProcesses: number;
    averageResponseTime: number;
    processesByUnit: Array<{ unit: string; count: number }>;
    processesByViolence: Array<{ violence: string; count: number }>;
    totalProfessionals: number;
    totalUnits: number;
  };
  charts: {
    identificationForms: {
      revelacao: number;
      suspeita: number;
      denuncia: number;
      total: number;
    };
    violenceByGender: {
      masculino: Array<{ violence: string; count: number }>;
      feminino: Array<{ violence: string; count: number }>;
    };
    inactivity: {
      units: Array<{
        id: string;
        name: string;
        days: number;
        status: 'critical' | 'warning' | 'normal';
      }>;
      professionals: Array<{
        id: string;
        name: string;
        unit: string;
        days: number;
        status: 'critical' | 'warning' | 'normal';
      }>;
    };
  };
  recentProcesses: Array<{
    id: string;
    citizenName: string;
    violence: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    createdAt: string;
    unit: string;
    professional: string;
  }>;
  trends?: {
    totalProcesses?: number;
    pendingProcesses?: number;
    inProgressProcesses?: number;
    completedProcesses?: number;
    urgentProcesses?: number;
    averageResponseTime?: number;
  };
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Erro ao carregar dashboard');
      }

      const data = await response.json();
      
      // Garantir que os dados tenham a estrutura esperada
      const safeData: DashboardData = {
        stats: {
          totalProcesses: data.stats?.totalProcesses || 0,
          pendingProcesses: data.stats?.pendingProcesses || 0,
          inProgressProcesses: data.stats?.inProgressProcesses || 0,
          completedProcesses: data.stats?.completedProcesses || 0,
          urgentProcesses: data.stats?.urgentProcesses || 0,
          averageResponseTime: data.stats?.averageResponseTime || 0,
          processesByUnit: data.stats?.processesByUnit || [],
          processesByViolence: data.stats?.processesByViolence || [],
          totalProfessionals: data.stats?.totalProfessionals || 0,
          totalUnits: data.stats?.totalUnits || 0,
        },
        charts: {
          identificationForms: {
            revelacao: data.charts?.identificationForms?.revelacao || 0,
            suspeita: data.charts?.identificationForms?.suspeita || 0,
            denuncia: data.charts?.identificationForms?.denuncia || 0,
            total: data.charts?.identificationForms?.total || 0,
          },
          violenceByGender: {
            masculino: data.charts?.violenceByGender?.masculino || [],
            feminino: data.charts?.violenceByGender?.feminino || [],
          },
          inactivity: {
            units: data.charts?.inactivity?.units || [],
            professionals: data.charts?.inactivity?.professionals || [],
          },
        },
        recentProcesses: data.recentProcesses || [],
        trends: data.trends || {},
      };
      
      setDashboardData(safeData);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'IN_PROGRESS':
        return 'status-progress';
      case 'COMPLETED':
        return 'status-completed';
      default:
        return '';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendente';
      case 'IN_PROGRESS':
        return 'Em Andamento';
      case 'COMPLETED':
        return 'Concluído';
      case 'ARCHIVED':
        return 'Arquivado';
      default:
        return status;
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'URGENT':
      case 'HIGH':
        return 'priority-high';
      case 'NORMAL':
        return 'priority-medium';
      case 'LOW':
        return 'priority-low';
      default:
        return '';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'Urgente';
      case 'HIGH':
        return 'Alta';
      case 'NORMAL':
        return 'Normal';
      case 'LOW':
        return 'Baixa';
      default:
        return priority;
    }
  };

  const getInactivityBadgeClass = (status: string) => {
    switch (status) {
      case 'critical':
        return 'badge-critical';
      case 'warning':
        return 'badge-warning';
      default:
        return 'badge-normal';
    }
  };

  const getInactivityStatusText = (status: string) => {
    switch (status) {
      case 'critical':
        return 'Crítico';
      case 'warning':
        return 'Atenção';
      default:
        return 'Normal';
    }
  };

  const formatTrendValue = (value: number | undefined) => {
    if (value === undefined || value === 0) return null;
    const isPositive = value > 0;
    const absValue = Math.abs(value);
    return {
      class: isPositive ? 'trend-up' : 'trend-down',
      icon: isPositive ? '↑' : '↓',
      text: `${isPositive ? '+' : '-'}${absValue}%`
    };
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
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h2 className="error-title">Erro ao carregar dashboard</h2>
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={fetchDashboardData}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  // Calcular totais seguros
  const totalIdentification = 
    dashboardData.charts.identificationForms.revelacao +
    dashboardData.charts.identificationForms.suspeita +
    dashboardData.charts.identificationForms.denuncia;

  // Calcular máximos para os gráficos
  const maxViolenceValue = Math.max(
    ...(dashboardData.charts.violenceByGender.masculino?.map(v => v.count) || [0]),
    ...(dashboardData.charts.violenceByGender.feminino?.map(v => v.count) || [0])
  ) || 1;

  // Trends dinâmicos
  const totalTrend = formatTrendValue(dashboardData.trends?.totalProcesses);
  const pendingTrend = formatTrendValue(dashboardData.trends?.pendingProcesses);
  const inProgressTrend = formatTrendValue(dashboardData.trends?.inProgressProcesses);
  const completedTrend = formatTrendValue(dashboardData.trends?.completedProcesses);
  const urgentTrend = formatTrendValue(dashboardData.trends?.urgentProcesses);
  const responseTimeTrend = formatTrendValue(dashboardData.trends?.averageResponseTime);

  return (
    <div className="dashboard-container">

      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

        
        <div className="content-wrapper">
          {/* Welcome Section */}
          <div className="welcome-section">
            <h1 className="welcome-title">
              Olá, {user?.name?.split(' ')[0] || 'Usuário'}!
            </h1>
            <p className="welcome-subtitle">
              {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card" style={{ animationDelay: '0.1s' }}>
              <div className="stat-header">
                <span className="stat-title">Total de Processos</span>
                <span className="stat-icon">📋</span>
              </div>
              <div className="stat-value">{dashboardData.stats.totalProcesses}</div>
              {totalTrend && (
                <div className="stat-trend">
                  <span className={totalTrend.class}>{totalTrend.icon} {totalTrend.text}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>em relação ao mês anterior</span>
                </div>
              )}
            </div>

            <div className="stat-card" style={{ animationDelay: '0.2s' }}>
              <div className="stat-header">
                <span className="stat-title">Pendentes</span>
                <span className="stat-icon">⏳</span>
              </div>
              <div className="stat-value">{dashboardData.stats.pendingProcesses}</div>
              {pendingTrend && (
                <div className="stat-trend">
                  <span className={pendingTrend.class}>{pendingTrend.icon} {pendingTrend.text}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>em relação ao mês anterior</span>
                </div>
              )}
            </div>

            <div className="stat-card" style={{ animationDelay: '0.3s' }}>
              <div className="stat-header">
                <span className="stat-title">Em Andamento</span>
                <span className="stat-icon">⚡</span>
              </div>
              <div className="stat-value">{dashboardData.stats.inProgressProcesses}</div>
              {inProgressTrend && (
                <div className="stat-trend">
                  <span className={inProgressTrend.class}>{inProgressTrend.icon} {inProgressTrend.text}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>em relação ao mês anterior</span>
                </div>
              )}
            </div>

            <div className="stat-card" style={{ animationDelay: '0.4s' }}>
              <div className="stat-header">
                <span className="stat-title">Concluídos</span>
                <span className="stat-icon">✅</span>
              </div>
              <div className="stat-value">{dashboardData.stats.completedProcesses}</div>
              {completedTrend && (
                <div className="stat-trend">
                  <span className={completedTrend.class}>{completedTrend.icon} {completedTrend.text}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>em relação ao mês anterior</span>
                </div>
              )}
            </div>

            <div className="stat-card" style={{ animationDelay: '0.5s' }}>
              <div className="stat-header">
                <span className="stat-title">Casos Urgentes</span>
                <span className="stat-icon">⚠️</span>
              </div>
              <div className="stat-value" style={{ 
                background: 'linear-gradient(135deg, #FF1493, #FFA500)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent' 
              }}>
                {dashboardData.stats.urgentProcesses}
              </div>
              {urgentTrend && (
                <div className="stat-trend">
                  <span className={urgentTrend.class}>{urgentTrend.icon} {urgentTrend.text}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>em relação ao mês anterior</span>
                </div>
              )}
            </div>

            <div className="stat-card" style={{ animationDelay: '0.6s' }}>
              <div className="stat-header">
                <span className="stat-title">Tempo Médio</span>
                <span className="stat-icon">⏱️</span>
              </div>
              <div className="stat-value">{dashboardData.stats.averageResponseTime}d</div>
              {responseTimeTrend && (
                <div className="stat-trend">
                  <span className={responseTimeTrend.class}>{responseTimeTrend.icon} {responseTimeTrend.text}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>em relação ao mês anterior</span>
                </div>
              )}
            </div>
          </div>

          {/* Charts Grid */}
          <div className="charts-grid">
            {/* Gráfico de Formas de Identificação */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <h3 className="chart-title">Formas de Identificação</h3>
                  <p className="chart-subtitle">Distribuição dos casos</p>
                </div>
              </div>
              <div className="pie-chart-container">
                <div 
                  className="pie-chart"
                  style={{
                    background: `conic-gradient(
                      #00D4FF 0% ${(dashboardData.charts.identificationForms.revelacao / totalIdentification) * 100}%,
                      #8A2BE2 ${(dashboardData.charts.identificationForms.revelacao / totalIdentification) * 100}% ${((dashboardData.charts.identificationForms.revelacao + dashboardData.charts.identificationForms.suspeita) / totalIdentification) * 100}%,
                      #FF1493 ${((dashboardData.charts.identificationForms.revelacao + dashboardData.charts.identificationForms.suspeita) / totalIdentification) * 100}% 100%
                    )`
                  }}
                ></div>
                <div className="pie-legend">
                  <div className="pie-total">{totalIdentification}</div>
                  <div className="pie-total-label">total</div>
                </div>
              </div>
              <div className="pie-items">
                <div className="pie-item">
                  <div className="pie-color" style={{ background: '#00D4FF' }}></div>
                  <span className="pie-name">Revelação Espontânea</span>
                  <span className="pie-percentage">
                    {totalIdentification > 0 
                      ? Math.round((dashboardData.charts.identificationForms.revelacao / totalIdentification) * 100) 
                      : 0}%
                  </span>
                </div>
                <div className="pie-item">
                  <div className="pie-color" style={{ background: '#8A2BE2' }}></div>
                  <span className="pie-name">Suspeita Profissional</span>
                  <span className="pie-percentage">
                    {totalIdentification > 0 
                      ? Math.round((dashboardData.charts.identificationForms.suspeita / totalIdentification) * 100) 
                      : 0}%
                  </span>
                </div>
                <div className="pie-item">
                  <div className="pie-color" style={{ background: '#FF1493' }}></div>
                  <span className="pie-name">Denúncia</span>
                  <span className="pie-percentage">
                    {totalIdentification > 0 
                      ? Math.round((dashboardData.charts.identificationForms.denuncia / totalIdentification) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Gráfico de Violências por Sexo */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <h3 className="chart-title">Violências por Sexo</h3>
                  <p className="chart-subtitle">Distribuição por gênero</p>
                </div>
              </div>
              <div className="chart-container">
                <div className="chart-bar">
                  {(dashboardData.charts.violenceByGender.masculino || []).slice(0, 5).map((item, index) => (
                    <div key={index} className="bar-item">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          height: `${(item.count / maxViolenceValue) * 150}px`,
                          background: 'linear-gradient(180deg, #00D4FF, #0066FF)'
                        }}
                      ></div>
                      <span className="bar-label">{item.violence}</span>
                      <span className="bar-value">{item.count}</span>
                    </div>
                  ))}
                </div>
                <div className="chart-bar" style={{ marginTop: '30px' }}>
                  {(dashboardData.charts.violenceByGender.feminino || []).slice(0, 5).map((item, index) => (
                    <div key={index} className="bar-item">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          height: `${(item.count / maxViolenceValue) * 150}px`,
                          background: 'linear-gradient(180deg, #FF1493, #8A2BE2)'
                        }}
                      ></div>
                      <span className="bar-label">{item.violence}</span>
                      <span className="bar-value">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de Inatividade */}
          {dashboardData.charts.inactivity.units.length > 0 || dashboardData.charts.inactivity.professionals.length > 0 ? (
            <div className="chart-card" style={{ marginBottom: '32px' }}>
              <div className="chart-header">
                <div>
                  <h3 className="chart-title">Inatividade</h3>
                  <p className="chart-subtitle">Unidades e profissionais sem acesso</p>
                </div>
              </div>
              <div className="inactivity-grid">
                {/* Unidades inativas */}
                {dashboardData.charts.inactivity.units.length > 0 && (
                  <div>
                    <h4 style={{ color: '#FFFFFF', marginBottom: '16px', fontSize: '16px' }}>Unidades</h4>
                    {dashboardData.charts.inactivity.units.map((unit, index) => (
                      <div key={unit.id} className="inactivity-card" style={{ animationDelay: `${0.1 * index}s` }}>
                        <div className="inactivity-header">
                          <span className="inactivity-name">{unit.name}</span>
                          <span className={`inactivity-badge ${getInactivityBadgeClass(unit.status)}`}>
                            {getInactivityStatusText(unit.status)}
                          </span>
                        </div>
                        <div className="inactivity-time">{unit.days} dias</div>
                        <div className="inactivity-unit">sem acesso</div>
                        <div className="inactivity-progress">
                          <div 
                            className="inactivity-progress-fill" 
                            style={{ width: `${Math.min(100, (unit.days / 30) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Profissionais inativos */}
                {dashboardData.charts.inactivity.professionals.length > 0 && (
                  <div>
                    <h4 style={{ color: '#FFFFFF', marginBottom: '16px', fontSize: '16px' }}>Profissionais</h4>
                    {dashboardData.charts.inactivity.professionals.map((prof, index) => (
                      <div key={prof.id} className="inactivity-card" style={{ animationDelay: `${0.1 * index}s` }}>
                        <div className="inactivity-header">
                          <span className="inactivity-name">{prof.name}</span>
                          <span className={`inactivity-badge ${getInactivityBadgeClass(prof.status)}`}>
                            {getInactivityStatusText(prof.status)}
                          </span>
                        </div>
                        <div className="inactivity-time">{prof.days} dias</div>
                        <div className="inactivity-unit">{prof.unit}</div>
                        <div className="inactivity-progress">
                          <div 
                            className="inactivity-progress-fill" 
                            style={{ width: `${Math.min(100, (prof.days / 30) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Processos Recentes */}
          {dashboardData.recentProcesses.length > 0 && (
            <div className="recent-processes">
              <div className="section-header">
                <h3 className="section-title">Processos Recentes</h3>
                <Link href="/portal/processes" className="view-all-link">
                  Ver todos <span>→</span>
                </Link>
              </div>

              <table className="process-table">
                <thead>
                  <tr>
                    <th>Cidadão</th>
                    <th>Violência</th>
                    <th>Unidade</th>
                    <th>Profissional</th>
                    <th>Status</th>
                    <th>Prioridade</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recentProcesses.map((process) => (
                    <tr 
                      key={process.id}
                      onClick={() => router.push(`/portal/processes/${process.id}`)}
                    >
                      <td style={{ fontWeight: '500' }}>{process.citizenName}</td>
                      <td>{process.violence}</td>
                      <td>{process.unit}</td>
                      <td>{process.professional}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(process.status)}`}>
                          {getStatusText(process.status)}
                        </span>
                      </td>
                      <td>
                        <span className={getPriorityClass(process.priority)}>
                          {getPriorityText(process.priority)}
                        </span>
                      </td>
                      <td style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {formatDate(process.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}