'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import './users.css';

interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string | null;
  role: 'ADMIN' | 'MANAGER' | 'PROFESSIONAL';
  isAdmin: boolean;
  createdAt: string;
  lastLogin: string | null;
  loginAttempts: number;
  lockedUntil: string | null;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface StatsResponse {
  total: number;
  admins: number;
  managers: number;
  professionals: number;
  createdToday: number;
  locked: number;
}

export default function AdminUsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [stats, setStats] = useState<StatsResponse>({
    total: 0,
    admins: 0,
    managers: 0,
    professionals: 0,
    createdToday: 0,
    locked: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    role: ''
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    password: '',
    role: 'PROFESSIONAL',
    isAdmin: false
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchStats();
    }
  }, [user, pagination.page, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role })
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar usuários');

      const data: UsersResponse = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/stats/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: '', role: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCreateUser = () => {
    setFormData({
      name: '',
      email: '',
      cpf: '',
      phone: '',
      password: '',
      role: 'PROFESSIONAL',
      isAdmin: false
    });
    setModalMode('create');
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setFormData({
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      phone: user.phone || '',
      password: '',
      role: user.role,
      isAdmin: user.isAdmin
    });
    setSelectedUser(user);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setModalMode('view');
    setShowModal(true);
  };

  const handleToggleLock = async (userId: string, currentLocked: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/toggle-lock`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lock: !currentLocked })
      });

      if (response.ok) {
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      console.error('Erro ao bloquear/desbloquear:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchUsers();
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
        ? `${process.env.NEXT_PUBLIC_API_URL}/users`
        : `${process.env.NEXT_PUBLIC_API_URL}/users/${selectedUser?.id}`;
      
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
        fetchUsers();
        fetchStats();
        setShowModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao salvar usuário');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar usuário');
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return { text: 'Admin', class: 'role-admin' };
      case 'MANAGER': return { text: 'Gestor', class: 'role-manager' };
      default: return { text: 'Profissional', class: 'role-professional' };
    }
  };

  const getStatusInfo = (user: User) => {
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return { text: 'Bloqueado', class: 'status-locked' };
    }
    if (user.lastLogin && new Date(user.lastLogin) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
      return { text: 'Ativo', class: 'status-active' };
    }
    return { text: 'Inativo', class: 'status-inactive' };
  };

  if (authLoading || loading) {
    return (
      <div className="users-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Gerenciar Usuários</h1>
        <button className="btn-create" onClick={handleCreateUser}>
          <span>+</span> Novo Usuário
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.admins}</div>
          <div className="stat-label">Admins</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.managers}</div>
          <div className="stat-label">Gestores</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.professionals}</div>
          <div className="stat-label">Profissionais</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.locked}</div>
          <div className="stat-label">Bloqueados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.createdToday}</div>
          <div className="stat-label">Hoje</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <input
            type="text"
            placeholder="Buscar por nome, email ou CPF..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="filter-input search"
          />
          
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="filter-select"
          >
            <option value="">Todos os perfis</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Gestor</option>
            <option value="PROFESSIONAL">Profissional</option>
          </select>
          
          <button className="btn-clear" onClick={clearFilters}>
            Limpar
          </button>
          
          <button className="btn-refresh" onClick={() => {
            fetchUsers();
            fetchStats();
          }}>
            <span className="refresh-icon">↻</span> Atualizar
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Email / CPF</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>Último Acesso</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-data">
                  Nenhum usuário encontrado
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const role = getRoleBadge(user.role);
                const status = getStatusInfo(user);
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="user-name">{user.name}</div>
                          <div className="user-phone">{user.phone || 'Sem telefone'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="email-cpf">
                        <div>{user.email}</div>
                        <div className="cpf">{formatCPF(user.cpf)}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${role.class}`}>
                        {role.text}
                      </span>
                      {user.isAdmin && user.role !== 'ADMIN' && (
                        <span className="admin-tag">Admin</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${status.class}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="last-login">{formatDate(user.lastLogin)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn view"
                          onClick={() => handleViewUser(user)}
                          title="Visualizar"
                        >
                          👁️
                        </button>
                        <button
                          className="action-btn edit"
                          onClick={() => handleEditUser(user)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className={`action-btn ${user.lockedUntil ? 'unlock' : 'lock'}`}
                          onClick={() => handleToggleLock(user.id, !!user.lockedUntil)}
                          title={user.lockedUntil ? 'Desbloquear' : 'Bloquear'}
                        >
                          {user.lockedUntil ? '🔓' : '🔒'}
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteUser(user.id)}
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalMode === 'create' ? 'Novo Usuário' : 
                 modalMode === 'edit' ? 'Editar Usuário' : 
                 'Detalhes do Usuário'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {modalMode === 'view' && selectedUser ? (
                <div className="user-details-view">
                  <div className="detail-row">
                    <span className="detail-label">Nome:</span>
                    <span className="detail-value">{selectedUser.name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedUser.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">CPF:</span>
                    <span className="detail-value">{formatCPF(selectedUser.cpf)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Telefone:</span>
                    <span className="detail-value">{selectedUser.phone || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Perfil:</span>
                    <span className={`role-badge ${getRoleBadge(selectedUser.role).class}`}>
                      {getRoleBadge(selectedUser.role).text}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Admin:</span>
                    <span className="detail-value">{selectedUser.isAdmin ? 'Sim' : 'Não'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Criado em:</span>
                    <span className="detail-value">{formatDate(selectedUser.createdAt)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Último acesso:</span>
                    <span className="detail-value">{formatDate(selectedUser.lastLogin)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Tentativas:</span>
                    <span className="detail-value">{selectedUser.loginAttempts}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`status-badge ${getStatusInfo(selectedUser).class}`}>
                      {getStatusInfo(selectedUser).text}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="form-container">
                  <div className="form-group">
                    <label>Nome *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>CPF *</label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="form-group">
                    <label>Telefone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  {modalMode === 'create' && (
                    <div className="form-group">
                      <label>Senha *</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="********"
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Perfil</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                    >
                      <option value="PROFESSIONAL">Profissional</option>
                      <option value="MANAGER">Gestor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="form-group checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.isAdmin}
                        onChange={(e) => setFormData({...formData, isAdmin: e.target.checked})}
                      />
                      Usuário administrador
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {modalMode !== 'view' && (
                <button className="btn-save" onClick={handleSubmitForm}>
                  Salvar
                </button>
              )}
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