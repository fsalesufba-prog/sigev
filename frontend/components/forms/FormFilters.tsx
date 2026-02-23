'use client';

import React, { useState } from 'react';
import './FormFilters.css';

interface FormFiltersProps {
  filters: {
    search: string;
    type: string;
    isActive: string;
  };
  onFilterChange: (filters: any) => void;
  isAdmin: boolean;
}

export default function FormFilters({ filters, onFilterChange, isAdmin }: FormFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ search: searchTerm });
  };

  const handleFilterChange = (key: string, value: string) => {
    onFilterChange({ [key]: value });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    onFilterChange({
      search: '',
      type: '',
      isActive: ''
    });
  };

  const hasActiveFilters = filters.type !== '' || filters.isActive !== '';

  const formTypes = [
    { value: 'INITIAL', label: 'Formulário Inicial' },
    { value: 'ESCUTA_ESPECIALIZADA', label: 'Escuta Especializada' },
    { value: 'RELATORIO_ENCAMINHAMENTO', label: 'Relatório de Encaminhamento' },
    { value: 'RELATORIO_ESCUTA', label: 'Relatório da Escuta' }
  ];

  return (
    <div className="form-filters">
      <form onSubmit={handleSearchSubmit} className="search-bar">
        <input
          type="text"
          placeholder="Buscar por nome ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-btn">
          🔍
        </button>
        {isAdmin && (
          <button
            type="button"
            className={`filters-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filtros avançados"
          >
            ⚙️
          </button>
        )}
      </form>

      {showFilters && isAdmin && (
        <div className="filters-panel">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Tipo de Formulário</label>
              <select 
                value={filters.type} 
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="">Todos</option>
                {formTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select 
                value={filters.isActive} 
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <button className="clear-filters" onClick={handleClearFilters}>
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}