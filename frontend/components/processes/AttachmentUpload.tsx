'use client';

import React, { useState, useRef } from 'react';
import './AttachmentUpload.css';

interface AttachmentUploadProps {
  processId: string;
  onUploadComplete?: (files: any[]) => void;
}

export default function AttachmentUpload({ processId, onUploadComplete }: AttachmentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      const token = localStorage.getItem('accessToken');
      
      // Simular progresso
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/attachments/process/${processId}/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      clearInterval(interval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao fazer upload');
      }

      const data = await response.json();
      
      if (onUploadComplete) {
        onUploadComplete(data);
      }

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => {
        setProgress(0);
        setUploading(false);
      }, 1000);

    } catch (error: any) {
      setError(error.message);
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="attachment-upload">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="file-input"
      />

      <button
        type="button"
        onClick={handleFileSelect}
        disabled={uploading}
        className="upload-button"
      >
        {uploading ? 'Enviando...' : '📎 Selecionar Arquivos'}
      </button>

      {uploading && (
        <div className="upload-progress">
          <div 
            className="progress-bar" 
            style={{ width: `${progress}%` }}
          ></div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}

      {error && (
        <div className="upload-error">
          {error}
        </div>
      )}

      <p className="upload-info">
        Formatos aceitos: Imagens, PDF, Word, Texto, Vídeos, Áudios (máx. 10MB por arquivo)
      </p>
    </div>
  );
}