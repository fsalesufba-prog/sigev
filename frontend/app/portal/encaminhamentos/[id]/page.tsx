// frontend/app/portal/encaminhamentos/[id]/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import './encaminhamento-detalhe.css';

export default function EncaminhamentoDetalhePage({ params }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [encaminhamento, setEncaminhamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && params?.id) {
      fetchEncaminhamento();
    }
  }, [isAuthenticated, params?.id]);

  const fetchEncaminhamento = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/encaminhamentos/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar encaminhamento');
      
      const data = await response.json();
      setEncaminhamento(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/encaminhamentos/${params.id}/open`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao abrir encaminhamento');
      
      await fetchEncaminhamento();
    } catch (error) {
      alert(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleComplete = async () => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/encaminhamentos/${params.id}/complete`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao concluir encaminhamento');
      
      await fetchEncaminhamento();
    } catch (error) {
      alert(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Tem certeza que deseja cancelar este encaminhamento?')) return;

    try {
      setUpdating(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/encaminhamentos/${params.id}/cancel`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao cancelar encaminhamento');
      
      await fetchEncaminhamento();
    } catch (error) {
      alert(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      'PENDING': { class: 'status-pending', text: 'Pendente', icon: '⏳' },
      'OPENED': { class: 'status-opened', text: 'Aberto', icon: '📂' },
      'COMPLETED': { class: 'status-completed', text: 'Concluído', icon: '✅' },
      'CANCELLED': { class: 'status-cancelled', text: 'Cancelado', icon: '❌' }
    };
    return statusMap[status] || { class: '', text: status, icon: '❓' };
  };

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || !encaminhamento) {
    return (
      <div className="error-container">
        <div className="error-card">
          <h2>Erro</h2>
          <p>{error || 'Encaminhamento não encontrado'}</p>
          <button onClick={() => router.push('/portal/encaminhamentos')}>
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(encaminhamento.status);

  return (
    <div className="encaminhamento-detalhe-page">
      <div className="detalhe-header">
        <button className="back-btn" onClick={() => router.push('/portal/encaminhamentos')}>
          ← Voltar
        </button>
        <h1>Encaminhamento #{encaminhamento.id?.slice(0, 8)}</h1>
        <span className={`status-badge-large ${statusInfo.class}`}>
          {statusInfo.icon} {statusInfo.text}
        </span>
      </div>

      <div className="detalhe-content">
        {/* Informações do Processo */}
        <div className="info-card">
          <h2>📋 Processo</h2>
          {encaminhamento.process ? (
            <div className="process-info">
              <p><strong>ID:</strong> {encaminhamento.process.id}</p>
              <p><strong>Cidadão:</strong> {encaminhamento.process.citizen?.name || 'N/A'}</p>
              {encaminhamento.process.citizen?.cpf && (
                <p><strong>CPF:</strong> {encaminhamento.process.citizen.cpf}</p>
              )}
              {encaminhamento.process.citizen?.birthDate && (
                <p><strong>Nascimento:</strong> {formatDate(encaminhamento.process.citizen.birthDate)}</p>
              )}
            </div>
          ) : (
            <p className="process-id-only">Processo ID: {encaminhamento.processId}</p>
          )}
          <button 
            className="btn-view-process"
            onClick={() => router.push(`/portal/processes/${encaminhamento.processId}`)}
          >
            Ver Processo Completo
          </button>
        </div>

        {/* Unidades */}
        <div className="info-card">
          <h2>🏛️ Unidades</h2>
          <div className="units-flow">
            <div className="unit-block">
              <h3>Origem</h3>
              <p className="unit-name">{encaminhamento.fromUnit?.name || 'N/A'}</p>
              {encaminhamento.fromUnit?.email && (
                <p className="unit-contact">📧 {encaminhamento.fromUnit.email}</p>
              )}
              {encaminhamento.fromUnit?.phone && (
                <p className="unit-contact">📞 {encaminhamento.fromUnit.phone}</p>
              )}
            </div>
            <div className="unit-arrow-large">→</div>
            <div className="unit-block">
              <h3>Destino</h3>
              <p className="unit-name">{encaminhamento.toUnit?.name || 'N/A'}</p>
              {encaminhamento.toUnit?.email && (
                <p className="unit-contact">📧 {encaminhamento.toUnit.email}</p>
              )}
              {encaminhamento.toUnit?.phone && (
                <p className="unit-contact">📞 {encaminhamento.toUnit.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Descrição */}
        {encaminhamento.description && (
          <div className="info-card">
            <h2>📝 Descrição</h2>
            <p className="description-text">{encaminhamento.description}</p>
          </div>
        )}

        {/* Datas e Prazos */}
        <div className="info-card">
          <h2>⏰ Datas e Prazos</h2>
          <div className="dates-grid">
            <div className="date-item">
              <span className="date-label">Criado em:</span>
              <span className="date-value">{formatDate(encaminhamento.createdAt)}</span>
            </div>
            
            {encaminhamento.deadline && (
              <div className="date-item">
                <span className="date-label">Prazo:</span>
                <span className="date-value">{formatDate(encaminhamento.deadline)}</span>
              </div>
            )}
            
            {encaminhamento.openedAt && (
              <div className="date-item">
                <span className="date-label">Aberto em:</span>
                <span className="date-value">{formatDate(encaminhamento.openedAt)}</span>
                {encaminhamento.opener && (
                  <span className="opener-name">por {encaminhamento.opener.name}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="acoes-card">
          <h2>🔧 Ações</h2>
          <div className="acoes-buttons">
            {encaminhamento.status === 'PENDING' && (
              <>
                <button 
                  className="btn-open"
                  onClick={handleOpen}
                  disabled={updating}
                >
                  {updating ? 'Processando...' : '📂 Abrir Encaminhamento'}
                </button>
                <button 
                  className="btn-cancel-action"
                  onClick={handleCancel}
                  disabled={updating}
                >
                  {updating ? 'Processando...' : '❌ Cancelar'}
                </button>
              </>
            )}
            
            {encaminhamento.status === 'OPENED' && (
              <>
                <button 
                  className="btn-complete"
                  onClick={handleComplete}
                  disabled={updating}
                >
                  {updating ? 'Processando...' : '✅ Concluir'}
                </button>
                <button 
                  className="btn-cancel-action"
                  onClick={handleCancel}
                  disabled={updating}
                >
                  {updating ? 'Processando...' : '❌ Cancelar'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}