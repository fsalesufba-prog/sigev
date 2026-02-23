// frontend/app/portal/encaminhamentos/new/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import './encaminhamento-new.css';

interface Unit {
  id: string;
  name: string;
}

export default function NewEncaminhamentoPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const processId = searchParams.get('processId');
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [userUnitIds, setUserUnitIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    processId: processId || '',
    toUnitId: '',
    description: '',
    deadline: '',
    deadlineDays: '',
    hasDeadline: false
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const unitIds = (user as any).units?.map((u: any) => u.id) || [];
      setUserUnitIds(unitIds);
      fetchUnits();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (processId) {
      setFormData(prev => ({ ...prev, processId }));
    }
  }, [processId]);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Erro ao carregar unidades');
      
      const data = await response.json();
      
      let unitsList: Unit[] = [];
      if (Array.isArray(data)) {
        unitsList = data;
      } else if (data.data && Array.isArray(data.data)) {
        unitsList = data.data;
      } else if (data.units && Array.isArray(data.units)) {
        unitsList = data.units;
      }
      
      setUnits(unitsList);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.processId) {
      setError('ID do processo não informado');
      return;
    }

    if (!formData.toUnitId) {
      setError('Selecione uma unidade de destino');
      return;
    }

    if (userUnitIds.includes(formData.toUnitId)) {
      setError('A unidade de destino deve ser diferente da sua unidade');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      
      const payload: any = {
        processId: formData.processId,
        toUnitId: formData.toUnitId,
        description: formData.description
      };

      if (formData.hasDeadline && formData.deadlineDays) {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + parseInt(formData.deadlineDays));
        payload.deadline = deadline.toISOString();
        payload.deadlineDays = parseInt(formData.deadlineDays);
        payload.deadlineType = 'DAYS';
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/encaminhamentos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar encaminhamento');
      }

      setSuccess(true);
      
      setTimeout(() => {
        router.push(`/portal/processes/${formData.processId}`);
      }, 2000);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToProcess = () => {
    router.push(`/portal/processes/${formData.processId}`);
  };

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const unitsArray = Array.isArray(units) ? units : [];
  const filteredUnits = unitsArray.filter(unit => !userUnitIds.includes(unit.id));

  return (
    <div className="encaminhamento-container">
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="content-wrapper">
          <div className="page-header">
            <h1 className="page-title">Novo Encaminhamento</h1>
            <button 
              onClick={handleBackToProcess}
              className="back-link"
            >
              ← Voltar ao Processo
            </button>
          </div>

          {success ? (
            <div className="success-message">
              <div className="success-icon">✓</div>
              <h3>Encaminhamento criado com sucesso!</h3>
              <p>Redirecionando para o processo...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="encaminhamento-form">
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="toUnitId">Unidade de Destino *</label>
                <select
                  id="toUnitId"
                  name="toUnitId"
                  value={formData.toUnitId}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="">Selecione uma unidade</option>
                  {filteredUnits.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
                {userUnitIds.length > 0 && (
                  <small style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: '4px' }}>
                    Suas unidades: {userUnitIds.map(id => 
                      unitsArray.find(u => u.id === id)?.name || id
                    ).join(', ')}
                  </small>
                )}
                {loading && <p style={{ color: '#00D4FF', marginTop: '8px' }}>Carregando unidades...</p>}
              </div>

              <div className="form-group">
                <label htmlFor="description">Observações / Justificativa</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Descreva o motivo do encaminhamento..."
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="hasDeadline"
                    checked={formData.hasDeadline}
                    onChange={handleChange}
                  />
                  Definir prazo para resposta
                </label>
              </div>

              {formData.hasDeadline && (
                <div className="form-group">
                  <label htmlFor="deadlineDays">Prazo (dias)</label>
                  <input
                    type="number"
                    id="deadlineDays"
                    name="deadlineDays"
                    value={formData.deadlineDays}
                    onChange={handleChange}
                    min="1"
                    max="90"
                    placeholder="Ex: 15"
                  />
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button"
                  onClick={handleBackToProcess}
                  className="cancel-button"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={submitting || !formData.toUnitId}
                >
                  {submitting ? 'Enviando...' : 'Criar Encaminhamento'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}