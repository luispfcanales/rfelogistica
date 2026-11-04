import { useState, useMemo } from 'react';
import { downloadTSBKardexExcel } from '../../api/odoo';
import TSBKardex from './TSBKardex';
import TSBReconciliationModal from './TSBReconciliationModal';

export default function TSBReports({ showToast }) {
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [kardexFilters, setKardexFilters] = useState({ location: 'ALL', product: '' });

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

  const monthOptions = useMemo(() => {
    return [{ value: '', label: 'Todos los meses' }, ...generateDefaultMonths()];
  }, []);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await downloadTSBKardexExcel({
        month: selectedMonth,
        location: kardexFilters.location,
        product: kardexFilters.product,
        method: kardexFilters.method || 'GLOBAL_AVCO',
        sort: kardexFilters.sort || 'asc'
      });
      showToast('Kardex Excel generado y descargado correctamente', 'success');
    } catch (err) {
      showToast(`Error al exportar: ${err.message}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      
      {/* Top Header Bar: Kardex Valorizado + Global Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm w-full">
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-300 w-full md:w-auto">
          <div className="flex-1 md:flex-none px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-md flex items-center justify-center">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Kardex Valorizado (Interactivo)
          </div>
        </div>

        {/* Global Controls: Period Selector, Audit & Export Button */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs">
            <svg className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-slate-800 focus:outline-none cursor-pointer text-xs font-bold"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-white text-slate-800">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setIsReconcileOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl transition-all text-xs font-bold flex items-center shadow-md active:scale-95 whitespace-nowrap cursor-pointer"
            title="Verificar conciliación física contra stock.quant (100% Exacto)"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Auditoría stock.quant
          </button>

          <button 
            onClick={handleExportExcel}
            disabled={exporting}
            className={`bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl transition-all text-xs font-bold flex items-center shadow-md active:scale-95 whitespace-nowrap cursor-pointer ${
              exporting ? 'opacity-75 cursor-not-allowed' : ''
            }`}
            title="Descargar reporte filtrado de Kardex en Excel"
          >
            {exporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generando Excel...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar Excel
              </>
            )}
          </button>
        </div>
      </div>

      {/* Kardex Valorizado Interactivo */}
      <TSBKardex selectedMonth={selectedMonth} onFilterChange={setKardexFilters} />

      {/* Live Reconciliation Modal against stock.quant */}
      <TSBReconciliationModal
        isOpen={isReconcileOpen}
        onClose={() => setIsReconcileOpen(false)}
      />
    </div>
  );
}
