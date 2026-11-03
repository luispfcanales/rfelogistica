import React from 'react';
import { formatCurrency, formatQuantity, getAdjustmentBadge, getDocTypeBadge } from '../../utils/kardex';
import { getLocationLabel } from '../../utils/kardexLocations';

export default function MovementDetailModal({ row, onClose }) {
  if (!row) return null;

  const docBadge = getDocTypeBadge(row);
  const adjBadge = getAdjustmentBadge(row.adjCategory);
  const uom = row.uomName || row.originalUom || 'Unidad';

  const isIncoming = (row.inQty || 0) > 0;
  const isOutgoing = (row.outQty || 0) > 0;
  const qty = isIncoming ? row.inQty : (isOutgoing ? row.outQty : 0);
  const unitCost = isIncoming ? row.inCost : (isOutgoing ? row.outCost : row.calculatedCost);
  const total = isIncoming ? row.inTotal : (isOutgoing ? row.outTotal : row.calculatedTotal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-6 py-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border ${docBadge.className}`}>
                  {docBadge.label} ({docBadge.code})
                </span>
                {row.hasVoucher ? (
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    SUNAT OK
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    SIN COMPROBANTE
                  </span>
                )}
                {adjBadge && (
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${adjBadge.bg}`}>
                    {adjBadge.label}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-extrabold text-white mt-1.5 flex items-center font-mono tracking-tight">
                {row.series && row.number ? `${row.series}-${row.number}` : (row.docName || row.reference || 'Movimiento de Almacén')}
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

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Box 1: Comprobante y Entidad */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-3 shadow-sm">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center">
                <svg className="w-4 h-4 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Comprobante y Tercero
              </h4>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Cliente / Proveedor:</span>
                <span className="font-bold text-slate-900 text-right truncate max-w-[210px]" title={row.partner}>
                  {row.partner || 'PORTADOR'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">RUC / DNI / N° Doc:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {row.partnerVat || 'Sin RUC'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Serie y Correlativo:</span>
                <span className="font-mono font-extrabold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  {row.series ? `${row.series}-${row.number}` : (row.number || '-')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Tipo Doc. SUNAT:</span>
                <span className="font-semibold text-slate-800">
                  {row.docCode ? `Código ${row.docCode} (${row.docType})` : row.docType}
                </span>
              </div>
            </div>

            {/* Box 2: Trazabilidad Física y Ubicaciones */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-3 shadow-sm">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center">
                <svg className="w-4 h-4 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Trazabilidad Física de Almacén
              </h4>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Fecha y Hora Efectiva:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {row.dateTime || row.date}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Ubicación Origen (From):</span>
                <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 truncate max-w-[210px]" title={row.fromLocation}>
                  {getLocationLabel(row.fromLocation)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Ubicación Destino (To):</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate max-w-[210px]" title={row.toLocation}>
                  {getLocationLabel(row.toLocation)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Tipo Operación Kardex:</span>
                <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {row.opType}
                </span>
              </div>
            </div>

          </div>

          {/* Adjustment Reason & Reference Box if applicable */}
          {(row.adjCategory || row.adjustmentReason || row.docName) && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center">
                <svg className="w-4 h-4 mr-1.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Motivo / Referencia de Operación
              </h4>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Referencia Odoo: </span>
                  <span className="font-mono font-bold text-slate-800">{row.docName || row.reference}</span>
                </div>
                {row.adjCategory && (
                  <div>
                    <span className="text-slate-500 font-medium">Categoría D4: </span>
                    <span className={`px-2 py-0.5 rounded font-bold border text-[11px] ${adjBadge?.bg}`}>
                      {row.adjCategory}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Product Movement Values Card */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center">
                <svg className="w-4 h-4 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Detalle de Valorización (Base UdM: {uom})
              </span>
              <span className="font-mono text-[11px] text-slate-500">ID Línea: {row.id}</span>
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Producto</span>
                <span className="font-bold text-slate-900 text-xs block truncate" title={row.product}>
                  {row.product}
                </span>
              </div>
              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase block mb-1">Cantidad Operada</span>
                <span className="font-mono font-extrabold text-amber-950 text-sm block">
                  {formatQuantity(qty, uom)}
                </span>
              </div>
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200">
                <span className="text-[10px] font-bold text-blue-800 uppercase block mb-1">Costo Unitario (AVCO)</span>
                <span className="font-mono font-extrabold text-blue-950 text-sm block">
                  {formatCurrency(unitCost)}
                </span>
              </div>
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">Total Operación</span>
                <span className="font-mono font-extrabold text-emerald-950 text-sm block">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Saldo Resultante tras este movimiento:</span>
              <span className="font-mono font-extrabold text-slate-900">
                {formatQuantity(row.calculatedQty, uom)} &bull; {formatCurrency(row.calculatedTotal)}
              </span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-medium">
            Toca afuera o presiona <kbd className="px-1.5 py-0.5 bg-slate-200 border border-slate-300 rounded text-[10px] font-mono">Esc</kbd> para cerrar
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
}
