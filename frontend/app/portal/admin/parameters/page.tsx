// frontend/app/portal/admin/parameters/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { SystemParameters } from '../../../../../backend/src/types/parameters.types';
import './parameters.css';

export default function ParametersPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const [parameters, setParameters] = useState<SystemParameters | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sistema' | 'seguranca' | 'notificacoes' | 'processos' | 'upload' | 'auditoria'>('sistema');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchParameters();
    }
  }, [user]);

  const fetchParameters = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/parameters`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar parâmetros');
      
      const data = await response.json();
      setParameters(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!parameters) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/parameters`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parameters)
      });

      if (!response.ok) throw new Error('Erro ao salvar parâmetros');

      setSuccessMessage('Parâmetros salvos com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMaintenanceToggle = async () => {
    if (!parameters) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/parameters/maintenance`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ativo: !parameters.sistema.manutencao,
          mensagem: 'Sistema em manutenção. Voltaremos em breve.'
        })
      });

      if (!response.ok) throw new Error('Erro ao alternar modo de manutenção');

      setParameters({
        ...parameters,
        sistema: {
          ...parameters.sistema,
          manutencao: !parameters.sistema.manutencao
        }
      });

      setSuccessMessage(`Modo de manutenção ${!parameters.sistema.manutencao ? 'ativado' : 'desativado'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const updateField = (section: string, field: string, value: any) => {
    if (!parameters) return;

    const sections = section.split('.');
    if (sections.length === 1) {
      setParameters({
        ...parameters,
        [section]: {
          ...(parameters as any)[section],
          [field]: value
        }
      });
    } else if (sections.length === 2) {
      setParameters({
        ...parameters,
        [sections[0]]: {
          ...(parameters as any)[sections[0]],
          [sections[1]]: {
            ...(parameters as any)[sections[0]][sections[1]],
            [field]: value
          }
        }
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading || loading) {
    return (
      <div className="parameters-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!parameters) {
    return (
      <div className="parameters-error">
        <p>Erro ao carregar parâmetros</p>
        <button onClick={fetchParameters}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="parameters-page">
      <div className="parameters-header">
        <h1>Parâmetros do Sistema</h1>
        <div className="header-actions">
          <button 
            className={`maintenance-btn ${parameters.sistema.manutencao ? 'active' : ''}`}
            onClick={handleMaintenanceToggle}
          >
            {parameters.sistema.manutencao ? '🔴 Modo Manutenção Ativo' : '🟢 Ativar Manutenção'}
          </button>
          <button 
            className="btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
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

      <div className="parameters-tabs">
        <button 
          className={`tab ${activeTab === 'sistema' ? 'active' : ''}`}
          onClick={() => setActiveTab('sistema')}
        >
          ⚙️ Sistema
        </button>
        <button 
          className={`tab ${activeTab === 'seguranca' ? 'active' : ''}`}
          onClick={() => setActiveTab('seguranca')}
        >
          🔒 Segurança
        </button>
        <button 
          className={`tab ${activeTab === 'notificacoes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notificacoes')}
        >
          🔔 Notificações
        </button>
        <button 
          className={`tab ${activeTab === 'processos' ? 'active' : ''}`}
          onClick={() => setActiveTab('processos')}
        >
          📋 Processos
        </button>
        <button 
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          📎 Upload
        </button>
        <button 
          className={`tab ${activeTab === 'auditoria' ? 'active' : ''}`}
          onClick={() => setActiveTab('auditoria')}
        >
          📊 Auditoria
        </button>
      </div>

      <div className="parameters-content">
        {activeTab === 'sistema' && (
          <div className="parameters-section">
            <h2>Configurações do Sistema</h2>
            
            <div className="form-group">
              <label>Nome do Sistema</label>
              <input
                type="text"
                value={parameters.sistema.nome}
                onChange={(e) => updateField('sistema', 'nome', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Versão</label>
              <input
                type="text"
                value={parameters.sistema.versao}
                onChange={(e) => updateField('sistema', 'versao', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Ambiente</label>
              <select
                value={parameters.sistema.ambiente}
                onChange={(e) => updateField('sistema', 'ambiente', e.target.value)}
              >
                <option value="development">Desenvolvimento</option>
                <option value="homologation">Homologação</option>
                <option value="production">Produção</option>
              </select>
            </div>

            <div className="form-group">
              <label>URL do Frontend</label>
              <input
                type="url"
                value={parameters.sistema.url}
                onChange={(e) => updateField('sistema', 'url', e.target.value)}
              />
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={parameters.sistema.manutencao}
                  onChange={(e) => updateField('sistema', 'manutencao', e.target.checked)}
                />
                Modo de Manutenção
              </label>
            </div>

            {parameters.sistema.manutencao && (
              <div className="form-group">
                <label>Mensagem de Manutenção</label>
                <textarea
                  value={parameters.sistema.mensagemManutencao || ''}
                  onChange={(e) => updateField('sistema', 'mensagemManutencao', e.target.value)}
                  rows={3}
                  placeholder="Mensagem exibida durante a manutenção"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'seguranca' && (
          <div className="parameters-section">
            <h2>Configurações de Segurança</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label>Máx. Tentativas de Login</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={parameters.seguranca.maxTentativasLogin}
                  onChange={(e) => updateField('seguranca', 'maxTentativasLogin', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Tempo de Bloqueio (min)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={parameters.seguranca.tempoBloqueioMinutos}
                  onChange={(e) => updateField('seguranca', 'tempoBloqueioMinutos', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Expiração da Sessão (horas)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={parameters.seguranca.sessaoExpiracaoHoras}
                  onChange={(e) => updateField('seguranca', 'sessaoExpiracaoHoras', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={parameters.seguranca.exigirMfa}
                    onChange={(e) => updateField('seguranca', 'exigirMfa', e.target.checked)}
                  />
                  Exigir MFA (2 fatores)
                </label>
              </div>
            </div>

            <h3>Política de Senha</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Tamanho Mínimo</label>
                <input
                  type="number"
                  min="4"
                  max="20"
                  value={parameters.seguranca.politicaSenha.tamanhoMinimo}
                  onChange={(e) => updateField('politicaSenha', 'tamanhoMinimo', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Dias para Expiração</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={parameters.seguranca.politicaSenha.diasExpiracao}
                  onChange={(e) => updateField('politicaSenha', 'diasExpiracao', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={parameters.seguranca.politicaSenha.exigirMaiuscula}
                    onChange={(e) => updateField('politicaSenha', 'exigirMaiuscula', e.target.checked)}
                  />
                  Exigir letra maiúscula
                </label>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={parameters.seguranca.politicaSenha.exigirMinuscula}
                    onChange={(e) => updateField('politicaSenha', 'exigirMinuscula', e.target.checked)}
                  />
                  Exigir letra minúscula
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={parameters.seguranca.politicaSenha.exigirNumero}
                    onChange={(e) => updateField('politicaSenha', 'exigirNumero', e.target.checked)}
                  />
                  Exigir número
                </label>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={parameters.seguranca.politicaSenha.exigirEspecial}
                    onChange={(e) => updateField('politicaSenha', 'exigirEspecial', e.target.checked)}
                  />
                  Exigir caractere especial
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Histórico de Senhas (quantidade)</label>
              <input
                type="number"
                min="0"
                max="20"
                value={parameters.seguranca.politicaSenha.historicoSenhas}
                onChange={(e) => updateField('politicaSenha', 'historicoSenhas', parseInt(e.target.value))}
              />
            </div>

            <h3>Bloqueio por Horário</h3>
            
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={parameters.seguranca.bloqueioHorario.ativo}
                  onChange={(e) => updateField('bloqueioHorario', 'ativo', e.target.checked)}
                />
                Ativar bloqueio por horário
              </label>
            </div>

            {parameters.seguranca.bloqueioHorario.ativo && (
              <div className="form-row">
                <div className="form-group">
                  <label>Horário Início</label>
                  <input
                    type="time"
                    value={parameters.seguranca.bloqueioHorario.inicio}
                    onChange={(e) => updateField('bloqueioHorario', 'inicio', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Horário Fim</label>
                  <input
                    type="time"
                    value={parameters.seguranca.bloqueioHorario.fim}
                    onChange={(e) => updateField('bloqueioHorario', 'fim', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notificacoes' && (
          <div className="parameters-section">
            <h2>Configurações de Notificações</h2>
            
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={parameters.notificacoes.emailAlertas}
                  onChange={(e) => updateField('notificacoes', 'emailAlertas', e.target.checked)}
                />
                Enviar alertas por e-mail
              </label>
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={parameters.notificacoes.emailResumoDiario}
                  onChange={(e) => updateField('notificacoes', 'emailResumoDiario', e.target.checked)}
                />
                Enviar resumo diário
              </label>
            </div>

            <div className="form-group">
              <label>Dias para Alerta de Prazo</label>
              <input
                type="number"
                min="1"
                max="30"
                value={parameters.notificacoes.diasParaAlertaPrazo}
                onChange={(e) => updateField('notificacoes', 'diasParaAlertaPrazo', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Horário do Resumo Diário</label>
              <input
                type="time"
                value={parameters.notificacoes.horarioResumoDiario}
                onChange={(e) => updateField('notificacoes', 'horarioResumoDiario', e.target.value)}
              />
            </div>
          </div>
        )}

        {activeTab === 'processos' && (
          <div className="parameters-section">
            <h2>Configurações de Processos</h2>
            
            <div className="form-group">
              <label>Prazo Padrão (dias)</label>
              <input
                type="number"
                min="1"
                max="90"
                value={parameters.processos.prazoPadraoDias}
                onChange={(e) => updateField('processos', 'prazoPadraoDias', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Tipo de Prazo Padrão</label>
              <select
                value={parameters.processos.tipoPrazoPadrao}
                onChange={(e) => updateField('processos', 'tipoPrazoPadrao', e.target.value)}
              >
                <option value="DAYS">Dias Corridos</option>
                <option value="BUSINESS_DAYS">Dias Úteis</option>
              </select>
            </div>

            <div className="form-group">
              <label>Prioridade Padrão</label>
              <select
                value={parameters.processos.prioridadePadrao}
                onChange={(e) => updateField('processos', 'prioridadePadrao', e.target.value)}
              >
                <option value="LOW">Baixa</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={parameters.processos.permitirExclusao}
                  onChange={(e) => updateField('processos', 'permitirExclusao', e.target.checked)}
                />
                Permitir exclusão de processos
              </label>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="parameters-section">
            <h2>Configurações de Upload</h2>
            
            <div className="form-group">
              <label>Tamanho Máximo (MB)</label>
              <input
                type="number"
                min="1"
                max="500"
                value={parameters.upload.tamanhoMaximoMB}
                onChange={(e) => updateField('upload', 'tamanhoMaximoMB', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Path de Upload</label>
              <input
                type="text"
                value={parameters.upload.path}
                onChange={(e) => updateField('upload', 'path', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Tipos de Arquivo Permitidos</label>
              <div className="types-list">
                {parameters.upload.tiposPermitidos.map((tipo, index) => (
                  <div key={index} className="type-item">
                    <span>{tipo}</span>
                    <button 
                      className="remove-type"
                      onClick={() => {
                        const novosTipos = parameters.upload.tiposPermitidos.filter((_, i) => i !== index);
                        updateField('upload', 'tiposPermitidos', novosTipos);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="add-type">
                <select 
                  id="new-type"
                  onChange={(e) => {
                    if (e.target.value && !parameters.upload.tiposPermitidos.includes(e.target.value)) {
                      updateField('upload', 'tiposPermitidos', [...parameters.upload.tiposPermitidos, e.target.value]);
                    }
                    e.target.value = '';
                  }}
                >
                  <option value="">Adicionar tipo...</option>
                  <option value="image/jpeg">JPEG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/gif">GIF</option>
                  <option value="application/pdf">PDF</option>
                  <option value="application/msword">DOC</option>
                  <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">DOCX</option>
                  <option value="audio/mpeg">MP3</option>
                  <option value="audio/wav">WAV</option>
                  <option value="video/mp4">MP4</option>
                  <option value="text/plain">TXT</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'auditoria' && (
          <div className="parameters-section">
            <h2>Configurações de Auditoria</h2>
            
            <div className="form-group">
              <label>Manter Logs por (dias)</label>
              <input
                type="number"
                min="30"
                max="365"
                value={parameters.auditoria.manterLogsDias}
                onChange={(e) => updateField('auditoria', 'manterLogsDias', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Nível de Log</label>
              <select
                value={parameters.auditoria.nivelLog}
                onChange={(e) => updateField('auditoria', 'nivelLog', e.target.value)}
              >
                <option value="basico">Básico</option>
                <option value="completo">Completo</option>
                <option value="nenhum">Nenhum</option>
              </select>
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={parameters.auditoria.logAcessos}
                  onChange={(e) => updateField('auditoria', 'logAcessos', e.target.checked)}
                />
                Registrar acessos
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="parameters-footer">
        <button 
          className="btn-save"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}