// frontend/app/portal/admin/backup/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Backup, BackupHistory } from '../../../../../backend/src/types/backup.types';
import './backup.css';

export default function BackupPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [espacoInfo, setEspacoInfo] = useState({ utilizado: 0, disponivel: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [backupDescription, setBackupDescription] = useState('');
  const [backupOptions, setBackupOptions] = useState({
    incluirUploads: true,
    incluirLogs: true
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchBackups();
    }
  }, [user, pagination.page]);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/backups?page=${pagination.page}&limit=${pagination.limit}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Erro ao carregar backups');
      
      const data = await response.json();
      setBackups(data.backups);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages
      });
      setEspacoInfo({
        utilizado: data.espacoUtilizado,
        disponivel: data.espacoDisponivel
      });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/backups/manual`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          descricao: backupDescription,
          incluirUploads: backupOptions.incluirUploads,
          incluirLogs: backupOptions.incluirLogs
        })
      });

      if (!response.ok) throw new Error('Erro ao criar backup');

      const data = await response.json();
      setSuccessMessage('Backup criado com sucesso!');
      setShowCreateModal(false);
      setBackupDescription('');
      fetchBackups();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBackup = async (backupId: string, backupName: string) => {
    if (!confirm(`Tem certeza que deseja deletar o backup "${backupName}"?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/backups/${backupId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao deletar backup');

      setSuccessMessage('Backup deletado com sucesso!');
      fetchBackups();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDownloadBackup = async (backupId: string, backupName: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/backups/download/${backupId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao baixar backup');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleSimpleBackup = async () => {
    try {
      setCreating(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/backup`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao iniciar backup');

      const data = await response.json();
      setSuccessMessage(`Backup ${data.backupId} iniciado!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setCreating(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'concluído': return 'status-success';
      case 'em_andamento': return 'status-warning';
      case 'falha': return 'status-danger';
      default: return '';
    }
  };

  const getTipoIcon = (tipo: string) => {
    return tipo === 'manual' ? '👤' : '🤖';
  };

  if (isLoading) {
    return (
      <div className="backup-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="backup-page">
      <div className="backup-header">
        <h1>Backup do Sistema</h1>
        <div className="header-actions">
          <button 
            className="btn-simple-backup"
            onClick={handleSimpleBackup}
            disabled={creating}
          >
            {creating ? 'Processando...' : '⚡ Backup Rápido'}
          </button>
          <button 
            className="btn-create-backup"
            onClick={() => setShowCreateModal(true)}
          >
            + Novo Backup Manual
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          <p>{successMessage}</p>
        </div>
      )}

      <div className="storage-info">
        <div className="info-card">
          <div className="info-icon">💾</div>
          <div className="info-content">
            <div className="info-label">Espaço Utilizado</div>
            <div className="info-value">{formatBytes(espacoInfo.utilizado)}</div>
          </div>
        </div>
        <div className="info-card">
          <div className="info-icon">📀</div>
          <div className="info-content">
            <div className="info-label">Espaço Disponível</div>
            <div className="info-value">{formatBytes(espacoInfo.disponivel)}</div>
          </div>
        </div>
        <div className="info-card">
          <div className="info-icon">📊</div>
          <div className="info-content">
            <div className="info-label">Total de Backups</div>
            <div className="info-value">{pagination.total}</div>
          </div>
        </div>
        <div className="info-card">
          <div className="info-icon">📅</div>
          <div className="info-content">
            <div className="info-label">Último Backup</div>
            <div className="info-value">
              {backups.length > 0 ? formatDate(backups[0].data) : 'Nenhum'}
            </div>
          </div>
        </div>
      </div>

      <div className="backup-list">
        <h2>Backups Realizados</h2>
        
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : backups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💾</div>
            <h3>Nenhum backup encontrado</h3>
            <p>Clique em "Novo Backup Manual" para criar seu primeiro backup</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="backup-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Data</th>
                    <th>Tamanho</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Criado por</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.id}>
                      <td className="backup-name">{backup.nome}</td>
                      <td>{formatDate(backup.data)}</td>
                      <td>{formatBytes(backup.tamanho)}</td>
                      <td>
                        <span className="tipo-badge">
                          {getTipoIcon(backup.tipo)} {backup.tipo}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(backup.status)}`}>
                          {backup.status}
                        </span>
                      </td>
                      <td>{backup.criadoPor}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn download"
                            onClick={() => handleDownloadBackup(backup.id, backup.nome)}
                            title="Download"
                          >
                            ⬇️
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDeleteBackup(backup.id, backup.nome)}
                            title="Deletar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
          </>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo Backup Manual</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Descrição (opcional)</label>
                <textarea
                  value={backupDescription}
                  onChange={(e) => setBackupDescription(e.target.value)}
                  placeholder="Ex: Backup antes da atualização"
                  rows={3}
                />
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={backupOptions.incluirUploads}
                    onChange={(e) => setBackupOptions({ ...backupOptions, incluirUploads: e.target.checked })}
                  />
                  Incluir arquivos de upload
                </label>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={backupOptions.incluirLogs}
                    onChange={(e) => setBackupOptions({ ...backupOptions, incluirLogs: e.target.checked })}
                  />
                  Incluir logs do sistema
                </label>
              </div>

              <div className="backup-info">
                <p>⏱️ O processo pode levar alguns minutos</p>
                <p>💾 O arquivo será salvo no servidor</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn-create"
                onClick={handleCreateBackup}
                disabled={creating}
              >
                {creating ? 'Criando...' : 'Criar Backup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}