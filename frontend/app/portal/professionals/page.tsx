'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/layout/Header';
import Sidebar from '../../../components/layout/Sidebar';
import ProfessionalFilters from '../../../components/professionals/ProfessionalFilters';
import ProfessionalTable from '../../../components/professionals/ProfessionalTable';
import './professionals.css';

interface Professional {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string | null;
  registration: string | null;
  specialty: string | null;
  council: string | null;
  councilNumber: string | null;
  councilState: string | null;
  isActive: boolean;
  admissionDate: string | null;
  createdAt: string;
  lastLogin: string | null;
  loginAttempts: number;
  lockedUntil: string | null;
  units: Array<{
    id: string;
    name: string;
    position: string;
    registration: string;
  }>;
}

export default function ProfessionalsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    specialty: '',
    unitId: '',
    status: '',
    page: 1
  });

  // Forçar recálculo do layout
  useEffect(() => {
    const forceLayout = () => {
      document.body.style.display = 'none';
      document.body.offsetHeight;
      document.body.style.display = '';
      
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        (mainContent as HTMLElement).style.marginLeft = sidebarCollapsed ? '80px' : '280px';
        (mainContent as HTMLElement).style.width = sidebarCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)';
      }
    };

    forceLayout();
    const timer = setTimeout(forceLayout, 100);
    return () => clearTimeout(timer);
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/auth/login';
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfessionals();
    }
  }, [isAuthenticated, filters]);

  const fetchProfessionals = async () => {
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
      if (filters.specialty) queryParams.append('specialty', filters.specialty);
      if (filters.unitId) queryParams.append('unitId', filters.unitId);
      if (filters.status) queryParams.append('status', filters.status);
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', '10');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        window.location.href = '/auth/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Erro ao carregar profissionais');
      }

      const data = await response.json();
      
      // Usando a estrutura que seu backend retorna
      setProfessionals(data.professionals || []);
      setPagination({
        page: data.pagination?.page || 1,
        limit: data.pagination?.limit || 10,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 1
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
    <div className="professionals-container">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
      />
      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header 
          user={user}
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <div className="content-wrapper">
          <div className="page-header">
            <div>
              <h1 className="page-title">Profissionais</h1>
              <p className="page-subtitle">
                Gerencie os profissionais da rede de proteção
              </p>
            </div>
            {(user?.isAdmin || user?.role === 'ADMIN') && (
              <Link href="/portal/professionals/new" className="btn-primary">
                <span>+</span> Novo Profissional
              </Link>
            )}
          </div>

          <ProfessionalFilters 
            filters={filters} 
            onFilterChange={(newFilters) => setFilters({ ...filters, ...newFilters, page: 1 })}
          />

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
              <p>Carregando profissionais...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={fetchProfessionals}>Tentar novamente</button>
            </div>
          ) : (
            <>
              <ProfessionalTable 
                professionals={professionals} 
                isAdmin={user?.isAdmin || user?.role === 'ADMIN'}
              />

              {pagination.pages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="pagination-btn"
                  >
                    Anterior
                  </button>
                  <span className="pagination-info">
                    Página {pagination.page} de {pagination.pages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
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