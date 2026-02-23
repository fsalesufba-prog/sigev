'use client';

import React, { useState } from 'react';
import './FormBuilder.css';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'radio' | 'select' | 'email' | 'phone' | 'cpf' | 'address';
  label: string;
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  order: number;
  options?: FieldOption[];
  defaultValue?: any;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: FormField[];
}

interface FormBuilderProps {
  initialSections?: FormSection[];
  onChange?: (sections: FormSection[]) => void;
  onSave?: () => void;
}

export default function FormBuilder({ initialSections = [], onChange, onSave }: FormBuilderProps) {
  const [sections, setSections] = useState<FormSection[]>(initialSections);
  const [draggedSection, setDraggedSection] = useState<number | null>(null);
  const [draggedField, setDraggedField] = useState<{ sectionIdx: number; fieldIdx: number } | null>(null);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Partial<FormSection>>({});
  const [editingField, setEditingField] = useState<Partial<FormField>>({});
  const [editingSectionIdx, setEditingSectionIdx] = useState<number>(-1);
  const [editingFieldIdx, setEditingFieldIdx] = useState<number>(-1);

  const fieldTypes = [
    { value: 'text', label: 'Texto (curto)', icon: '📝' },
    { value: 'textarea', label: 'Texto (longo)', icon: '📄' },
    { value: 'number', label: 'Número', icon: '🔢' },
    { value: 'date', label: 'Data', icon: '📅' },
    { value: 'checkbox', label: 'Checkbox', icon: '✅' },
    { value: 'radio', label: 'Opção única', icon: '⚪' },
    { value: 'select', label: 'Lista suspensa', icon: '📋' },
    { value: 'email', label: 'E-mail', icon: '✉️' },
    { value: 'phone', label: 'Telefone', icon: '📞' },
    { value: 'cpf', label: 'CPF', icon: '🆔' },
    { value: 'address', label: 'Endereço', icon: '🏠' }
  ];

  const handleSectionsChange = (newSections: FormSection[]) => {
    setSections(newSections);
    if (onChange) onChange(newSections);
  };

  // ========== SEÇÕES ==========
  const addSection = () => {
    setEditingSection({
      title: '',
      description: '',
      order: sections.length + 1
    });
    setEditingSectionIdx(-1);
    setShowSectionModal(true);
  };

  const editSection = (index: number) => {
    setEditingSection(sections[index]);
    setEditingSectionIdx(index);
    setShowSectionModal(true);
  };

  const deleteSection = (index: number) => {
    if (confirm('Tem certeza que deseja excluir esta seção?')) {
      const newSections = sections.filter((_, i) => i !== index).map((s, idx) => ({
        ...s,
        order: idx + 1
      }));
      handleSectionsChange(newSections);
    }
  };

  const saveSection = () => {
    if (!editingSection.title) {
      alert('Título da seção é obrigatório');
      return;
    }

    const newSection: FormSection = {
      id: editingSection.id || `section_${Date.now()}`,
      title: editingSection.title!,
      description: editingSection.description,
      order: editingSection.order || (editingSectionIdx === -1 ? sections.length + 1 : editingSection.order!),
      fields: editingSection.fields || []
    };

    let newSections: FormSection[];
    if (editingSectionIdx === -1) {
      newSections = [...sections, newSection];
    } else {
      newSections = sections.map((s, i) => i === editingSectionIdx ? newSection : s);
    }

    handleSectionsChange(newSections);
    setShowSectionModal(false);
  };

  // ========== CAMPOS ==========
  const addField = (sectionIdx: number, fieldType: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: fieldType as any,
      label: 'Novo campo',
      placeholder: '',
      required: false,
      enabled: true,
      order: sections[sectionIdx].fields.length + 1,
      options: (fieldType === 'radio' || fieldType === 'select') ? [] : undefined
    };

    const newSections = [...sections];
    newSections[sectionIdx].fields.push(newField);
    handleSectionsChange(newSections);
  };

  const editField = (sectionIdx: number, fieldIdx: number) => {
    setEditingField(sections[sectionIdx].fields[fieldIdx]);
    setEditingSectionIdx(sectionIdx);
    setEditingFieldIdx(fieldIdx);
    setShowFieldModal(true);
  };

  const deleteField = (sectionIdx: number, fieldIdx: number) => {
    if (confirm('Tem certeza que deseja excluir este campo?')) {
      const newSections = [...sections];
      newSections[sectionIdx].fields = newSections[sectionIdx].fields
        .filter((_, i) => i !== fieldIdx)
        .map((f, idx) => ({ ...f, order: idx + 1 }));
      handleSectionsChange(newSections);
    }
  };

  const saveField = () => {
    if (!editingField.label) {
      alert('Label do campo é obrigatório');
      return;
    }

    const updatedField: FormField = {
      id: editingField.id || `field_${Date.now()}`,
      type: editingField.type!,
      label: editingField.label!,
      placeholder: editingField.placeholder,
      required: editingField.required || false,
      enabled: editingField.enabled !== false,
      order: editingField.order || (editingFieldIdx === -1 ? sections[editingSectionIdx].fields.length + 1 : editingField.order!),
      options: editingField.options,
      defaultValue: editingField.defaultValue
    };

    const newSections = [...sections];
    if (editingFieldIdx === -1) {
      newSections[editingSectionIdx].fields.push(updatedField);
    } else {
      newSections[editingSectionIdx].fields[editingFieldIdx] = updatedField;
    }

    // Reordenar
    newSections[editingSectionIdx].fields = newSections[editingSectionIdx].fields
      .map((f, idx) => ({ ...f, order: idx + 1 }));

    handleSectionsChange(newSections);
    setShowFieldModal(false);
  };

  // ========== DRAG AND DROP ==========
  const handleDragStart = (e: React.DragEvent, type: 'section' | 'field', index: number, fieldIdx?: number) => {
    if (type === 'section') {
      setDraggedSection(index);
      e.dataTransfer.setData('text/plain', `section:${index}`);
    } else if (type === 'field' && fieldIdx !== undefined) {
      setDraggedField({ sectionIdx: index, fieldIdx });
      e.dataTransfer.setData('text/plain', `field:${index}:${fieldIdx}`);
    }
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedSection(null);
    setDraggedField(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropSection = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    
    if (data.startsWith('section:')) {
      const sourceIdx = parseInt(data.split(':')[1]);
      if (sourceIdx === targetIdx) return;

      const newSections = [...sections];
      const [movedSection] = newSections.splice(sourceIdx, 1);
      newSections.splice(targetIdx, 0, movedSection);
      
      // Reordenar
      newSections.forEach((s, idx) => { s.order = idx + 1; });
      
      handleSectionsChange(newSections);
    }
  };

  const handleDropField = (e: React.DragEvent, targetSectionIdx: number, targetFieldIdx?: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    
    if (data.startsWith('field:')) {
      const [_, sourceSectionIdx, sourceFieldIdx] = data.split(':').map(Number);
      if (sourceSectionIdx === targetSectionIdx && sourceFieldIdx === targetFieldIdx) return;

      const newSections = [...sections];
      const [movedField] = newSections[sourceSectionIdx].fields.splice(sourceFieldIdx, 1);
      
      if (targetFieldIdx !== undefined) {
        newSections[targetSectionIdx].fields.splice(targetFieldIdx, 0, movedField);
      } else {
        newSections[targetSectionIdx].fields.push(movedField);
      }
      
      // Reordenar campos da seção de origem
      newSections[sourceSectionIdx].fields = newSections[sourceSectionIdx].fields
        .map((f, idx) => ({ ...f, order: idx + 1 }));
      
      // Reordenar campos da seção de destino
      newSections[targetSectionIdx].fields = newSections[targetSectionIdx].fields
        .map((f, idx) => ({ ...f, order: idx + 1 }));
      
      handleSectionsChange(newSections);
    }
  };

  // ========== ADICIONAR OPÇÃO ==========
  const addOption = () => {
    const options = editingField.options || [];
    const newOption = {
      value: `option_${options.length + 1}`,
      label: `Opção ${options.length + 1}`
    };
    setEditingField({
      ...editingField,
      options: [...options, newOption]
    });
  };

  const updateOption = (idx: number, field: 'value' | 'label', value: string) => {
    const options = [...(editingField.options || [])];
    options[idx] = { ...options[idx], [field]: value };
    setEditingField({ ...editingField, options });
  };

  const removeOption = (idx: number) => {
    const options = (editingField.options || []).filter((_, i) => i !== idx);
    setEditingField({ ...editingField, options });
  };

  return (
    <div className="form-builder">
      {/* TOOLBAR LATERAL */}
      <div className="builder-toolbar">
        <div className="toolbar-title">Tipos de Campo</div>
        <div className="field-types">
          {fieldTypes.map(type => (
            <div
              key={type.value}
              className="field-type-btn"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', `new-field:${type.value}`);
              }}
            >
              <span className="icon">{type.icon}</span>
              <span>{type.label}</span>
            </div>
          ))}
        </div>

        <div className="section-actions">
          <button className="btn-add-section" onClick={addSection}>
            <span>+</span> Adicionar Seção
          </button>
        </div>
      </div>

      {/* ÁREA DE CONSTRUÇÃO */}
      <div className="builder-canvas">
        <div className="canvas-header">
          <h3>Estrutura do Formulário</h3>
          {onSave && (
            <button className="btn-preview" onClick={onSave}>
              Salvar Formulário
            </button>
          )}
        </div>

        {sections.length === 0 ? (
          <div className="empty-section">
            <p>Clique em "Adicionar Seção" para começar</p>
          </div>
        ) : (
          <div className="sections-list">
            {sections.map((section, sectionIdx) => (
              <div
                key={section.id}
                className="section-card"
                draggable
                onDragStart={(e) => handleDragStart(e, 'section', sectionIdx)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropSection(e, sectionIdx)}
              >
                <div className="section-header">
                  <span className="section-drag">⋮⋮</span>
                  <span className="section-title">{section.title}</span>
                  {section.description && (
                    <span className="section-badge">descrição</span>
                  )}
                  <div className="section-actions">
                    <button
                      className="section-action-btn"
                      onClick={() => editSection(sectionIdx)}
                      title="Editar seção"
                    >
                      ✏️
                    </button>
                    <button
                      className="section-action-btn delete"
                      onClick={() => deleteSection(sectionIdx)}
                      title="Excluir seção"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div
                  className="fields-list"
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    const data = e.dataTransfer.getData('text/plain');
                    if (data.startsWith('new-field:')) {
                      const fieldType = data.split(':')[1];
                      addField(sectionIdx, fieldType);
                    } else {
                      handleDropField(e, sectionIdx);
                    }
                  }}
                >
                  {section.fields.length === 0 ? (
                    <div className="empty-field">
                      Arraste campos para cá
                    </div>
                  ) : (
                    section.fields.map((field, fieldIdx) => (
                      <div
                        key={field.id}
                        className="field-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'field', sectionIdx, fieldIdx)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropField(e, sectionIdx, fieldIdx);
                        }}
                      >
                        <span className="field-icon">
                          {fieldTypes.find(t => t.value === field.type)?.icon || '📝'}
                        </span>
                        <div className="field-content">
                          <span className="field-label">{field.label}</span>
                          <div className="field-meta">
                            <span>{field.type}</span>
                            {field.required && (
                              <span className="field-required">* obrigatório</span>
                            )}
                          </div>
                        </div>
                        <div className="field-actions">
                          <button
                            className="field-action-btn"
                            onClick={() => editField(sectionIdx, fieldIdx)}
                            title="Editar campo"
                          >
                            ✏️
                          </button>
                          <button
                            className="field-action-btn delete"
                            onClick={() => deleteField(sectionIdx, fieldIdx)}
                            title="Excluir campo"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE SEÇÃO */}
      {showSectionModal && (
        <div className="modal-overlay" onClick={() => setShowSectionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSectionIdx === -1 ? 'Nova Seção' : 'Editar Seção'}</h2>
              <button className="modal-close" onClick={() => setShowSectionModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Título da Seção *</label>
                <input
                  type="text"
                  value={editingSection.title || ''}
                  onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                  placeholder="Ex: Dados Pessoais"
                />
              </div>
              <div className="form-group">
                <label>Descrição (opcional)</label>
                <textarea
                  value={editingSection.description || ''}
                  onChange={(e) => setEditingSection({ ...editingSection, description: e.target.value })}
                  placeholder="Instruções para esta seção"
                  rows={2}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowSectionModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={saveSection}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CAMPO */}
      {showFieldModal && (
        <div className="modal-overlay" onClick={() => setShowFieldModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingFieldIdx === -1 ? 'Novo Campo' : 'Editar Campo'}</h2>
              <button className="modal-close" onClick={() => setShowFieldModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tipo de Campo</label>
                <select
                  value={editingField.type || 'text'}
                  onChange={(e) => setEditingField({ ...editingField, type: e.target.value as any })}
                >
                  {fieldTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Label do Campo *</label>
                <input
                  type="text"
                  value={editingField.label || ''}
                  onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                  placeholder="Ex: Nome Completo"
                />
              </div>

              <div className="form-group">
                <label>Placeholder (opcional)</label>
                <input
                  type="text"
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                  placeholder="Ex: Digite seu nome completo"
                />
              </div>

              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="field-required"
                  checked={editingField.required || false}
                  onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                />
                <label htmlFor="field-required">Campo obrigatório</label>
              </div>

              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="field-enabled"
                  checked={editingField.enabled !== false}
                  onChange={(e) => setEditingField({ ...editingField, enabled: e.target.checked })}
                />
                <label htmlFor="field-enabled">Campo habilitado</label>
              </div>

              {(editingField.type === 'radio' || editingField.type === 'select') && (
                <div className="form-group">
                  <label>Opções</label>
                  <div className="options-list">
                    {(editingField.options || []).map((opt, idx) => (
                      <div key={idx} className="option-item">
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => updateOption(idx, 'label', e.target.value)}
                          placeholder="Label"
                        />
                        <input
                          type="text"
                          value={opt.value}
                          onChange={(e) => updateOption(idx, 'value', e.target.value)}
                          placeholder="Valor"
                        />
                        <button
                          className="field-action-btn delete"
                          onClick={() => removeOption(idx)}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    <button className="btn-add-option" onClick={addOption}>
                      + Adicionar opção
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowFieldModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={saveField}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}