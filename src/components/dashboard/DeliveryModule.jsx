import { useState } from 'react';
import { fetchOrder, fetchOrderLines, createDelivery } from '../../api/odoo';

export default function DeliveryModule({ showToast }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [lines, setLines] = useState([]);
  
  // Delivery header fields pre-filled according to specification
  const [pickingTypeName, setPickingTypeName] = useState('PEM: Entregas PEM');
  const [locationName, setLocationName] = useState('PEM/Ubicacion Compartido');
  const [locationDestName, setLocationDestName] = useState('PER/Consumo inmediato');
  const [operationType, setOperationType] = useState('Otros');
  const [documentTypeCode, setDocumentTypeCode] = useState('(00) Otros');

  const [createdDelivery, setCreatedDelivery] = useState(null);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setOrder(null);
    setLines([]);
    setCreatedDelivery(null);

    try {
      const orderData = await fetchOrder(query);
      if (!orderData || orderData.error) throw new Error(orderData?.error || 'Orden de compra no encontrada');
      setOrder(orderData);

      const linesData = await fetchOrderLines(orderData.id);
      if (linesData && linesData.error) throw new Error(linesData.error);

      const safeLines = Array.isArray(linesData) ? linesData : [];

      // Pre-fill delivery lines with pending quantity
      setLines(
        safeLines.map((l) => ({
          ...l,
          selected: true,
          deliveryQty: l.pending > 0 ? l.pending : l.product_qty,
        }))
      );

      // Check analytic account rules for destination location (location_dest_id)
      let destLocation = 'PER/Consumo inmediato';
      let destReason = '';

      const checkAnalyticMatch = (linesArr, targetIds, targetCodes) => {
        return linesArr.some((l) => {
          if (!l.analytic_distribution || typeof l.analytic_distribution !== 'object') return false;
          return Object.keys(l.analytic_distribution).some((k) => {
            const kStr = String(k);
            return (
              targetIds.some((id) => kStr === String(id) || kStr.split(',').includes(String(id))) ||
              targetCodes.some((code) => kStr.toUpperCase().includes(code.toUpperCase()))
            );
          });
        });
      };

      if (checkAnalyticMatch(safeLines, [888], ['QINV0107'])) {
        destLocation = 'PER/Equipos Diversos por Recibir';
        destReason = 'Distribución analítica QINV0107 (ID: 888) detectada';
      } else if (checkAnalyticMatch(safeLines, [920], ['QINV0210'])) {
        destLocation = 'PER/Obras en Curso';
        destReason = 'Distribución analítica QINV0210 (ID: 920) detectada';
      }

      // Auto-configure delivery fields based on purchase order picking_type default_location_dest_id in Odoo
      let originLocation = orderData.picking_type_default_location_dest || '';

      if (!originLocation) {
        const rawTypeString = [
          orderData.picking_type_name,
          orderData.picking_type_display_name,
          orderData.picking_type_sequence_code,
        ].filter(Boolean).join(' ');

        const poPickingUpper = rawTypeString.toUpperCase();

        if (poPickingUpper.includes('R/APA') || poPickingUpper.includes('PEM/APA') || (poPickingUpper.includes('APA') && !poPickingUpper.includes('ZAPAPATOS'))) {
          originLocation = 'PEM/APA';
        } else if (poPickingUpper.includes('R/ARA') || poPickingUpper.includes('PEM/ARA') || poPickingUpper.includes('ARA')) {
          originLocation = 'PEM/ARA';
        } else if (poPickingUpper.includes('R/MANT') || poPickingUpper.includes('PEM/MANT') || poPickingUpper.includes('MANT')) {
          originLocation = 'PEM/MANT';
        } else if (poPickingUpper.includes('R/TRC') || poPickingUpper.includes('PEM/TRC') || poPickingUpper.includes('TRC')) {
          originLocation = 'PEM/TRC';
        } else if (poPickingUpper.includes('R/COM') || poPickingUpper.includes('UBICACION COMPARTIDO') || poPickingUpper.includes('COM')) {
          originLocation = 'PEM/Ubicacion Compartido';
        } else {
          const rMatch = poPickingUpper.match(/R\/([A-Z0-9_-]+)/);
          if (rMatch) {
            originLocation = `PEM/${rMatch[1]}`;
          }
        }
      }

      setPickingTypeName('PEM: Entregas PEM');
      if (originLocation) setLocationName(originLocation);
      setLocationDestName(destLocation);
      setOperationType('Otros');
      setDocumentTypeCode('(00) Otros');

      if (destReason) {
        showToast(`${destReason}. Ubicación destino configurada a ${destLocation}.`, 'success');
      } else if (originLocation) {
        showToast(`Ubicación de origen autocompletada a ${originLocation} (desde Tipo de Operación de Odoo).`, 'success');
      } else {
        showToast(`Orden cargada (Tipo de operación: ${orderData.picking_type_name || 'N/A'})`, 'info');
      }
    } catch (err) {
      showToast(err.message || 'Error al buscar la orden de compra', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleLine = (id) => {
    setLines(lines.map((l) => (l.id === id ? { ...l, selected: !l.selected } : l)));
  };

  const toggleAll = (e) => {
    const checked = e.target.checked;
    setLines(lines.map((l) => ({ ...l, selected: checked })));
  };

  const updateQty = (id, val) => {
    const num = parseFloat(val) || 0;
    setLines(
      lines.map((l) => {
        if (l.id === id) {
          return { ...l, deliveryQty: Math.max(0, num) };
        }
        return l;
      })
    );
  };

  const selectedLines = lines.filter((l) => l.selected && l.deliveryQty > 0);

  const handleCreateDelivery = async () => {
    if (selectedLines.length === 0) {
      return showToast('Selecciona al menos una línea de producto con cantidad mayor a 0', 'error');
    }

    setSubmitting(true);
    try {
      let companyIdInt = 0;
      let companyNameStr = '';
      if (order.company_id_num) {
        companyIdInt = order.company_id_num;
      } else if (Array.isArray(order.company_id) && order.company_id.length > 0) {
        companyIdInt = parseInt(order.company_id[0], 10);
      } else if (typeof order.company_id === 'number') {
        companyIdInt = order.company_id;
      }
      companyNameStr = order.company_name || (Array.isArray(order.company_id) ? order.company_id[1] : '');

      const payload = {
        order_id: order.id,
        order_name: order.name,
        company_id: companyIdInt,
        company_name: companyNameStr,
        picking_type_name: pickingTypeName,
        location_name: locationName,
        location_dest_name: locationDestName,
        l10n_pe_operation_type: operationType,
        x_l10n_latam_document_type_id: documentTypeCode,
        lines: selectedLines.map((l) => {
          let productIdInt = 0;
          if (Array.isArray(l.product_id) && l.product_id.length > 0) {
            productIdInt = parseInt(l.product_id[0], 10);
          } else if (typeof l.product_id === 'number') {
            productIdInt = l.product_id;
          }

          let uomIdInt = 0;
          if (Array.isArray(l.product_uom) && l.product_uom.length > 0) {
            uomIdInt = parseInt(l.product_uom[0], 10);
          } else if (typeof l.product_uom === 'number') {
            uomIdInt = l.product_uom;
          }

          return {
            line_id: l.id,
            product_id: productIdInt,
            product_name: l.product_name || l.name,
            quantity: l.deliveryQty,
            uom_id: uomIdInt,
            analytic_distribution: l.analytic_distribution || null,
          };
        }),
      };

      const result = await createDelivery(payload);
      if (result.error) throw new Error(result.error);

      setCreatedDelivery(result);
      showToast(`Borrador de entrega ${result.picking_name || ''} creado exitosamente en Odoo`, 'success');
    } catch (err) {
      showToast(err.message || 'Error al crear la entrega', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to format analytic distribution dictionary nicely
  const renderAnalyticDistribution = (dist) => {
    if (!dist || typeof dist !== 'object' || Object.keys(dist).length === 0) {
      return <span className="text-slate-400 text-xs italic">Sin distribución</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {Object.entries(dist).map(([key, val]) => (
          <span
            key={key}
            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
          >
            <span className="font-semibold mr-1">{key}:</span> {val}%
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Search Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Creación de Borrador de Entrega desde Orden de Compra
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Inventario &rarr; Operaciones &rarr; Entregas
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por referencia de Orden de Compra (ej. P00123, PO005)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-md shadow-teal-600/20 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            Buscar OC
          </button>
        </form>
      </div>

      {loading && (
        <div className="flex justify-center p-12">
          <div className="animate-spin w-10 h-10 border-4 border-teal-600/30 border-t-teal-600 rounded-full" />
        </div>
      )}

      {/* Order Info & Delivery Parameters Card */}
      {order && (
        <div className="space-y-6">
          {/* Order Header Summary */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-slate-900 font-mono">{order.name}</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                    {order.state || 'Confirmado'}
                  </span>
                  {(order.company_name || (Array.isArray(order.company_id) && order.company_id[1])) && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      {order.company_name || order.company_id[1]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Proveedor: <strong className="text-slate-900">{Array.isArray(order.partner_id) ? order.partner_id[1] : 'N/A'}</strong>
                </p>
              </div>

              {/* Status Badge regarding picking_type_id & origin location */}
              <div>
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>
                    <strong>Tipo OC:</strong> {order.picking_type_name || 'N/A'} &rarr; <strong>Origen:</strong> <span className="font-mono text-emerald-900 font-bold">{locationName}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Form Fields */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configuración del Movimiento de Entrega (Inventario)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Tipo de Operación (Picking Type)
                  </label>
                  <input
                    type="text"
                    value={pickingTypeName}
                    onChange={(e) => setPickingTypeName(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Ubicación Origen (location_id)
                  </label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Ubicación Destino (location_dest_id)
                  </label>
                  <input
                    type="text"
                    value={locationDestName}
                    onChange={(e) => setLocationDestName(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Tipo Operación SUNAT (l10n_pe_operation_type)
                  </label>
                  <select
                    value={operationType}
                    onChange={(e) => setOperationType(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600 font-sans"
                  >
                    <option value="Otros">Otros</option>
                    <option value="00">00 (Otros)</option>
                    <option value="01">01 (Venta nacional)</option>
                    <option value="02">02 (Compra nacional)</option>
                    <option value="05">05 (Traslado entre establecimientos)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Tipo de Documento (x_l10n_latam_document_type_id)
                  </label>
                  <input
                    type="text"
                    value={documentTypeCode}
                    onChange={(e) => setDocumentTypeCode(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lines Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Líneas de Producto</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecciona los productos y las cantidades a incluir en el borrador de entrega
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono font-semibold">
                {selectedLines.length} de {lines.length} seleccionadas
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={lines.length > 0 && lines.every((l) => l.selected)}
                        onChange={toggleAll}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4">Producto</th>
                    <th className="py-3.5 px-4">Distribución Analítica</th>
                    <th className="py-3.5 px-4 text-right">Cant. Pendiente OC</th>
                    <th className="py-3.5 px-4 text-center w-36">Cant. a Entregar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line) => (
                    <tr
                      key={line.id}
                      className={`transition-colors ${
                        line.selected ? 'bg-teal-50/40 hover:bg-teal-50/70' : 'hover:bg-slate-50 opacity-60'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={line.selected}
                          onChange={() => toggleLine(line.id)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div>
                          <span>{line.product_name || line.name}</span>
                          {line.uom_name && (
                            <span className="ml-2 text-xs text-slate-500">({line.uom_name})</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {renderAnalyticDistribution(line.analytic_distribution)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                        {line.pending}
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={line.deliveryQty}
                          disabled={!line.selected}
                          onChange={(e) => updateQty(line.id, e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-center text-sm font-mono text-teal-700 font-bold focus:outline-none focus:border-teal-600 disabled:opacity-40"
                        />
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-slate-500 text-sm">
                        No hay líneas de producto encontradas en esta Orden de Compra.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                Se registrará un movimiento de inventario en estado <strong className="text-teal-700 uppercase font-mono">Borrador</strong>.
              </div>

              <button
                onClick={handleCreateDelivery}
                disabled={submitting || selectedLines.length === 0}
                className="bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-8 py-3.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-teal-600/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 min-w-[240px]"
              >
                {submitting ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Crear Borrador de Entrega
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal / Banner */}
      {createdDelivery && (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl animate-in zoom-in-95 duration-300 shadow-md">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-emerald-900">
                ¡Borrador de Entrega Creado en Odoo Exitosamente!
              </h3>
              <p className="text-sm text-emerald-700 mt-1">
                Referencia en Odoo: <strong className="text-emerald-900 font-mono text-base">{createdDelivery.picking_name}</strong> (ID: #{createdDelivery.picking_id})
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setCreatedDelivery(null)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm"
                >
                  Cerrar Notificación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
