'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import './documents.css';

interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

interface Document {
  id: string;
  name: string;
  description: string | null;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}

interface DocumentsResponse {
  data: Document[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminDocumentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Verificar se é admin
  const isAdmin = user?.role === 'ADMIN' || user?.isAdmin === true;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchDebounced && { search: searchDebounced })
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar documentos');

      const data: DocumentsResponse = await response.json();
      setDocuments(data.data);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages
      });
      setError(null);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [user, pagination.page, pagination.limit, searchDebounced]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user, fetchDocuments]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📗';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📙';
    return '📄';
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

  const handleCreateClick = () => {
    setFormData({ name: '', description: '' });
    setSelectedFiles([]);
    setModalMode('create');
    setShowModal(true);
  };

  const handleEditClick = (doc: Document) => {
    setFormData({
      name: doc.name,
      description: doc.description || ''
    });
    setSelectedDocument(doc);
    setSelectedFiles([]);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleViewClick = (doc: Document) => {
    setSelectedDocument(doc);
    setModalMode('view');
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/documents/download/${attachment.id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Erro ao baixar arquivo');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar:', error);
      alert('Erro ao baixar arquivo');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('Nome do documento é obrigatório');
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('accessToken');

      if (modalMode === 'create') {
        // Criar FormData para upload
        const formDataToSend = new FormData();
        formDataToSend.append('name', formData.name);
        if (formData.description) {
          formDataToSend.append('description', formData.description);
        }
        selectedFiles.forEach(file => {
          formDataToSend.append('attachments', file);
        });

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataToSend
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao criar documento');
        }

        fetchDocuments();
        setShowModal(false);

      } else if (modalMode === 'edit' && selectedDocument) {
        // Atualizar metadados
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${selectedDocument.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao atualizar documento');
        }

        // Se houver novos arquivos, fazer upload
        if (selectedFiles.length > 0) {
          const formDataToSend = new FormData();
          selectedFiles.forEach(file => {
            formDataToSend.append('attachments', file);
          });

          const uploadResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/documents/${selectedDocument.id}/attachments`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: formDataToSend
            }
          );

          if (!uploadResponse.ok) {
            const error = await uploadResponse.json();
            throw new Error(error.error || 'Erro ao adicionar anexos');
          }
        }

        fetchDocuments();
        setShowModal(false);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (documentId: string, attachmentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este anexo?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}/attachments/${attachmentId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir anexo');
      }

      fetchDocuments();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!confirm(`Tem certeza que deseja excluir o documento "${doc.name}" e todos os seus anexos?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${doc.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir documento');
      }

      fetchDocuments();
      setShowModal(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (authLoading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="documents-page">
      <div className="documents-header">
        <h1>Documentos</h1>
        <div className="header-actions">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          {isAdmin && (
            <button className="btn-primary" onClick={handleCreateClick}>
              <span>+</span> Novo Documento
            </button>
          )}
          <button className="btn-secondary" onClick={fetchDocuments}>
            ↻ Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchDocuments}>Tentar novamente</button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Carregando documentos...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>Nenhum documento encontrado</h3>
          <p>
            {isAdmin 
              ? 'Clique em "Novo Documento" para começar'
              : 'Não há documentos disponíveis no momento'}
          </p>
        </div>
      ) : (
        <>
          <div className="documents-grid">
            {documents.map((doc) => (
              <div key={doc.id} className="document-card">
                {isAdmin && (
                  <div className="card-actions">
                    <button
                      className="card-action-btn"
                      onClick={() => handleEditClick(doc)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="card-action-btn delete"
                      onClick={() => handleDeleteDocument(doc)}
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </div>
                )}
                
                <div className="document-icon" onClick={() => handleViewClick(doc)} style={{ cursor: 'pointer' }}>
                  📄
                </div>
                
                <h3 className="document-name" onClick={() => handleViewClick(doc)} style={{ cursor: 'pointer' }}>
                  {doc.name}
                </h3>
                
                {doc.description && (
                  <p className="document-description">{doc.description}</p>
                )}
                
                <div className="document-meta">
                  <span>👤 {doc.createdBy.name}</span>
                  <span>📅 {formatDate(doc.createdAt)}</span>
                  <span>📎 {doc.attachments.length} anexo(s)</span>
                </div>

                {doc.attachments.length > 0 && (
                  <div className="attachments-list">
                    <div className="attachments-title">ANEXOS</div>
                    {doc.attachments.slice(0, 3).map((att) => (
                      <div key={att.id} className="attachment-item">
                        <span className="attachment-icon">{getFileIcon(att.mimeType)}</span>
                        <div className="attachment-info">
                          <div className="attachment-name">{att.originalName}</div>
                          <div className="attachment-meta">{formatFileSize(att.size)}</div>
                        </div>
                        <button
                          className="attachment-download"
                          onClick={() => handleDownload(att)}
                          title="Baixar"
                        >
                          ⬇️
                        </button>
                        {isAdmin && (
                          <button
                            className="attachment-download"
                            onClick={() => handleDeleteAttachment(doc.id, att.id)}
                            title="Excluir"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                    {doc.attachments.length > 3 && (
                      <div className="attachment-item" onClick={() => handleViewClick(doc)} style={{ cursor: 'pointer' }}>
                        <span className="attachment-icon">⋯</span>
                        <div className="attachment-info">
                          <div className="attachment-name">
                            + {doc.attachments.length - 3} anexos
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Anterior
              </button>
              <span className="page-info">
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

      {/* Modal de Criar/Editar */}
      {showModal && modalMode !== 'view' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Novo Documento' : 'Editar Documento'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Nome do Documento *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Manual de Procedimentos, Protocolo de Atendimento..."
                />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o conteúdo do documento..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Anexos</label>
                <div className="file-upload">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileChange}
                  />
                  <label htmlFor="file-upload" className="file-upload-label">
                    <div className="file-upload-icon">📎</div>
                    <div className="file-upload-text">
                      Clique para selecionar ou arraste arquivos
                    </div>
                    <div className="file-upload-hint">
                      PDF, DOC, XLS, imagens, vídeos, áudios (máx. 50MB)
                    </div>
                  </label>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="file-list">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="file-item">
                        <span className="file-item-icon">📄</span>
                        <div className="file-item-info">
                          <div className="file-item-name">{file.name}</div>
                          <div className="file-item-size">{formatFileSize(file.size)}</div>
                        </div>
                        <button
                          className="file-item-remove"
                          onClick={() => handleRemoveFile(index)}
                          title="Remover"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleSubmit} disabled={uploading}>
                {uploading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {showModal && modalMode === 'view' && selectedDocument && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedDocument.name}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="view-section">
                <div className="view-section-title">INFORMAÇÕES</div>
                <div className="view-row">
                  <span className="view-label">ID:</span>
                  <span className="view-value">{selectedDocument.id}</span>
                </div>
                <div className="view-row">
                  <span className="view-label">Criado por:</span>
                  <span className="view-value">{selectedDocument.createdBy.name}</span>
                </div>
                <div className="view-row">
                  <span className="view-label">Criado em:</span>
                  <span className="view-value">{formatDate(selectedDocument.createdAt)}</span>
                </div>
                <div className="view-row">
                  <span className="view-label">Atualizado em:</span>
                  <span className="view-value">{formatDate(selectedDocument.updatedAt)}</span>
                </div>
              </div>

              {selectedDocument.description && (
                <div className="view-section">
                  <div className="view-section-title">DESCRIÇÃO</div>
                  <div className="view-description">
                    {selectedDocument.description}
                  </div>
                </div>
              )}

              {selectedDocument.attachments.length > 0 && (
                <div className="view-section">
                  <div className="view-section-title">ANEXOS ({selectedDocument.attachments.length})</div>
                  <div className="attachments-list">
                    {selectedDocument.attachments.map((att) => (
                      <div key={att.id} className="attachment-item">
                        <span className="attachment-icon">{getFileIcon(att.mimeType)}</span>
                        <div className="attachment-info">
                          <div className="attachment-name">{att.originalName}</div>
                          <div className="attachment-meta">{formatFileSize(att.size)}</div>
                        </div>
                        <button
                          className="attachment-download"
                          onClick={() => handleDownload(att)}
                          title="Baixar"
                        >
                          ⬇️
                        </button>
                        {isAdmin && (
                          <button
                            className="attachment-download"
                            onClick={() => handleDeleteAttachment(selectedDocument.id, att.id)}
                            title="Excluir"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}