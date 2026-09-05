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
      if (data.error) throw new Error(data.error);
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
      a.download = `reporte_stock_tsb_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showToast('Excel de stock generado correctamente', 'success');
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
        <div className="animate-spin w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full"></div>
        <p className="text-gray-400 animate-pulse">Consultando inventario de Tambopata...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161B22] border border-gray-800 p-6 rounded-2xl shadow-xl backdrop-blur-sm bg-opacity-80">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Productos en Stock</p>
          <h3 className="text-3xl font-bold text-white mt-1">
            {filteredStock.length}
          </h3>
          <div className="mt-2 text-xs text-blue-400 flex items-center">
            <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
            Mostrando {filteredStock.length} de {stock.length} registros
          </div>
        </div>
        
        <div className="bg-[#161B22] border border-gray-800 p-6 rounded-2xl shadow-xl backdrop-blur-sm bg-opacity-80">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Compañía</p>
          <h3 className="text-xl font-semibold text-gray-200 mt-1">TAMBOPATA STILO Y BAR</h3>
          <p className="text-xs text-gray-500 mt-1">Reporte de inventario</p>
        </div>

        <div className="bg-[#161B22] border border-gray-800 p-6 rounded-2xl shadow-xl backdrop-blur-sm bg-opacity-80 flex flex-col justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Acciones</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <button 
                onClick={loadStock}
                className="text-blue-400 hover:text-blue-300 transition-colors text-xs font-bold flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
              <button 
                onClick={handlePrintTicket}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-all text-[10px] font-bold flex items-center shadow-lg shadow-blue-900/20"
              >
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir Ticket
              </button>
              <button 
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-all text-[10px] font-bold flex items-center shadow-lg shadow-emerald-900/20"
              >
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            className="w-full bg-[#0D1117] border border-gray-800 rounded-xl px-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-200 placeholder-gray-600 transition-all shadow-inner"
          />
          <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="w-full md:w-64">
          <select 
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full bg-[#0D1117] border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-200 transition-all appearance-none cursor-pointer"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%234B5563\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem' }}
          >
            <option value="">Todas las ubicaciones</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-[#161B22] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0D1117] border-bottom border-gray-800">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-tighter">Ubicación</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-tighter">Referencia</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-tighter">Producto</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-tighter text-right">Stock</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-tighter text-center">UdM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredStock.map((item, idx) => (
                <tr key={`${item.product_id}-${item.location_id}-${idx}`} className="hover:bg-blue-500/5 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/5 px-2 py-1 rounded">
                      {item.location_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-blue-400 font-bold bg-blue-500/5 px-2 py-1 rounded">
                      {item.internal_ref || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-200">{item.name || item.product_name}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-mono font-bold ${item.quantity > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {item.quantity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full font-bold">
                      {item.uom_name}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredStock.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">
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
