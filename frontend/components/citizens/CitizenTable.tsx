'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import './CitizenTable.css';

interface CitizenTableProps {
  citizens: Array<{
    id: string;
    name: string;
    birthDate: string;
    gender?: string;
    cpf?: string;
    age: number;
    address?: string;
    phone?: string;
    processCount: number;
  }>;
}

export default function CitizenTable({ citizens }: CitizenTableProps) {
  const router = useRouter();

  const getGenderText = (gender?: string) => {
    switch (gender) {
      case 'M': return 'Masculino';
      case 'F': return 'Feminino';
      case 'OTHER': return 'Outro';
      default: return '-';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const handleRowClick = (citizenId: string) => {
    router.push(`/portal/citizens/${citizenId}`);
  };

  if (citizens.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">👤</div>
        <h3>Nenhum cidadão encontrado</h3>
        <p>Tente ajustar os filtros ou criar um novo cidadão</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="citizen-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Data Nasc.</th>
            <th>Idade</th>
            <th>Gênero</th>
            <th>CPF</th>
            <th>Telefone</th>
            <th>Processos</th>
            <th className="action-col"></th>
          </tr>
        </thead>
        <tbody>
          {citizens.map((citizen) => (
            <tr 
              key={citizen.id}
              onClick={() => handleRowClick(citizen.id)}
              className="citizen-row"
            >
              <td className="citizen-name">{citizen.name}</td>
              <td>{formatDate(citizen.birthDate)}</td>
              <td>{citizen.age} anos</td>
              <td>{getGenderText(citizen.gender)}</td>
              <td>{citizen.cpf || '-'}</td>
              <td>{citizen.phone || '-'}</td>
              <td>
                <span className="process-count">{citizen.processCount}</span>
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