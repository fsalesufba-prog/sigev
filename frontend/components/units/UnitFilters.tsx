'use client';

import React, { useState, useEffect } from 'react';
import './UnitFilters.css';

interface UnitType {
  id: string;
  description: string;
}

interface UnitFiltersProps {
  filters: {
    search: string;
    typeId: string;
    status: string;
  };
  onFilterChange: (filters: any) => void;
}

export default function UnitFilters({ filters, onFilterChange }: UnitFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [types, setTypes] = useState<UnitType[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units/types`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTypes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erro ao buscar tipos:', error);
    }
  };

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
      typeId: '',
      status: ''
    });
  };

  const hasActiveFilters = filters.typeId || filters.status;

  return (
    <div className="unit-filters">
      <form onSubmit={handleSearchSubmit} className="search-bar">
        <input
          type="text"
          placeholder="Buscar por nome, email ou telefone..."
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
              <label>Tipo de Unidade</label>
              <select 
                value={filters.typeId} 
                onChange={(e) => handleFilterChange('typeId', e.target.value)}
              >
                <option value="">Todos</option>
                {types.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select 
                value={filters.status} 
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Todas</option>
                <option value="active">Ativas</option>
                <option value="inactive">Inativas</option>
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