'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CitizenFilters from '../../../components/citizens/CitizenFilters';
import CitizenTable from '../../../components/citizens/CitizenTable';
import './citizens.css';

interface Citizen {
  id: string;
  name: string;
  birthDate: string;
  gender?: string;
  cpf?: string;
  age: number;
  address?: string;
  phone?: string;
  processCount: number;
}

export default function CitizensPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    gender: '',
    hasDisability: '',
    hasHealthProblem: '',
    page: 1
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCitizens();
    }
  }, [isAuthenticated, filters]);

  const fetchCitizens = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setError('Token de autenticação não encontrado');
        setLoading(false);
        return;
      }

      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.gender) queryParams.append('gender', filters.gender);
      if (filters.hasDisability) queryParams.append('hasDisability', filters.hasDisability);
      if (filters.hasHealthProblem) queryParams.append('hasHealthProblem', filters.hasHealthProblem);
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', '10');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/citizens?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        router.push('/auth/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao carregar cidadãos');
      }

      const data = await response.json();
      setCitizens(data.data || []);
      setPagination({
        page: data.page || 1,
        limit: data.limit || 10,
        total: data.total || 0,
        totalPages: data.totalPages || 0
      });

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

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
    <div className="citizens-container">
      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

        
        <div className="content-wrapper">
          <div className="page-header">
            <div>
              <h1 className="page-title">Cidadãos</h1>
              <p className="page-subtitle">
                Gerencie os cidadãos atendidos pelo sistema
              </p>
            </div>
            <Link href="/portal/citizens/new" className="btn-primary">
              <span>+</span> Novo Cidadão
            </Link>
          </div>

          <CitizenFilters 
            filters={filters} 
            onFilterChange={(newFilters) => setFilters({ ...filters, ...newFilters, page: 1 })}
          />

          {loading ? (
            <div className="loading-state">Carregando cidadãos...</div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={fetchCitizens}>Tentar novamente</button>
            </div>
          ) : (
            <>
              <CitizenTable 
                citizens={citizens} 
              />

              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="pagination-btn"
                  >
                    Anterior
                  </button>
                  <span className="pagination-info">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="pagination-btn"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}