'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../../../hooks/useAuth';
import FormBuilder from '../../../../../../components/forms/FormBuilder';
import type { FormSection } from '../../../../../../components/forms/FormBuilder';
import '../edit-form.css';

export default function NewFormPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.code === 'DUPLICATE_ENTRY') {
          throw new Error('Já existe um formulário com este nome e tipo');
        }
        throw new Error(error.error || 'Erro ao criar formulário');
      }

      router.push('/portal/admin/forms');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="edit-form-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="edit-form-page">
      <div className="edit-form-header">
        <h1>Novo Formulário</h1>
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