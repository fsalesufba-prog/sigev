// frontend/app/portal/processes/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import './process-detail.css';

interface ProcessDetail {
  id: string;
  citizen: {
    id: string;
    name: string;
    birthDate: string;
    cpf?: string;
    rg?: string;
    motherName?: string;
    fatherName?: string;
    address?: string;
    phone?: string;
  };
  professional: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  unit: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  identificationForm: string;
  description?: string;
  status: string;
  priority: string;
  deadline?: string;
  deadlineType?: string;
  deadlineDays?: number;
  isFavorite: boolean;
  readAt?: string;
  readBy?: string;
  createdAt: string;
  updatedAt: string;
  violences: Array<{
    violence: {
      id: string;
      name: string;
      description: string;
    };
  }>;
  notes: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: {
      name: string;
    };
  }>;
  encaminhamentos: Array<{
    id: string;
    fromUnit: { name: string };
    toUnit: { name: string };
    status: string;
    createdAt: string;
    deadline?: string;
    openedAt?: string;
    opener?: { name: string };
  }>;
  attachments: Array<{
    id: string;
    originalName: string;
    size: number;
    mimeType: string;
    createdAt: string;
    user: { name: string };
  }>;
}

export default function ProcessDetailPage({ params }: { params: { id: string } }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // 🔴 RENOMEADO de 'process' para 'processData' para evitar conflito com o objeto global 'process'
  const [processData, setProcessData] = useState<ProcessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'encaminhamentos' | 'attachments'>('details');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && params?.id) {
      fetchProcess();
    }
  }, [isAuthenticated, params?.id]);

  const fetchProcess = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/processes/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar processo');
      
      const data = await response.json();
      setProcessData(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!processData) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/processes/${processData.id}/favorite`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setProcessData({ ...processData, isFavorite: !processData.isFavorite });
      }
    } catch (error) {
      console.error('Erro ao favoritar:', error);
    }
  };

  const handleAddNote = async () => {
    if (!processData || !noteContent.trim()) return;

    try {
      setSendingNote(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/processes/${processData.id}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: noteContent })
      });

      if (response.ok) {
        setNoteContent('');
        fetchProcess();
      }
    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
    } finally {
      setSendingNote(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'IN_PROGRESS': return 'status-progress';
      case 'COMPLETED': return 'status-completed';
      case 'ARCHIVED': return 'status-archived';
      default: return '';
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'priority-urgent';
      case 'HIGH': return 'priority-high';
      case 'NORMAL': return 'priority-normal';
      case 'LOW': return 'priority-low';
      default: return '';
    }
  };

  if (authLoading) {
    return (
      <div className="dashboard-container">
        
        <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          
          <div className="content-wrapper">
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        
        <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          
          <div className="content-wrapper">
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !processData) {
    return (
      <div className="dashboard-container">
        
        <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          
          <div className="content-wrapper">
            <div className="detail-error">
              <p>{error || 'Processo não encontrado'}</p>
              <button onClick={() => router.push('/portal/processes')}>Voltar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      
      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        
        
        <div className="content-wrapper">
          <div className="detail-header">
            <div className="header-left">
              <button className="back-btn" onClick={() => router.push('/portal/processes')}>
                ← Voltar
              </button>
              <h1>Processo #{processData.id.slice(0, 8)}</h1>
            </div>
            <div className="header-actions">
              <button 
                className={`favorite-btn ${processData.isFavorite ? 'active' : ''}`}
                onClick={handleToggleFavorite}
              >
                {processData.isFavorite ? '⭐' : '☆'} Favorito
              </button>
              <button className="edit-btn" onClick={() => router.push(`/portal/processes/${processData.id}/edit`)}>
                ✏️ Editar
              </button>
            </div>
          </div>

          <div className="detail-tabs">
            <button 
              className={`tab ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              📋 Detalhes
            </button>
            <button 
              className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              📝 Notas ({processData.notes?.length || 0})
            </button>
            <button 
              className={`tab ${activeTab === 'encaminhamentos' ? 'active' : ''}`}
              onClick={() => setActiveTab('encaminhamentos')}
            >
              🔄 Encaminhamentos ({processData.encaminhamentos?.length || 0})
            </button>
            <button 
              className={`tab ${activeTab === 'attachments' ? 'active' : ''}`}
              onClick={() => setActiveTab('attachments')}
            >
              📎 Anexos ({processData.attachments?.length || 0})
            </button>
          </div>

          <div className="detail-content">
            {activeTab === 'details' && (
              <div className="details-section">
                <div className="info-grid">
                  <div className="info-card">
                    <h3>Cidadão</h3>
                    <p><strong>Nome:</strong> {processData.citizen?.name || '-'}</p>
                    <p><strong>Nascimento:</strong> {formatDate(processData.citizen?.birthDate)}</p>
                    {processData.citizen?.cpf && <p><strong>CPF:</strong> {processData.citizen.cpf}</p>}
                    {processData.citizen?.motherName && <p><strong>Mãe:</strong> {processData.citizen.motherName}</p>}
                    {processData.citizen?.fatherName && <p><strong>Pai:</strong> {processData.citizen.fatherName}</p>}
                    {processData.citizen?.address && <p><strong>Endereço:</strong> {processData.citizen.address}</p>}
                    {processData.citizen?.phone && <p><strong>Telefone:</strong> {processData.citizen.phone}</p>}
                  </div>

                  <div className="info-card">
                    <h3>Processo</h3>
                    <p><strong>Status:</strong> <span className={`status-badge ${getStatusClass(processData.status)}`}>{processData.status}</span></p>
                    <p><strong>Prioridade:</strong> <span className={`priority-badge ${getPriorityClass(processData.priority)}`}>{processData.priority}</span></p>
                    <p><strong>Identificação:</strong> {processData.identificationForm}</p>
                    <p><strong>Criado em:</strong> {formatDate(processData.createdAt)}</p>
                    {processData.deadline && <p><strong>Prazo:</strong> {formatDate(processData.deadline)}</p>}
                  </div>

                  <div className="info-card">
                    <h3>Responsáveis</h3>
                    <p><strong>Profissional:</strong> {processData.professional?.name || '-'}</p>
                    <p><strong>E-mail:</strong> {processData.professional?.email || '-'}</p>
                    <p><strong>Unidade:</strong> {processData.unit?.name || '-'}</p>
                    <p><strong>Telefone:</strong> {processData.unit?.phone || '-'}</p>
                  </div>

                  <div className="info-card full-width">
                    <h3>Violências</h3>
                    <div className="violences-list">
                      {processData.violences && processData.violences.length > 0 ? (
                        processData.violences.map((v, index) => (
                          <div key={index} className="violence-item">
                            <strong>{v.violence?.name || 'Violência'}</strong>
                            <p>{v.violence?.description || ''}</p>
                          </div>
                        ))
                      ) : (
                        <p>Nenhuma violência registrada</p>
                      )}
                    </div>
                  </div>

                  {processData.description && (
                    <div className="info-card full-width">
                      <h3>Descrição do Caso</h3>
                      <p className="case-description">{processData.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="notes-section">
                <div className="add-note">
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Adicionar uma nota..."
                    rows={4}
                  />
                  <button 
                    onClick={handleAddNote}
                    disabled={sendingNote || !noteContent.trim()}
                  >
                    {sendingNote ? 'Enviando...' : 'Adicionar Nota'}
                  </button>
                </div>

                <div className="notes-list">
                  {!processData.notes || processData.notes.length === 0 ? (
                    <p className="no-items">Nenhuma nota adicionada</p>
                  ) : (
                    processData.notes.map((note) => (
                      <div key={note.id} className="note-item">
                        <div className="note-header">
                          <span className="note-author">{note.user?.name || 'Usuário'}</span>
                          <span className="note-date">{formatDate(note.createdAt)}</span>
                        </div>
                        <p className="note-content">{note.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'encaminhamentos' && (
              <div className="encaminhamentos-section">
                <div className="section-header">
                  <h3>Encaminhamentos</h3>
                </div>

                {!processData.encaminhamentos || processData.encaminhamentos.length === 0 ? (
                  <p className="no-items">Nenhum encaminhamento realizado</p>
                ) : (
                  <div className="encaminhamentos-list">
                    {processData.encaminhamentos.map((enc) => (
                      <div key={enc.id} className="encaminhamento-item">
                        <div className="enc-header">
                          <span className="enc-from">{enc.fromUnit?.name || 'Origem'}</span>
                          <span className="enc-arrow">→</span>
                          <span className="enc-to">{enc.toUnit?.name || 'Destino'}</span>
                          <span className={`enc-status ${enc.status?.toLowerCase() || 'pending'}`}>{enc.status}</span>
                        </div>
                        <div className="enc-details">
                          <span>Enviado em: {formatDate(enc.createdAt)}</span>
                          {enc.deadline && <span>Prazo: {formatDate(enc.deadline)}</span>}
                          {enc.openedAt && <span>Aberto em: {formatDate(enc.openedAt)} por {enc.opener?.name}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attachments' && (
              <div className="attachments-section">
                <div className="section-header">
                  <h3>Anexos</h3>
                  <button 
                    className="btn-upload"
                    onClick={() => router.push(`/portal/processes/${processData.id}/upload`)}
                  >
                    + Adicionar Anexos
                  </button>
                </div>

                {!processData.attachments || processData.attachments.length === 0 ? (
                  <p className="no-items">Nenhum anexo adicionado</p>
                ) : (
                  <div className="attachments-list">
                    {processData.attachments.map((att) => (
                      <div key={att.id} className="attachment-item">
                        <span className="attachment-icon">📎</span>
                        <div className="attachment-info">
                          <div className="attachment-name">{att.originalName}</div>
                          <div className="attachment-meta">
                            {formatBytes(att.size)} • {att.user?.name || 'Usuário'} • {formatDate(att.createdAt)}
                          </div>
                        </div>
                        <button 
                          className="attachment-download"
                          onClick={() => {
                            const url = `${process.env.NEXT_PUBLIC_API_URL}/attachments/download/${att.id}`;
                            window.open(url, '_blank');
                          }}
                        >
                          ⬇️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}