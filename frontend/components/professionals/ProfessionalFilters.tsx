'use client';

import React, { useState, useEffect } from 'react';
import './ProfessionalFilters.css';

interface Unit {
  id: string;
  name: string;
}

interface ProfessionalFiltersProps {
  filters: {
    search: string;
    specialty: string;
    unitId: string;
    status: string;
  };
  onFilterChange: (filters: any) => void;
}

export default function ProfessionalFilters({ filters, onFilterChange }: ProfessionalFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSpecialties();
    fetchUnits();
  }, []);

  const fetchSpecialties = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals/specialties`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSpecialties(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erro ao buscar especialidades:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals/units/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnits(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erro ao buscar unidades:', error);
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
      specialty: '',
      unitId: '',
      status: ''
    });
  };

  const hasActiveFilters = filters.specialty || filters.unitId || filters.status;

  return (
    <div className="professional-filters">
      <form onSubmit={handleSearchSubmit} className="search-bar">
        <input
          type="text"
          placeholder="Buscar por nome, email, CPF ou registro..."
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
              <label>Especialidade</label>
              <select 
                value={filters.specialty} 
                onChange={(e) => handleFilterChange('specialty', e.target.value)}
              >
                <option value="">Todas</option>
                {specialties.map(specialty => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Unidade</label>
              <select 
                value={filters.unitId} 
                onChange={(e) => handleFilterChange('unitId', e.target.value)}
              >
                <option value="">Todas</option>
                {units.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
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
                <option value="">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
                <option value="locked">Bloqueados</option>
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