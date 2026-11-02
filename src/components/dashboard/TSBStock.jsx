import { useState, useEffect } from 'react';
import { fetchTSBStock } from '../../api/odoo';

export default function TSBStock({ showToast }) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  useEffect(() => {
    loadStock();
  }, []);

  const loadStock = async () => {
    setLoading(true);
    try {
      const data = await fetchTSBStock();
      if (data && data.error) throw new Error(data.error);
      setStock(data || []);
    } catch (err) {
      showToast(`Error al cargar stock: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredDataQueryString = () => {
    const params = new URLSearchParams();
    if (filter) params.append('q', filter);
    if (selectedLocation) params.append('loc', selectedLocation);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const handleExportExcel = async () => {
    try {
      const savedUser = localStorage.getItem('odoo_user');
      if (!savedUser) return;
      const user = JSON.parse(savedUser);
      
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';
      const response = await fetch(`${API_BASE}/tsb/stock/export${getFilteredDataQueryString()}`, {
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
      a.download = `Stock_Tambopata_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      showToast('Reporte de Stock descargado correctamente', 'success');
    } catch (err) {
      showToast(`Error al exportar: ${err.message}`, 'error');
    }
  };

  const handlePrintTicket = async () => {
    try {
      const savedUser = localStorage.getItem('odoo_user');
      if (!savedUser) return;
      const user = JSON.parse(savedUser);
      
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';
      const response = await fetch(`${API_BASE}/tsb/stock/print${getFilteredDataQueryString()}`, {
        headers: {
          'X-Odoo-User': user.username,
          'X-Odoo-Key': user.password
        }
      });

      if (!response.ok) throw new Error('Error al generar el ticket');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      showToast('Ticket generado correctamente', 'success');
    } catch (err) {
      showToast(`Error al imprimir: ${err.message}`, 'error');
    }
  };

  const filteredStock = stock.filter(item => {
    const matchesQuery = filter === '' || 
      item.name?.toLowerCase().includes(filter.toLowerCase()) || 
      item.internal_ref?.toLowerCase().includes(filter.toLowerCase()) ||
      item.product_name?.toLowerCase().includes(filter.toLowerCase());
    
    const matchesLoc = selectedLocation === '' || 
      item.location_name.toLowerCase().includes(selectedLocation.toLowerCase());

    return matchesQuery && matchesLoc;
  });

  const locations = [...new Set(stock.map(item => item.location_name))].sort();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full"></div>
        <p className="text-slate-500 font-medium animate-pulse">Consultando inventario de Tambopata...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Productos en Stock</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">
            {filteredStock.length}
          </h3>
          <div className="mt-2 text-xs text-blue-600 font-medium flex items-center">
            <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
            Mostrando {filteredStock.length} de {stock.length} registros
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Compañía</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">TAMBOPATA STILO Y BAR</h3>
          <p className="text-xs text-slate-500 mt-1">Reporte de inventario</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Acciones</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <button 
                onClick={loadStock}
                className="text-blue-600 hover:text-blue-700 transition-colors text-xs font-bold flex items-center"
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
              <button 
                onClick={handlePrintTicket}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-all text-xs font-bold flex items-center shadow-md shadow-blue-500/20"
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir Ticket
              </button>
              <button 
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-all text-xs font-bold flex items-center shadow-md shadow-emerald-500/20"
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Buscar por producto o referencia..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 placeholder-slate-400 transition-all shadow-sm font-sans"
          />
          <svg className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="w-full md:w-64">
          <select 
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 transition-all cursor-pointer font-sans shadow-sm"
          >
            <option value="">Todas las ubicaciones</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-tighter">Ubicación</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-tighter">Referencia</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-tighter">Producto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-tighter text-right">Stock</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-tighter text-center">UdM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStock.map((item, idx) => (
                <tr key={`${item.product_id}-${item.location_id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                      {item.location_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                      {item.internal_ref || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-900">{item.name || item.product_name}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-mono font-bold ${item.quantity > 0 ? 'text-blue-700' : 'text-red-600'}`}>
                      {item.quantity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-bold">
                      {item.uom_name}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredStock.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">
                    No se encontraron productos en stock que coincidan con los filtros.
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
