import React from 'react';

export default function MovementDetailModal({ row, onClose }) {
  if (!row) return null;

  const report = row.rawReport || {};
  const items = Array.isArray(report.items) ? report.items : [
    {
      id: row.itemId || 1,
      product_name: row.product,
      quantity: row.inQty > 0 ? row.inQty : row.outQty,
      price_unit: row.inQty > 0 ? row.inCost : row.outCost,
      subtotal: row.inQty > 0 ? row.inTotal : row.outTotal,
      uom_name: 'Unidad',
      analytic: row.location
    }
  ];

  const totalAmount = items.reduce((acc, it) => acc + (it.subtotal || (it.quantity * (it.price_unit || 0))), 0);

  // Origin / Destination locations determination
  let originLoc = row.location || 'Almacén Central';
  let destLoc = 'Partners/Cliente';

  if (row.moveType === 'in_invoice' || row.moveType === 'incoming_reception' || row.moveType === 'initial_inventory') {
    originLoc = 'Proveedores / Inventario Inicial';
    destLoc = row.location;
  } else if (row.moveType === 'internal_transfer_in' || row.moveType === 'internal_transfer_out') {
    if (report.partner && report.partner.includes('Origen:')) {
      const matchOrg = report.partner.match(/Origen:\s*([^)]+)/i);
      if (matchOrg) originLoc = matchOrg[1];
    }
    if (report.partner && report.partner.includes('Destino:')) {
      const matchDst = report.partner.match(/Destino:\s*([^)]+)/i);
      if (matchDst) destLoc = matchDst[1];
    }
  }

  const sunatDocName = row.matchedInvoiceName || (row.series && row.number ? `${row.series}-${row.number}` : row.docName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                  {row.docType} ({row.docCode})
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase">
                  ESTADO: HECHO
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white mt-1 flex items-center font-mono">
                {row.docName || sunatDocName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition-colors"
            title="Cerrar ventana"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Column 1: Document & Partner Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Información del Cliente / Proveedor
              </h4>

              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Cliente / Socio:</span>
                <span className="font-bold text-slate-900 text-right truncate max-w-[200px]" title={row.partner}>
                  {row.partner}
                </span>
              </div>

              {row.partnerVat && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">RUC / Doc:</span>
                  <span className="font-mono font-bold text-slate-900">{row.partnerVat}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Comprobante SUNAT:</span>
                <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {sunatDocName}
                </span>
              </div>

              {row.matchedInvoiceName && row.matchedInvoiceName !== row.docName && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Movimiento Almacén:</span>
                  <span className="font-mono font-semibold text-slate-800">{row.docName}</span>
                </div>
              )}
            </div>

            {/* Column 2: Operation & Location Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Ubicación y Operación Odoo
              </h4>

              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Fecha y Hora Efectiva:</span>
                <span className="font-mono font-semibold text-slate-900">{row.dateTime || row.date}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Ubicación Origen:</span>
                <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {originLoc}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Ubicación Destino:</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {destLoc}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Tipo de Operación:</span>
                <span className="font-semibold text-slate-800">{row.opType || row.docType}</span>
              </div>
            </div>

          </div>

          {/* Items Breakdown Table ("Operaciones detalladas") */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center">
                <svg className="w-3.5 h-3.5 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Operaciones Detalladas del Movimiento ({items.length} productos)
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Información extraída de Odoo ERP</span>
            </h4>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                    <th className="px-4 py-2.5">Producto</th>
                    <th className="px-4 py-2.5 text-center">Unidad</th>
                    <th className="px-4 py-2.5 text-right">Cantidad</th>
                    <th className="px-4 py-2.5 text-right">Precio / Costo Unit.</th>
                    <th className="px-4 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-mono">
                  {items.map((it, idx) => {
                    const q = it.quantity || 0;
                    const p = it.price_unit || 0;
                    const sub = it.subtotal || (q * p);
                    const isSelected = it.product_name === row.product;

                    return (
                      <tr 
                        key={it.id || idx} 
                        className={`transition-colors ${isSelected ? 'bg-blue-50/90 font-bold text-blue-900' : 'hover:bg-slate-50 text-slate-800'}`}
                      >
                        <td className="px-4 py-2.5 font-sans">
                          {isSelected && (
                            <span className="mr-1.5 inline-block w-2 h-2 rounded-full bg-blue-600"></span>
                          )}
                          {it.product_name || 'PRODUCTO'}
                        </td>
                        <td className="px-4 py-2.5 text-center text-slate-500 font-sans text-[11px]">
                          {it.uom_name || it.uom || 'Unidad'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-extrabold text-slate-900">
                          {q.toLocaleString('en-PE')}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          S/ {p.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-extrabold text-slate-900">
                          S/ {sub.toLocaleString('en-PE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t border-slate-300 font-bold text-xs">
                    <td colSpan="2" className="px-4 py-2.5 text-slate-800 uppercase font-sans">Total Movimiento:</td>
                    <td className="px-4 py-2.5 text-right font-mono font-extrabold text-slate-900">
                      {items.reduce((a, b) => a + (b.quantity || 0), 0).toLocaleString('en-PE')} u.
                    </td>
                    <td className="px-4 py-2.5"></td>
                    <td className="px-4 py-2.5 text-right font-mono font-extrabold text-blue-900 text-sm">
                      S/ {totalAmount.toLocaleString('en-PE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-medium">
            Toca afuera o presiona <kbd className="px-1.5 py-0.5 bg-slate-200 border border-slate-300 rounded text-[10px] font-mono">Esc</kbd> para cerrar
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
}
