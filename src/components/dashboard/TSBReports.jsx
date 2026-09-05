import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { fetchTSBReports } from '../../api/odoo';

export default function TSBReports({ showToast }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const getCurrentMonthStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const generateDefaultMonths = () => {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const list = [];
    for (let year = currentYear; year >= 2026; year--) {
      const startM = (year === currentYear) ? currentMonth : 12;
      const endM = (year === 2026) ? 4 : 1;
      for (let m = startM; m >= endM; m--) {
        const monthStr = `${year}-${String(m).padStart(2, '0')}`;
        list.push({
          value: monthStr,
          label: `${monthNames[m - 1]} ${year}`
        });
      }
    }
    return list;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [availableMonths, setAvailableMonths] = useState(generateDefaultMonths());
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedStates, setSelectedStates] = useState(['posted']);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const STATUS_OPTIONS = [
    { value: 'posted', label: 'Publicado' },
    { value: 'cancel', label: 'Cancelado' },
    { value: 'draft', label: 'Borrador' }
  ];

  const extractMonthsFromReports = (data) => {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const set = new Set();
    if (Array.isArray(data)) {
      data.forEach(r => {
        if (r && r.date && r.date.length >= 7) {
          const yyyymm = r.date.substring(0, 7);
          if (/^\d{4}-\d{2}$/.test(yyyymm)) {
            set.add(yyyymm);
          }
        }
      });
    }
    const sorted = Array.from(set).sort().reverse();
    return sorted.map(m => {
      const [year, monthNum] = m.split('-');
      const idx = parseInt(monthNum, 10) - 1;
      const name = monthNames[idx] || monthNum;
      return {
        value: m,
        label: `${name} ${year}`
      };
    });
  };

  const monthOptions = useMemo(() => {
    const map = new Map();
    generateDefaultMonths().forEach(m => map.set(m.value, m.label));
    availableMonths.forEach(m => map.set(m.value, m.label));
    
    const combined = Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    combined.sort((a, b) => b.value.localeCompare(a.value));
    
    return [{ value: '', label: 'Todos los meses' }, ...combined];
  }, [availableMonths]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadReports(selectedMonth);
  }, [selectedMonth]);

  const loadReports = async (monthToLoad = selectedMonth) => {
    setLoading(true);
    try {
      const data = await fetchTSBReports(monthToLoad);
      if (data && data.error) throw new Error(data.error);
      const reportList = Array.isArray(data) ? data : [];
      setReports(reportList);

      if (monthToLoad === '' || availableMonths.length === 0) {
        const months = extractMonthsFromReports(reportList);
        if (months.length > 0) {
          setAvailableMonths(months);
        }
      }
    } catch (err) {
      showToast(`Error al cargar reportes: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const savedUser = localStorage.getItem('odoo_user');
      if (!savedUser) return;
      const user = JSON.parse(savedUser);
      
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';
      const monthParam = selectedMonth ? `?month=${encodeURIComponent(selectedMonth)}` : '';
      const response = await fetch(`${API_BASE}/tsb/reports/export${monthParam}`, {
        headers: {
          'X-Odoo-User': user.username,
          'X-Odoo-Key': user.password
        }
      });

      if (!response.ok) throw new Error('Error al generar el reporte');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const monthSuffix = selectedMonth ? selectedMonth : 'todos';
      a.download = `reporte_kardex_tsb_${monthSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showToast('Excel generado correctamente', 'success');
    } catch (err) {
      showToast(`Error al exportar: ${err.message}`, 'error');
    }
  };

  const [movementFilter, setMovementFilter] = useState('all');
  const [docTypeFilter, setDocTypeFilter] = useState('all');

  const safeReports = Array.isArray(reports) ? reports : [];

  const getDocType = (report) => {
    if (!report) return '';
    if (report.move_type === 'initial_inventory') return 'Inventario Inicial';
    const name = (report.name || '').toUpperCase();
    const serial = (report.serial || '').toUpperCase();
    if (name.startsWith('B') || serial.startsWith('B') || name.startsWith('B-') || serial.startsWith('BT')) return 'Boleta';
    if (name.startsWith('F') || serial.startsWith('F') || name.startsWith('F-') || serial.startsWith('FT')) return 'Factura';
    return report.move_type === 'out_invoice' ? 'Factura Cliente' : 'Factura Proveedor';
  };

  const filteredReports = safeReports.filter(r => {
    if (!r) return false;
    const name = (r.name || '').toLowerCase();
    const partner = (r.partner || '').toLowerCase();
    const partnerVat = (r.partner_vat || '').toLowerCase();
    const serial = (r.serial || '').toLowerCase();
    const correlative = (r.correlative || '').toLowerCase();
    const searchFilter = (filter || '').toLowerCase();

    const matchesSearch = name.includes(searchFilter) || 
                          partner.includes(searchFilter) ||
                          partnerVat.includes(searchFilter) ||
                          serial.includes(searchFilter) ||
                          correlative.includes(searchFilter);
    const matchesState = selectedStates.length === 0 || selectedStates.includes(r.state);
    
    const matchesMovement = movementFilter === 'all' || r.move_type === movementFilter;
    
    const docType = getDocType(r);
    const matchesDocType = docTypeFilter === 'all' || 
      (docTypeFilter === 'boleta' && docType === 'Boleta') || 
      (docTypeFilter === 'factura' && docType === 'Factura') ||
      (docTypeFilter === 'inicial' && docType === 'Inventario Inicial');

    return matchesSearch && matchesState && matchesMovement && matchesDocType;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const totalAmount = filteredReports.reduce((sum, r) => sum + (r.amount_total || 0), 0);
  const totalIn = filteredReports.filter(r => r.move_type === 'in_invoice' || r.move_type === 'initial_inventory').reduce((sum, r) => sum + (r.amount_total || 0), 0);
  const totalOut = filteredReports.filter(r => r.move_type === 'out_invoice').reduce((sum, r) => sum + (r.amount_total || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full"></div>
        <p className="text-gray-400 animate-pulse">Cargando reportes de Tambopata...</p>
      </div>
    );
  }

  const seriesMapping = {
    'BT06': 'apa bar',
    'BT07': 'apa boutique',
    'BT02': 'ara bar',
    'BT04': 'ara boutique',
    'BT03': 'bar trc',
    'BT05': 'boutique ara',
    'BT01': 'cafetin',
    'BT08': 'oficina central compartido'
  };

  const getLocation = (report) => {
    if (!report) return null;
    if (report.move_type === 'initial_inventory') {
      const firstItem = Array.isArray(report.items) && report.items[0];
      if (firstItem && firstItem.analytic) {
        let loc = firstItem.analytic;
        if (loc.includes(' (')) loc = loc.split(' (')[0];
        return loc.toUpperCase();
      }
      return 'INVENTARIO INICIAL';
    }
    if (report.move_type !== 'out_invoice') return null;
    const serial = report.serial || report.name?.split('-')[1];
    return seriesMapping[serial] || null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#161B22] border border-gray-800 p-5 rounded-2xl shadow-xl backdrop-blur-sm bg-opacity-80">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Consolidado</p>
          <h3 className="text-2xl font-bold text-white mt-1">
            S/ {totalAmount.toLocaleString('en-PE', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-blue-400 mt-1 font-medium">{filteredReports.length} documentos</p>
        </div>
        
        <div className="bg-[#161B22] border border-gray-800 p-5 rounded-2xl shadow-xl backdrop-blur-sm bg-opacity-80">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Entradas (Proveedores / Inicial)</p>
          <h3 className="text-2xl font-bold text-amber-400 mt-1">
            S/ {totalIn.toLocaleString('en-PE', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-amber-400/80 mt-1 font-medium">Ingresos a Almacén</p>
        </div>

        <div className="bg-[#161B22] border border-gray-800 p-5 rounded-2xl shadow-xl backdrop-blur-sm bg-opacity-80">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Salidas (Ventas)</p>
          <h3 className="text-2xl font-bold text-emerald-400 mt-1">
            S/ {totalOut.toLocaleString('en-PE', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-emerald-400/80 mt-1 font-medium">Descuentos de Inventario</p>
        </div>

        <div className="bg-[#161B22] border border-gray-800 p-5 rounded-2xl shadow-xl backdrop-blur-sm bg-opacity-80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</span>
            <button 
              onClick={() => loadReports(selectedMonth)}
              className="text-blue-400 hover:text-blue-300 transition-colors text-xs flex items-center font-semibold"
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Recargar
            </button>
          </div>
          <button 
            onClick={handleExportExcel}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl transition-all text-xs font-bold flex items-center justify-center shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar Excel Organizado
          </button>
        </div>
      </div>

      {/* Filter Tabs & Month Selector */}
      <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Movement Type Tabs */}
          <div className="flex items-center bg-[#0D1117] p-1 rounded-xl border border-gray-800 w-full lg:w-auto">
            <button
              onClick={() => setMovementFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 lg:flex-none ${
                movementFilter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Todos los Movimientos
            </button>
            <button
              onClick={() => setMovementFilter('in_invoice')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 lg:flex-none ${
                movementFilter === 'in_invoice' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Entradas (Proveedores)
            </button>
            <button
              onClick={() => setMovementFilter('initial_inventory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 lg:flex-none ${
                movementFilter === 'initial_inventory' ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Inventario Inicial
            </button>
            <button
              onClick={() => setMovementFilter('out_invoice')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 lg:flex-none ${
                movementFilter === 'out_invoice' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Salidas (Ventas / Clientes)
            </button>
          </div>

          {/* Doc Type Selector */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center bg-[#0D1117] p-1 rounded-xl border border-gray-800">
              <button
                onClick={() => setDocTypeFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  docTypeFilter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Todos Comprobantes
              </button>
              <button
                onClick={() => setDocTypeFilter('factura')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  docTypeFilter === 'factura' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Facturas
              </button>
              <button
                onClick={() => setDocTypeFilter('boleta')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  docTypeFilter === 'boleta' ? 'bg-sky-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Boletas
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center pt-2 border-t border-gray-800/60">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Filtrar por serie, correlativo, producto o cliente/proveedor..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-[#0D1117] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50 text-gray-200 placeholder-gray-600 transition-all text-xs"
            />
            <svg className="absolute left-3.5 top-3 w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="w-full sm:w-64 flex items-center bg-[#0D1117] border border-gray-800 rounded-xl px-3 py-2 text-xs">
            <svg className="w-4 h-4 text-blue-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-transparent text-gray-200 focus:outline-none cursor-pointer text-xs font-medium"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#161B22] text-gray-200">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-[#161B22] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0D1117] border-b border-gray-800">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-tighter">Documento</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-tighter">Tipo & Movimiento</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-tighter">Serie / Corr.</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-tighter">Punto de Venta / Origen</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-tighter text-right">Total (S/)</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-tighter text-center relative">
                  <button 
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className="flex items-center justify-center w-full hover:text-blue-400 transition-colors group"
                  >
                    Estado
                    <svg className={`w-3 h-3 ml-1 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isStatusDropdownOpen && (
                    <div 
                      ref={dropdownRef}
                      className="absolute right-0 mt-2 w-48 bg-[#161B22] border border-gray-800 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200"
                    >
                      <div className="space-y-1">
                        {STATUS_OPTIONS.map((option) => (
                          <label 
                            key={option.value}
                            className="flex items-center px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedStates.includes(option.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStates([...selectedStates, option.value]);
                                } else {
                                  setSelectedStates(selectedStates.filter(s => s !== option.value));
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                            />
                            <span className="ml-3 text-xs font-medium text-gray-300 normal-case tracking-normal">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-800 flex justify-between px-1">
                        <button 
                          onClick={() => setSelectedStates(STATUS_OPTIONS.map(o => o.value))}
                          className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase"
                        >
                          Todos
                        </button>
                        <button 
                          onClick={() => setSelectedStates([])}
                          className="text-[10px] text-gray-500 hover:text-gray-400 font-bold uppercase"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>
                  )}
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-tighter w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredReports.map((report) => {
                if (!report) return null;
                const location = getLocation(report);
                const items = Array.isArray(report.items) ? report.items : [];
                const amountTotal = (report.amount_total || 0).toLocaleString('en-PE', { minimumFractionDigits: 2 });
                const docType = getDocType(report);
                const isInitial = report.move_type === 'initial_inventory';
                const isIncoming = report.move_type === 'in_invoice' || isInitial;

                const dotColorClass = isInitial 
                  ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50' 
                  : (report.move_type === 'in_invoice' ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-emerald-400 shadow-sm shadow-emerald-400/50');
                
                const docTypeBadgeClass = isInitial 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                  : (docType === 'Boleta' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20');

                const moveTypeBadgeClass = isInitial 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                  : (report.move_type === 'in_invoice' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20');

                const moveTypeLabel = isInitial 
                  ? 'INVENTARIO INICIAL' 
                  : (report.move_type === 'in_invoice' ? 'ENTRADA (Proveedor)' : 'SALIDA (Venta)');

                return (
                  <Fragment key={report.id}>
                    <tr 
                      className={`hover:bg-blue-500/5 transition-colors cursor-pointer ${expandedRow === report.id ? 'bg-blue-500/5' : ''}`}
                      onClick={() => setExpandedRow(expandedRow === report.id ? null : report.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-2.5 h-2.5 rounded-full mr-3 ${dotColorClass}`} title={moveTypeLabel}></div>
                          <div className="flex flex-col">
                            <span className="font-mono text-sm text-blue-400 font-bold">{report.name || '-'}</span>
                            <span className="text-[10px] text-gray-500 font-medium">{report.date || '-'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${docTypeBadgeClass}`}>
                            {docType}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${moveTypeBadgeClass}`}>
                            {moveTypeLabel}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-200 font-mono font-bold">{report.serial || '-'}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{report.correlative || '-'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          {location ? (
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{location}</span>
                          ) : (
                            <span className="text-xs text-gray-200 font-medium truncate max-w-[220px]">{report.partner || '-'}</span>
                          )}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {location && <span className="text-[10px] text-gray-400 truncate max-w-[170px]">{report.partner || '-'}</span>}
                            {report.partner_vat && (
                              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                                RUC: {report.partner_vat}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-mono text-right text-gray-100 font-bold">
                        S/ {amountTotal}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          report.state === 'posted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-500'
                        }`}>
                          {report.state === 'posted' ? 'Publicado' : report.state}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <svg 
                          className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${expandedRow === report.id ? 'rotate-180 text-blue-400' : ''}`} 
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </td>
                    </tr>
                    
                    {expandedRow === report.id && (
                      <tr className="bg-[#0D1117] animate-in fade-in duration-300">
                        <td colSpan="7" className="px-6 py-4">
                          <div className="bg-[#161B22] border border-blue-500/20 rounded-xl p-4 shadow-inner">
                            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center">
                              <svg className="w-3.5 h-3.5 mr-1.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                              </svg>
                              Detalle de Líneas de {isIncoming ? 'Entrada (Factura/Boleta Proveedor)' : 'Salida (Factura/Boleta Cliente)'}
                            </h4>
                            <table className="w-full text-left">
                              <thead>
                                <tr className="text-[10px] text-gray-500 uppercase border-b border-gray-800">
                                  <th className="pb-2">Producto</th>
                                  {isIncoming && <th className="pb-2 text-center">Unidad de Negocio / Distribución</th>}
                                  <th className="pb-2 text-right">{isIncoming ? 'Cant. Entrada' : 'Cant. Salida'}</th>
                                  <th className="pb-2 text-right">{isIncoming ? 'Costo Unit.' : 'Precio Unit.'}</th>
                                  <th className="pb-2 text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800/30">
                                {items.map((item) => {
                                  const qty = item.quantity || 0;
                                  const unit = item.price_unit || 0;
                                  const sub = (qty * unit).toLocaleString('en-PE', { minimumFractionDigits: 2 });
                                  return (
                                    <tr key={item.id} className="text-xs text-gray-300">
                                      <td className="py-2.5 pr-4 font-medium text-gray-200">{item.product_name || 'Descuento / Ajuste'}</td>
                                      {isIncoming && (
                                        <td className="py-2.5 text-center">
                                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                                            {item.analytic || 'General'}
                                          </span>
                                        </td>
                                      )}
                                      <td className="py-2.5 text-right font-mono font-semibold">{qty}</td>
                                      <td className="py-2.5 text-right font-mono text-gray-400">S/ {unit.toFixed(2)}</td>
                                      <td className="py-2.5 text-right font-mono text-gray-100 font-bold">
                                        S/ {sub}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500 italic">
                    No se encontraron comprobantes que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
