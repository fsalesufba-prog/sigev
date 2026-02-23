// frontend/app/portal/citizens/new/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import './new-citizen.css';

interface FormData {
  name: string;
  birthDate: string;
  gender: 'M' | 'F' | 'OTHER' | '';
  cpf: string;
  rg: string;
  motherName: string;
  fatherName: string;
  motherCpf: string;
  fatherCpf: string;
  address: string;
  phone: string;
  email: string;
  education: string;
  hasDisability: boolean;
  disabilityType: string;
  hasHealthProblem: boolean;
  healthProblemDesc: string;
  usesMedication: boolean;
  medicationDesc: string;
}

export default function NewCitizenPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basico' | 'filiacao' | 'contato' | 'saude'>('basico');

  const [formData, setFormData] = useState<FormData>({
    name: '',
    birthDate: '',
    gender: '',
    cpf: '',
    rg: '',
    motherName: '',
    fatherName: '',
    motherCpf: '',
    fatherCpf: '',
    address: '',
    phone: '',
    email: '',
    education: '',
    hasDisability: false,
    disabilityType: '',
    hasHealthProblem: false,
    healthProblemDesc: '',
    usesMedication: false,
    medicationDesc: ''
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Formatar CPF (000.000.000-00)
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  // Formatar telefone ((00) 00000-0000)
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 14);
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 15);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
      
      // Se desmarcar campos dependentes, limpar
      if (name === 'hasDisability' && !checked) {
        setFormData(prev => ({ ...prev, disabilityType: '' }));
      }
      if (name === 'hasHealthProblem' && !checked) {
        setFormData(prev => ({ ...prev, healthProblemDesc: '' }));
      }
      if (name === 'usesMedication' && !checked) {
        setFormData(prev => ({ ...prev, medicationDesc: '' }));
      }
    } else {
      // Aplicar máscaras
      let formattedValue = value;
      if (name === 'cpf') formattedValue = formatCPF(value);
      if (name === 'phone') formattedValue = formatPhone(value);
      if (name === 'motherCpf') formattedValue = formatCPF(value);
      if (name === 'fatherCpf') formattedValue = formatCPF(value);

      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      alert('Nome é obrigatório');
      return false;
    }
    if (!formData.birthDate) {
      alert('Data de nascimento é obrigatória');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('accessToken');
      
      // Preparar dados para envio
      const dataToSend = {
        ...formData,
        birthDate: new Date(formData.birthDate).toISOString(),
        gender: formData.gender || undefined,
        cpf: formData.cpf.replace(/\D/g, '') || undefined,
        rg: formData.rg || undefined,
        motherCpf: formData.motherCpf.replace(/\D/g, '') || undefined,
        fatherCpf: formData.fatherCpf.replace(/\D/g, '') || undefined,
        phone: formData.phone.replace(/\D/g, '') || undefined,
        hasDisability: formData.hasDisability,
        disabilityType: formData.hasDisability ? formData.disabilityType : undefined,
        hasHealthProblem: formData.hasHealthProblem,
        healthProblemDesc: formData.hasHealthProblem ? formData.healthProblemDesc : undefined,
        usesMedication: formData.usesMedication,
        medicationDesc: formData.usesMedication ? formData.medicationDesc : undefined
      };

      console.log('Enviando dados:', dataToSend);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/citizens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar cidadão');
      }

      const newCitizen = await response.json();
      
      setSuccess('Cidadão cadastrado com sucesso!');
      
      // Verificar se tem returnTo na URL
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get('returnTo');
      
      setTimeout(() => {
        if (returnTo) {
          router.push(returnTo);
        } else {
          router.push(`/portal/citizens/${newCitizen.id}`);
        }
      }, 1500);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const educationLevels = [
    'Não alfabetizado',
    'Ensino Fundamental Incompleto',
    'Ensino Fundamental Completo',
    'Ensino Médio Incompleto',
    'Ensino Médio Completo',
    'Superior Incompleto',
    'Superior Completo',
    'Pós-graduação',
    'Mestrado',
    'Doutorado'
  ];

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

  return (
    <div className="new-citizen-container">
      <div className="new-citizen-header">
        <h1>Novo Cidadão</h1>
        <p className="subtitle">Cadastre um novo cidadão no sistema</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="success-message">
          <span className="success-icon">✅</span>
          <p>{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="new-citizen-form">
        {/* Tabs */}
        <div className="form-tabs">
          <button
            type="button"
            className={`tab ${activeTab === 'basico' ? 'active' : ''}`}
            onClick={() => setActiveTab('basico')}
          >
            📋 Dados Básicos
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'filiacao' ? 'active' : ''}`}
            onClick={() => setActiveTab('filiacao')}
          >
            👪 Filiação
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'contato' ? 'active' : ''}`}
            onClick={() => setActiveTab('contato')}
          >
            📞 Contato
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'saude' ? 'active' : ''}`}
            onClick={() => setActiveTab('saude')}
          >
            🏥 Saúde
          </button>
        </div>

        {/* Aba: Dados Básicos */}
        {activeTab === 'basico' && (
          <div className="tab-content">
            <div className="form-group required">
              <label htmlFor="name">Nome Completo</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Digite o nome completo"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group required">
                <label htmlFor="birthDate">Data de Nascimento</label>
                <input
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender">Sexo</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                >
                  <option value="">Selecione...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cpf">CPF</label>
                <input
                  type="text"
                  id="cpf"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              <div className="form-group">
                <label htmlFor="rg">RG</label>
                <input
                  type="text"
                  id="rg"
                  name="rg"
                  value={formData.rg}
                  onChange={handleInputChange}
                  placeholder="RG"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="education">Escolaridade</label>
              <select
                id="education"
                name="education"
                value={formData.education}
                onChange={handleInputChange}
              >
                <option value="">Selecione...</option>
                {educationLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Aba: Filiação */}
        {activeTab === 'filiacao' && (
          <div className="tab-content">
            <div className="form-group">
              <label htmlFor="motherName">Nome da Mãe</label>
              <input
                type="text"
                id="motherName"
                name="motherName"
                value={formData.motherName}
                onChange={handleInputChange}
                placeholder="Nome completo da mãe"
              />
            </div>

            <div className="form-group">
              <label htmlFor="motherCpf">CPF da Mãe</label>
              <input
                type="text"
                id="motherCpf"
                name="motherCpf"
                value={formData.motherCpf}
                onChange={handleInputChange}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div className="form-group">
              <label htmlFor="fatherName">Nome do Pai</label>
              <input
                type="text"
                id="fatherName"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleInputChange}
                placeholder="Nome completo do pai"
              />
            </div>

            <div className="form-group">
              <label htmlFor="fatherCpf">CPF do Pai</label>
              <input
                type="text"
                id="fatherCpf"
                name="fatherCpf"
                value={formData.fatherCpf}
                onChange={handleInputChange}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
          </div>
        )}

        {/* Aba: Contato */}
        {activeTab === 'contato' && (
          <div className="tab-content">
            <div className="form-group">
              <label htmlFor="address">Endereço</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Rua, número, bairro, cidade, CEP"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone">Telefone</label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">E-mail</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
          </div>
        )}

        {/* Aba: Saúde */}
        {activeTab === 'saude' && (
          <div className="tab-content">
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="hasDisability"
                  checked={formData.hasDisability}
                  onChange={handleInputChange}
                />
                <span>Possui deficiência física?</span>
              </label>
            </div>

            {formData.hasDisability && (
              <div className="form-group">
                <label htmlFor="disabilityType">Qual deficiência?</label>
                <input
                  type="text"
                  id="disabilityType"
                  name="disabilityType"
                  value={formData.disabilityType}
                  onChange={handleInputChange}
                  placeholder="Descreva a deficiência"
                />
              </div>
            )}

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="hasHealthProblem"
                  checked={formData.hasHealthProblem}
                  onChange={handleInputChange}
                />
                <span>Possui problema de saúde?</span>
              </label>
            </div>

            {formData.hasHealthProblem && (
              <div className="form-group">
                <label htmlFor="healthProblemDesc">Descreva o problema</label>
                <textarea
                  id="healthProblemDesc"
                  name="healthProblemDesc"
                  value={formData.healthProblemDesc}
                  onChange={handleInputChange}
                  placeholder="Descreva o problema de saúde"
                  rows={3}
                />
              </div>
            )}

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="usesMedication"
                  checked={formData.usesMedication}
                  onChange={handleInputChange}
                />
                <span>Usa medicamento?</span>
              </label>
            </div>

            {formData.usesMedication && (
              <div className="form-group">
                <label htmlFor="medicationDesc">Quais medicamentos?</label>
                <textarea
                  id="medicationDesc"
                  name="medicationDesc"
                  value={formData.medicationDesc}
                  onChange={handleInputChange}
                  placeholder="Liste os medicamentos utilizados"
                  rows={3}
                />
              </div>
            )}
          </div>
        )}

        {/* Botões de Ação */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => {
              const returnTo = new URLSearchParams(window.location.search).get('returnTo');
              if (returnTo) {
                router.push(returnTo);
              } else {
                router.push('/portal/citizens');
              }
            }}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={submitting}
          >
            {submitting ? 'Salvando...' : 'Salvar Cidadão'}
          </button>
        </div>
      </form>
    </div>
  );
}