export const SERIES_MAPPING = {
  'BT06': 'APA BAR',
  'BT07': 'APA BOUTIQUE',
  'BT02': 'ARA BAR',
  'BT04': 'ARA BOUTIQUE',
  'BT03': 'BAR TRC',
  'BT05': 'BOUTIQUE ARA',
  'BT01': 'CAFETIN',
  'BT08': 'OFICINA CENTRAL COMPARTIDO'
};

export function mapLocation(raw) {
  if (!raw) return 'GENERAL';
  let rawUpper = String(raw).trim().toUpperCase();
  const idx = rawUpper.indexOf(' (');
  if (idx !== -1) {
    rawUpper = rawUpper.substring(0, idx).trim();
  }

  if (SERIES_MAPPING[rawUpper]) {
    return SERIES_MAPPING[rawUpper];
  }

  if (rawUpper.includes('APA/BAR') || rawUpper.includes('APA BAR')) return 'APA BAR';
  if (rawUpper.includes('APA/BOUTIQUE') || rawUpper.includes('APA BOUTIQUE')) return 'APA BOUTIQUE';
  if (rawUpper.includes('ARA/BAR') || rawUpper.includes('ARA BAR')) return 'ARA BAR';
  if (rawUpper.includes('ARA/BOUTIQUE') || rawUpper.includes('ARA BOUTIQUE')) return 'ARA BOUTIQUE';
  if (rawUpper.includes('TRC/BAR') || rawUpper.includes('BAR TRC')) return 'BAR TRC';
  if (rawUpper.includes('TRC/BOUTIQUE') || rawUpper.includes('BOUTIQUE TRC') || rawUpper.includes('BOUTIQUE ARA')) return 'BOUTIQUE ARA';
  if (rawUpper.includes('CAFETIN')) return 'CAFETIN';
  if (rawUpper.includes('COMPARTIDO')) return 'OFICINA CENTRAL COMPARTIDO';

  return rawUpper || 'GENERAL';
}

export function getDocCode(docType, series, name) {
  const sUpper = (series || '').toUpperCase();
  const nUpper = (name || '').toUpperCase();

  if (docType === 'Inventario Inicial' || docType === 'Saldo Inicial') return '00';
  if (docType.includes('Nota') || nUpper.includes('NC')) return '07';
  if (sUpper.startsWith('B') || nUpper.startsWith('B') || nUpper.startsWith('B-')) return '03';
  if (sUpper.startsWith('F') || nUpper.startsWith('F') || nUpper.startsWith('F-')) return '01';
  return '00';
}

export function getProductCode(name) {
  if (!name) return '';
  const match = String(name).match(/^\[([\w\d_-]+)\]/);
  return match ? match[1] : '';
}

export function processRawReportsToKardexRows(reports) {
  if (!Array.isArray(reports)) return [];

  const rows = [];

  reports.forEach(report => {
    if (!report) return;

    let series = report.serial || '';
    let number = report.correlative || '';

    if (!series && !number) {
      const docParts = (report.name || '').split('-');
      if (docParts.length >= 3) {
        series = docParts[1];
        number = docParts.slice(2).join('-');
      } else if (docParts.length === 2) {
        series = docParts[0];
        number = docParts[1];
      }
    }

    const nameUpper = (report.name || '').toUpperCase();
    const seriesUpper = (series || '').toUpperCase();

    let docType = 'Factura';
    if (report.move_type === 'initial_inventory') {
      const pUpper = (report.partner || '').toUpperCase();
      if (pUpper.includes('SALDO INICIAL') || nameUpper.includes('SALDO INICIAL') || pUpper.includes('SALDO')) {
        docType = 'Saldo Inicial';
      } else {
        docType = 'Inventario Inicial';
      }
    } else if (report.move_type === 'in_refund' || report.move_type === 'out_refund') {
      docType = 'Nota de Crédito';
    } else if (seriesUpper.startsWith('B') || nameUpper.startsWith('B') || nameUpper.startsWith('B-')) {
      docType = 'Boleta';
    } else if (seriesUpper.startsWith('F') || nameUpper.startsWith('F') || nameUpper.startsWith('F-')) {
      docType = 'Factura';
    }

    const docCode = getDocCode(docType, series, report.name);
    const items = Array.isArray(report.items) ? report.items : [];

    items.forEach(item => {
      let location = '';
      if (report.move_type === 'initial_inventory') {
        location = mapLocation(item.analytic);
      } else if (report.move_type === 'out_invoice') {
        if (SERIES_MAPPING[series]) {
          location = SERIES_MAPPING[series];
        } else if (SERIES_MAPPING[seriesUpper]) {
          location = SERIES_MAPPING[seriesUpper];
        } else if (report.partner) {
          location = report.partner;
        } else {
          location = 'VENTAS TSB';
        }
      } else {
        location = mapLocation(item.analytic);
        if ((!location || location === 'GENERAL') && report.partner) {
          location = mapLocation(report.partner);
        }
      }

      if (!location) location = 'GENERAL';

      const partnerName = report.partner || 'PORTADOR';

      const row = {
        id: `${report.id}-${item.id || Math.random()}`,
        reportId: report.id,
        itemId: item.id,
        date: report.date || '',
        product: item.product_name || 'PRODUCTO SIN NOMBRE',
        location: location,
        docType: docType,
        docCode: docCode,
        series: series,
        number: number,
        docName: report.name || '',
        partner: partnerName,
        partnerVat: report.partner_vat || '',
        moveType: report.move_type,
        inQty: 0,
        inCost: 0,
        inTotal: 0,
        outQty: 0,
        outCost: 0,
        outTotal: 0
      };

      if (report.move_type === 'in_invoice' || report.move_type === 'initial_inventory') {
        row.inQty = item.quantity || 0;
        row.inCost = item.price_unit || 0;
        row.inTotal = item.subtotal || (row.inQty * row.inCost);
      } else {
        row.outQty = item.quantity || 0;
        row.outCost = item.price_unit || 0;
        row.outTotal = item.subtotal || (row.outQty * row.outCost);
      }

      rows.push(row);
    });
  });

  // Canonical product name resolution by internal product code [CODE]
  const codeToCanonicalName = new Map();
  rows.forEach(r => {
    const code = getProductCode(r.product);
    if (code) {
      const existing = codeToCanonicalName.get(code);
      if (!existing) {
        codeToCanonicalName.set(code, r.product);
      } else {
        if (r.moveType === 'initial_inventory' || r.product.length > existing.length) {
          codeToCanonicalName.set(code, r.product);
        }
      }
    }
  });

  rows.forEach(r => {
    const code = getProductCode(r.product);
    if (code && codeToCanonicalName.has(code)) {
      r.product = codeToCanonicalName.get(code);
    }
  });

  return rows;
}

export function buildKardexByProduct(kardexRows, { locationFilter = 'ALL', sortDirection = 'desc' } = {}) {
  const filteredRows = kardexRows.filter(r => {
    if (locationFilter === 'ALL') return true;
    return r.location.toUpperCase() === locationFilter.toUpperCase();
  });

  const productMap = new Map();

  filteredRows.forEach(r => {
    const pName = r.product;
    if (!productMap.has(pName)) {
      productMap.set(pName, []);
    }
    productMap.get(pName).push({ ...r });
  });

  const productsList = Array.from(productMap.keys()).sort((a, b) => a.localeCompare(b));

  const result = {};

  productsList.forEach(pName => {
    const pRows = productMap.get(pName);

    // 1. Sort ASCENDING by date and document number for chronological calculation
    pRows.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.number || '').localeCompare(b.number || '');
    });

    let totInQty = 0;
    let totInTotal = 0;
    let totOutQty = 0;
    let totOutTotal = 0;
    let runningQty = 0;
    let runningTotal = 0;

    const computedRows = pRows.map(r => {
      if (r.inQty > 0) {
        totInQty += r.inQty;
        totInTotal += r.inTotal;
        runningQty += r.inQty;
        runningTotal += r.inTotal;
      }

      if (r.outQty > 0) {
        totOutQty += r.outQty;
        totOutTotal += r.outTotal;
        runningQty -= r.outQty;
        runningTotal -= r.outTotal;
      }

      const calculatedQty = runningQty;
      const calculatedTotal = runningTotal;
      const calculatedCost = runningQty > 0 ? runningTotal / runningQty : 0;

      let opType = 'Venta nacional';
      if (r.docCode === '00' || r.docType === 'Inventario Inicial' || r.docType === 'Saldo Inicial') {
        opType = r.docType;
      } else if (r.inQty > 0) {
        opType = 'Compra nacional';
      }

      return {
        ...r,
        opType,
        calculatedQty,
        calculatedCost,
        calculatedTotal
      };
    });

    // 2. Sort by requested direction (default desc for presentation, matching Excel export)
    if (sortDirection === 'desc') {
      computedRows.sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return (b.number || '').localeCompare(a.number || '');
      });
    }

    const finalBalanceQty = runningQty;
    const finalBalanceTotal = runningTotal;
    const finalBalanceCost = finalBalanceQty > 0 ? finalBalanceTotal / finalBalanceQty : 0;

    result[pName] = {
      productName: pName,
      rows: computedRows,
      summary: {
        totInQty,
        totInTotal,
        totOutQty,
        totOutTotal,
        finalBalanceQty,
        finalBalanceCost,
        finalBalanceTotal,
        totalMovements: computedRows.length
      }
    };
  });

  return {
    productsList,
    productsData: result
  };
}
