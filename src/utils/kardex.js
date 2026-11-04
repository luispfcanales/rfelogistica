// Kardex frontend presentation and formatting utilities (Stage 3)
// Business and costing engine runs exclusively on Go backend (odooinvoce)

import { getLocationLabel } from './kardexLocations';

export const SERIES_MAPPING = {
  'BT06': 'APA BAR',
  'BT07': 'APA BOUTIQUE',
  'BT02': 'ARA BAR',
  'BT04': 'ARA BOUTIQUE',
  'BT03': 'BAR TRC',
  'BT05': 'TRC BOUTIQUE',
  'BT01': 'PEM CAFETIN',
  'BT08': 'PEM ALMACEN COMPARTIDO'
};

export function mapLocation(raw) {
  return getLocationLabel(raw);
}

export function formatQuantity(val, uomName = '') {
  if (val === undefined || val === null || isNaN(val)) return '-';
  const num = Number(val);
  const formatted = num.toLocaleString('en-PE', {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2
  });
  const uom = uomName ? ` ${uomName.toLowerCase()}` : '';
  return `${formatted}${uom}`;
}

export function formatCurrency(val) {
  if (val === undefined || val === null || isNaN(val)) return 'S/ 0.00';
  const num = Number(val);
  return `S/ ${num.toLocaleString('en-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getAdjustmentBadge(category) {
  if (!category) return null;
  switch (category) {
    case 'Merma Real':
      return {
        label: 'Merma Real',
        bg: 'bg-rose-100 text-rose-800 border-rose-200'
      };
    case 'Conteo Físico':
      return {
        label: 'Conteo Físico',
        bg: 'bg-teal-100 text-teal-800 border-teal-200'
      };
    case 'Corrección de Sistema':
      return {
        label: 'Corrección Sistema',
        bg: 'bg-indigo-100 text-indigo-800 border-indigo-200'
      };
    case 'Ajuste Mixto':
      return {
        label: 'Ajuste Mixto',
        bg: 'bg-amber-100 text-amber-800 border-amber-200'
      };
    case 'Regularización de Negativos':
      return {
        label: 'Reg. Negativos',
        bg: 'bg-purple-100 text-purple-800 border-purple-200'
      };
    case 'No Inventariable':
      return {
        label: 'No Inventariable',
        bg: 'bg-slate-100 text-slate-700 border-slate-300'
      };
    default:
      return {
        label: category,
        bg: 'bg-slate-100 text-slate-800 border-slate-200'
      };
  }
}

export function getDocTypeBadge(row) {
  const docType = row.doc_type || row.docType || '';
  const docCode = row.doc_code || row.docCode || '00';
  const hasVoucher = row.has_voucher || row.hasVoucher;

  if (docType === 'Saldo Inicial del Periodo' || docType === 'Inventario Inicial') {
    return {
      label: docType,
      code: '00',
      className: 'bg-cyan-100 text-cyan-800 border-cyan-200 font-bold'
    };
  }
  if (docType === 'Venta POS sin comprobante') {
    return {
      label: 'Venta POS (Sin Comprobante)',
      code: 'POS',
      className: 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
    };
  }
  if (docCode === '01') {
    return {
      label: 'Factura Electrónica',
      code: '01',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold'
    };
  }
  if (docCode === '03') {
    return {
      label: 'Boleta de Venta',
      code: '03',
      className: 'bg-blue-100 text-blue-800 border-blue-200 font-bold'
    };
  }
  if (docCode === '07') {
    return {
      label: 'Nota de Crédito',
      code: '07',
      className: 'bg-purple-100 text-purple-800 border-purple-200 font-bold'
    };
  }
  return {
    label: docType || 'Movimiento Interno',
    code: docCode,
    className: 'bg-slate-100 text-slate-800 border-slate-200'
  };
}

// Normalizes backend Go Kardex payload for React rendering
export function normalizeKardexPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { productsList: [], productsData: {} };
  }

  const productsData = {};
  const productsList = Object.keys(payload).sort((a, b) => a.localeCompare(b));

  for (const pName of productsList) {
    const raw = payload[pName];
    if (!raw) continue;

    const summary = raw.summary || {};
    const rows = Array.isArray(raw.rows) ? raw.rows : [];

    // Normalize summary metrics (match Go JSON tags in KardexSummary)
    const ventasQty = summary.ventas_qty ?? summary.ventas_reales_qty ?? 0;
    const ventasTotal = summary.ventas_total ?? summary.ventas_reales_tot ?? 0;
    const consumoMermaQty = summary.consumo_merma_qty ?? 0;
    const consumoMermaTotal = summary.consumo_merma_total ?? summary.consumo_merma_tot ?? 0;
    const devProveedorQty = summary.dev_proveedor_qty ?? 0;
    const devProveedorTotal = summary.dev_proveedor_total ?? summary.dev_proveedor_tot ?? 0;

    // Sum all incoming and outgoing movements directly from rows (matching Excel export totals)
    let rowsInQty = 0;
    let rowsInTotal = 0;
    let rowsOutQty = 0;
    let rowsOutTotal = 0;
    for (const r of rows) {
      rowsInQty += r.in_qty || 0;
      rowsInTotal += r.in_total || 0;
      rowsOutQty += r.out_qty || 0;
      rowsOutTotal += r.out_total || 0;
    }

    const summaryInQty = (summary.compras_qty || 0) + (summary.inv_inicial_qty || 0) + (summary.ajustes_pos_qty || 0) + (summary.dev_cliente_qty || 0) + (summary.transfer_in_qty || 0);
    const summaryInTotal = (summary.compras_total || 0) + (summary.inv_inicial_total || 0) + (summary.ajustes_pos_total || 0) + (summary.dev_cliente_total || 0) + (summary.transfer_in_total || 0);
    const summaryOutQty = ventasQty + consumoMermaQty + (summary.ajustes_neg_qty || 0) + devProveedorQty + (summary.transfer_out_qty || 0);
    const summaryOutTotal = ventasTotal + consumoMermaTotal + (summary.ajustes_neg_total || 0) + devProveedorTotal + (summary.transfer_out_total || 0);

    const normSummary = {
      comprasQty: summary.compras_qty || 0,
      comprasTotal: summary.compras_total || 0,
      invInicialQty: summary.inv_inicial_qty || 0,
      invInicialTotal: summary.inv_inicial_total || 0,
      ajustesPosQty: summary.ajustes_pos_qty || 0,
      ajustesPosTotal: summary.ajustes_pos_total || 0,
      ajustesNegQty: summary.ajustes_neg_qty || 0,
      ajustesNegTotal: summary.ajustes_neg_total || 0,
      ventasRealesQty: ventasQty,
      ventasRealesTotal: ventasTotal,
      consumoMermaQty: consumoMermaQty,
      consumoMermaTotal: consumoMermaTotal,
      devClienteQty: summary.dev_cliente_qty || 0,
      devClienteTotal: summary.dev_cliente_total || 0,
      devProveedorQty: devProveedorQty,
      devProveedorTotal: devProveedorTotal,
      transferInQty: summary.transfer_in_qty || 0,
      transferInTotal: summary.transfer_in_total || 0,
      transferOutQty: summary.transfer_out_qty || 0,
      transferOutTotal: summary.transfer_out_total || 0,
      finalBalanceQty: summary.final_balance_qty || 0,
      finalBalanceCost: summary.final_balance_cost || 0,
      finalBalanceTotal: summary.final_balance_total || 0,
      totalMovements: summary.total_movements || rows.length,
      hasNegative: Boolean(summary.has_negative),
      // Aggregate totals for catalog & summary footer (all Entradas and all Salidas)
      totInQty: rows.length > 0 ? rowsInQty : summaryInQty,
      totInTotal: rows.length > 0 ? rowsInTotal : summaryInTotal,
      totOutQty: rows.length > 0 ? rowsOutQty : summaryOutQty,
      totOutTotal: rows.length > 0 ? rowsOutTotal : summaryOutTotal,
    };

    // Normalize rows
    const normRows = rows.map((r, idx) => ({
      id: r.id || `row-${idx}`,
      date: r.date || '',
      dateTime: r.date_time || r.dateTime || '',
      productId: r.product_id || raw.product_id,
      product: r.product || pName,
      productName: pName,
      defaultCode: r.default_code || raw.default_code,
      location: r.location || '',
      fromLocation: r.from_location || '',
      toLocation: r.to_location || '',
      docType: r.doc_type || '',
      docCode: r.doc_code || '00',
      series: r.series || '',
      number: r.number || '',
      docName: r.doc_name || '',
      partner: r.partner || 'PORTADOR',
      partnerVat: r.partner_vat || '',
      opType: r.op_type || '',
      adjCategory: r.adj_category || '',
      adjustmentReason: r.adjustment_reason || '',
      hasVoucher: Boolean(r.has_voucher),
      isNegative: Boolean(r.is_negative),
      originalUom: r.original_uom || raw.uom_name || 'Unidad',
      uomName: raw.uom_name || 'Unidad',
      uomFactor: r.uom_factor || 1,
      inQty: r.in_qty || 0,
      inCost: r.in_cost || 0,
      inTotal: r.in_total || 0,
      outQty: r.out_qty || 0,
      outCost: r.out_cost || 0,
      outTotal: r.out_total || 0,
      calculatedQty: r.calculated_qty || 0,
      calculatedCost: r.calculated_cost || 0,
      calculatedTotal: r.calculated_total || 0
    }));

    productsData[pName] = {
      productId: raw.product_id,
      productName: pName,
      defaultCode: raw.default_code,
      productType: raw.product_type || 'product',
      isActive: raw.is_active !== undefined ? raw.is_active : true,
      uomName: raw.uom_name || 'Unidad',
      categoryName: raw.category_name || '',
      summary: normSummary,
      rows: normRows
    };
  }

  return { productsList, productsData };
}
