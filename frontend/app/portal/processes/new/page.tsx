// frontend/app/portal/processes/new/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import './new-process.css';

interface Citizen {
  id: string;
  name: string;
  cpf?: string;
  birthDate: string;
  age?: number;
}

interface Professional {
  id: string;
  name: string;
  email: string;
}

interface Unit {
  id: string;
  name: string;
}

interface Violence {
  id: string;
  name: string;
  description: string;
}

interface UserUnit {
  id: string;
  name: string;
  position?: string;
}

interface FormData {
  citizenId: string;
  professionalId: string;
  unitId: string;
  identificationForm: 'REVELACAO_ESPONTANEA' | 'SUSPEITA_PROFISSIONAL' | 'DENUNCIA';
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  deadline: string;
  deadlineType: 'DAYS' | 'BUSINESS_DAYS';
  deadlineDays: number;
  violenceIds: string[];
}

export default function NewProcessPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [violences, setViolences] = useState<Violence[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchCitizen, setSearchCitizen] = useState('');
  const [showCitizenModal, setShowCitizenModal] = useState(false);
  const [searchResults, setSearchResults] = useState<Citizen[]>([]);
  const [searchingCitizen, setSearchingCitizen] = useState(false);
  const [selectedCitizen, setSelectedCitizen] = useState<Citizen | null>(null);

  const [formData, setFormData] = useState<FormData>({
    citizenId: '',
    professionalId: '',
    unitId: '',
    identificationForm: 'REVELACAO_ESPONTANEA',
    description: '',
    priority: 'NORMAL',
    deadline: '',
    deadlineType: 'DAYS',
    deadlineDays: 15,
    violenceIds: []
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInitialData();
    }
  }, [isAuthenticated]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const [professionalsRes, unitsRes, violencesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals?limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/units?limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/violences/list/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (professionalsRes.ok) {
        const data = await professionalsRes.json();
        setProfessionals(data.data || []);
      }

      if (unitsRes.ok) {
        const data = await unitsRes.json();
        setUnits(data.data || []);
        
        // Selecionar primeira unidade do usuário ou primeira disponível
        if (user?.units && user.units.length > 0) {
          setFormData(prev => ({ ...prev, unitId: user.units[0].id }));
        } else if (data.data && data.data.length > 0) {
          setFormData(prev => ({ ...prev, unitId: data.data[0].id }));
        }
      }

      if (violencesRes.ok) {
        const data = await violencesRes.json();
        setViolences(data || []);
      }

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const searchCitizens = async () => {
    if (!searchCitizen.trim()) return;

    try {
      setSearchingCitizen(true);
      const token = localStorage.getItem('accessToken');
      
      // 🔥 ENDPOINT CORRETO
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/citizens?search=${encodeURIComponent(searchCitizen)}&limit=10`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Resultados encontrados:', data);
        setSearchResults(data.data || []);
        setShowCitizenModal(true);
      } else {
        console.error('Erro na busca:', await response.text());
      }
    } catch (error) {
      console.error('Erro ao buscar cidadãos:', error);
    } finally {
      setSearchingCitizen(false);
    }
  };

  const selectCitizen = (citizen: Citizen) => {
    setSelectedCitizen(citizen);
    setFormData(prev => ({ ...prev, citizenId: citizen.id }));
    setShowCitizenModal(false);
    setSearchCitizen(`${citizen.name} ${citizen.cpf ? `- ${citizen.cpf}` : ''}`);
  };

  const handleViolenceToggle = (violenceId: string) => {
    setFormData(prev => {
      const isSelected = prev.violenceIds.includes(violenceId);
      return {
        ...prev,
        violenceIds: isSelected
          ? prev.violenceIds.filter(id => id !== violenceId)
          : [...prev.violenceIds, violenceId]
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.citizenId) {
      alert('Selecione um cidadão');
      return;
    }

    if (!formData.professionalId) {
      alert('Selecione um profissional responsável');
      return;
    }

    if (!formData.unitId) {
      alert('Selecione uma unidade');
      return;
    }

    if (formData.violenceIds.length === 0) {
      alert('Selecione pelo menos um tipo de violência');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      
      // Preparar dados para envio
      const dataToSend = {
        ...formData,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
        deadlineDays: formData.deadline ? formData.deadlineDays : undefined
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/processes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar processo');
      }

      const newProcess = await response.json();
      router.push(`/portal/processes/${newProcess.id}`);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
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

  return (
    <div className="dashboard-container">

      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

        
        <div className="content-wrapper">
          <div className="new-process-header">
            <h1>Novo Processo</h1>
          </div>

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="new-process-form">
            {/* Seção: Cidadão */}
            <div className="form-section">
              <h2>1. Cidadão</h2>
              
              <div className="citizen-selector">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Buscar cidadão por nome ou CPF..."
                    value={searchCitizen}
                    onChange={(e) => setSearchCitizen(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchCitizens()}
                    disabled={loading}
                  />
                  <button 
                    type="button"
                    onClick={searchCitizens}
                    disabled={searchingCitizen || !searchCitizen.trim()}
                  >
                    {searchingCitizen ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
                
                {selectedCitizen && (
                  <div className="selected-item">
                    <span className="selected-icon">✓</span>
                    <div className="selected-info">
                      <span className="selected-name">{selectedCitizen.name}</span>
                      {selectedCitizen.cpf && (
                        <span className="selected-cpf">CPF: {selectedCitizen.cpf}</span>
                      )}
                      {selectedCitizen.age && (
                        <span className="selected-age">{selectedCitizen.age} anos</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seção: Responsáveis */}
            <div className="form-section">
              <h2>2. Responsáveis</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="professionalId">Profissional Responsável *</label>
                  <select
                    id="professionalId"
                    value={formData.professionalId}
                    onChange={(e) => setFormData(prev => ({ ...prev, professionalId: e.target.value }))}
                    required
                    disabled={loading}
                  >
                    <option value="">Selecione um profissional</option>
                    {professionals.map(prof => (
                      <option key={prof.id} value={prof.id}>{prof.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="unitId">Unidade *</label>
                  <select
                    id="unitId"
                    value={formData.unitId}
                    onChange={(e) => setFormData(prev => ({ ...prev, unitId: e.target.value }))}
                    required
                    disabled={loading}
                  >
                    <option value="">Selecione uma unidade</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Seção: Detalhes do Caso */}
            <div className="form-section">
              <h2>3. Detalhes do Caso</h2>
              
              <div className="form-group">
                <label htmlFor="identificationForm">Forma de Identificação *</label>
                <select
                  id="identificationForm"
                  value={formData.identificationForm}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    identificationForm: e.target.value as any 
                  }))}
                  required
                  disabled={loading}
                >
                  <option value="REVELACAO_ESPONTANEA">Revelação Espontânea</option>
                  <option value="SUSPEITA_PROFISSIONAL">Suspeita Profissional</option>
                  <option value="DENUNCIA">Denúncia</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="description">Descrição do Caso</label>
                <textarea
                  id="description"
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva detalhadamente o caso..."
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Tipos de Violência *</label>
                <div className="violences-grid">
                  {violences.map(violence => (
                    <div key={violence.id} className="violence-checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={formData.violenceIds.includes(violence.id)}
                          onChange={() => handleViolenceToggle(violence.id)}
                          disabled={loading}
                        />
                        <div className="violence-info">
                          <span className="violence-name">{violence.name}</span>
                          <span className="violence-description">{violence.description}</span>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Seção: Prioridade e Prazo */}
            <div className="form-section">
              <h2>4. Prioridade e Prazo</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="priority">Prioridade *</label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      priority: e.target.value as any 
                    }))}
                    required
                    disabled={loading}
                  >
                    <option value="LOW">Baixa</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="deadline">Data Limite</label>
                  <input
                    type="date"
                    id="deadline"
                    value={formData.deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                    disabled={loading}
                  />
                </div>
              </div>

              {formData.deadline && (
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="deadlineType">Tipo de Prazo</label>
                    <select
                      id="deadlineType"
                      value={formData.deadlineType}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        deadlineType: e.target.value as any 
                      }))}
                      disabled={loading}
                    >
                      <option value="DAYS">Dias Corridos</option>
                      <option value="BUSINESS_DAYS">Dias Úteis</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="deadlineDays">Quantidade de Dias</label>
                    <input
                      type="number"
                      id="deadlineDays"
                      min="1"
                      max="90"
                      value={formData.deadlineDays}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        deadlineDays: parseInt(e.target.value) 
                      }))}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="form-actions">
              <button 
                type="button"
                className="btn-cancel"
                onClick={() => router.push('/portal/processes')}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="btn-submit"
                disabled={submitting || loading}
              >
                {submitting ? 'Criando...' : 'Criar Processo'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Seleção de Cidadão */}
      {showCitizenModal && (
        <div className="modal-overlay" onClick={() => setShowCitizenModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Selecionar Cidadão</h2>
              <button className="modal-close" onClick={() => setShowCitizenModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {searchingCitizen ? (
                <div className="modal-loading">
                  <div className="loading-spinner"></div>
                  <p>Buscando...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <p className="no-results">Nenhum cidadão encontrado</p>
              ) : (
                <div className="citizen-list">
                  {searchResults.map(citizen => (
                    <div 
                      key={citizen.id} 
                      className="citizen-item"
                      onClick={() => selectCitizen(citizen)}
                    >
                      <div className="citizen-info">
                        <div className="citizen-name">{citizen.name}</div>
                        {citizen.cpf && <div className="citizen-cpf">CPF: {citizen.cpf}</div>}
                      </div>
                      <div className="citizen-birth">
                        {new Date(citizen.birthDate).toLocaleDateString('pt-BR')}
                        {citizen.age && <span> ({citizen.age} anos)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCitizenModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}