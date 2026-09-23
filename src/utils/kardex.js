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

  if (rawUpper.includes('APA/BAR') || rawUpper.includes('APA BAR') || rawUpper.includes('BAR APA')) return 'APA BAR';
  if (rawUpper.includes('APA/BOUTIQUE') || rawUpper.includes('APA BOUTIQUE') || rawUpper.includes('BOUTIQUE APA')) return 'APA BOUTIQUE';
  if (rawUpper.includes('ARA/BAR') || rawUpper.includes('ARA BAR') || rawUpper.includes('BAR ARA')) return 'ARA BAR';
  if (rawUpper.includes('ARA/BOUTIQUE') || rawUpper.includes('ARA BOUTIQUE') || rawUpper.includes('BOUTIQUE ARA')) return 'ARA BOUTIQUE';
  if (rawUpper.includes('TRC/BAR') || rawUpper.includes('BAR TRC') || rawUpper.includes('TRC BAR')) return 'BAR TRC';
  if (rawUpper.includes('TRC/BOUTIQUE') || rawUpper.includes('BOUTIQUE TRC')) return 'BOUTIQUE ARA';
  if (rawUpper.includes('CAFETIN') || rawUpper.includes('CAFETÍ')) return 'CAFETIN';
  if (rawUpper.includes('COMPARTIDO')) return 'OFICINA CENTRAL COMPARTIDO';

  return rawUpper || 'GENERAL';
}

export function getDocCode(docType, series, name) {
  const sUpper = (series || '').toUpperCase();
  const nUpper = (name || '').toUpperCase();

  if (docType === 'Inventario Inicial' || docType === 'Saldo Inicial' || docType === 'Traslado Interno' || docType === 'Recepción' || docType === 'Salida por Devolución') return '00';
  if (docType.includes('Nota') || nUpper.includes('NC')) return '07';
  if (sUpper.startsWith('B') || nUpper.startsWith('B') || nUpper.startsWith('B-')) return '03';
  if (sUpper.startsWith('F') || nUpper.startsWith('F') || nUpper.startsWith('F-')) return '01';
  return '00';
}

export function getUomFactor(uomName) {
  if (!uomName) return 1;
  const raw = String(uomName).trim();
  const lower = raw.toLowerCase();

  const known = {
    'unidad': 1,
    'atado': 1,
    'racimo': 1,
    'unidad (servicios)': 1,
    'par': 2,
    'par-a': 2,
    'sixpack': 6,
    'six-pack': 6,
    'docenas': 12,
    'docena': 12,
    'cajónx06planchas': 6,
    'cajonx06planchas': 6,
    'cajónx12planchas': 12,
    'cajonx12planchas': 12,
    'cajax15pares': 30,
    'planchax10peqx2und': 20,
  };

  if (known[lower] !== undefined) {
    return known[lower];
  }

  const match = lower.match(/x(\d+)(?:und|pares|planchas)?/);
  if (match && match[1]) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val > 0) {
      if (lower.includes('pares')) {
        return val * 2;
      }
      return val;
    }
  }

  const fallbackMatch = lower.match(/(\d+)\s*(?:und|unidades|unds)?/);
  if (fallbackMatch && fallbackMatch[1]) {
    const val = parseInt(fallbackMatch[1], 10);
    if (!isNaN(val) && val > 0) {
      return val;
    }
  }

  return 1;
}

export function getProductCode(name) {
  if (!name) return '';
  const match = String(name).match(/^\[([\w\d_-]+)\]/);
  return match ? match[1] : '';
}

export function processRawReportsToKardexRows(reports) {
  if (!Array.isArray(reports)) return [];

  const rows = [];
  const hasPhysicalReceptions = reports.some(r => r && r.move_type === 'incoming_reception');
  const hasPhysicalDispatches = reports.some(r => r && r.move_type === 'outgoing_dispatch');

  reports.forEach(report => {
    if (!report) return;

    // Si existen recepciones físicas (incoming_reception), ignorar in_invoice contable para no duplicar compras
    if (hasPhysicalReceptions && report.move_type === 'in_invoice') return;
    // Si es un despacho de venta POS (outgoing_dispatch con /POS/), ignorarlo porque la venta ya está en out_invoice (Boleta/Factura)
    if (report.move_type === 'outgoing_dispatch') {
      const nameUpper = (report.name || '').toUpperCase();
      const seriesUpper = (report.serial || '').toUpperCase();
      if (nameUpper.includes('/POS/') || seriesUpper.includes('POS')) {
        return;
      }
    }

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
    } else if (report.move_type === 'internal_transfer_in' || report.move_type === 'internal_transfer_out') {
      docType = 'Traslado Interno';
    } else if (report.move_type === 'incoming_reception') {
      docType = 'Recepción';
    } else if (report.move_type === 'outgoing_dispatch') {
      const pUpper = (report.partner || '').toUpperCase();
      if (nameUpper.includes('/POS/') || seriesUpper.includes('POS') || (report.name && report.name.includes('/POS/'))) {
        docType = 'Venta POS';
      } else if (nameUpper.includes('/DEV/') || seriesUpper.includes('DEV') || pUpper.includes('PROVEEDOR')) {
        docType = 'Salida por Devolución';
      } else {
        docType = 'Salida por Venta';
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
      if (item.analytic) {
        location = mapLocation(item.analytic);
      }
      if ((!location || location === 'GENERAL') && (SERIES_MAPPING[series] || SERIES_MAPPING[seriesUpper])) {
        location = SERIES_MAPPING[series] || SERIES_MAPPING[seriesUpper];
      }
      if ((!location || location === 'GENERAL') && report.partner) {
        const partnerLoc = mapLocation(report.partner);
        if (partnerLoc && partnerLoc !== 'GENERAL') {
          location = partnerLoc;
        }
      }
      if (!location) {
        location = 'GENERAL';
      }

      let partnerName = report.partner || 'PORTADOR';
      if (report.move_type === 'internal_transfer_in' || report.move_type === 'internal_transfer_out') {
        if (report.partner && report.partner.includes('(')) {
          const matchLoc = report.partner.match(/\((Origen|Destino):\s*([^)]+)\)/i);
          if (matchLoc && matchLoc[2]) {
            const cleanLoc = mapLocation(matchLoc[2]);
            partnerName = `Traslado Interno (${matchLoc[1]}: ${cleanLoc})`;
          }
        }
      }

      const row = {
        id: `${report.id}-${item.id || Math.random()}`,
        reportId: report.id,
        itemId: item.id,
        date: report.date || '',
        dateTime: report.date_time || report.dateTime || report.date || '',
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

      const rawQty = item.quantity || 0;
      const uomName = item.uom_name || item.uom || '';
      const factor = getUomFactor(uomName);
      const actualQty = rawQty * factor;

      if (report.move_type === 'in_invoice' || report.move_type === 'initial_inventory' || report.move_type === 'internal_transfer_in' || report.move_type === 'incoming_reception') {
        row.inQty = actualQty;
        row.inTotal = item.subtotal || (rawQty * (item.price_unit || 0));
        row.inCost = actualQty > 0 ? (row.inTotal / actualQty) : (item.price_unit || 0);
      } else {
        row.outQty = actualQty;
        row.outTotal = item.subtotal || (rawQty * (item.price_unit || 0));
        row.outCost = item.price_unit || 0;
      }

      rows.push(row);
    });
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

    // 1. Sort ASCENDING by dateTime, date, series, and document number for chronological calculation
    pRows.sort((a, b) => {
      const dtA = a.dateTime || a.date || '';
      const dtB = b.dateTime || b.date || '';
      if (dtA !== dtB) {
        return dtA.localeCompare(dtB);
      }
      if (a.series !== b.series) {
        return (a.series || '').localeCompare(b.series || '');
      }
      return (a.number || '').localeCompare(b.number || '');
    });

    let totInQty = 0;
    let totInTotal = 0;
    let totOutQty = 0;
    let totOutTotal = 0;
    let runningQty = 0;
    let runningTotal = 0;
    let currentCost = 0;

    const computedRows = pRows.map(r => {
      let outCost = r.outCost || 0;
      let outTotal = r.outTotal || 0;

      if (r.inQty > 0) {
        totInQty += r.inQty;
        totInTotal += r.inTotal;
        runningQty += r.inQty;
        runningTotal += r.inTotal;
        currentCost = runningQty > 0 ? runningTotal / runningQty : 0;
      } else if (r.outQty > 0) {
        // En salidas:
        // 1. Precio Unit. de las salidas es el anterior registro del costo unit. del SALDO FINAL
        outCost = currentCost;
        // 2. Venta Total de las salidas = cantidad salida * precio unit. salida
        outTotal = r.outQty * outCost;

        totOutQty += r.outQty;
        totOutTotal += outTotal;

        // 3. Cantidad SALDO FINAL = anterior cantidad - cantidad salida
        runningQty -= r.outQty;
        // 4. Saldo Total SALDO FINAL = anterior saldo total - venta total salidas
        runningTotal -= outTotal;

        // 5. Costo Unit. SALDO FINAL = saldo total / cantidad
        if (Math.abs(runningQty) < 1e-9) {
          runningQty = 0;
          runningTotal = 0;
        } else {
          currentCost = runningTotal / runningQty;
        }
      }

      const calculatedQty = runningQty;
      const calculatedTotal = runningTotal;
      const calculatedCost = currentCost;

      let opType = 'Venta nacional';
      if (r.docCode === '00' || r.docType === 'Inventario Inicial' || r.docType === 'Saldo Inicial' || r.docType === 'Salida por Devolución' || r.docType === 'Venta POS' || r.docType === 'Salida por Venta') {
        opType = r.docType;
      } else if (r.inQty > 0) {
        opType = 'Compra nacional';
      }

      return {
        ...r,
        outCost,
        outTotal,
        opType,
        calculatedQty,
        calculatedCost,
        calculatedTotal
      };
    });

    // 2. Sort by requested direction (default desc for presentation, matching Excel export)
    if (sortDirection === 'desc') {
      computedRows.sort((a, b) => {
        const dtA = a.dateTime || a.date || '';
        const dtB = b.dateTime || b.date || '';
        if (dtA !== dtB) {
          return dtB.localeCompare(dtA);
        }
        if (a.series !== b.series) {
          return (b.series || '').localeCompare(a.series || '');
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
