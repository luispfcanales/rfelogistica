import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

// Initial default Odoo Analytic Account Mapping based on user's Odoo setup
const DEFAULT_BUSINESS_UNITS = [
  { id: '937', name: 'APA Bar', aliases: ['apa bar', 'apa/bar', 'bar apa', 'apa'] },
  { id: '936', name: 'APA Boutique', aliases: ['apa boutique', 'boutique apa'] },
  { id: '939', name: 'ARA Bar', aliases: ['ara bar', 'ara/bar', 'bar ara', 'ara'] },
  { id: '938', name: 'ARA Boutique', aliases: ['ara boutique', 'boutique ara'] },
  { id: '935', name: 'PM Cafetin', aliases: ['pm cafetin', 'cafetin', 'pem cafetin', 'pem/cafetin', 'cafetin pem'] },
  { id: '941', name: 'TRC Bar', aliases: ['trc bar', 'trc/bar', 'bar trc', 'trc'] },
  { id: '940', name: 'TRC Boutique', aliases: ['trc boutique', 'boutique trc'] }
];

export default function AnalyticConverter({ showToast }) {
  const [businessUnits, setBusinessUnits] = useState(DEFAULT_BUSINESS_UNITS);
  const [fileName, setFileName] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [rawWorkbook, setRawWorkbook] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [targetColumn, setTargetColumn] = useState('');
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'CONVERTED', 'WARNING'

  // Modals state
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [selectedRowForDistribution, setSelectedRowForDistribution] = useState(null);
  const [editDistributionItems, setEditDistributionItems] = useState([]);

  // Form states for adding new business unit
  const [newUnitId, setNewUnitId] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitAliases, setNewUnitAliases] = useState('');

  // Normalize string for matching
  const normalize = (str) => {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Utility to split 100% equally among N unit IDs so the sum is GUARANTEED to be exactly 100.00%
  const makeEqualDistribution = (unitIds) => {
    if (!unitIds || unitIds.length === 0) return [];
    const n = unitIds.length;
    const basePct = Math.floor((100 / n) * 100) / 100; // 2 decimals rounded down
    let currentTotal = basePct * n;
    let diff = Math.round((100 - currentTotal) * 100) / 100; // Remainder to reach 100.00%

    return unitIds.map((id, idx) => {
      // Add the remainder to the last item so the total is 100.00%
      const pct = idx === n - 1 ? Math.round((basePct + diff) * 100) / 100 : basePct;
      return {
        unitId: id,
        percentage: pct
      };
    });
  };

  // Convert array of distribution items into Odoo JSON format: {"937": 33.33, "941": 33.33, "939": 33.34}
  const buildJsonFromDistribution = (items) => {
    if (!items || items.length === 0) return '';
    const obj = {};
    items.forEach(it => {
      if (it.unitId) {
        obj[it.unitId] = Math.round(Number(it.percentage || 0) * 100) / 100;
      }
    });
    return JSON.stringify(obj);
  };

  // Parse raw text or JSON into distribution items and Odoo JSON format
  const convertToAnalyticJson = (rawValue) => {
    if (rawValue === null || rawValue === undefined) {
      return { jsonStr: '', items: [], status: 'EMPTY' };
    }
    
    const strVal = String(rawValue).trim();
    if (!strVal) return { jsonStr: '', items: [], status: 'EMPTY' };

    // 1. Check if cell is already valid JSON like {"941": 100.0} or {"937": 33.33, "941": 33.33, "939": 33.34}
    if (strVal.startsWith('{') && strVal.endsWith('}')) {
      try {
        const parsed = JSON.parse(strVal);
        if (typeof parsed === 'object' && parsed !== null) {
          const items = Object.entries(parsed).map(([id, pct]) => ({
            unitId: id,
            percentage: Number(pct) || 0
          }));
          return { jsonStr: strVal, items, status: 'ALREADY_JSON' };
        }
      } catch (e) {
        // Not valid JSON, continue to text matching
      }
    }

    const normVal = normalize(strVal);

    // 2. Find ALL business units referenced in the text cell
    const matchedUnitIds = [];
    businessUnits.forEach(unit => {
      const normName = normalize(unit.name);
      if (strVal === unit.id || normVal === normName) {
        matchedUnitIds.push(unit.id);
        return;
      }
      for (const alias of unit.aliases) {
        if (normVal === normalize(alias) || (alias.length >= 3 && normVal.includes(normalize(alias)))) {
          matchedUnitIds.push(unit.id);
          break;
        }
      }
    });

    const uniqueUnitIds = Array.from(new Set(matchedUnitIds));

    if (uniqueUnitIds.length > 0) {
      const items = makeEqualDistribution(uniqueUnitIds);
      const jsonStr = buildJsonFromDistribution(items);
      return { jsonStr, items, status: 'CONVERTED' };
    }

    // Unmapped warning
    return { jsonStr: strVal, items: [], status: 'WARNING' };
  };

  // Handle Excel File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellStyles: true });
        setRawWorkbook(workbook);

        const firstSheetName = workbook.SheetNames[0];
        setSheetName(firstSheetName);
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!jsonRows || jsonRows.length === 0) {
          if (showToast) showToast('El archivo Excel está vacío', 'error');
          return;
        }

        const rawHeaders = jsonRows[0].map(h => String(h).trim());
        setHeaders(rawHeaders);

        // Auto-detect column name containing "distribución" or "distribucion" or "analítica" or "analytic"
        let autoCol = rawHeaders.find(h => {
          const norm = normalize(h);
          return norm.includes('distribucion') || norm.includes('distribucion analitica') || norm.includes('analitica') || norm.includes('analytic');
        });

        if (!autoCol && rawHeaders.length > 0) {
          autoCol = rawHeaders[0];
        }

        setTargetColumn(autoCol || '');
        processExcelRows(jsonRows, autoCol || '');

        if (showToast) showToast(`Archivo ${file.name} cargado correctamente`, 'success');
      } catch (err) {
        console.error(err);
        if (showToast) showToast(`Error al leer el archivo Excel: ${err.message}`, 'error');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Process rows with selected target column
  const processExcelRows = (jsonRows, colName) => {
    if (!jsonRows || jsonRows.length < 2) {
      setRows([]);
      return;
    }

    const headerList = jsonRows[0].map(h => String(h).trim());
    const colIndex = headerList.indexOf(colName);

    const processed = [];

    for (let i = 1; i < jsonRows.length; i++) {
      const rowData = jsonRows[i];
      if (!rowData || rowData.every(cell => cell === '' || cell === null)) continue;

      const origVal = colIndex !== -1 ? rowData[colIndex] : '';
      const conversion = convertToAnalyticJson(origVal);

      // Find description and line price/total if present
      let desc = '';
      let subtotalPrice = 0;

      headerList.forEach((h, idx) => {
        const hNorm = normalize(h);
        if (hNorm.includes('producto') || hNorm.includes('lineas de factura/producto') || hNorm.includes('descripcion') || hNorm.includes('contacto')) {
          if (!desc && rowData[idx]) desc = String(rowData[idx]);
        }
        if (hNorm.includes('subtotal') || hNorm.includes('precio') || hNorm.includes('monto')) {
          const num = parseFloat(rowData[idx]);
          if (!isNaN(num) && num > 0) subtotalPrice = num;
        }
      });

      processed.push({
        rowIndex: i + 1,
        rawRow: rowData,
        description: desc,
        subtotalPrice: subtotalPrice,
        originalValue: origVal,
        newValue: conversion.jsonStr,
        items: conversion.items,
        status: conversion.status
      });
    }

    setRows(processed);
  };

  // Re-process when user selects a different column
  const handleColumnChange = (newCol) => {
    setTargetColumn(newCol);
    if (rawWorkbook && sheetName) {
      const worksheet = rawWorkbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      processExcelRows(jsonRows, newCol);
    }
  };

  // Quick single unit dropdown selection in table
  const handleSingleUnitSelect = (rowIndex, unitId) => {
    setRows(prevRows => prevRows.map(r => {
      if (r.rowIndex === rowIndex) {
        if (!unitId) return r;
        const items = [{ unitId, percentage: 100.0 }];
        const jsonStr = buildJsonFromDistribution(items);
        return {
          ...r,
          newValue: jsonStr,
          items: items,
          status: 'CONVERTED'
        };
      }
      return r;
    }));
  };

  // Open Percentage Distribution Modal for a specific row
  const handleOpenDistributionModal = (row) => {
    setSelectedRowForDistribution(row);
    // If row already has items, use them; if empty, initialize with 1 default line
    if (row.items && row.items.length > 0) {
      setEditDistributionItems(JSON.parse(JSON.stringify(row.items)));
    } else {
      setEditDistributionItems([{ unitId: businessUnits[0]?.id || '937', percentage: 100.0 }]);
    }
  };

  // Update a line in the distribution modal
  const handleUpdateDistributionLine = (idx, field, val) => {
    setEditDistributionItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          [field]: field === 'percentage' ? (parseFloat(val) || 0) : val
        };
      }
      return item;
    }));
  };

  // Add line to distribution modal
  const handleAddDistributionLine = () => {
    // Pick first unused unit if possible
    const usedIds = new Set(editDistributionItems.map(it => it.unitId));
    const available = businessUnits.find(u => !usedIds.has(u.id)) || businessUnits[0];
    setEditDistributionItems(prev => [
      ...prev,
      { unitId: available?.id || '937', percentage: 0 }
    ]);
  };

  // Remove line from distribution modal
  const handleRemoveDistributionLine = (idx) => {
    setEditDistributionItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Equal split button inside distribution modal (sums exactly 100.00%)
  const handleAutoEqualSplit = () => {
    if (editDistributionItems.length === 0) return;
    const ids = editDistributionItems.map(it => it.unitId);
    const balanced = makeEqualDistribution(ids);
    setEditDistributionItems(balanced);
  };

  // Save distribution modal
  const handleSaveDistributionModal = () => {
    if (!selectedRowForDistribution) return;

    const sum = editDistributionItems.reduce((acc, it) => acc + (Number(it.percentage) || 0), 0);
    const roundedSum = Math.round(sum * 100) / 100;

    if (Math.abs(roundedSum - 100) > 0.01) {
      if (showToast) showToast(`Los porcentajes deben sumar exactamente 100.00% (Actual: ${roundedSum.toFixed(2)}%)`, 'error');
      return;
    }

    const newJson = buildJsonFromDistribution(editDistributionItems);

    setRows(prevRows => prevRows.map(r => {
      if (r.rowIndex === selectedRowForDistribution.rowIndex) {
        return {
          ...r,
          newValue: newJson,
          items: editDistributionItems,
          status: 'CONVERTED'
        };
      }
      return r;
    }));

    if (showToast) showToast('Distribución analítica actualizada correctamente', 'success');
    setSelectedRowForDistribution(null);
  };

  // Add custom Business Unit mapping
  const handleAddBusinessUnit = (e) => {
    e.preventDefault();
    if (!newUnitId.trim() || !newUnitName.trim()) {
      if (showToast) showToast('El ID y el Nombre son obligatorios', 'error');
      return;
    }

    const aliases = newUnitAliases
      .split(',')
      .map(a => a.trim().toLowerCase())
      .filter(Boolean);

    const newUnit = {
      id: newUnitId.trim(),
      name: newUnitName.trim(),
      aliases: Array.from(new Set([newUnitName.trim().toLowerCase(), ...aliases]))
    };

    const updated = [...businessUnits.filter(u => u.id !== newUnit.id), newUnit];
    setBusinessUnits(updated);
    setNewUnitId('');
    setNewUnitName('');
    setNewUnitAliases('');
    setIsMappingModalOpen(false);

    if (showToast) showToast(`Unidad de negocio ${newUnit.name} (${newUnit.id}) agregada`, 'success');

    if (rawWorkbook && sheetName && targetColumn) {
      const worksheet = rawWorkbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      processExcelRows(jsonRows, targetColumn);
    }
  };

  // Download converted Excel file
  const handleDownloadExcel = () => {
    if (!rawWorkbook || !sheetName || rows.length === 0) {
      if (showToast) showToast('No hay datos procesados para descargar', 'error');
      return;
    }

    try {
      const worksheet = rawWorkbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      const colIndex = headers.indexOf(targetColumn);
      if (colIndex === -1) {
        if (showToast) showToast('No se encontró la columna seleccionada', 'error');
        return;
      }

      // Update values in row matrix
      rows.forEach(r => {
        const rIdx = r.rowIndex - 1; // 0-indexed in jsonRows
        if (jsonRows[rIdx]) {
          jsonRows[rIdx][colIndex] = r.newValue;
        }
      });

      // Create new Worksheet and Workbook
      const newSheet = XLSX.utils.aoa_to_sheet(jsonRows);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newSheet, sheetName);

      // Export file
      const outFileName = fileName ? `CONVERTIDO_${fileName}` : 'Distribución_Analítica_Odoo.xlsx';
      XLSX.writeFile(newWorkbook, outFileName);

      if (showToast) showToast(`Archivo ${outFileName} descargado exitosamente`, 'success');
    } catch (err) {
      console.error(err);
      if (showToast) showToast(`Error al exportar Excel: ${err.message}`, 'error');
    }
  };

  // Filtered rows for UI table
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (filterStatus === 'CONVERTED' && r.status !== 'CONVERTED') return false;
      if (filterStatus === 'WARNING' && r.status !== 'WARNING') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchDesc = r.description.toLowerCase().includes(q);
        const matchOrig = String(r.originalValue).toLowerCase().includes(q);
        const matchNew = String(r.newValue).toLowerCase().includes(q);
        const matchRow = String(r.rowIndex).includes(q);
        return matchDesc || matchOrig || matchNew || matchRow;
      }

      return true;
    });
  }, [rows, filterStatus, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = rows.length;
    const converted = rows.filter(r => r.status === 'CONVERTED' || r.status === 'ALREADY_JSON').length;
    const warnings = rows.filter(r => r.status === 'WARNING').length;
    return { total, converted, warnings };
  }, [rows]);

  // Current modal distribution total percentage
  const currentModalSum = useMemo(() => {
    const sum = editDistributionItems.reduce((acc, it) => acc + (Number(it.percentage) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [editDistributionItems]);

  return (
    <div className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Module Title Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wider">
              Módulo de Importación Odoo
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
              Suma 100% Garantizada
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-2 flex items-center">
            <svg className="w-7 h-7 mr-2.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Convertidor y Editor de Distribución Analítica
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Transforma texto a JSON Odoo y permite distribuir porcentajes por Unidad de Negocio asegurando que sumen exactamente el 100.00%.
          </p>
        </div>

        <button
          onClick={() => setIsMappingModalOpen(true)}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center self-start md:self-auto"
        >
          <svg className="w-4 h-4 mr-1.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Gestionar IDs ({businessUnits.length} Unidades)
        </button>
      </div>

      {/* Excel Drag & Drop Upload Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
          Paso 1: Seleccionar o Arrastrar Archivo Excel (.xlsx, .xls, .csv)
        </label>
        
        <div className="relative border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-2xl p-8 text-center transition-all cursor-pointer group">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {fileName ? `Archivo seleccionado: ${fileName}` : 'Haz clic aquí o arrastra tu archivo Excel'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Soporta archivos de exportación e importación masiva de Odoo
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Bar after Upload */}
        {headers.length > 0 && (
          <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                Columna a convertir:
              </label>
              <select
                value={targetColumn}
                onChange={(e) => handleColumnChange(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                {headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {rows.length > 0 && (
              <button
                onClick={handleDownloadExcel}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center active:scale-95"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar Excel Convertido (.xlsx)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Data Table & Conversion Summary */}
      {rows.length > 0 && (
        <div className="space-y-4">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total de Líneas Procesadas</p>
              <p className="text-2xl font-extrabold font-mono text-slate-900 mt-1">{stats.total}</p>
            </div>
            
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Convertidos (Suma 100% OK)</p>
              <p className="text-2xl font-extrabold font-mono text-emerald-900 mt-1">{stats.converted}</p>
            </div>

            <div className={`border rounded-xl p-4 shadow-sm ${stats.warnings > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${stats.warnings > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
                Sin Coincidencia / Por Revisar
              </p>
              <p className={`text-2xl font-extrabold font-mono mt-1 ${stats.warnings > 0 ? 'text-amber-900' : 'text-slate-900'}`}>
                {stats.warnings}
              </p>
            </div>
          </div>

          {/* Table Filters & Search */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="Buscar por producto, texto original o resultado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                />
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterStatus === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({stats.total})
                </button>
                <button
                  onClick={() => setFilterStatus('CONVERTED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterStatus === 'CONVERTED' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  Convertidos ({stats.converted})
                </button>
                <button
                  onClick={() => setFilterStatus('WARNING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterStatus === 'WARNING' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  Pendientes ({stats.warnings})
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="px-4 py-3 text-center w-16">Fila</th>
                    <th className="px-4 py-3">Descripción / Producto</th>
                    <th className="px-4 py-3">Texto Original Excel</th>
                    <th className="px-4 py-3">Distribución & JSON Odoo</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Acciones / Edición Porcentajes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRows.map((r) => {
                    const isConverted = r.status === 'CONVERTED';
                    const isAlreadyJson = r.status === 'ALREADY_JSON';
                    const isWarning = r.status === 'WARNING';
                    const itemsCount = r.items ? r.items.length : 0;

                    return (
                      <tr 
                        key={r.rowIndex} 
                        className={`transition-colors ${isWarning ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-500">#{r.rowIndex}</td>
                        
                        <td className="px-4 py-3 font-semibold text-slate-800 truncate max-w-[200px]" title={r.description}>
                          {r.description || '-'}
                        </td>
                        
                        <td className="px-4 py-3 font-mono font-bold text-slate-700 bg-slate-50/80 rounded">
                          {String(r.originalValue) || <span className="italic text-slate-400">Vacío</span>}
                        </td>
                        
                        <td className="px-4 py-3 font-mono">
                          <div className="flex flex-col space-y-1">
                            <span className="font-extrabold text-indigo-900 bg-indigo-50 px-2 py-1 rounded border border-indigo-200 block text-xs">
                              {r.newValue}
                            </span>
                            {itemsCount > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {r.items.map((it, idx) => {
                                  const u = businessUnits.find(bu => bu.id === it.unitId);
                                  return (
                                    <span key={idx} className="text-[10px] font-sans font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                      {u ? u.name : it.unitId}: {it.percentage}%
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {isConverted && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ CONVERTIDO (100%)
                            </span>
                          )}
                          {isAlreadyJson && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              JSON VÁLIDO
                            </span>
                          )}
                          {isWarning && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                              ⚠ REVISAR
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            {/* Fast single unit selection */}
                            <select
                              value={r.items && r.items.length === 1 ? r.items[0].unitId : ''}
                              onChange={(e) => handleSingleUnitSelect(r.rowIndex, e.target.value)}
                              className="bg-white border border-slate-300 text-slate-800 text-[11px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="">100% Único...</option>
                              {businessUnits.map(u => (
                                <option key={u.id} value={u.id}>
                                  100% {u.name}
                                </option>
                              ))}
                            </select>

                            {/* Full Multi-unit percentage editor button */}
                            <button
                              onClick={() => handleOpenDistributionModal(r)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg text-[11px] font-extrabold transition-colors flex items-center"
                              title="Editar porcentajes y unidades de negocio (100%)"
                            >
                              <svg className="w-3.5 h-3.5 mr-1 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Porcentajes %
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-slate-500 italic">
                        No se encontraron filas que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Percentage Distribution Modal (Matching Odoo's exact "Analítica (100%)" Modal design) */}
      {selectedRowForDistribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
                  %
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Analítica - Distribución por Unidad de Negocio</h3>
                  <p className="text-xs text-slate-400">
                    Fila #{selectedRowForDistribution.rowIndex} - {selectedRowForDistribution.description || 'Línea de factura'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRowForDistribution(null)}
                className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              
              {/* Info banner */}
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-slate-700 font-medium">
                    Los porcentajes de las unidades de negocio seleccionadas <strong className="text-slate-900">deben sumar el 100.00%</strong>.
                  </span>
                </div>

                <button
                  onClick={handleAutoEqualSplit}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs shadow-sm transition-all flex items-center whitespace-nowrap ml-3"
                  title="Dividir 100% en partes iguales asegurando suma exacta 100.00%"
                >
                  ⚡ Repartir Equitativamente (100%)
                </button>
              </div>

              {/* Items Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                      <th className="px-4 py-3">Unidad de Negocio ({currentModalSum}%)</th>
                      <th className="px-4 py-3 text-center w-36">Porcentaje (%)</th>
                      {selectedRowForDistribution.subtotalPrice > 0 && (
                        <th className="px-4 py-3 text-right">Subtotal Estimado</th>
                      )}
                      <th className="px-4 py-3 text-center w-16">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {editDistributionItems.map((item, idx) => {
                      const calculatedSubtotal = selectedRowForDistribution.subtotalPrice > 0
                        ? (selectedRowForDistribution.subtotalPrice * (item.percentage / 100))
                        : 0;

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-sans">
                            <select
                              value={item.unitId}
                              onChange={(e) => handleUpdateDistributionLine(idx, 'unitId', e.target.value)}
                              className="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              {businessUnits.map(u => (
                                <option key={u.id} value={u.id}>
                                  {u.name} (ID: {u.id})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <div className="relative flex items-center justify-center">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={item.percentage}
                                onChange={(e) => handleUpdateDistributionLine(idx, 'percentage', e.target.value)}
                                className="w-24 bg-slate-50 border border-slate-300 rounded-lg text-center px-2 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600"
                              />
                              <span className="ml-1 text-slate-500 font-bold text-xs">%</span>
                            </div>
                          </td>

                          {selectedRowForDistribution.subtotalPrice > 0 && (
                            <td className="px-4 py-3 text-right font-extrabold text-emerald-700">
                              S/ {calculatedSubtotal.toFixed(2)}
                            </td>
                          )}

                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleRemoveDistributionLine(idx)}
                              className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition-colors"
                              title="Eliminar esta línea"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-300 font-bold text-xs">
                      <td className="px-4 py-3">
                        <button
                          onClick={handleAddDistributionLine}
                          className="text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center hover:underline"
                        >
                          + Agregar una línea
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded text-xs font-mono font-extrabold border ${
                          Math.abs(currentModalSum - 100) < 0.01
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                        }`}>
                          {currentModalSum.toFixed(2)} %
                        </span>
                      </td>
                      {selectedRowForDistribution.subtotalPrice > 0 && (
                        <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900">
                          S/ {selectedRowForDistribution.subtotalPrice.toFixed(2)}
                        </td>
                      )}
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Status Banner */}
              {Math.abs(currentModalSum - 100) >= 0.01 && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl flex items-center justify-between text-xs font-bold">
                  <span>
                    ⚠ La suma total actual es de <strong>{currentModalSum.toFixed(2)}%</strong>. Debe ser exactamente 100.00%.
                  </span>
                  <button
                    onClick={handleAutoEqualSplit}
                    className="underline text-red-900 hover:text-red-700 ml-2"
                  >
                    Ajustar automáticamente a 100%
                  </button>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                JSON Odoo: <code className="font-mono text-indigo-700 font-bold">{buildJsonFromDistribution(editDistributionItems)}</code>
              </span>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedRowForDistribution(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveDistributionModal}
                  disabled={Math.abs(currentModalSum - 100) >= 0.01}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition-all"
                >
                  Guardar Distribución
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Unit ID Mapping Modal */}
      {isMappingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                  ID
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Configuración de Unidades de Negocio</h3>
                  <p className="text-[11px] text-slate-400">Mapeo de Nombres en Letras a IDs de Odoo</p>
                </div>
              </div>
              <button
                onClick={() => setIsMappingModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Unidades Registradas Actuales ({businessUnits.length})
                </h4>
                <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
                  {businessUnits.map(unit => (
                    <div key={unit.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded mr-2 border border-indigo-200">
                          ID: {unit.id}
                        </span>
                        <span className="font-bold text-slate-900">{unit.name}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Alias reconocidos: {unit.aliases.join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAddBusinessUnit} className="bg-indigo-50/50 border border-indigo-200 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider">
                  + Agregar Nueva Unidad de Negocio / ID de Odoo
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">ID Odoo (ej. 937)</label>
                    <input
                      type="text"
                      placeholder="937"
                      value={newUnitId}
                      onChange={(e) => setNewUnitId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre Oficial (ej. APA Bar)</label>
                    <input
                      type="text"
                      placeholder="APA Bar"
                      value={newUnitName}
                      onChange={(e) => setNewUnitName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Alias adicionales (separados por coma)</label>
                  <input
                    type="text"
                    placeholder="ej. apa bar, bar apa, apa/bar"
                    value={newUnitAliases}
                    onChange={(e) => setNewUnitAliases(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs shadow-sm transition-colors"
                >
                  Guardar Unidad de Negocio
                </button>
              </form>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsMappingModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
