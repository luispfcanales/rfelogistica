import { useState, useEffect } from 'react';
import { fetchTSBReconciliation } from '../../api/odoo';
import { formatQuantity } from '../../utils/kardex';

export default function TSBReconciliationModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTSBReconciliation();
      if (res && res.error) throw new Error(res.error);
      setData(res);
    } catch (err) {
      setError(err.message || 'Error cargando conciliación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const items = data?.items || [];
  const totalMatched = data?.total_matched || 0;
  const totalDiscrep = data?.total_discrepancies || 0;
  const noStockControl = items.filter(it => it.status === 'NO_STOCK_CONTROL').length;
  const archived = items.filter(it => it.status === 'ARCHIVED').length;

  const filteredItems = items.filter(it => {
    if (filterStatus !== 'ALL' && it.status !== filterStatus) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return it.product_name.toLowerCase().includes(q) ||
        (it.default_code && it.default_code.toLowerCase().includes(q)) ||
        it.location.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-6 py-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                  100% Cuadrado con Odoo
                </span>
                <span className="text-slate-400 text-xs font-mono">
                  {data?.timestamp || 'En vivo'}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white mt-1">
                Conciliación Física: Kardex vs stock.quant (9 Ubicaciones Internas)
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 p-2.5 rounded-2xl transition-all shadow-sm"
            title="Cerrar ventana"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Traffic Light Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            {/* OK */}
            <button
              onClick={() => setFilterStatus(filterStatus === 'OK' ? 'ALL' : 'OK')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                filterStatus === 'OK'
                  ? 'bg-emerald-100 border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-100/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900 uppercase">Exacto (OK)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <span className="text-2xl font-mono font-extrabold text-emerald-950 block mt-1.5">
                {totalMatched.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-800 font-medium block mt-0.5">
                Coincidencia 100% física
              </span>
            </button>

            {/* Consu Sin Control */}
            <button
              onClick={() => setFilterStatus(filterStatus === 'NO_STOCK_CONTROL' ? 'ALL' : 'NO_STOCK_CONTROL')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                filterStatus === 'NO_STOCK_CONTROL'
                  ? 'bg-amber-100 border-amber-400 shadow-md ring-2 ring-amber-500/30'
                  : 'bg-amber-50/70 border-amber-200/80 hover:bg-amber-100/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-900 uppercase">Sin Control Stock</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              </div>
              <span className="text-2xl font-mono font-extrabold text-amber-950 block mt-1.5">
                {noStockControl.toLocaleString()}
              </span>
              <span className="text-[10px] text-amber-800 font-medium block mt-0.5">
                Consumibles (café, limones)
              </span>
            </button>

            {/* Archivados */}
            <button
              onClick={() => setFilterStatus(filterStatus === 'ARCHIVED' ? 'ALL' : 'ARCHIVED')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                filterStatus === 'ARCHIVED'
                  ? 'bg-slate-200 border-slate-400 shadow-md ring-2 ring-slate-500/30'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase">Archivados</span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              </div>
              <span className="text-2xl font-mono font-extrabold text-slate-900 block mt-1.5">
                {archived.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-600 font-medium block mt-0.5">
                Inactivos no almacenables
              </span>
            </button>

            {/* Descuadres Reales */}
            <button
              onClick={() => setFilterStatus(filterStatus === 'DISCREPANCY' ? 'ALL' : 'DISCREPANCY')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                filterStatus === 'DISCREPANCY'
                  ? 'bg-rose-100 border-rose-400 shadow-md ring-2 ring-rose-500/30'
                  : 'bg-rose-50/70 border-rose-200/80 hover:bg-rose-100/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-900 uppercase">Descuadre Real</span>
                <span className={`w-2.5 h-2.5 rounded-full ${totalDiscrep > 0 ? 'bg-rose-600 animate-ping' : 'bg-rose-300'}`}></span>
              </div>
              <span className="text-2xl font-mono font-extrabold text-rose-950 block mt-1.5">
                {totalDiscrep.toLocaleString()}
              </span>
              <span className="text-[10px] text-rose-800 font-medium block mt-0.5">
                {totalDiscrep === 0 ? '¡Cero descuadres!' : 'Almacenables activos'}
              </span>
            </button>

          </div>

          {/* Search Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Filtrar por producto, código o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 font-medium"
              />
              <svg className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl border border-slate-300 flex items-center shadow-sm"
            >
              <svg className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Recargar
            </button>
          </div>

          {/* Results Table */}
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto"></div>
              <p className="text-slate-600 font-bold text-xs">Comparando live stock.quant con Kardex...</p>
            </div>
          ) : error ? (
            <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-800">
              <p className="font-bold text-xs">{error}</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase sticky top-0 backdrop-blur-sm z-10">
                    <tr>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Ubicación</th>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3 text-right">Kardex (Go)</th>
                      <th className="px-4 py-3 text-right">stock.quant (Odoo)</th>
                      <th className="px-4 py-3 text-right">Diferencia</th>
                      <th className="px-4 py-3">Diagnóstico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-mono">
                    {filteredItems.slice(0, 150).map((it, idx) => {
                      const isOK = it.status === 'OK';
                      const isNoControl = it.status === 'NO_STOCK_CONTROL';
                      const isArch = it.status === 'ARCHIVED';

                      return (
                        <tr key={`${it.product_id}-${it.location}-${idx}`} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {isOK ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                OK (100%)
                              </span>
                            ) : isNoControl ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Sin Control
                              </span>
                            ) : isArch ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                Archivado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                Descuadre
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-sans font-bold text-slate-800 whitespace-nowrap">
                            {it.location}
                          </td>
                          <td className="px-4 py-2.5 font-sans">
                            <span className="font-semibold text-slate-900">{it.product_name}</span>
                            {it.default_code && (
                              <span className="ml-1.5 text-[10px] text-slate-400">[{it.default_code}]</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-extrabold text-slate-900">
                            {formatQuantity(it.kardex_qty)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-extrabold text-slate-900">
                            {formatQuantity(it.quant_qty)}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-extrabold ${
                            Math.abs(it.difference) < 0.001 ? 'text-emerald-700' : 'text-amber-800'
                          }`}>
                            {Math.abs(it.difference) < 0.001 ? '0.00' : it.difference.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 font-sans text-slate-600 text-[11px] truncate max-w-[200px]" title={it.explanation}>
                            {it.explanation}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredItems.length > 150 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-slate-500 text-[11px]">
                  Mostrando los primeros 150 de {filteredItems.length} registros. Usa el buscador para filtrar.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Verificación automática contra la base de datos de Odoo ERP
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-95"
          >
            Cerrar Conciliación
          </button>
        </div>
      </div>
    </div>
  );
}
