'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import './ProfessionalTable.css';

interface ProfessionalTableProps {
  professionals: Array<{
    id: string;
    name: string;
    email: string;
    cpf: string;
    phone: string | null;
    registration: string | null;
    specialty: string | null;
    isActive: boolean;
    loginAttempts: number;
    lockedUntil: string | null;
    units: Array<{
      name: string;
      position: string;
    }>;
  }>;
  isAdmin: boolean;
}

export default function ProfessionalTable({ professionals, isAdmin }: ProfessionalTableProps) {
  const router = useRouter();

  const handleRowClick = (professionalId: string) => {
    router.push(`/portal/professionals/${professionalId}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const isLocked = (lockedUntil: string | null) => {
    if (!lockedUntil) return false;
    return new Date(lockedUntil) > new Date();
  };

  if (professionals.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">👤</div>
        <h3>Nenhum profissional encontrado</h3>
        <p>Tente ajustar os filtros ou criar um novo profissional</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="professional-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>CPF</th>
            <th>Registro</th>
            <th>Especialidade</th>
            <th>Unidades</th>
            <th>Status</th>
            {isAdmin && <th className="action-col"></th>}
          </tr>
        </thead>
        <tbody>
          {professionals.map((professional) => {
            const locked = isLocked(professional.lockedUntil);
            const status = !professional.isActive ? 'inactive' : locked ? 'locked' : 'active';
            
            return (
              <tr 
                key={professional.id}
                onClick={() => handleRowClick(professional.id)}
                className="professional-row"
              >
                <td className="professional-name">{professional.name}</td>
                <td>{professional.email}</td>
                <td>{professional.cpf}</td>
                <td>{professional.registration || '-'}</td>
                <td>{professional.specialty || '-'}</td>
                <td>
                  {professional.units.length > 0 ? (
                    <span className="unit-badge">{professional.units.length} unidade(s)</span>
                  ) : (
                    <span className="no-unit">Nenhuma</span>
                  )}
                </td>
                <td>
                  <span className={`status-badge status-${status}`}>
                    {status === 'active' && 'Ativo'}
                    {status === 'inactive' && 'Inativo'}
                    {status === 'locked' && 'Bloqueado'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="action-col">
                    <span className="view-details" title="Ver detalhes">→</span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}