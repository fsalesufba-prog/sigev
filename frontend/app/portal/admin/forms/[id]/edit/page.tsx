'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../../../hooks/useAuth';
import FormBuilder from '../../../../../../components/forms/FormBuilder';
import type { FormSection } from '../../../../../../components/forms/FormBuilder';
import './edit-form.css';

export default function EditFormPage({ params }: { params: { id: string } }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'INITIAL',
    description: ''
  });
  const [sections, setSections] = useState<FormSection[]>([]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && params.id) {
      fetchForm();
    }
  }, [user, params.id]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar formulário');

      const data = await response.json();
      setFormData({
        name: data.name,
        type: data.type,
        description: data.description || ''
      });
      setSections(data.config?.sections || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert('Nome do formulário é obrigatório');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');

      const payload = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        config: { sections }
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar formulário');
      }

      router.push('/portal/admin/forms');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="edit-form-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) return null;

  if (error) {
    return (
      <div className="edit-form-error">
        <p>{error}</p>
        <button onClick={() => router.push('/portal/admin/forms')}>Voltar</button>
      </div>
    );
  }

  return (
    <div className="edit-form-page">
      <div className="edit-form-header">
        <h1>Editar Formulário</h1>
        <div className="header-actions">
          <button
            className="btn-cancel"
            onClick={() => router.push('/portal/admin/forms')}
          >
            Cancelar
          </button>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Formulário'}
          </button>
        </div>
      </div>

      <div className="edit-form-content">
        <div className="form-metadata">
          <div className="metadata-group">
            <label>Nome do Formulário *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Formulário Inicial"
            />
          </div>
          <div className="metadata-group">
            <label>Tipo de Formulário *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="INITIAL">Formulário Inicial</option>
              <option value="ESCUTA_ESPECIALIZADA">Escuta Especializada</option>
              <option value="RELATORIO_ENCAMINHAMENTO">Relatório de Encaminhamento</option>
              <option value="RELATORIO_ESCUTA">Relatório da Escuta</option>
            </select>
          </div>
          <div className="metadata-group">
            <label>Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do formulário"
              rows={2}
            />
          </div>
        </div>

        <FormBuilder
          initialSections={sections}
          onChange={setSections}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}