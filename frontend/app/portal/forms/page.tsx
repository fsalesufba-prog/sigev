'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/layout/Header';
import Sidebar from '../../../components/layout/Sidebar';
import FormFilters from '../../../components/forms/FormFilters';
import FormTable from '../../../components/forms/FormTable';
import './forms.css';

interface Form {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function FormsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [forms, setForms] = useState<Form[]>([]);
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
    type: '',
    isActive: '',
    page: 1
  });

  const isAdmin = user?.isAdmin || user?.role === 'ADMIN';

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
      fetchForms();
    }
  }, [isAuthenticated, filters]);

  const fetchForms = async () => {
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
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.isActive) queryParams.append('isActive', filters.isActive);
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', '10');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forms?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        window.location.href = '/auth/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Erro ao carregar formulários');
      }

      const data = await response.json();
      
      setForms(data.data || []);
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

  const getFormTypeText = (type: string) => {
    const types: Record<string, string> = {
      'INITIAL': 'Formulário Inicial',
      'ESCUTA_ESPECIALIZADA': 'Escuta Especializada',
      'RELATORIO_ENCAMINHAMENTO': 'Relatório de Encaminhamento',
      'RELATORIO_ESCUTA': 'Relatório da Escuta'
    };
    return types[type] || type;
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
    <div className="forms-container">
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
              <h1 className="page-title">Formulários Dinâmicos</h1>
              <p className="page-subtitle">
                Gerencie os formulários do sistema (Itens 5.1, 5.2, 5.3 e 5.4 do Edital)
              </p>
            </div>
            {isAdmin && (
              <Link href="/portal/forms/new" className="btn-primary">
                <span>+</span> Novo Formulário
              </Link>
            )}
          </div>

          <FormFilters 
            filters={filters} 
            onFilterChange={(newFilters) => setFilters({ ...filters, ...newFilters, page: 1 })}
            isAdmin={isAdmin}
          />

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
              <p>Carregando formulários...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={fetchForms}>Tentar novamente</button>
            </div>
          ) : (
            <>
              <FormTable 
                forms={forms} 
                isAdmin={isAdmin}
                getFormTypeText={getFormTypeText}
                onStatusToggle={fetchForms}
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