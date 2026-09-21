import { useState, useMemo } from 'react';
import { processRawReportsToKardexRows, buildKardexByProduct, SERIES_MAPPING } from '../../utils/kardex';

export default function TSBKardex({ rawReports, loading }) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [sortDirection, setSortDirection] = useState('desc');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Available Location Options
  const locationOptions = useMemo(() => {
    const locs = ['ALL', ...Object.values(SERIES_MAPPING), 'GENERAL', 'VENTAS TSB'];
    return Array.from(new Set(locs));
  }, []);

  // 1. Process raw reports into Kardex rows
  const kardexRows = useMemo(() => {
    return processRawReportsToKardexRows(rawReports);
  }, [rawReports]);

  // 2. Build Kardex data grouped by product for selected location
  const { productsList, productsData } = useMemo(() => {
    return buildKardexByProduct(kardexRows, {
      locationFilter: selectedLocation,
      sortDirection: sortDirection
    });
  }, [kardexRows, selectedLocation, sortDirection]);

  // 3. Filtered products list matching search query
  const matchingProducts = useMemo(() => {
    if (!productSearch.trim()) return productsList;
    const query = productSearch.toLowerCase();
    return productsList.filter(p => p.toLowerCase().includes(query));
  }, [productsList, productSearch]);

  const activeProductData = selectedProduct ? productsData[selectedProduct] : null;

  const handleSelectProduct = (pName) => {
    setSelectedProduct(pName);
    setIsDropdownOpen(false);
  };

  const handleClearSearch = () => {
    setProductSearch('');
    setSelectedProduct('');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
        <p className="text-slate-600 animate-pulse text-sm font-semibold">Calculando inventario valorizado...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      
      {/* Control Bar: Product Search & Location Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 w-full">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Product Search Input with Autocomplete Dropdown */}
          <div className="relative flex-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Buscar Producto en Kardex
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Escribe el nombre del producto (ej. Cusqueña, Coca Cola)..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setIsDropdownOpen(true);
                  if (selectedProduct && e.target.value !== selectedProduct) {
                    setSelectedProduct('');
                  }
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold"
              />
              <svg className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {(productSearch || selectedProduct) && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Autocomplete Suggestions Dropdown */}
            {isDropdownOpen && matchingProducts.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto z-50 divide-y divide-slate-100">
                <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 sticky top-0 backdrop-blur-sm border-b border-slate-200">
                  {matchingProducts.length} Productos Encontrados
                </div>
                {matchingProducts.map((pName) => {
                  const pData = productsData[pName];
                  const finalStock = pData?.summary?.finalBalanceQty || 0;
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
                      <span className="truncate max-w-[80%] font-medium">{pName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-bold">
                        Stock: {finalStock}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Location & Sort Controls */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            {/* Location Selector */}
            <div className="w-full sm:w-auto flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Punto de Venta / Ubicación
              </label>
              <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs">
                <svg className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="bg-transparent text-slate-800 focus:outline-none cursor-pointer text-xs font-bold"
                >
                  <option value="ALL" className="bg-white">CONSOLIDADO GENERAL</option>
                  {locationOptions.filter(l => l !== 'ALL').map(loc => (
                    <option key={loc} value={loc} className="bg-white">{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort Order Direction Toggle */}
            <div className="w-full sm:w-auto flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Orden Cronológico
              </label>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300">
                <button
                  onClick={() => setSortDirection('desc')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    sortDirection === 'desc' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Reciente ➔ Antiguo
                </button>
                <button
                  onClick={() => setSortDirection('asc')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    sortDirection === 'asc' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
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
              Acceso Rápido ({productsList.length} productos):
            </span>
            <div className="flex flex-wrap items-center gap-1.5 mt-2 max-h-24 overflow-y-auto pr-1">
              <button
                onClick={() => handleSelectProduct('')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  !selectedProduct ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                }`}
              >
                Ver Catálogo General
              </button>
              {matchingProducts.slice(0, 15).map(pName => (
                <button
                  key={pName}
                  onClick={() => {
                    handleSelectProduct(pName);
                    setProductSearch(pName);
                  }}
                  className={`px-3 py-1 rounded-lg text-[11px] transition-all ${
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

      {/* Selected Product Kardex Sheet View */}
      {selectedProduct && activeProductData ? (
        <div className="space-y-6 w-full">
          
          {/* Header Card & Key Stats Bar for Product */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                    Kardex Valorizado Promedio
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    UDM: Unidad
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                    {selectedLocation === 'ALL' ? 'CONSOLIDADO GENERAL' : selectedLocation}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-2 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  PRODUCTO: {activeProductData.productName}
                </h2>
              </div>

              <button
                onClick={() => setSelectedProduct('')}
                className="text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl border border-slate-300 transition-colors flex items-center self-start md:self-auto font-bold shadow-sm"
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver a la lista
              </button>
            </div>

            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
              <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl shadow-sm">
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Entradas (Compras/Inicial)</p>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-extrabold font-mono text-slate-900">
                    {activeProductData.summary.totInQty.toLocaleString('en-PE')} u.
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-800">
                    S/ {activeProductData.summary.totInTotal.toLocaleString('en-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl shadow-sm">
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Salidas (Ventas)</p>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-extrabold font-mono text-slate-900">
                    {activeProductData.summary.totOutQty.toLocaleString('en-PE')} u.
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-800">
                    S/ {activeProductData.summary.totOutTotal.toLocaleString('en-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-xl shadow-sm">
                <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Saldo Final (Stock Acumulado)</p>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-extrabold font-mono text-blue-900">
                    {activeProductData.summary.finalBalanceQty.toLocaleString('en-PE')} u.
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-mono font-extrabold text-blue-900">
                      S/ {activeProductData.summary.finalBalanceTotal.toLocaleString('en-PE', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono font-semibold">
                      Cost. Prom: S/ {activeProductData.summary.finalBalanceCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Kardex Table matching Excel output */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead>
                  {/* Grouped Top Header Row */}
                  <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-extrabold uppercase tracking-wider">
                    <th colSpan="4" className="px-4 py-3 border-r border-slate-300 text-center bg-slate-200/70 text-slate-800">
                      Comprobante de Pago
                    </th>
                    <th colSpan="4" className="px-4 py-3 border-r border-slate-300 text-center bg-slate-100 text-slate-800">
                      Detalle de Operación y Almacén
                    </th>
                    <th colSpan="3" className="px-4 py-3 border-r border-slate-300 text-center bg-amber-100 text-amber-950 border-b-2 border-b-amber-500">
                      ENTRADAS
                    </th>
                    <th colSpan="3" className="px-4 py-3 border-r border-slate-300 text-center bg-emerald-100 text-emerald-950 border-b-2 border-b-emerald-500">
                      SALIDAS
                    </th>
                    <th colSpan="3" className="px-4 py-3 text-center bg-blue-100 text-blue-950 border-b-2 border-b-blue-500">
                      SALDO FINAL
                    </th>
                  </tr>

                  {/* Column Subheaders Row */}
                  <tr className="bg-slate-50 border-b border-slate-300 text-[10px] font-bold text-slate-600 uppercase">
                    <th className="px-3 py-2.5">Fecha</th>
                    <th className="px-3 py-2.5 text-center">Tipo Doc</th>
                    <th className="px-3 py-2.5">Serie</th>
                    <th className="px-3 py-2.5 border-r border-slate-300">Número</th>
                    <th className="px-3 py-2.5">Tipo Operación</th>
                    <th className="px-3 py-2.5">Doc. Almacén</th>
                    <th className="px-3 py-2.5">Cliente / Proveedor</th>
                    <th className="px-3 py-2.5 border-r border-slate-300">RUC / N° Doc</th>
                    <th className="px-3 py-2.5 text-right bg-amber-50/70">Cantidad</th>
                    <th className="px-3 py-2.5 text-right bg-amber-50/70">Costo Unit.</th>
                    <th className="px-3 py-2.5 text-right bg-amber-50/70 border-r border-slate-300">Costo Total</th>
                    <th className="px-3 py-2.5 text-right bg-emerald-50/70">Cantidad</th>
                    <th className="px-3 py-2.5 text-right bg-emerald-50/70">Precio Unit.</th>
                    <th className="px-3 py-2.5 text-right bg-emerald-50/70 border-r border-slate-300">Venta Total</th>
                    <th className="px-3 py-2.5 text-right bg-blue-50/70">Cantidad</th>
                    <th className="px-3 py-2.5 text-right bg-blue-50/70">Costo Unit.</th>
                    <th className="px-3 py-2.5 text-right bg-blue-50/70">Saldo Total</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-xs font-mono">
                  {activeProductData.rows.map((row) => {
                    const isIncoming = row.inQty > 0;
                    const isInitial = row.docType === 'Inventario Inicial' || row.docType === 'Saldo Inicial' || row.docCode === '00';

                    const docBadgeClass = isInitial
                      ? 'bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold'
                      : row.docCode === '03'
                      ? 'bg-sky-100 text-sky-800 border border-sky-200 font-bold'
                      : row.docCode === '07'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200 font-bold'
                      : 'bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold';

                    return (
                      <tr key={row.id} className="hover:bg-blue-50/80 transition-colors bg-white">
                        <td className="px-3 py-2.5 text-slate-900 font-sans font-medium whitespace-nowrap">{row.date}</td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${docBadgeClass}`}>
                            {row.docCode} ({row.docType})
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-900 font-bold whitespace-nowrap">{row.series || '-'}</td>
                        <td className="px-3 py-2.5 text-slate-800 border-r border-slate-200 whitespace-nowrap">{row.number || '-'}</td>
                        
                        <td className="px-3 py-2.5 font-sans whitespace-nowrap">
                          <span className={`text-[11px] font-bold ${
                            isInitial ? 'text-cyan-700' : isIncoming ? 'text-amber-700' : 'text-emerald-700'
                          }`}>
                            {row.opType}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 font-sans truncate max-w-[140px]" title={row.docName}>{row.docName}</td>
                        <td className="px-3 py-2.5 text-slate-800 font-sans truncate max-w-[180px] font-medium" title={row.partner}>{row.partner}</td>
                        <td className="px-3 py-2.5 text-slate-600 border-r border-slate-200 whitespace-nowrap">{row.partnerVat || '-'}</td>

                        {/* Entradas */}
                        <td className="px-3 py-2.5 text-right font-extrabold text-amber-900 bg-amber-50/50">
                          {row.inQty > 0 ? row.inQty.toLocaleString('en-PE') : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-700 bg-amber-50/50 font-semibold">
                          {row.inQty > 0 ? `S/ ${row.inCost.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-extrabold text-amber-900 bg-amber-50/50 border-r border-slate-200">
                          {row.inQty > 0 ? `S/ ${row.inTotal.toLocaleString('en-PE', { minimumFractionDigits: 2 })}` : '-'}
                        </td>

                        {/* Salidas */}
                        <td className="px-3 py-2.5 text-right font-extrabold text-emerald-900 bg-emerald-50/50">
                          {row.outQty > 0 ? row.outQty.toLocaleString('en-PE') : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-700 bg-emerald-50/50 font-semibold">
                          {row.outQty > 0 ? `S/ ${row.outCost.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-extrabold text-emerald-900 bg-emerald-50/50 border-r border-slate-200">
                          {row.outQty > 0 ? `S/ ${row.outTotal.toLocaleString('en-PE', { minimumFractionDigits: 2 })}` : '-'}
                        </td>

                        {/* Saldo Final */}
                        <td className="px-3 py-2.5 text-right font-extrabold text-blue-950 bg-blue-50/50">
                          {row.calculatedQty.toLocaleString('en-PE')}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-800 bg-blue-50/50 font-semibold">
                          S/ {row.calculatedCost.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-extrabold text-blue-950 bg-blue-50/50">
                          S/ {row.calculatedTotal.toLocaleString('en-PE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Totals Row */}
                  <tr className="bg-slate-100 border-t-2 border-slate-400 text-xs font-extrabold text-slate-900">
                    <td colSpan="8" className="px-4 py-3 uppercase tracking-wider text-blue-800 border-r border-slate-300">
                      TOTAL {activeProductData.productName}
                    </td>

                    <td className="px-3 py-3 text-right text-amber-950 bg-amber-100/90 font-extrabold">
                      {activeProductData.summary.totInQty.toLocaleString('en-PE')}
                    </td>
                    <td className="px-3 py-3 bg-amber-100/90"></td>
                    <td className="px-3 py-3 text-right text-amber-950 bg-amber-100/90 border-r border-slate-300 font-extrabold">
                      S/ {activeProductData.summary.totInTotal.toLocaleString('en-PE', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-3 py-3 text-right text-emerald-950 bg-emerald-100/90 font-extrabold">
                      {activeProductData.summary.totOutQty.toLocaleString('en-PE')}
                    </td>
                    <td className="px-3 py-3 bg-emerald-100/90"></td>
                    <td className="px-3 py-3 text-right text-emerald-950 bg-emerald-100/90 border-r border-slate-300 font-extrabold">
                      S/ {activeProductData.summary.totOutTotal.toLocaleString('en-PE', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-3 py-3 text-right text-blue-950 bg-blue-100/90 font-extrabold">
                      {activeProductData.summary.finalBalanceQty.toLocaleString('en-PE')}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700 bg-blue-100/90 font-mono font-bold">
                      S/ {activeProductData.summary.finalBalanceCost.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right text-blue-950 bg-blue-100/90 font-extrabold">
                      S/ {activeProductData.summary.finalBalanceTotal.toLocaleString('en-PE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        /* Multi-Product Catalog Table View when no single product is selected */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm w-full">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Catálogo Consolidado de Productos</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Haz clic en cualquier producto para abrir su Kardex Valorizado detallado.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg">
              {matchingProducts.length} productos
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Producto</th>
                  <th className="px-6 py-3.5 text-center">Movimientos</th>
                  <th className="px-6 py-3.5 text-right">Entradas (Cant)</th>
                  <th className="px-6 py-3.5 text-right">Salidas (Cant)</th>
                  <th className="px-6 py-3.5 text-right">Stock Final</th>
                  <th className="px-6 py-3.5 text-right">Costo Promedio</th>
                  <th className="px-6 py-3.5 text-right">Saldo Total (S/)</th>
                  <th className="px-6 py-3.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {matchingProducts.map((pName) => {
                  const pData = productsData[pName];
                  if (!pData) return null;
                  const { summary } = pData;
                  return (
                    <tr
                      key={pName}
                      onClick={() => handleSelectProduct(pName)}
                      className="hover:bg-blue-50/80 transition-colors cursor-pointer group bg-white"
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {pName}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {summary.totalMovements} mov.
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-amber-800 font-extrabold">
                        {summary.totInQty.toLocaleString('en-PE')}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-800 font-extrabold">
                        {summary.totOutQty.toLocaleString('en-PE')}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-extrabold text-blue-900">
                        {summary.finalBalanceQty.toLocaleString('en-PE')}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700 font-semibold">
                        S/ {summary.finalBalanceCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-extrabold text-slate-900">
                        S/ {summary.finalBalanceTotal.toLocaleString('en-PE', { minimumFractionDigits: 2 })}
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
                {matchingProducts.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-slate-500 italic">
                      No se encontraron productos que coincidan con el filtro seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
