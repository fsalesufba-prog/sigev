'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import './citizen-detail.css';

interface CitizenDetail {
  id: string;
  name: string;
  birthDate: string;
  gender?: string;
  cpf?: string;
  rg?: string;
  motherName?: string;
  fatherName?: string;
  motherCpf?: string;
  fatherCpf?: string;
  address?: string;
  phone?: string;
  email?: string;
  education?: string;
  hasDisability: boolean;
  disabilityType?: string;
  hasHealthProblem: boolean;
  healthProblemDesc?: string;
  usesMedication: boolean;
  medicationDesc?: string;
  age: number;
  processes: Array<{
    id: string;
    status: string;
    priority: string;
    createdAt: string;
    unit: string;
    professional: string;
    violence: string;
  }>;
}

export default function CitizenDetailPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const citizenId = params.id as string;
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [citizen, setCitizen] = useState<CitizenDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && citizenId) {
      fetchCitizenDetails();
    }
  }, [isAuthenticated, citizenId]);

  const fetchCitizenDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/citizens/${citizenId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        router.push('/auth/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Erro ao carregar cidadão');
      }

      const data = await response.json();
      setCitizen(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getGenderText = (gender?: string) => {
    switch (gender) {
      case 'M': return 'Masculino';
      case 'F': return 'Feminino';
      case 'OTHER': return 'Outro';
      default: return 'Não informado';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'IN_PROGRESS': return 'Em Andamento';
      case 'COMPLETED': return 'Concluído';
      case 'ARCHIVED': return 'Arquivado';
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'Urgente';
      case 'HIGH': return 'Alta';
      case 'NORMAL': return 'Normal';
      case 'LOW': return 'Baixa';
      default: return priority;
    }
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

  if (error || !citizen) {
    return (
      <div className="citizens-container">
        
        <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          
          <div className="content-wrapper">
            <div className="error-state">
              <p>{error || 'Cidadão não encontrado'}</p>
              <button onClick={() => router.push('/portal/citizens')}>Voltar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="citizens-container">
      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        
        
        <div className="content-wrapper">
          <div className="detail-header">
            <button className="back-button" onClick={() => router.push('/portal/citizens')}>
              ← Voltar
            </button>
            <Link href={`/portal/processes/new?citizenId=${citizen.id}`} className="new-process-button">
              + Novo Processo
            </Link>
          </div>

          <div className="citizen-profile">
            {/* Cabeçalho do Perfil */}
            <div className="profile-header">
              <div className="profile-avatar-large">
                {citizen.name.charAt(0).toUpperCase()}
              </div>
              <div className="profile-title">
                <h1 className="profile-name">{citizen.name}</h1>
                <p className="profile-meta">
                  {citizen.age} anos • {getGenderText(citizen.gender)} • {citizen.cpf || 'Sem CPF'}
                </p>
              </div>

            </div>

            {/* Grid de Informações */}
            <div className="profile-grid">
              {/* Informações Pessoais */}
              <div className="detail-card">
                <h2 className="card-title">Informações Pessoais</h2>
                <div className="info-list">
                  <div className="info-row">
                    <span className="info-label">Nome Completo</span>
                    <span className="info-value">{citizen.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Data de Nascimento</span>
                    <span className="info-value">{formatDate(citizen.birthDate)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Idade</span>
                    <span className="info-value">{citizen.age} anos</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Gênero</span>
                    <span className="info-value">{getGenderText(citizen.gender)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">CPF</span>
                    <span className="info-value">{citizen.cpf || 'Não informado'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">RG</span>
                    <span className="info-value">{citizen.rg || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              {/* Filiação */}
              <div className="detail-card">
                <h2 className="card-title">Filiação</h2>
                <div className="info-list">
                  <div className="info-row">
                    <span className="info-label">Nome da Mãe</span>
                    <span className="info-value">{citizen.motherName || 'Não informado'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">CPF da Mãe</span>
                    <span className="info-value">{citizen.motherCpf || 'Não informado'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Nome do Pai</span>
                    <span className="info-value">{citizen.fatherName || 'Não informado'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">CPF do Pai</span>
                    <span className="info-value">{citizen.fatherCpf || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              {/* Contato e Endereço */}
              <div className="detail-card">
                <h2 className="card-title">Contato e Endereço</h2>
                <div className="info-list">
                  <div className="info-row">
                    <span className="info-label">Endereço</span>
                    <span className="info-value">{citizen.address || 'Não informado'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Telefone</span>
                    <span className="info-value">{citizen.phone || 'Não informado'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">E-mail</span>
                    <span className="info-value">{citizen.email || 'Não informado'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Escolaridade</span>
                    <span className="info-value">{citizen.education || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              {/* Saúde */}
              <div className="detail-card">
                <h2 className="card-title">Saúde</h2>
                <div className="info-list">
                  <div className="info-row">
                    <span className="info-label">Deficiência</span>
                    <span className="info-value">
                      {citizen.hasDisability ? citizen.disabilityType || 'Sim' : 'Não'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Problema de Saúde</span>
                    <span className="info-value">
                      {citizen.hasHealthProblem ? citizen.healthProblemDesc || 'Sim' : 'Não'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Medicação</span>
                    <span className="info-value">
                      {citizen.usesMedication ? citizen.medicationDesc || 'Sim' : 'Não'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Processos Relacionados */}
            <div className="detail-card">
              <h2 className="card-title">Processos Relacionados</h2>
              {citizen.processes.length === 0 ? (
                <p className="empty-message">Nenhum processo encontrado para este cidadão</p>
              ) : (
                <div className="related-processes">
                  <table className="process-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Violência</th>
                        <th>Unidade</th>
                        <th>Profissional</th>
                        <th>Status</th>
                        <th>Prioridade</th>
                        <th>Data</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {citizen.processes.map((process) => (
                        <tr 
                          key={process.id}
                          onClick={() => router.push(`/portal/processes/${process.id}`)}
                          className="process-row"
                        >
                          <td className="process-id">{process.id.substring(0, 8)}...</td>
                          <td>{process.violence}</td>
                          <td>{process.unit}</td>
                          <td>{process.professional}</td>
                          <td>
                            <span className={`status-badge ${process.status.toLowerCase()}`}>
                              {getStatusText(process.status)}
                            </span>
                          </td>
                          <td>
                            <span className={`priority-badge ${process.priority.toLowerCase()}`}>
                              {getPriorityText(process.priority)}
                            </span>
                          </td>
                          <td>{formatDate(process.createdAt)}</td>
                          <td className="action-col">→</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}