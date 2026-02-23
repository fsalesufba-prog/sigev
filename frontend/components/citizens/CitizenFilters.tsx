'use client';

import React, { useState } from 'react';
import './CitizenFilters.css';

interface CitizenFiltersProps {
  filters: {
    search: string;
    gender: string;
    hasDisability: string;
    hasHealthProblem: string;
  };
  onFilterChange: (filters: any) => void;
}

export default function CitizenFilters({ filters, onFilterChange }: CitizenFiltersProps) {
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
      gender: '',
      hasDisability: '',
      hasHealthProblem: ''
    });
  };

  const hasActiveFilters = filters.gender || filters.hasDisability || filters.hasHealthProblem;

  return (
    <div className="citizen-filters">
      <form onSubmit={handleSearchSubmit} className="search-bar">
        <input
          type="text"
          placeholder="Buscar por nome, CPF ou nome da mãe..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-btn">
          🔍
        </button>
        <button
          type="button"
          className={`filters-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
          title="Filtros avançados"
        >
          ⚙️
        </button>
      </form>

      {showFilters && (
        <div className="filters-panel">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Gênero</label>
              <select 
                value={filters.gender} 
                onChange={(e) => handleFilterChange('gender', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Deficiência</label>
              <select 
                value={filters.hasDisability} 
                onChange={(e) => handleFilterChange('hasDisability', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Com deficiência</option>
                <option value="false">Sem deficiência</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Problema de Saúde</label>
              <select 
                value={filters.hasHealthProblem} 
                onChange={(e) => handleFilterChange('hasHealthProblem', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Com problema</option>
                <option value="false">Sem problema</option>
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