'use client';

import React, { useState, useEffect } from 'react';
import './ProcessFilters.css';

interface Unit {
  id: string;
  name: string;
}

interface ProcessFiltersProps {
  filters: {
    search: string;
    status: string;
    priority: string;
    unitId: string;
  };
  onFilterChange: (filters: any) => void;
}

export default function ProcessFilters({ filters, onFilterChange }: ProcessFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [units, setUnits] = useState<Unit[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Unidades recebidas:', data);
        
        // Garantir que é um array
        let unitsList: Unit[] = [];
        
        if (Array.isArray(data)) {
          unitsList = data;
        } else if (data.data && Array.isArray(data.data)) {
          unitsList = data.data;
        } else if (data.units && Array.isArray(data.units)) {
          unitsList = data.units;
        } else {
          // Se for um objeto, tentar converter
          try {
            unitsList = Object.values(data).filter(item => item && typeof item === 'object' && 'id' in item) as Unit[];
          } catch {
            unitsList = [];
          }
        }
        
        console.log('Unidades processadas:', unitsList);
        setUnits(unitsList);
      } else {
        console.error('Erro ao buscar unidades:', response.status);
        setUnits([]);
      }
    } catch (error) {
      console.error('Erro ao buscar unidades:', error);
      setUnits([]);
    } finally {
      setLoading(false);
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
      status: '',
      priority: '',
      unitId: ''
    });
  };

  const hasActiveFilters = filters.status || filters.priority || filters.unitId;

  return (
    <div className="process-filters">
      <form onSubmit={handleSearchSubmit} className="search-bar">
        <input
          type="text"
          placeholder="Buscar por nome, CPF ou descrição..."
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
              <label>Status</label>
              <select 
                value={filters.status} 
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendente</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="COMPLETED">Concluído</option>
                <option value="ARCHIVED">Arquivado</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Prioridade</label>
              <select 
                value={filters.priority} 
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <option value="">Todas</option>
                <option value="URGENT">Urgente</option>
                <option value="HIGH">Alta</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Baixa</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Unidade</label>
              <select 
                value={filters.unitId} 
                onChange={(e) => handleFilterChange('unitId', e.target.value)}
                disabled={loading}
              >
                <option value="">Todas</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
              {loading && <small style={{ color: '#00D4FF', marginTop: '4px', display: 'block' }}>Carregando unidades...</small>}
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