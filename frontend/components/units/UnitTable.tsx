'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import './UnitTable.css';

interface UnitTableProps {
  units: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    isActive: boolean;
    type: {
      description: string;
    };
    professionalsCount: number;
    processesCount: number;
  }>;
}

export default function UnitTable({ units }: UnitTableProps) {
  const router = useRouter();

  const handleRowClick = (unitId: string) => {
    router.push(`/portal/units/${unitId}`);
  };

  if (units.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏛️</div>
        <h3>Nenhuma unidade encontrada</h3>
        <p>Tente ajustar os filtros ou criar uma nova unidade</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="unit-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Email</th>
            <th>Telefone</th>
            <th>Profissionais</th>
            <th>Processos</th>
            <th>Status</th>
            <th className="action-col"></th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr 
              key={unit.id}
              onClick={() => handleRowClick(unit.id)}
              className="unit-row"
            >
              <td className="unit-name">{unit.name}</td>
              <td>{unit.type.description}</td>
              <td>{unit.email}</td>
              <td>{unit.phone}</td>
              <td className="count-cell">{unit.professionalsCount}</td>
              <td className="count-cell">{unit.processesCount}</td>
              <td>
                <span className={`status-badge ${unit.isActive ? 'status-active' : 'status-inactive'}`}>
                  {unit.isActive ? 'Ativa' : 'Inativa'}
                </span>
              </td>
              <td className="action-col">
                <span className="view-details" title="Ver detalhes">→</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}