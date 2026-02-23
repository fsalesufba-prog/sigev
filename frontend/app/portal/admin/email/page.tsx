// frontend/app/portal/admin/email/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { EmailConfig, EmailTemplate, EmailLog } from '../../../../../backend/src/types/email.types';
import './email.css';

export default function EmailPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'templates' | 'logs' | 'send'>('config');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [sendForm, setSendForm] = useState({
    to: '',
    subject: '',
    html: '',
    tipo: 'personalizado'
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchConfig();
      fetchTemplates();
      fetchLogs();
    }
  }, [user]);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/email/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar configuração');
      
      const data = await response.json();
      setConfig(data);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/email/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar templates');
      
      const data = await response.json();
      setTemplates(data);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/email/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar logs');
      
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/email/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) throw new Error('Erro ao salvar configuração');

      setSuccessMessage('Configurações salvas com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/email/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assunto: editingTemplate.assunto,
          corpo: editingTemplate.corpo
        })
      });

      if (!response.ok) throw new Error('Erro ao atualizar template');

      setSuccessMessage('Template atualizado com sucesso!');
      setShowTemplateModal(false);
      fetchTemplates();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!sendForm.to || !sendForm.subject || !sendForm.html) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/email/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sendForm)
      });

      if (!response.ok) throw new Error('Erro ao enviar e-mail');

      setSuccessMessage('E-mail enviado com sucesso!');
      setSendForm({ to: '', subject: '', html: '', tipo: 'personalizado' });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendWelcome = async (userId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/email/send-welcome`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          temporaryPassword: 'Senha@123'
        })
      });

      if (!response.ok) throw new Error('Erro ao enviar e-mail');

      alert('E-mail de boas-vindas enviado!');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSendReset = async (userId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/email/send-reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          resetToken: 'reset-token-exemplo'
        })
      });

      if (!response.ok) throw new Error('Erro ao enviar e-mail');

      alert('E-mail de recuperação enviado!');
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
      minute: '2-digit'
    });
  };

  if (isLoading || loading) {
    return (
      <div className="email-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="email-page">
      <div className="email-header">
        <h1>Configurações de E-mail</h1>
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

      <div className="email-tabs">
        <button 
          className={`tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ Configurações
        </button>
        <button 
          className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          📝 Templates
        </button>
        <button 
          className={`tab ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => setActiveTab('send')}
        >
          ✉️ Enviar E-mail
        </button>
        <button 
          className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 Logs
        </button>
      </div>

      <div className="email-content">
        {activeTab === 'config' && config && (
          <div className="config-section">
            <h2>Configuração do Servidor</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label>Host SMTP</label>
                <input
                  type="text"
                  value={config.servidor.host}
                  onChange={(e) => setConfig({
                    ...config,
                    servidor: { ...config.servidor, host: e.target.value }
                  })}
                />
              </div>

              <div className="form-group">
                <label>Porta</label>
                <input
                  type="number"
                  value={config.servidor.port}
                  onChange={(e) => setConfig({
                    ...config,
                    servidor: { ...config.servidor, port: parseInt(e.target.value) }
                  })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={config.servidor.secure}
                    onChange={(e) => setConfig({
                      ...config,
                      servidor: { ...config.servidor, secure: e.target.checked }
                    })}
                  />
                  Conexão segura (SSL/TLS)
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Usuário</label>
                <input
                  type="text"
                  value={config.servidor.auth.user}
                  onChange={(e) => setConfig({
                    ...config,
                    servidor: {
                      ...config.servidor,
                      auth: { ...config.servidor.auth, user: e.target.value }
                    }
                  })}
                />
              </div>

              <div className="form-group">
                <label>Senha</label>
                <input
                  type="password"
                  value={config.servidor.auth.pass === '********' ? '' : config.servidor.auth.pass}
                  onChange={(e) => setConfig({
                    ...config,
                    servidor: {
                      ...config.servidor,
                      auth: { ...config.servidor.auth, pass: e.target.value }
                    }
                  })}
                  placeholder="********"
                />
              </div>
            </div>

            <h2>Remetente</h2>

            <div className="form-row">
              <div className="form-group">
                <label>Nome</label>
                <input
                  type="text"
                  value={config.remetente.nome}
                  onChange={(e) => setConfig({
                    ...config,
                    remetente: { ...config.remetente, nome: e.target.value }
                  })}
                />
              </div>

              <div className="form-group">
                <label>E-mail</label>
                <input
                  type="email"
                  value={config.remetente.email}
                  onChange={(e) => setConfig({
                    ...config,
                    remetente: { ...config.remetente, email: e.target.value }
                  })}
                />
              </div>
            </div>

            <h2>Limites</h2>

            <div className="form-row">
              <div className="form-group">
                <label>Máx. e-mails por dia</label>
                <input
                  type="number"
                  value={config.limites.maxEmailsPorDia}
                  onChange={(e) => setConfig({
                    ...config,
                    limites: { ...config.limites, maxEmailsPorDia: parseInt(e.target.value) }
                  })}
                />
              </div>

              <div className="form-group">
                <label>Máx. e-mails por hora</label>
                <input
                  type="number"
                  value={config.limites.maxEmailsPorHora}
                  onChange={(e) => setConfig({
                    ...config,
                    limites: { ...config.limites, maxEmailsPorHora: parseInt(e.target.value) }
                  })}
                />
              </div>
            </div>

            <div className="form-actions">
              <button 
                className="btn-save"
                onClick={handleSaveConfig}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="templates-section">
            <h2>Templates de E-mail</h2>
            
            <div className="templates-grid">
              {templates.map((template) => (
                <div key={template.id} className="template-card">
                  <div className="template-header">
                    <h3>{template.nome}</h3>
                    <span className="template-type">{template.tipo}</span>
                  </div>
                  
                  <div className="template-preview">
                    <div className="preview-subject">
                      <strong>Assunto:</strong> {template.assunto}
                    </div>
                    <div className="preview-variables">
                      <strong>Variáveis:</strong> {template.variaveis.join(', ')}
                    </div>
                  </div>

                  <button
                    className="btn-edit-template"
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowTemplateModal(true);
                    }}
                  >
                    Editar Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'send' && (
          <div className="send-section">
            <h2>Enviar E-mail</h2>
            
            <div className="form-group">
              <label>Destinatário *</label>
              <input
                type="email"
                value={sendForm.to}
                onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="form-group">
              <label>Assunto *</label>
              <input
                type="text"
                value={sendForm.subject}
                onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                placeholder="Assunto do e-mail"
              />
            </div>

            <div className="form-group">
              <label>Conteúdo HTML *</label>
              <textarea
                value={sendForm.html}
                onChange={(e) => setSendForm({ ...sendForm, html: e.target.value })}
                rows={10}
                placeholder="<h1>Olá</h1><p>Conteúdo do e-mail</p>"
              />
            </div>

            <div className="quick-templates">
              <h3>Templates Rápidos</h3>
              <div className="quick-buttons">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    className="quick-template-btn"
                    onClick={() => {
                      setSendForm({
                        ...sendForm,
                        subject: template.assunto,
                        html: template.corpo,
                        tipo: template.tipo
                      });
                    }}
                  >
                    {template.nome}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button 
                className="btn-send"
                onClick={handleSendEmail}
                disabled={saving}
              >
                {saving ? 'Enviando...' : 'Enviar E-mail'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="logs-section">
            <h2>Logs de E-mail</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{logs.length}</div>
                <div className="stat-label">Total de envios</div>
              </div>
              <div className="stat-card">
                <div className="stat-value success">0</div>
                <div className="stat-label">Sucesso</div>
              </div>
              <div className="stat-card">
                <div className="stat-value danger">0</div>
                <div className="stat-label">Falhas</div>
              </div>
            </div>

            <div className="table-container">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Destinatário</th>
                    <th>Assunto</th>
                    <th>Tipo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="no-data">
                        Nenhum log encontrado
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDate(log.data)}</td>
                        <td>{log.destinatario}</td>
                        <td>{log.assunto}</td>
                        <td>{log.tipo}</td>
                        <td>
                          <span className={`status-badge ${log.status}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showTemplateModal && editingTemplate && (
        <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Template: {editingTemplate.nome}</h2>
              <button className="modal-close" onClick={() => setShowTemplateModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Assunto</label>
                <input
                  type="text"
                  value={editingTemplate.assunto}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, assunto: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Corpo HTML</label>
                <textarea
                  value={editingTemplate.corpo}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, corpo: e.target.value })}
                  rows={20}
                  className="code-editor"
                />
              </div>

              <div className="variables-info">
                <strong>Variáveis disponíveis:</strong>
                <div className="variables-list">
                  {editingTemplate.variaveis.map((varName) => (
                    <code key={varName}>{varName}</code>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowTemplateModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn-save"
                onClick={handleUpdateTemplate}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}