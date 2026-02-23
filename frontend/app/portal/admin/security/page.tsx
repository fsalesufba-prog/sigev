// frontend/app/portal/admin/security/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { SecurityLog, ActiveSession } from '../../../../../backend/src/types/security.types';
import './security.css';

export default function SecurityPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'sessions' | 'blocked'>('logs');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockData, setBlockData] = useState({ ip: '', motivo: '', horas: 24 });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchLogs();
      fetchSessions();
    }
  }, [user, pagination.page]);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/security/logs?page=${pagination.page}&limit=${pagination.limit}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Erro ao carregar logs');
      
      const data = await response.json();
      setLogs(data.logs);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages
      });
    } catch (error: any) {
      setError(error.message);
    }
  };

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/security/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar sessões');
      
      const data = await response.json();
      setSessions(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogout = async (userId: string, userName: string) => {
    if (!confirm(`Deseja forçar o logout do usuário "${userName}"?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/security/sessions/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao forçar logout');

      alert('Logout forçado com sucesso');
      fetchSessions();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleBlockIp = async () => {
    if (!blockData.ip || !blockData.motivo || !blockData.horas) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/security/block-ip`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(blockData)
      });

      if (!response.ok) throw new Error('Erro ao bloquear IP');

      alert(`IP ${blockData.ip} bloqueado com sucesso`);
      setShowBlockModal(false);
      setBlockData({ ip: '', motivo: '', horas: 24 });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    return status === 'sucesso' ? '✅' : '❌';
  };

  if (isLoading || loading) {
    return (
      <div className="security-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="security-page">
      <div className="security-header">
        <h1>Segurança</h1>
        <button 
          className="btn-block-ip"
          onClick={() => setShowBlockModal(true)}
        >
          🔒 Bloquear IP
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <div className="security-tabs">
        <button 
          className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 Logs de Segurança
        </button>
        <button 
          className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          👥 Sessões Ativas
        </button>
        <button 
          className={`tab ${activeTab === 'blocked' ? 'active' : ''}`}
          onClick={() => setActiveTab('blocked')}
        >
          🚫 IPs Bloqueados
        </button>
      </div>

      <div className="security-content">
        {activeTab === 'logs' && (
          <div className="logs-section">
            <h2>Logs de Segurança</h2>
            
            <div className="table-container">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Usuário</th>
                    <th>Ação</th>
                    <th>IP</th>
                    <th>Status</th>
                    <th>Detalhes</th>
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
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDate(log.data)}</td>
                        <td>{log.usuario}</td>
                        <td>{log.acao}</td>
                        <td>{log.ip || '-'}</td>
                        <td>
                          <span className={`status-icon ${log.status}`}>
                            {getStatusIcon(log.status)}
                          </span>
                        </td>
                        <td className="log-details">{log.detalhes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="sessions-section">
            <h2>Sessões Ativas</h2>
            
            <div className="sessions-grid">
              {sessions.length === 0 ? (
                <div className="no-data">Nenhuma sessão ativa</div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className={`session-card ${session.atual ? 'current' : ''}`}>
                    <div className="session-header">
                      <div className="session-user">
                        <span className="user-avatar">
                          {session.nome.charAt(0)}
                        </span>
                        <div>
                          <div className="user-name">{session.nome}</div>
                          <div className="user-email">{session.usuario}</div>
                        </div>
                      </div>
                      {session.atual && (
                        <span className="current-badge">Sessão Atual</span>
                      )}
                    </div>

                    <div className="session-details">
                      <div className="detail-item">
                        <span className="detail-label">IP:</span>
                        <span className="detail-value">{session.ip}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Login:</span>
                        <span className="detail-value">{formatDate(session.loginAt)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Expira:</span>
                        <span className="detail-value">{formatDate(session.expiraEm)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">User Agent:</span>
                        <span className="detail-value user-agent">{session.userAgent}</span>
                      </div>
                    </div>

                    {!session.atual && (
                      <button
                        className="btn-force-logout"
                        onClick={() => handleForceLogout(session.id, session.nome)}
                      >
                        Forçar Logout
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'blocked' && (
          <div className="blocked-section">
            <h2>IPs Bloqueados</h2>
            
            <div className="blocked-list">
              <div className="empty-state">
                <div className="empty-icon">🔒</div>
                <h3>Nenhum IP bloqueado</h3>
                <p>Clique em "Bloquear IP" para adicionar</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showBlockModal && (
        <div className="modal-overlay" onClick={() => setShowBlockModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bloquear IP</h2>
              <button className="modal-close" onClick={() => setShowBlockModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Endereço IP *</label>
                <input
                  type="text"
                  value={blockData.ip}
                  onChange={(e) => setBlockData({ ...blockData, ip: e.target.value })}
                  placeholder="192.168.1.100"
                />
              </div>

              <div className="form-group">
                <label>Motivo *</label>
                <input
                  type="text"
                  value={blockData.motivo}
                  onChange={(e) => setBlockData({ ...blockData, motivo: e.target.value })}
                  placeholder="Tentativas suspeitas"
                />
              </div>

              <div className="form-group">
                <label>Tempo de bloqueio (horas) *</label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={blockData.horas}
                  onChange={(e) => setBlockData({ ...blockData, horas: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowBlockModal(false)}>
                Cancelar
              </button>
              <button className="btn-block" onClick={handleBlockIp}>
                Bloquear IP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}