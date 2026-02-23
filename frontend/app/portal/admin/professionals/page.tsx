'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
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

interface ProfessionalsResponse {
    professionals: Professional[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

interface StatsResponse {
    total: number;
    active: number;
    locked: number;
    withUnits: number;
    createdToday: number;
    bySpecialty: Array<{
        specialty: string;
        count: number;
    }>;
}

interface Unit {
    id: string;
    name: string;
}

export default function AdminProfessionalsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [stats, setStats] = useState<StatsResponse>({
        total: 0,
        active: 0,
        locked: 0,
        withUnits: 0,
        createdToday: 0,
        bySpecialty: []
    });
    const [units, setUnits] = useState<Unit[]>([]);
    const [specialties, setSpecialties] = useState<string[]>([]);
    const [filters, setFilters] = useState({
        search: '',
        specialty: '',
        unitId: '',
        status: ''
    });
    const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create' | 'assign'>('view');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        cpf: '',
        phone: '',
        registration: '',
        specialty: '',
        council: '',
        councilNumber: '',
        councilState: '',
        admissionDate: '',
        password: ''
    });
    const [assignData, setAssignData] = useState({
        unitId: '',
        position: '',
        registration: ''
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
    }, [user, authLoading, router]);

    const fetchProfessionals = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');

            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                ...(filters.search && { search: filters.search }),
                ...(filters.specialty && { specialty: filters.specialty }),
                ...(filters.unitId && { unitId: filters.unitId }),
                ...(filters.status && { status: filters.status })
            });

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Erro ao carregar profissionais');

            const data: ProfessionalsResponse = await response.json();
            setProfessionals(data.professionals);
            setPagination(data.pagination);
            setError(null);

        } catch (error: any) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [user, pagination.page, pagination.limit, filters]);

    const fetchStats = useCallback(async () => {
        if (!user) return;

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals/stats/summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
        }
    }, [user]);

    const fetchUnits = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setUnits(data.units || []);
            }
        } catch (error) {
            console.error('Erro ao buscar unidades:', error);
        }
    }, []);

    const fetchSpecialties = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals/specialties`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setSpecialties(data);
            }
        } catch (error) {
            console.error('Erro ao buscar especialidades:', error);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchProfessionals();
            fetchStats();
            fetchUnits();
            fetchSpecialties();
        }
    }, [user, fetchProfessionals, fetchStats, fetchUnits, fetchSpecialties]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const clearFilters = () => {
        setFilters({ search: '', specialty: '', unitId: '', status: '' });
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleRefresh = () => {
        fetchProfessionals();
        fetchStats();
    };

    const handleCreateProfessional = () => {
        setFormData({
            name: '',
            email: '',
            cpf: '',
            phone: '',
            registration: '',
            specialty: '',
            council: '',
            councilNumber: '',
            councilState: '',
            admissionDate: '',
            password: ''
        });
        setModalMode('create');
        setShowModal(true);
    };

    const handleEditProfessional = (professional: Professional) => {
        setFormData({
            name: professional.name,
            email: professional.email,
            cpf: professional.cpf,
            phone: professional.phone || '',
            registration: professional.registration || '',
            specialty: professional.specialty || '',
            council: professional.council || '',
            councilNumber: professional.councilNumber || '',
            councilState: professional.councilState || '',
            admissionDate: professional.admissionDate ? professional.admissionDate.split('T')[0] : '',
            password: ''
        });
        setSelectedProfessional(professional);
        setModalMode('edit');
        setShowModal(true);
    };

    const handleViewProfessional = (professional: Professional) => {
        setSelectedProfessional(professional);
        setModalMode('view');
        setShowModal(true);
    };

    const handleAssignUnit = (professional: Professional) => {
        setSelectedProfessional(professional);
        setAssignData({ unitId: '', position: '', registration: '' });
        setModalMode('assign');
        setShowModal(true);
    };

    const handleToggleLock = async (professionalId: string, currentLocked: boolean) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals/${professionalId}/toggle-lock`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ lock: !currentLocked })
            });

            if (response.ok) {
                fetchProfessionals();
                fetchStats();
            }
        } catch (error) {
            console.error('Erro ao bloquear/desbloquear:', error);
        }
    };

    const handleToggleActive = async (professionalId: string, currentActive: boolean) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals/${professionalId}/toggle-active`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ active: !currentActive })
            });

            if (response.ok) {
                fetchProfessionals();
                fetchStats();
            }
        } catch (error) {
            console.error('Erro ao ativar/desativar:', error);
        }
    };

    const handleRemoveUnit = async (professionalId: string, unitId: string) => {
        if (!confirm('Remover vínculo com esta unidade?')) return;

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals/${professionalId}/remove-unit/${unitId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                fetchProfessionals();
            }
        } catch (error) {
            console.error('Erro ao remover vínculo:', error);
        }
    };

    const handleDeleteProfessional = async (professionalId: string) => {
        if (!confirm('Tem certeza que deseja deletar este profissional?')) return;

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals/${professionalId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                fetchProfessionals();
                fetchStats();
                setShowModal(false);
            }
        } catch (error) {
            console.error('Erro ao deletar:', error);
        }
    };

    const handleSubmitForm = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const url = modalMode === 'create'
                ? `${process.env.NEXT_PUBLIC_API_URL}/professionals`
                : `${process.env.NEXT_PUBLIC_API_URL}/professionals/${selectedProfessional?.id}`;

            const method = modalMode === 'create' ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                fetchProfessionals();
                fetchStats();
                setShowModal(false);
            } else {
                const error = await response.json();
                alert(error.error || 'Erro ao salvar profissional');
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar profissional');
        }
    };

    const handleSubmitAssign = async () => {
        if (!assignData.unitId) {
            alert('Selecione uma unidade');
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professionals/${selectedProfessional?.id}/assign-unit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(assignData)
            });

            if (response.ok) {
                fetchProfessionals();
                setShowModal(false);
            } else {
                const error = await response.json();
                alert(error.error || 'Erro ao vincular profissional');
            }
        } catch (error) {
            console.error('Erro ao vincular:', error);
            alert('Erro ao vincular profissional');
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Nunca';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCPF = (cpf: string) => {
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    };

    const getStatusInfo = (professional: Professional) => {
        if (professional.lockedUntil && new Date(professional.lockedUntil) > new Date()) {
            return { text: 'Bloqueado', class: 'status-locked' };
        }
        if (!professional.isActive) {
            return { text: 'Inativo', class: 'status-inactive' };
        }
        return { text: 'Ativo', class: 'status-active' };
    };

    const getCouncilDisplay = (professional: Professional) => {
        if (!professional.council || !professional.councilNumber) return null;
        return `${professional.council} ${professional.councilNumber}${professional.councilState ? `/${professional.councilState}` : ''}`;
    };

    if (authLoading) {
        return (
            <div className="professionals-loading">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="professionals-page">
            <div className="professionals-content-wrapper">
                <div className="professionals-content">
                    <div className="page-header">
                        <h1>Gerenciar Profissionais</h1>
                        <button className="btn-create" onClick={handleCreateProfessional}>
                            <span>+</span> Novo Profissional
                        </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-value">{stats.total}</div>
                            <div className="stat-label">Total</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.active}</div>
                            <div className="stat-label">Ativos</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.locked}</div>
                            <div className="stat-label">Bloqueados</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.withUnits}</div>
                            <div className="stat-label">Com Unidades</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.createdToday}</div>
                            <div className="stat-label">Hoje</div>
                        </div>
                    </div>

                    {/* Charts Section - Especialidades */}
                    {stats.bySpecialty.length > 0 && (
                        <div className="charts-section">
                            <h2>Profissionais por Especialidade</h2>
                            <div className="specialty-chart">
                                {stats.bySpecialty.map((item, index) => (
                                    <div key={index} className="chart-bar-item">
                                        <div className="chart-bar-label">{item.specialty}</div>
                                        <div className="chart-bar-container">
                                            <div
                                                className="chart-bar-fill"
                                                style={{
                                                    width: `${(item.count / Math.max(...stats.bySpecialty.map(s => s.count))) * 100}%`,
                                                    backgroundColor: `hsl(${index * 45}, 70%, 50%)`
                                                }}
                                            >
                                                <span className="chart-bar-value">{item.count}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="filters-section">
                        <div className="filters-grid">
                            <input
                                type="text"
                                placeholder="Buscar por nome, email, CPF ou registro..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="filter-input search"
                            />

                            <select
                                value={filters.specialty}
                                onChange={(e) => handleFilterChange('specialty', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">Todas especialidades</option>
                                {specialties.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>

                            <select
                                value={filters.unitId}
                                onChange={(e) => handleFilterChange('unitId', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">Todas unidades</option>
                                {units.map(unit => (
                                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                                ))}
                            </select>

                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">Todos status</option>
                                <option value="active">Ativos</option>
                                <option value="locked">Bloqueados</option>
                                <option value="inactive">Inativos</option>
                            </select>

                            <button className="btn-clear" onClick={clearFilters}>
                                Limpar
                            </button>

                            <button className="btn-refresh" onClick={handleRefresh}>
                                <span className="refresh-icon">↻</span> Atualizar
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="error-message">
                            <p>{error}</p>
                            <button onClick={handleRefresh}>Tentar novamente</button>
                        </div>
                    )}

                    {/* Loading */}
                    {loading && professionals.length === 0 ? (
                        <div className="professionals-loading">
                            <div className="loading-spinner"></div>
                        </div>
                    ) : (
                        <>
                            {/* Professionals Table */}
                            <div className="table-container">
                                <table className="professionals-table">
                                    <thead>
                                        <tr>
                                            <th>Profissional</th>
                                            <th>Registro</th>
                                            <th>Especialidade</th>
                                            <th>Conselho</th>
                                            <th>Unidades</th>
                                            <th>Status</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {professionals.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="no-data">
                                                    Nenhum profissional encontrado
                                                </td>
                                            </tr>
                                        ) : (
                                            professionals.map((professional) => {
                                                const status = getStatusInfo(professional);
                                                const council = getCouncilDisplay(professional);
                                                return (
                                                    <tr key={professional.id}>
                                                        <td>
                                                            <div className="professional-cell">
                                                                <div className="professional-avatar">
                                                                    {professional.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="professional-name">{professional.name}</div>
                                                                    <div className="professional-email">{professional.email}</div>
                                                                    <div className="professional-cpf">{formatCPF(professional.cpf)}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="registration-badge">
                                                                {professional.registration || 'N/I'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className="specialty-badge">
                                                                {professional.specialty || 'Não especificada'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {council ? (
                                                                <span className="council-badge">{council}</span>
                                                            ) : (
                                                                <span className="no-council">Não informado</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div className="units-list">
                                                                {professional.units.length > 0 ? (
                                                                    professional.units.map((unit, idx) => (
                                                                        <div key={unit.id} className="unit-item">
                                                                            <span className="unit-name">{unit.name}</span>
                                                                            {unit.position && <span className="unit-position">({unit.position})</span>}
                                                                            <button
                                                                                className="unit-remove-btn"
                                                                                onClick={() => handleRemoveUnit(professional.id, unit.id)}
                                                                                title="Remover vínculo"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <span className="no-units">Sem vínculo</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`status-badge ${status.class}`}>
                                                                {status.text}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="action-buttons">
                                                                <button
                                                                    className="action-btn view"
                                                                    onClick={() => handleViewProfessional(professional)}
                                                                    title="Visualizar"
                                                                >
                                                                    👁️
                                                                </button>
                                                                <button
                                                                    className="action-btn edit"
                                                                    onClick={() => handleEditProfessional(professional)}
                                                                    title="Editar"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    className="action-btn assign"
                                                                    onClick={() => handleAssignUnit(professional)}
                                                                    title="Vincular a unidade"
                                                                >
                                                                    🔗
                                                                </button>
                                                                <button
                                                                    className={`action-btn ${professional.isActive ? 'deactivate' : 'activate'}`}
                                                                    onClick={() => handleToggleActive(professional.id, professional.isActive)}
                                                                    title={professional.isActive ? 'Desativar' : 'Ativar'}
                                                                >
                                                                    {professional.isActive ? '⏸️' : '▶️'}
                                                                </button>
                                                                <button
                                                                    className={`action-btn ${professional.lockedUntil ? 'unlock' : 'lock'}`}
                                                                    onClick={() => handleToggleLock(professional.id, !!professional.lockedUntil)}
                                                                    title={professional.lockedUntil ? 'Desbloquear' : 'Bloquear'}
                                                                >
                                                                    {professional.lockedUntil ? '🔓' : '🔒'}
                                                                </button>
                                                                <button
                                                                    className="action-btn delete"
                                                                    onClick={() => handleDeleteProfessional(professional.id)}
                                                                    title="Deletar"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination.pages > 1 && (
                                <div className="pagination">
                                    <button
                                        disabled={pagination.page === 1}
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                    >
                                        Anterior
                                    </button>
                                    <span className="page-info">
                                        Página {pagination.page} de {pagination.pages}
                                    </span>
                                    <button
                                        disabled={pagination.page === pagination.pages}
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                    >
                                        Próxima
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {modalMode === 'create' ? 'Novo Profissional' :
                                    modalMode === 'edit' ? 'Editar Profissional' :
                                        modalMode === 'assign' ? 'Vincular a Unidade' :
                                            'Detalhes do Profissional'}
                            </h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className="modal-body">
                            {modalMode === 'view' && selectedProfessional ? (
                                <div className="professional-details-view">
                                    <div className="detail-row">
                                        <span className="detail-label">Nome:</span>
                                        <span className="detail-value">{selectedProfessional.name}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Email:</span>
                                        <span className="detail-value">{selectedProfessional.email}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">CPF:</span>
                                        <span className="detail-value">{formatCPF(selectedProfessional.cpf)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Telefone:</span>
                                        <span className="detail-value">{selectedProfessional.phone || '-'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Registro:</span>
                                        <span className="detail-value">{selectedProfessional.registration || '-'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Especialidade:</span>
                                        <span className="detail-value">{selectedProfessional.specialty || '-'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Conselho:</span>
                                        <span className="detail-value">
                                            {selectedProfessional.council && selectedProfessional.councilNumber ?
                                                `${selectedProfessional.council} ${selectedProfessional.councilNumber}${selectedProfessional.councilState ? `/${selectedProfessional.councilState}` : ''}`
                                                : '-'}
                                        </span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Data Admissão:</span>
                                        <span className="detail-value">
                                            {selectedProfessional.admissionDate ?
                                                new Date(selectedProfessional.admissionDate).toLocaleDateString('pt-BR') : '-'}
                                        </span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Criado em:</span>
                                        <span className="detail-value">{formatDate(selectedProfessional.createdAt)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Último acesso:</span>
                                        <span className="detail-value">{formatDate(selectedProfessional.lastLogin)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Status:</span>
                                        <span className={`status-badge ${getStatusInfo(selectedProfessional).class}`}>
                                            {getStatusInfo(selectedProfessional).text}
                                        </span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Unidades:</span>
                                        <div className="units-detail">
                                            {selectedProfessional.units.length > 0 ? (
                                                selectedProfessional.units.map(unit => (
                                                    <div key={unit.id} className="unit-detail-item">
                                                        <strong>{unit.name}</strong>
                                                        {unit.position && <span> - {unit.position}</span>}
                                                        {unit.registration && <span> (Reg: {unit.registration})</span>}
                                                    </div>
                                                ))
                                            ) : (
                                                <span>Nenhuma unidade vinculada</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : modalMode === 'assign' ? (
                                <div className="form-container">
                                    <h3>Vincular {selectedProfessional?.name} a uma unidade</h3>
                                    <div className="form-group">
                                        <label>Unidade *</label>
                                        <select
                                            value={assignData.unitId}
                                            onChange={(e) => setAssignData({ ...assignData, unitId: e.target.value })}
                                            className="filter-select"
                                        >
                                            <option value="">Selecione uma unidade</option>
                                            {units.map(unit => (
                                                <option key={unit.id} value={unit.id}>{unit.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Cargo/Função</label>
                                        <input
                                            type="text"
                                            value={assignData.position}
                                            onChange={(e) => setAssignData({ ...assignData, position: e.target.value })}
                                            placeholder="Ex: Coordenador, Técnico..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Registro na Unidade</label>
                                        <input
                                            type="text"
                                            value={assignData.registration}
                                            onChange={(e) => setAssignData({ ...assignData, registration: e.target.value })}
                                            placeholder="Número de registro específico"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="form-container">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Nome *</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Nome completo"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Email *</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="email@exemplo.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>CPF *</label>
                                            <input
                                                type="text"
                                                value={formData.cpf}
                                                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                                placeholder="000.000.000-00"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Telefone</label>
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="(00) 00000-0000"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Registro Profissional</label>
                                            <input
                                                type="text"
                                                value={formData.registration}
                                                onChange={(e) => setFormData({ ...formData, registration: e.target.value })}
                                                placeholder="Número do registro"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Especialidade</label>
                                            <input
                                                type="text"
                                                value={formData.specialty}
                                                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                                placeholder="Ex: Psicologia, Serviço Social..."
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Conselho</label>
                                            <input
                                                type="text"
                                                value={formData.council}
                                                onChange={(e) => setFormData({ ...formData, council: e.target.value })}
                                                placeholder="Ex: CRP, CREAS..."
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Número do Conselho</label>
                                            <input
                                                type="text"
                                                value={formData.councilNumber}
                                                onChange={(e) => setFormData({ ...formData, councilNumber: e.target.value })}
                                                placeholder="00000"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>UF</label>
                                            <input
                                                type="text"
                                                value={formData.councilState}
                                                onChange={(e) => setFormData({ ...formData, councilState: e.target.value })}
                                                placeholder="SP"
                                                maxLength={2}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Data de Admissão</label>
                                            <input
                                                type="date"
                                                value={formData.admissionDate}
                                                onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                                            />
                                        </div>
                                        {modalMode === 'create' && (
                                            <div className="form-group">
                                                <label>Senha *</label>
                                                <input
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    placeholder="********"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            {modalMode === 'assign' ? (
                                <button className="btn-save" onClick={handleSubmitAssign}>
                                    Vincular
                                </button>
                            ) : modalMode !== 'view' ? (
                                <button className="btn-save" onClick={handleSubmitForm}>
                                    Salvar
                                </button>
                            ) : null}
                            <button className="btn-cancel" onClick={() => setShowModal(false)}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}