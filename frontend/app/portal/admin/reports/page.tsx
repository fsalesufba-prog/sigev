'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell 
} from 'recharts';
import './reports.css';

// ========== INTERFACES ==========
interface Unit {
  id: string;
  name: string;
}

interface ReportFilters {
  startDate: string;
  endDate: string;
  unitId: string;
  status: string;
  identificationForm: string;
}

interface KPI {
  totalProcesses: number;
  pendingProcesses: number;
  completedProcesses: number;
  averageCompletionDays: number;
}

interface ProcessByCitizen {
  citizenId: string;
  citizenName: string;
  birthDate: string;
  totalProcesses: number;
  processes: Array<{
    id: string;
    date: string;
    unit: string;
    professional: string;
    identificationForm: string;
    violences: string[];
    status: string;
  }>;
}

interface PendingProcess {
  id: string;
  citizenName: string;
  citizenAge: number;
  createdAt: string;
  deadline: string | null;
  priority: string;
  professional: string;
  unit: string;
  daysOpen: number;
  violences?: string[];
}

interface ProfessionalInactivity {
  id: string;
  name: string;
  daysWithoutAccess: number;
  lastAccess: string | null;
  assignedProcesses: number;
}

interface UnitInactivity {
  id: string;
  name: string;
  daysWithoutAccess: number;
  totalProcesses: number;
  professionals: ProfessionalInactivity[];
}

interface InactivityData {
  units: UnitInactivity[];
}

interface IdentificationData {
  name: string;
  value: number;
  color: string;
}

interface ViolenceByGenderData {
  violenceType: string;
  masculine: number;
  feminine: number;
  other: number;
  total: number;
}

// ========== COMPONENTE PRINCIPAL ==========
export default function AdminReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    unitId: '',
    status: '',
    identificationForm: ''
  });

  // Dados dos relatórios
  const [kpi, setKpi] = useState<KPI>({
    totalProcesses: 0,
    pendingProcesses: 0,
    completedProcesses: 0,
    averageCompletionDays: 0
  });

  const [processesByCitizen, setProcessesByCitizen] = useState<ProcessByCitizen[]>([]);
  const [pendingProcesses, setPendingProcesses] = useState<PendingProcess[]>([]);
  const [inactivityData, setInactivityData] = useState<InactivityData | null>(null);
  const [identificationData, setIdentificationData] = useState<IdentificationData[]>([]);
  const [violenceByGenderData, setViolenceByGenderData] = useState<ViolenceByGenderData[]>([]);

  // Cores para os gráficos
  const COLORS = ['#0066FF', '#00D4FF', '#8A2BE2', '#FF1493', '#10b981', '#f59e0b'];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchUnits();
      loadAllReports();
    }
  }, [user]);

  const fetchUnits = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/units?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUnits(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar unidades:', error);
    }
  };

  const loadAllReports = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadKPI(),
        loadProcessesByCitizen(),
        loadPendingProcesses(),
        loadInactivityReport(),
        loadIdentificationReport(),
        loadViolenceByGenderReport()
      ]);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadKPI = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        ...(filters.unitId && { unitId: filters.unitId })
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/kpi?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setKpi({
          totalProcesses: data.totalProcesses || 0,
          pendingProcesses: data.pendingProcesses || 0,
          completedProcesses: data.completedProcesses || 0,
          averageCompletionDays: data.averageCompletionDays || 0
        });
      }
    } catch (error) {
      console.error('Erro ao carregar KPI:', error);
    }
  };

  const loadProcessesByCitizen = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        ...(filters.unitId && { unitId: filters.unitId }),
        ...(filters.status && { status: filters.status })
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/processes-by-citizen?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProcessesByCitizen(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar processos por cidadão:', error);
    }
  };

  const loadPendingProcesses = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        ...(filters.unitId && { unitId: filters.unitId })
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/pending-processes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Se veio agrupado por unidade, extrair processos
        if (Array.isArray(data) && data.length > 0 && data[0].processes) {
          const allProcesses = data.flatMap((unit: any) => unit.processes || []);
          setPendingProcesses(allProcesses);
        } else {
          setPendingProcesses(data || []);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar processos pendentes:', error);
    }
  };

  const loadInactivityReport = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/inactivity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setInactivityData(data);
      }
    } catch (error) {
      console.error('Erro ao carregar relatório de inatividade:', error);
    }
  };

  const loadIdentificationReport = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/identification-form?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setIdentificationData([
          { name: 'Revelação Espontânea', value: data.revelacaoEspontanea || 0, color: COLORS[0] },
          { name: 'Suspeita Profissional', value: data.suspeitaProfissional || 0, color: COLORS[1] },
          { name: 'Denúncia', value: data.denuncia || 0, color: COLORS[2] }
        ]);
      }
    } catch (error) {
      console.error('Erro ao carregar relatório de identificação:', error);
    }
  };

  const loadViolenceByGenderReport = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/violence-by-gender?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setViolenceByGenderData(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar relatório de violências por sexo:', error);
    }
  };

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadAllReports();
  };

  const resetFilters = () => {
    setFilters({
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      unitId: '',
      status: '',
      identificationForm: ''
    });
    setTimeout(() => loadAllReports(), 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getPriorityClass = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'low': return 'priority-low';
      case 'normal': return 'priority-normal';
      case 'high': return 'priority-high';
      case 'urgent': return 'priority-urgent';
      default: return 'priority-normal';
    }
  };

  const getDaysClass = (days: number) => {
    if (days <= 3) return 'days-normal';
    if (days <= 7) return 'days-warning';
    return 'days-danger';
  };

  // ========== EXPORTAÇÃO PDF ==========

const exportToPDF = async () => {
  try {
    // Criar documento
    const doc = new jsPDF();
    
    // ========== CAPA ==========
    // Gradiente com retângulos
    doc.setFillColor(0, 102, 255);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFillColor(138, 43, 226);
    doc.rect(0, 40, 210, 10, 'F');
    
    // Logo e título
    doc.setFontSize(36);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('SIGEV', 105, 25, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema Integrado de Gestão da Escuta de Violência', 105, 35, { align: 'center' });
    
    // Título do relatório
    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Gerencial', 105, 80, { align: 'center' });
    
    // Período
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${formatDate(filters.startDate)} a ${formatDate(filters.endDate)}`, 105, 95, { align: 'center' });
    
    // Data de emissão
    doc.setFontSize(12);
    doc.setTextColor(150, 150, 150);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 105, 105, { align: 'center' });
    
    doc.addPage();
    
    // ========== 1. INDICADORES GERAIS ==========
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Indicadores Gerais', 14, 20);
    
    // Tabela de KPI - usando autoTable diretamente
    autoTable(doc, {
      startY: 30,
      head: [['Total de Processos', 'Pendentes', 'Concluídos', 'Média (dias)']],
      body: [[
        kpi.totalProcesses.toString(),
        kpi.pendingProcesses.toString(),
        kpi.completedProcesses.toString(),
        kpi.averageCompletionDays.toFixed(1)
      ]],
      theme: 'grid',
      headStyles: { 
        fillColor: [0, 102, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: { 
        textColor: [0, 0, 0],
        fillColor: [245, 245, 245]
      },
      margin: { left: 14, right: 14 }
    });

    // ========== 2. FORMAS DE IDENTIFICAÇÃO ==========
    doc.setFontSize(16);
    doc.text('2. Formas de Identificação', 14, (doc as any).lastAutoTable.finalY + 15);
    
    const totalIdent = identificationData.reduce((acc, curr) => acc + curr.value, 0);
    
    if (totalIdent > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Forma de Identificação', 'Quantidade', 'Percentual']],
        body: identificationData.map(item => [
          item.name,
          item.value.toString(),
          `${((item.value / totalIdent) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
        headStyles: { 
          fillColor: [138, 43, 226],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        margin: { left: 14, right: 14 }
      });
    }

    // ========== 3. VIOLÊNCIAS POR SEXO ==========
    if (violenceByGenderData.length > 0) {
      doc.addPage();
      doc.setFontSize(18);
      doc.text('3. Violências por Sexo', 14, 20);
      
      autoTable(doc, {
        startY: 30,
        head: [['Tipo de Violência', 'Masculino', 'Feminino', 'Outros', 'Total']],
        body: violenceByGenderData.map(v => [
          v.violenceType,
          v.masculine.toString(),
          v.feminine.toString(),
          v.other.toString(),
          v.total.toString()
        ]),
        theme: 'striped',
        headStyles: { 
          fillColor: [0, 212, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        margin: { left: 14, right: 14 }
      });
    }

    // ========== 4. PROCESSOS PENDENTES ==========
    if (pendingProcesses.length > 0) {
      doc.addPage();
      doc.setFontSize(18);
      doc.setTextColor(255, 20, 147);
      doc.text('4. Processos Pendentes', 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Total: ${pendingProcesses.length} processos`, 14, 30);
      
      autoTable(doc, {
        startY: 35,
        head: [['Cidadão', 'Idade', 'Unidade', 'Profissional', 'Abertura', 'Dias', 'Prioridade']],
        body: pendingProcesses.slice(0, 30).map(p => [
          p.citizenName,
          `${p.citizenAge}`,
          p.unit,
          p.professional,
          formatDate(p.createdAt),
          `${p.daysOpen}`,
          p.priority
        ]),
        theme: 'striped',
        headStyles: { 
          fillColor: [255, 20, 147],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        margin: { left: 14, right: 14 }
      });
    }

    // ========== 5. INATIVIDADE ==========
    if (inactivityData?.units?.length) {
      doc.addPage();
      doc.setFontSize(18);
      doc.setTextColor(0, 102, 255);
      doc.text('5. Relatório de Inatividade', 14, 20);
      
      let yPosition = 30;
      
      inactivityData.units.slice(0, 5).forEach((unit: any) => {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(unit.name, 14, yPosition);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`${unit.daysWithoutAccess} dias sem acesso`, 14, yPosition + 5);
        
        autoTable(doc, {
          startY: yPosition + 8,
          head: [['Profissional', 'Dias', 'Último acesso', 'Processos']],
          body: unit.professionals.map((prof: any) => [
            prof.name,
            `${prof.daysWithoutAccess}`,
            prof.lastAccess ? formatDate(prof.lastAccess) : 'Nunca',
            `${prof.assignedProcesses}`
          ]),
          theme: 'plain',
          headStyles: { fillColor: [220, 220, 220] },
          margin: { left: 14, right: 14 }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 15;
      });
    }

    // ========== RODAPÉ ==========
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      (doc as any).setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `SIGEV - Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        14,
        (doc as any).internal.pageSize.height - 10
      );
    }

    doc.save(`relatorio-sigev-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
    
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    alert('Erro ao gerar PDF: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
  }
};
  
  // ========== EXPORTAÇÃO EXCEL ==========
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Aba de KPI
      const kpiData = [
        ['Indicador', 'Valor'],
        ['Total de Processos', kpi.totalProcesses],
        ['Processos Pendentes', kpi.pendingProcesses],
        ['Processos Concluídos', kpi.completedProcesses],
        ['Média de Dias para Conclusão', kpi.averageCompletionDays]
      ];
      const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData);
      XLSX.utils.book_append_sheet(wb, kpiSheet, 'Indicadores');

      // Aba de Formas de Identificação
      const identData = [
        ['Forma de Identificação', 'Quantidade'],
        ...identificationData.map(item => [item.name, item.value])
      ];
      const identSheet = XLSX.utils.aoa_to_sheet(identData);
      XLSX.utils.book_append_sheet(wb, identSheet, 'Identificação');

      // Aba de Processos Pendentes
      if (pendingProcesses.length > 0) {
        const pendingData = [
          ['Cidadão', 'Idade', 'Unidade', 'Profissional', 'Data Abertura', 'Prazo', 'Dias Abertos', 'Prioridade', 'Violências'],
          ...pendingProcesses.map(p => [
            p.citizenName,
            p.citizenAge,
            p.unit,
            p.professional,
            formatDate(p.createdAt),
            p.deadline ? formatDate(p.deadline) : 'Sem prazo',
            p.daysOpen,
            p.priority,
            p.violences?.join(', ') || ''
          ])
        ];
        const pendingSheet = XLSX.utils.aoa_to_sheet(pendingData);
        XLSX.utils.book_append_sheet(wb, pendingSheet, 'Pendentes');
      }

      // Aba de Violências por Sexo
      if (violenceByGenderData.length > 0) {
        const violenceData = [
          ['Tipo de Violência', 'Masculino', 'Feminino', 'Outros', 'Total'],
          ...violenceByGenderData.map(v => [v.violenceType, v.masculine, v.feminine, v.other, v.total])
        ];
        const violenceSheet = XLSX.utils.aoa_to_sheet(violenceData);
        XLSX.utils.book_append_sheet(wb, violenceSheet, 'Violências por Sexo');
      }

      // Aba de Inatividade
      if (inactivityData?.units && inactivityData.units.length > 0) {
        const inactivityRows: any[] = [];
        inactivityData.units.forEach((unit: UnitInactivity) => {
          inactivityRows.push([`UNIDADE: ${unit.name}`, `Dias sem acesso: ${unit.daysWithoutAccess}`, '', '']);
          unit.professionals.forEach((prof: ProfessionalInactivity) => {
            inactivityRows.push([
              `  ${prof.name}`,
              `${prof.daysWithoutAccess} dias`,
              prof.lastAccess ? formatDate(prof.lastAccess) : 'Nunca',
              `${prof.assignedProcesses} processos`
            ]);
          });
          inactivityRows.push([]);
        });
        
        const inactivitySheet = XLSX.utils.aoa_to_sheet(inactivityRows);
        XLSX.utils.book_append_sheet(wb, inactivitySheet, 'Inatividade');
      }

      // Salvar arquivo
      XLSX.writeFile(wb, `relatorio-sigev-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      alert('Erro ao gerar Excel');
    }
  };

  if (authLoading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1>📊 Relatórios Gerenciais</h1>
        <div className="header-actions">
          <button className="btn-export" onClick={exportToPDF} disabled={loading}>
            📄 Exportar PDF
          </button>
          <button className="btn-export" onClick={exportToExcel} disabled={loading}>
            📊 Exportar Excel
          </button>
          <button className="btn-secondary" onClick={loadAllReports} disabled={loading}>
            ↻ Atualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-panel">
        <div className="filters-title">
          <span>🔍</span> Filtros
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Data Inicial</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Data Final</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Unidade</label>
            <select
              value={filters.unitId}
              onChange={(e) => handleFilterChange('unitId', e.target.value)}
            >
              <option value="">Todas as unidades</option>
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
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
              <option value="PENDING">Pendentes</option>
              <option value="IN_PROGRESS">Em Andamento</option>
              <option value="COMPLETED">Concluídos</option>
            </select>
          </div>
        </div>
        <div className="filters-actions">
          <button className="btn-secondary" onClick={resetFilters}>
            Limpar Filtros
          </button>
          <button className="btn-primary" onClick={applyFilters} disabled={loading}>
            {loading ? 'Carregando...' : 'Aplicar Filtros'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Gerando relatórios...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Total de Processos</div>
              <div className="kpi-value">{kpi.totalProcesses}</div>
              <div className="kpi-trend">📊 No período</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Pendentes</div>
              <div className="kpi-value">{kpi.pendingProcesses}</div>
              <div className="kpi-trend negative">⏳ Aguardando</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Concluídos</div>
              <div className="kpi-value">{kpi.completedProcesses}</div>
              <div className="kpi-trend positive">✅ Finalizados</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Média de Conclusão</div>
              <div className="kpi-value">{kpi.averageCompletionDays.toFixed(1)}</div>
              <div className="kpi-trend">📅 Dias</div>
            </div>
          </div>

          <div className="reports-grid">
            {/* Gráfico de Formas de Identificação (Item 7.2) */}
            <div className="report-card">
              <div className="report-header">
                <h2><span>📋</span> Formas de Identificação</h2>
              </div>
              <div className="report-content">
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={identificationData.filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {identificationData.filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1a2e', 
                          border: '1px solid #2a2a2a',
                          color: 'white'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-legend">
                  {identificationData.filter(d => d.value > 0).map((item, index) => (
                    <div key={index} className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                      <span>{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gráfico de Violências por Sexo (Item 7.3) */}
            <div className="report-card">
              <div className="report-header">
                <h2><span>👥</span> Violências por Sexo</h2>
              </div>
              <div className="report-content">
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={violenceByGenderData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                      <XAxis dataKey="violenceType" stroke="#6b7280" angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1a2e', 
                          border: '1px solid #2a2a2a',
                          color: 'white'
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="masculine" fill={COLORS[0]} name="Masculino" />
                      <Bar dataKey="feminine" fill={COLORS[1]} name="Feminino" />
                      <Bar dataKey="other" fill={COLORS[2]} name="Outros" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Gráfico de Inatividade (Item 7.1) */}
            <div className="report-card full-width">
              <div className="report-header">
                <h2><span>⏰</span> Inatividade por Unidade/Profissional</h2>
              </div>
              <div className="report-content">
                {inactivityData?.units && inactivityData.units.length > 0 ? (
                  <div className="inactivity-list">
                    {inactivityData.units.map((unit: UnitInactivity) => (
                      <div key={unit.id} className="inactivity-unit">
                        <div className="unit-header">
                          <span className="unit-name">{unit.name}</span>
                          <span className="unit-days">
                            <span>{unit.daysWithoutAccess}</span> dias sem acesso | 
                            <span> {unit.totalProcesses}</span> processos
                          </span>
                        </div>
                        <div className="professionals-list">
                          {unit.professionals.map((prof: ProfessionalInactivity) => (
                            <div key={prof.id} className="professional-item">
                              <div className="professional-info">
                                <div className="professional-avatar">
                                  {prof.name.charAt(0)}
                                </div>
                                <span className="professional-name">{prof.name}</span>
                              </div>
                              <span className={`professional-days ${getDaysClass(prof.daysWithoutAccess)}`}>
                                {prof.daysWithoutAccess} dias
                              </span>
                              <span className="professional-processes">
                                {prof.assignedProcesses} processos
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">Nenhum dado de inatividade disponível</p>
                )}
              </div>
            </div>

            {/* Relatório de Processos Pendentes por Unidade (Item 9.2) */}
            <div className="report-card full-width">
              <div className="report-header">
                <h2><span>⏳</span> Processos Pendentes</h2>
              </div>
              <div className="report-content">
                {pendingProcesses.length === 0 ? (
                  <p className="no-data">Nenhum processo pendente encontrado</p>
                ) : (
                  <div className="table-responsive">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Cidadão</th>
                          <th>Idade</th>
                          <th>Unidade</th>
                          <th>Profissional</th>
                          <th>Aberto em</th>
                          <th>Prazo</th>
                          <th>Dias</th>
                          <th>Prioridade</th>
                          <th>Violências</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingProcesses.slice(0, 50).map((process) => (
                          <tr key={process.id}>
                            <td>{process.citizenName}</td>
                            <td>{process.citizenAge} anos</td>
                            <td>{process.unit}</td>
                            <td>{process.professional}</td>
                            <td>{formatDate(process.createdAt)}</td>
                            <td>{process.deadline ? formatDate(process.deadline) : '-'}</td>
                            <td>
                              <span className={`days-badge ${getDaysClass(process.daysOpen)}`}>
                                {process.daysOpen} dias
                              </span>
                            </td>
                            <td>
                              <span className={`priority-badge ${getPriorityClass(process.priority)}`}>
                                {process.priority}
                              </span>
                            </td>
                            <td>{process.violences?.slice(0, 2).join(', ')}{process.violences && process.violences.length > 2 ? '...' : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {pendingProcesses.length > 50 && (
                      <p className="table-note">* Mostrando 50 de {pendingProcesses.length} processos</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Relatório de Processos por Cidadão (Item 9.1) */}
            <div className="report-card full-width">
              <div className="report-header">
                <h2><span>👤</span> Processos por Cidadão</h2>
              </div>
              <div className="report-content">
                {processesByCitizen.length === 0 ? (
                  <p className="no-data">Nenhum processo encontrado no período</p>
                ) : (
                  processesByCitizen.slice(0, 10).map((citizen) => (
                    <div key={citizen.citizenId} className="citizen-section">
                      <div className="citizen-header">
                        <div>
                          <strong className="citizen-name">{citizen.citizenName}</strong>
                          <span className="citizen-birth">
                            Nasc: {formatDate(citizen.birthDate)}
                          </span>
                        </div>
                        <span className="citizen-count">
                          {citizen.totalProcesses} processo(s)
                        </span>
                      </div>
                      <div className="table-responsive">
                        <table className="report-table">
                          <thead>
                            <tr>
                              <th>Data</th>
                              <th>Unidade</th>
                              <th>Profissional</th>
                              <th>Identificação</th>
                              <th>Violências</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {citizen.processes.slice(0, 5).map((process) => (
                              <tr key={process.id}>
                                <td>{formatDate(process.date)}</td>
                                <td>{process.unit}</td>
                                <td>{process.professional}</td>
                                <td>{process.identificationForm}</td>
                                <td>{process.violences.join(', ')}</td>
                                <td>{process.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {citizen.processes.length > 5 && (
                        <p className="table-note">* Mostrando 5 de {citizen.processes.length} processos</p>
                      )}
                    </div>
                  ))
                )}
                {processesByCitizen.length > 10 && (
                  <p className="table-note">* Mostrando 10 de {processesByCitizen.length} cidadãos</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}