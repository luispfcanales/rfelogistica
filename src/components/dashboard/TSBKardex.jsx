import { useState, useMemo, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { fetchTSBKardex, downloadTSBKardexExcel } from '../../api/odoo';
import { 
  normalizeKardexPayload, 
  formatQuantity, 
  formatCurrency, 
  getAdjustmentBadge, 
  getDocTypeBadge 
} from '../../utils/kardex';
import { LOCATION_GROUPS, getLocationLabel } from '../../utils/kardexLocations';
import MovementDetailModal from './MovementDetailModal';

export default function TSBKardex({ selectedMonth = '', onFilterChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [kardexData, setKardexData] = useState({});
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [costingMethod, setCostingMethod] = useState('GLOBAL_AVCO');
  const [sortDirection, setSortDirection] = useState('asc');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMovementRow, setSelectedMovementRow] = useState(null);
  const [exportingKardex, setExportingKardex] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(15);
  const [catalogSort, setCatalogSort] = useState('name_asc');
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsPageSize, setMovementsPageSize] = useState(15);

  // Notify parent component of filter changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({
        location: selectedLocation,
        product: selectedProduct || productSearch,
        method: costingMethod,
        sort: sortDirection
      });
    }
  }, [selectedLocation, selectedProduct, productSearch, costingMethod, sortDirection, onFilterChange]);

  const handleExport = async (prod = selectedProduct) => {
    setExportingKardex(true);
    try {
      await downloadTSBKardexExcel({
        month: selectedMonth,
        location: selectedLocation,
        product: prod,
        method: costingMethod,
        sort: sortDirection
      });
    } catch (err) {
      alert(`Error al exportar Kardex: ${err.message}`);
    } finally {
      setExportingKardex(false);
    }
  };

  // Load Kardex payload from Go backend
  const loadKardex = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTSBKardex({
        month: selectedMonth,
        location: selectedLocation,
        product: '',
        method: costingMethod,
        sort: sortDirection
      });
      if (data && data.error) {
        throw new Error(data.error);
      }
      setKardexData(data || {});
    } catch (err) {
      setError(err.message || 'Error cargando Kardex');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedLocation, costingMethod, sortDirection]);

  useEffect(() => {
    loadKardex();
  }, [loadKardex]);

  // Normalize payload from Go backend
  const { productsList, productsData } = useMemo(() => {
    return normalizeKardexPayload(kardexData);
  }, [kardexData]);

  // Search filter + Catalog Sort (Más Entradas, Más Salidas, etc.)
  const matchingProducts = useMemo(() => {
    let filtered = productsList;
    if (productSearch.trim()) {
      const query = productSearch.toLowerCase();
      filtered = productsList.filter(p => {
        const pData = productsData[p];
        return p.toLowerCase().includes(query) || (pData?.defaultCode && pData.defaultCode.toLowerCase().includes(query));
      });
    }

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const sumA = productsData[a]?.summary || {};
      const sumB = productsData[b]?.summary || {};

      if (catalogSort === 'more_in') {
        const diff = (sumB.totInQty || 0) - (sumA.totInQty || 0);
        if (Math.abs(diff) > 1e-9) return diff;
      } else if (catalogSort === 'more_out') {
        const diff = (sumB.totOutQty || 0) - (sumA.totOutQty || 0);
        if (Math.abs(diff) > 1e-9) return diff;
      } else if (catalogSort === 'more_stock') {
        const diff = (sumB.finalBalanceQty || 0) - (sumA.finalBalanceQty || 0);
        if (Math.abs(diff) > 1e-9) return diff;
      } else if (catalogSort === 'more_value') {
        const diff = (sumB.finalBalanceTotal || 0) - (sumA.finalBalanceTotal || 0);
        if (Math.abs(diff) > 1e-9) return diff;
      } else if (catalogSort === 'more_movements') {
        const diff = (sumB.totalMovements || 0) - (sumA.totalMovements || 0);
        if (diff !== 0) return diff;
      }
      return a.localeCompare(b);
    });

    return sorted;
  }, [productsList, productsData, productSearch, catalogSort]);

  // Reset pagination when search, location, month, or catalog sort changes
  useEffect(() => {
    setCatalogPage(1);
  }, [productSearch, selectedLocation, selectedMonth, catalogSort]);

  const totalCatalogPages = Math.max(1, Math.ceil(matchingProducts.length / catalogPageSize));
  const currentCatalogPage = Math.min(catalogPage, totalCatalogPages);

  const paginatedProducts = useMemo(() => {
    const startIdx = (currentCatalogPage - 1) * catalogPageSize;
    return matchingProducts.slice(startIdx, startIdx + catalogPageSize);
  }, [matchingProducts, currentCatalogPage, catalogPageSize]);

  const activeProductData = selectedProduct ? productsData[selectedProduct] : null;
  const showLocationColumn = ['ALL', 'BOUTIQUE', 'BAR', 'APA', 'ARA', 'TRC', 'PEM'].includes(selectedLocation);

  // Reset movements pagination when product, location, month, or sort changes
  useEffect(() => {
    setMovementsPage(1);
  }, [selectedProduct, selectedLocation, selectedMonth, sortDirection, costingMethod]);

  const totalMovementRows = activeProductData?.rows?.length || 0;
  const totalMovementsPages = Math.max(1, Math.ceil(totalMovementRows / movementsPageSize));
  const currentMovementsPage = Math.min(movementsPage, totalMovementsPages);

  const paginatedMovements = useMemo(() => {
    if (!activeProductData?.rows) return [];
    const startIdx = (currentMovementsPage - 1) * movementsPageSize;
    return activeProductData.rows.slice(startIdx, startIdx + movementsPageSize);
  }, [activeProductData, currentMovementsPage, movementsPageSize]);

  const handleSelectProduct = (pName) => {
    setSelectedProduct(pName);
    setIsDropdownOpen(false);
  };

  const handleClearSearch = () => {
    setProductSearch('');
    setSelectedProduct('');
  };

  // Export Catalog Table exactly as shown in the view
  const handleExportCatalogExcel = () => {
    if (matchingProducts.length === 0) return;

    let totalMovs = 0;
    let totalIn = 0;
    let totalOut = 0;
    let totalStock = 0;
    let totalValue = 0;

    const rowsForExcel = matchingProducts.map((pName) => {
      const pData = productsData[pName] || {};
      const summary = pData.summary || {};
      const uom = pData.uomName || 'Units';

      const movs = summary.totalMovements || 0;
      const inQty = Number((summary.totInQty || 0).toFixed(2));
      const outQty = Number((summary.totOutQty || 0).toFixed(2));
      const stockFinal = Number((summary.finalBalanceQty || 0).toFixed(2));
      const avco = Number((summary.finalBalanceCost || 0).toFixed(2));
      const saldoTotal = Number((summary.finalBalanceTotal || 0).toFixed(2));

      totalMovs += movs;
      totalIn += inQty;
      totalOut += outQty;
      totalStock += stockFinal;
      totalValue += saldoTotal;

      return {
        'PRODUCTO': pName,
        'UDM': uom,
        'MOVIMIENTOS': movs,
        'ENTRADAS': inQty,
        'SALIDAS': outQty,
        'STOCK FINAL': stockFinal,
        'AVCO (COSTO PROM)': avco,
        'SALDO TOTAL (S/)': saldoTotal,
      };
    });

    // Add summary row at the bottom
    rowsForExcel.push({
      'PRODUCTO': `TOTAL CATÁLOGO (${matchingProducts.length} PRODUCTOS)`,
      'UDM': '',
      'MOVIMIENTOS': totalMovs,
      'ENTRADAS': Number(totalIn.toFixed(2)),
      'SALIDAS': Number(totalOut.toFixed(2)),
      'STOCK FINAL': Number(totalStock.toFixed(2)),
      'AVCO (COSTO PROM)': '',
      'SALDO TOTAL (S/)': Number(totalValue.toFixed(2)),
    });

    const ws = XLSX.utils.json_to_sheet(rowsForExcel);
    ws['!cols'] = [
      { wch: 52 }, // PRODUCTO
      { wch: 10 }, // UDM
      { wch: 15 }, // MOVIMIENTOS
      { wch: 15 }, // ENTRADAS
      { wch: 15 }, // SALIDAS
      { wch: 15 }, // STOCK FINAL
      { wch: 18 }, // AVCO (COSTO PROM)
      { wch: 18 }, // SALDO TOTAL (S/)
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catálogo Kardex');

    const locClean = (selectedLocation || 'CONSOLIDADO').replace(/[\s/]+/g, '_');
    const periodClean = selectedMonth || 'HISTORICO';
    const sortSuffix = catalogSort === 'more_in' ? '_MasEntradas' : catalogSort === 'more_out' ? '_MasSalidas' : '';
    XLSX.writeFile(wb, `Catalogo_Kardex_${locClean}_${periodClean}${sortSuffix}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      
      {/* Control Bar: Location, Search, Costing Method, Order */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4 w-full">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Location Selector (Grouped 9 locations & 4 points) */}
          <div className="w-full lg:w-72 flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center">
              <svg className="w-3.5 h-3.5 mr-1 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              Punto de Venta / Ubicación
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2 text-xs">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-transparent text-slate-800 focus:outline-none cursor-pointer text-xs font-bold w-full"
              >
                {LOCATION_GROUPS.map((grp) => (
                  <optgroup key={grp.group} label={grp.group} className="font-extrabold text-slate-500 bg-slate-50">
                    {grp.options.map((opt) => (
                      <option key={opt.value} value={opt.value} className="font-semibold text-slate-800 bg-white">
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Product Search Input with Autocomplete */}
          <div className="relative flex-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Buscar Producto en Kardex
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Escribe el nombre o código (ej. Coca Cola, Cusqueña, 352)..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setIsDropdownOpen(true);
                  if (selectedProduct && e.target.value !== selectedProduct) {
                    setSelectedProduct('');
                  }
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold"
              />
              <svg className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {(productSearch || selectedProduct) && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {isDropdownOpen && matchingProducts.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto z-50 divide-y divide-slate-100">
                <div className="px-3.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 sticky top-0 backdrop-blur-sm border-b border-slate-200 flex justify-between">
                  <span>{matchingProducts.length} Productos</span>
                  <span>Click para abrir</span>
                </div>
                {matchingProducts.map((pName) => {
                  const pData = productsData[pName];
                  const finalStock = pData?.summary?.finalBalanceQty || 0;
                  const uom = pData?.uomName || 'u.';
                  return (
                    <button
                      key={pName}
                      onClick={() => {
                        handleSelectProduct(pName);
                        setProductSearch(pName);
                      }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center justify-between text-xs ${
                        selectedProduct === pName ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-800'
                      }`}
                    >
                      <div className="truncate max-w-[75%]">
                        <span className="font-semibold">{pName}</span>
                        {pData?.defaultCode && (
                          <span className="ml-2 text-[10px] font-mono text-slate-400">[{pData.defaultCode}]</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold">
                        Stock: {formatQuantity(finalStock, uom)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Costing Method & Sort Controls */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            
            {/* Costing Method Selector */}
            <div className="w-full sm:w-auto flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Método AVCO
              </label>
              <select
                value={costingMethod}
                onChange={(e) => setCostingMethod(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                title="Criterio de Costeo Promedio Ponderado"
              >
                <option value="GLOBAL_AVCO">Global Empresa (Odoo)</option>
                <option value="LOCATION_AVCO">Por Ubicación</option>
              </select>
            </div>

            {/* Sort Toggle */}
            <div className="w-full sm:w-auto flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Orden
              </label>
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-300">
                <button
                  onClick={() => setSortDirection('desc')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    sortDirection === 'desc' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Más recientes primero"
                >
                  Reciente ➔ Antiguo
                </button>
                <button
                  onClick={() => setSortDirection('asc')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    sortDirection === 'asc' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Cronológico natural"
                >
                  Antiguo ➔ Reciente
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Quick Product Pills */}
        {productsList.length > 0 && (
          <div className="pt-3 border-t border-slate-200">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mr-2">
              Productos Populares ({productsList.length} disponibles):
            </span>
            <div className="flex flex-wrap items-center gap-1.5 mt-2 max-h-20 overflow-y-auto pr-1">
              <button
                onClick={() => handleSelectProduct('')}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                  !selectedProduct ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                }`}
              >
                Ver Catálogo General
              </button>
              {matchingProducts.slice(0, 12).map((pName) => (
                <button
                  key={pName}
                  onClick={() => {
                    handleSelectProduct(pName);
                    setProductSearch(pName);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] transition-all ${
                    selectedProduct === pName
                      ? 'bg-blue-100 text-blue-800 border border-blue-300 font-bold shadow-sm'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {pName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
          <p className="text-slate-700 font-bold text-sm animate-pulse">
            Calculando inventario y AVCO sobre ~31k líneas en Go...
          </p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center text-rose-800 space-y-2">
          <h4 className="font-extrabold text-base">Error al cargar Kardex</h4>
          <p className="text-xs">{error}</p>
          <button
            onClick={loadKardex}
            className="mt-3 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow hover:bg-rose-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : selectedProduct && activeProductData ? (
        /* Single Product Kardex View */
        <div className="space-y-6 w-full animate-in fade-in duration-300">
          
          {/* Header Product Card & Separated KPIs */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                    Kardex Valorizado AVCO
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    UdM Base: {activeProductData.uomName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                    {getLocationLabel(selectedLocation)}
                  </span>
                  {selectedMonth && (
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                      Periodo: {selectedMonth}
                    </span>
                  )}
                  {activeProductData.summary.hasNegative && (
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                      ALERTA: Saldo Negativo
                    </span>
                  )}
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-2 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {activeProductData.productName}
                </h2>
              </div>

              <div className="flex items-center space-x-2.5 self-start md:self-auto">
                <button
                  onClick={() => handleExport(activeProductData.productName)}
                  disabled={exportingKardex}
                  className={`text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-2xl shadow-sm transition-all flex items-center font-bold active:scale-95 ${
                    exportingKardex ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                  title="Descargar reporte Excel oficial de este producto"
                >
                  <svg className={`w-4 h-4 mr-1.5 ${exportingKardex ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exportingKardex ? 'Exportando...' : 'Exportar Excel'}
                </button>
                <button
                  onClick={() => setSelectedProduct('')}
                  className="text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-2xl border border-slate-300 transition-colors flex items-center font-bold shadow-sm"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Volver al Catálogo
                </button>
              </div>
            </div>

            {/* Separated KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-5">
              
              {/* Compras */}
              <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-amber-900 uppercase block tracking-wider">Compras</span>
                <span className="text-lg font-mono font-extrabold text-slate-900 block mt-1">
                  {formatQuantity(activeProductData.summary.comprasQty, activeProductData.uomName)}
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-800 block">
                  {formatCurrency(activeProductData.summary.comprasTotal)}
                </span>
              </div>

              {/* Inv Inicial / Saldo Inicial */}
              <div className="bg-cyan-50/70 border border-cyan-200/80 p-3.5 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-cyan-900 uppercase block tracking-wider">
                  {selectedMonth ? 'Saldo Ini. Periodo' : 'Inv. Inicial'}
                </span>
                <span className="text-lg font-mono font-extrabold text-slate-900 block mt-1">
                  {formatQuantity(activeProductData.summary.invInicialQty, activeProductData.uomName)}
                </span>
                <span className="text-[11px] font-mono font-bold text-cyan-800 block">
                  {formatCurrency(activeProductData.summary.invInicialTotal)}
                </span>
              </div>

              {/* Ajustes Positivos */}
              <div className="bg-teal-50/70 border border-teal-200/80 p-3.5 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-teal-900 uppercase block tracking-wider">Ajustes (+)</span>
                <span className="text-lg font-mono font-extrabold text-slate-900 block mt-1">
                  {formatQuantity(activeProductData.summary.ajustesPosQty, activeProductData.uomName)}
                </span>
                <span className="text-[11px] font-mono font-bold text-teal-800 block">
                  {formatCurrency(activeProductData.summary.ajustesPosTotal)}
                </span>
              </div>

              {/* Ventas Reales */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-emerald-900 uppercase block tracking-wider">Ventas Reales</span>
                <span className="text-lg font-mono font-extrabold text-slate-900 block mt-1">
                  {formatQuantity(activeProductData.summary.ventasRealesQty, activeProductData.uomName)}
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-800 block">
                  {formatCurrency(activeProductData.summary.ventasRealesTotal)}
                </span>
              </div>

              {/* Consumo / Merma */}
              <div className="bg-rose-50/70 border border-rose-200/80 p-3.5 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-rose-900 uppercase block tracking-wider">Consumo / Merma</span>
                <span className="text-lg font-mono font-extrabold text-slate-900 block mt-1">
                  {formatQuantity(activeProductData.summary.consumoMermaQty, activeProductData.uomName)}
                </span>
                <span className="text-[11px] font-mono font-bold text-rose-800 block">
                  {formatCurrency(activeProductData.summary.consumoMermaTotal)}
                </span>
              </div>

              {/* Saldo Final */}
              <div className="bg-blue-50/90 border-2 border-blue-300 p-3.5 rounded-2xl shadow-md">
                <span className="text-[10px] font-extrabold text-blue-900 uppercase block tracking-wider">Saldo Final</span>
                <span className="text-lg font-mono font-extrabold text-blue-950 block mt-1">
                  {formatQuantity(activeProductData.summary.finalBalanceQty, activeProductData.uomName)}
                </span>
                <span className="text-[11px] font-mono font-extrabold text-blue-900 block">
                  {formatCurrency(activeProductData.summary.finalBalanceTotal)}
                </span>
                <span className="text-[10px] font-mono text-slate-600 block mt-0.5">
                  AVCO: {formatCurrency(activeProductData.summary.finalBalanceCost)}
                </span>
              </div>

            </div>
          </div>

          {/* Detailed Movements Table */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm w-full">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  Movimientos Detallados ({activeProductData.rows.length} registros)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Cálculo continuo de saldos físicos y costo promedio ponderado (AVCO)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                  <span className="text-slate-500 font-semibold">Mostrar:</span>
                  <select
                    value={movementsPageSize}
                    onChange={(e) => {
                      setMovementsPageSize(Number(e.target.value));
                      setMovementsPage(1);
                    }}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-xl">
                  Base: {activeProductData.uomName}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[1150px]">
                <thead>
                  {/* Master Headers */}
                  <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-extrabold uppercase tracking-wider">
                    <th colSpan={showLocationColumn ? "5" : "4"} className="px-3.5 py-3 border-r border-slate-300 text-center bg-slate-200/70 text-slate-800">
                      Comprobante de Pago
                    </th>
                    <th colSpan="4" className="px-3.5 py-3 border-r border-slate-300 text-center bg-slate-100 text-slate-800">
                      Operación y Logística
                    </th>
                    <th colSpan="3" className="px-3.5 py-3 border-r border-slate-300 text-center bg-amber-100 text-amber-950 border-b-2 border-b-amber-500">
                      ENTRADAS
                    </th>
                    <th colSpan="3" className="px-3.5 py-3 border-r border-slate-300 text-center bg-emerald-100 text-emerald-950 border-b-2 border-b-emerald-500">
                      SALIDAS
                    </th>
                    <th colSpan="3" className="px-3.5 py-3 text-center bg-blue-100 text-blue-950 border-b-2 border-b-blue-500">
                      SALDO FINAL
                    </th>
                  </tr>

                  {/* Subheaders */}
                  <tr className="bg-slate-50 border-b border-slate-300 text-[10px] font-bold text-slate-600 uppercase">
                    <th className="px-3 py-2.5">Fecha</th>
                    <th className="px-3 py-2.5 text-center">Tipo</th>
                    <th className="px-3 py-2.5">Serie</th>
                    <th className="px-3 py-2.5">Número</th>
                    {showLocationColumn && (
                      <th className="px-3 py-2.5 border-r border-slate-300 text-blue-800">Ubicación</th>
                    )}
                    <th className={`px-3 py-2.5 ${!showLocationColumn ? 'border-r border-slate-300' : ''}`}>Operación</th>
                    <th className="px-3 py-2.5">Doc. Almacén</th>
                    <th className="px-3 py-2.5">Cliente / Proveedor</th>
                    <th className="px-3 py-2.5 border-r border-slate-300">RUC / Doc</th>
                    
                    <th className="px-3 py-2.5 text-right bg-amber-50/70">Cantidad</th>
                    <th className="px-3 py-2.5 text-right bg-amber-50/70">Costo Unit.</th>
                    <th className="px-3 py-2.5 text-right bg-amber-50/70 border-r border-slate-300">Costo Total</th>

                    <th className="px-3 py-2.5 text-right bg-emerald-50/70">Cantidad</th>
                    <th className="px-3 py-2.5 text-right bg-emerald-50/70">Precio Unit.</th>
                    <th className="px-3 py-2.5 text-right bg-emerald-50/70 border-r border-slate-300">Venta Total</th>

                    <th className="px-3 py-2.5 text-right bg-blue-50/70">Saldo Cant.</th>
                    <th className="px-3 py-2.5 text-right bg-blue-50/70">AVCO</th>
                    <th className="px-3 py-2.5 text-right bg-blue-50/70">Saldo Total</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-xs font-mono">
                  {paginatedMovements.map((row) => {
                    const isIncoming = row.inQty > 0;
                    const isOutgoing = row.outQty > 0;
                    const isInitial = row.docType === 'Saldo Inicial del Periodo' || row.docType === 'Inventario Inicial';
                    const docBadge = getDocTypeBadge(row);
                    const adjBadge = getAdjustmentBadge(row.adjCategory);

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedMovementRow(row)}
                        className={`hover:bg-blue-50/90 transition-colors cursor-pointer group ${
                          isInitial ? 'bg-cyan-50/40 font-semibold' : 'bg-white'
                        }`}
                        title="Haz clic para ver la trazabilidad completa"
                      >
                        <td className="px-3 py-2.5 text-slate-900 font-sans font-medium whitespace-nowrap">
                          {row.date}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${docBadge.className}`}>
                            {docBadge.code}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-900 font-bold whitespace-nowrap font-mono">
                          {row.series || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-800 whitespace-nowrap font-mono">
                          {row.number || '-'}
                        </td>

                        {showLocationColumn && (
                          <td className="px-3 py-2.5 text-blue-800 font-sans font-semibold border-r border-slate-200 whitespace-nowrap text-[11px]">
                            {getLocationLabel(row.location || row.toLocation || row.fromLocation)}
                          </td>
                        )}

                        <td className="px-3 py-2.5 font-sans whitespace-nowrap">
                          <div className="flex items-center space-x-1">
                            <span className={`text-[11px] font-bold ${
                              isInitial ? 'text-cyan-800' : isIncoming ? 'text-amber-800' : 'text-emerald-800'
                            }`}>
                              {row.opType}
                            </span>
                            {adjBadge && (
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${adjBadge.bg}`}>
                                {adjBadge.label}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2.5 text-blue-700 font-sans truncate max-w-[130px] font-medium group-hover:underline" title={row.docName}>
                          {row.docName}
                        </td>
                        <td className="px-3 py-2.5 text-slate-800 font-sans truncate max-w-[160px] font-medium" title={row.partner}>
                          {row.partner}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 border-r border-slate-200 whitespace-nowrap">
                          {row.partnerVat || '-'}
                        </td>

                        {/* Entradas */}
                        <td className="px-3 py-2.5 text-right font-extrabold text-amber-900 bg-amber-50/50">
                          {row.inQty > 0 ? formatQuantity(row.inQty, activeProductData.uomName) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-700 bg-amber-50/50">
                          {row.inQty > 0 ? formatCurrency(row.inCost) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-extrabold text-amber-900 bg-amber-50/50 border-r border-slate-200">
                          {row.inQty > 0 ? formatCurrency(row.inTotal) : '-'}
                        </td>

                        {/* Salidas */}
                        <td className="px-3 py-2.5 text-right font-extrabold text-emerald-900 bg-emerald-50/50">
                          {row.outQty > 0 ? formatQuantity(row.outQty, activeProductData.uomName) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-700 bg-emerald-50/50">
                          {row.outQty > 0 ? formatCurrency(row.outCost) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-extrabold text-emerald-900 bg-emerald-50/50 border-r border-slate-200">
                          {row.outQty > 0 ? formatCurrency(row.outTotal) : '-'}
                        </td>

                        {/* Saldo Final */}
                        <td className={`px-3 py-2.5 text-right font-extrabold bg-blue-50/50 ${
                          row.isNegative ? 'text-rose-700 font-black' : 'text-blue-950'
                        }`}>
                          {formatQuantity(row.calculatedQty, activeProductData.uomName)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-800 bg-blue-50/50">
                          {formatCurrency(row.calculatedCost)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-extrabold text-blue-950 bg-blue-50/50">
                          {formatCurrency(row.calculatedTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Resumen al final del historial (idéntico al Excel) */}
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-b-2 border-slate-400 text-xs font-mono font-extrabold text-slate-900">
                    <td
                      colSpan={showLocationColumn ? 9 : 8}
                      className="px-3.5 py-3 text-right font-sans font-extrabold uppercase tracking-wide text-slate-800 border-r border-slate-300 bg-slate-200/70"
                    >
                      TOTAL {activeProductData.productName.toUpperCase()} (UdM: {activeProductData.uomName}):
                    </td>

                    {/* Total Entradas */}
                    <td className="px-3 py-3 text-right font-black text-amber-950 bg-amber-100/80 whitespace-nowrap">
                      {formatQuantity(activeProductData.summary.totInQty, activeProductData.uomName)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400 bg-amber-100/80">
                      
                    </td>
                    <td className="px-3 py-3 text-right font-black text-amber-950 bg-amber-100/80 border-r border-slate-300 whitespace-nowrap">
                      {formatCurrency(activeProductData.summary.totInTotal)}
                    </td>

                    {/* Total Salidas */}
                    <td className="px-3 py-3 text-right font-black text-emerald-950 bg-emerald-100/80 whitespace-nowrap">
                      {formatQuantity(activeProductData.summary.totOutQty, activeProductData.uomName)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400 bg-emerald-100/80">
                      
                    </td>
                    <td className="px-3 py-3 text-right font-black text-emerald-950 bg-emerald-100/80 border-r border-slate-300 whitespace-nowrap">
                      {formatCurrency(activeProductData.summary.totOutTotal)}
                    </td>

                    {/* Saldo Final */}
                    <td className={`px-3 py-3 text-right font-black bg-blue-100/80 whitespace-nowrap ${
                      activeProductData.summary.hasNegative ? 'text-rose-700' : 'text-blue-950'
                    }`}>
                      {formatQuantity(activeProductData.summary.finalBalanceQty, activeProductData.uomName)}
                    </td>
                    <td className="px-3 py-3 text-right font-extrabold text-blue-900 bg-blue-100/80 whitespace-nowrap">
                      {formatCurrency(activeProductData.summary.finalBalanceCost)}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-blue-950 bg-blue-100/80 whitespace-nowrap">
                      {formatCurrency(activeProductData.summary.finalBalanceTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination Footer for Detailed Movements */}
            {totalMovementRows > 0 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-600 font-medium">
                  Mostrando{' '}
                  <span className="font-bold text-slate-900">
                    {(currentMovementsPage - 1) * movementsPageSize + 1}
                  </span>{' '}
                  a{' '}
                  <span className="font-bold text-slate-900">
                    {Math.min(currentMovementsPage * movementsPageSize, totalMovementRows)}
                  </span>{' '}
                  de{' '}
                  <span className="font-bold text-slate-900">
                    {totalMovementRows}
                  </span>{' '}
                  registros
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setMovementsPage(1)}
                    disabled={currentMovementsPage === 1}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Primera página"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setMovementsPage((p) => Math.max(1, p - 1))}
                    disabled={currentMovementsPage === 1}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Anterior
                  </button>

                  <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-blue-600 text-white shadow-sm">
                    Página {currentMovementsPage} de {totalMovementsPages}
                  </span>

                  <button
                    onClick={() => setMovementsPage((p) => Math.min(totalMovementsPages, p + 1))}
                    disabled={currentMovementsPage === totalMovementsPages}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Siguiente
                  </button>
                  <button
                    onClick={() => setMovementsPage(totalMovementsPages)}
                    disabled={currentMovementsPage === totalMovementsPages}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Última página"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Catalog Table View */
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm w-full">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Catálogo de Productos en Kardex ({getLocationLabel(selectedLocation)})
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Valores calculados por el motor oficial en Go con AVCO ponderado
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Sort Selector for Catalog */}
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <span className="text-slate-500 font-semibold">Ordenar por:</span>
                <select
                  value={catalogSort}
                  onChange={(e) => setCatalogSort(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="name_asc">Producto (A - Z)</option>
                  <option value="more_in">Más Entradas (Mayor a menor)</option>
                  <option value="more_out">Más Salidas (Mayor a menor)</option>
                  <option value="more_stock">Mayor Stock Final</option>
                  <option value="more_value">Mayor Saldo Total (S/)</option>
                  <option value="more_movements">Más Movimientos</option>
                </select>
              </div>

              {/* Page Size Selector */}
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <span className="text-slate-500 font-semibold">Mostrar:</span>
                <select
                  value={catalogPageSize}
                  onChange={(e) => {
                    setCatalogPageSize(Number(e.target.value));
                    setCatalogPage(1);
                  }}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl">
                {matchingProducts.length} productos
              </span>

              {/* Export Catalog View Button */}
              <button
                onClick={handleExportCatalogExcel}
                disabled={matchingProducts.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-xl transition-all text-xs font-bold flex items-center shadow-sm active:scale-95 cursor-pointer"
                title="Descargar esta tabla resumen de productos en Excel tal como se muestra"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar Catálogo Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-4 py-4 text-center">UdM</th>
                  <th className="px-4 py-4 text-center">Movimientos</th>
                  <th className="px-6 py-4 text-right">Entradas</th>
                  <th className="px-6 py-4 text-right">Salidas</th>
                  <th className="px-6 py-4 text-right">Stock Final</th>
                  <th className="px-6 py-4 text-right">AVCO (Costo Prom)</th>
                  <th className="px-6 py-4 text-right">Saldo Total</th>
                  <th className="px-6 py-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {paginatedProducts.map((pName) => {
                  const pData = productsData[pName];
                  if (!pData) return null;
                  const { summary, uomName } = pData;

                  return (
                    <tr
                      key={pName}
                      onClick={() => handleSelectProduct(pName)}
                      className="hover:bg-blue-50/80 transition-colors cursor-pointer group bg-white"
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        <div className="flex items-center space-x-2">
                          <span>{pName}</span>
                          {summary.hasNegative && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-rose-100 text-rose-800 rounded font-bold border border-rose-200">
                              Negativo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-slate-500 text-[11px]">
                        {uomName}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {summary.totalMovements}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-amber-800 font-extrabold">
                        {formatQuantity(summary.totInQty, uomName)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-800 font-extrabold">
                        {formatQuantity(summary.totOutQty, uomName)}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-extrabold ${
                        summary.hasNegative ? 'text-rose-700' : 'text-blue-900'
                      }`}>
                        {formatQuantity(summary.finalBalanceQty, uomName)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700 font-semibold">
                        {formatCurrency(summary.finalBalanceCost)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-extrabold text-slate-900">
                        {formatCurrency(summary.finalBalanceTotal)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-xs text-blue-600 group-hover:text-blue-700 font-bold flex items-center justify-center w-full">
                          Ver Kardex
                          <svg className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {matchingProducts.length > 0 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600 font-medium">
                Mostrando{' '}
                <span className="font-bold text-slate-900">
                  {(currentCatalogPage - 1) * catalogPageSize + 1}
                </span>{' '}
                a{' '}
                <span className="font-bold text-slate-900">
                  {Math.min(currentCatalogPage * catalogPageSize, matchingProducts.length)}
                </span>{' '}
                de{' '}
                <span className="font-bold text-slate-900">
                  {matchingProducts.length}
                </span>{' '}
                productos
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setCatalogPage(1)}
                  disabled={currentCatalogPage === 1}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Primera página"
                >
                  «
                </button>
                <button
                  onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                  disabled={currentCatalogPage === 1}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>

                <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-blue-600 text-white shadow-sm">
                  Página {currentCatalogPage} de {totalCatalogPages}
                </span>

                <button
                  onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                  disabled={currentCatalogPage === totalCatalogPages}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
                <button
                  onClick={() => setCatalogPage(totalCatalogPages)}
                  disabled={currentCatalogPage === totalCatalogPages}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Última página"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Movement Detail Modal */}
      {selectedMovementRow && (
        <MovementDetailModal
          row={selectedMovementRow}
          onClose={() => setSelectedMovementRow(null)}
        />
      )}
    </div>
  );
}
