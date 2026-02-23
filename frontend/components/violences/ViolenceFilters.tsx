'use client';

import React, { useState } from 'react';
import './ViolenceFilters.css';

interface ViolenceFiltersProps {
  filters: {
    search: string;
    isActive: string;
  };
  onFilterChange: (filters: any) => void;
  isAdmin: boolean;
}

export default function ViolenceFilters({ filters, onFilterChange, isAdmin }: ViolenceFiltersProps) {
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
      isActive: ''
    });
  };

  const hasActiveFilters = filters.isActive !== '';

  return (
    <div className="violence-filters">
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