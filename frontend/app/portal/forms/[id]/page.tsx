'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../../components/layout/Header';
import Sidebar from '../../../../components/layout/Sidebar';
import './form-detail.css';

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  order: number;
  options?: Array<{ value: string; label: string }>;
}

interface FormSection {
  id: string;
  title: string;
  order: number;
  fields: FormField[];
}

interface FormConfig {
  sections: FormSection[];
}

interface FormDetail {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
  config: FormConfig;
  createdAt: string;
  updatedAt: string;
}

export default function FormDetailPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const formId = params.id as string;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [form, setForm] = useState<FormDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'config'>('preview');
  const [formResponses, setFormResponses] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const isAdmin = user?.isAdmin || user?.role === 'ADMIN';

  // Forçar recálculo do layout
  useEffect(() => {
    const forceLayout = () => {
      document.body.style.display = 'none';
      document.body.offsetHeight;
      document.body.style.display = '';
      
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        (mainContent as HTMLElement).style.marginLeft = sidebarCollapsed ? '80px' : '280px';
        (mainContent as HTMLElement).style.width = sidebarCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)';
      }
    };

    forceLayout();
    const timer = setTimeout(forceLayout, 100);
    return () => clearTimeout(timer);
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/auth/login';
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && formId) {
      fetchFormDetails();
      fetchFormResponses();
    }
  }, [isAuthenticated, formId]);

  const fetchFormDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        window.location.href = '/auth/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Erro ao carregar formulário');
      }

      const data = await response.json();
      setForm(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormResponses = async () => {
    if (!isAdmin) return;
    
    try {
      setLoadingResponses(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}/responses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFormResponses(data);
      }
    } catch (error) {
      console.error('Erro ao carregar respostas:', error);
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!isAdmin || !form) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !form.isActive })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Erro ao alterar status');
      } else {
        setForm(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status');
    }
  };

  const handleDuplicate = async () => {
    if (!isAdmin || !form) return;
    
    if (!confirm(`Deseja duplicar o formulário "${form.name}"?`)) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Erro ao duplicar formulário');
      } else {
        const newForm = await response.json();
        alert('Formulário duplicado com sucesso!');
        router.push(`/portal/forms/${newForm.id}`);
      }
    } catch (error) {
      console.error('Erro ao duplicar formulário:', error);
      alert('Erro ao duplicar formulário');
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !form) return;
    
    if (!confirm(`Tem certeza que deseja excluir o formulário "${form.name}"? Esta ação não pode ser desfeita.`)) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/${formId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Erro ao excluir formulário');
      } else {
        alert('Formulário excluído com sucesso!');
        router.push('/portal/forms');
      }
    } catch (error) {
      console.error('Erro ao excluir formulário:', error);
      alert('Erro ao excluir formulário');
    }
  };

  const getFormTypeText = (type: string) => {
    const types: Record<string, string> = {
      'INITIAL': 'Formulário Inicial',
      'ESCUTA_ESPECIALIZADA': 'Escuta Especializada',
      'RELATORIO_ENCAMINHAMENTO': 'Relatório de Encaminhamento',
      'RELATORIO_ESCUTA': 'Relatório da Escuta'
    };
    return types[type] || type;
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

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error || !form) {
    return (
      <div className="forms-container">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} user={user} />
        <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Header user={user} onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <div className="content-wrapper">
            <div className="error-state">
              <p>{error || 'Formulário não encontrado'}</p>
              <button onClick={() => router.push('/portal/forms')}>Voltar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forms-container">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} user={user} />
      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header user={user} onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
        
        <div className="content-wrapper">
          {/* Cabeçalho */}
          <div className="detail-header">
            <button className="back-button" onClick={() => router.push('/portal/forms')}>
              ← Voltar
            </button>
            <div className="header-actions">
              {isAdmin && (
                <>
                  <Link href={`/portal/forms/${form.id}/edit`} className="edit-button">
                    Editar
                  </Link>
                  <button onClick={handleDuplicate} className="duplicate-button">
                    Duplicar
                  </button>
                  <button 
                    onClick={handleToggleStatus} 
                    className={`status-button ${form.isActive ? 'deactivate' : 'activate'}`}
                  >
                    {form.isActive ? 'Desativar' : 'Ativar'}
                  </button>
                  <button onClick={handleDelete} className="delete-button">
                    Excluir
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Informações do Formulário */}
          <div className="form-info-card">
            <div className="form-info-header">
              <div>
                <h1 className="form-title">{form.name}</h1>
                <p className="form-type">{getFormTypeText(form.type)}</p>
              </div>
              <div className="form-badges">
                <span className={`status-badge ${form.isActive ? 'active' : 'inactive'}`}>
                  {form.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
            
            {form.description && (
              <p className="form-description">{form.description}</p>
            )}
            
            <div className="form-meta">
              <span>Criado em: {formatDate(form.createdAt)}</span>
              <span>Atualizado em: {formatDate(form.updatedAt)}</span>
            </div>
          </div>

          {/* Abas */}
          <div className="form-tabs">
            <button 
              className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              Prévia do Formulário
            </button>
            {isAdmin && (
              <button 
                className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
                onClick={() => setActiveTab('config')}
              >
                Configuração JSON
              </button>
            )}
          </div>

          {/* Conteúdo das Abas */}
          <div className="tab-content">
            {activeTab === 'preview' && (
              <div className="form-preview">
                {form.config.sections.map((section) => (
                  <div key={section.id} className="preview-section">
                    <h2 className="preview-section-title">{section.title}</h2>
                    <div className="preview-fields">
                      {section.fields
                        .sort((a, b) => a.order - b.order)
                        .map((field) => (
                          <div key={field.id} className="preview-field">
                            <label className="preview-field-label">
                              {field.label}
                              {field.required && <span className="required-mark">*</span>}
                            </label>
                            
                            {field.type === 'textarea' && (
                              <textarea 
                                className="preview-field-input" 
                                placeholder={field.placeholder || ''}
                                disabled
                                rows={3}
                              />
                            )}
                            
                            {field.type === 'select' && field.options && (
                              <select className="preview-field-input" disabled>
                                <option value="">Selecione...</option>
                                {field.options.map((opt, idx) => (
                                  <option key={idx} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            )}
                            
                            {field.type === 'radio' && field.options && (
                              <div className="preview-radio-group">
                                {field.options.map((opt, idx) => (
                                  <label key={idx} className="preview-radio-label">
                                    <input type="radio" name={field.id} disabled />
                                    {opt.label}
                                  </label>
                                ))}
                              </div>
                            )}
                            
                            {field.type === 'checkbox' && (
                              <div className="preview-checkbox">
                                <input type="checkbox" disabled />
                                <span>{field.placeholder || 'Marcar esta opção'}</span>
                              </div>
                            )}
                            
                            {['text', 'email', 'phone', 'cpf', 'address'].includes(field.type) && (
                              <input 
                                type="text" 
                                className="preview-field-input" 
                                placeholder={field.placeholder || ''}
                                disabled
                              />
                            )}
                            
                            {field.type === 'number' && (
                              <input 
                                type="number" 
                                className="preview-field-input" 
                                placeholder={field.placeholder || ''}
                                disabled
                              />
                            )}
                            
                            {field.type === 'date' && (
                              <input 
                                type="date" 
                                className="preview-field-input" 
                                disabled
                              />
                            )}
                            
                            {!field.enabled && (
                              <span className="field-disabled-warning">Campo desabilitado</span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'config' && isAdmin && (
              <div className="form-config">
                <pre className="config-json">
                  {JSON.stringify(form.config, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}