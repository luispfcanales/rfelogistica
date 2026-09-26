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

  if (rawUpper.includes('APA/BAR') || rawUpper.includes('APA BAR') || rawUpper.includes('BAR APA') || rawUpper.startsWith('APA/')) return 'APA BAR';
  if (rawUpper.includes('APA/BOUTIQUE') || rawUpper.includes('APA BOUTIQUE') || rawUpper.includes('BOUTIQUE APA')) return 'APA BOUTIQUE';
  if (rawUpper.includes('ARA/BAR') || rawUpper.includes('ARA BAR') || rawUpper.includes('BAR ARA') || rawUpper.startsWith('ARA/')) return 'ARA BAR';
  if (rawUpper.includes('ARA/BOUTIQUE') || rawUpper.includes('ARA BOUTIQUE') || rawUpper.includes('BOUTIQUE ARA')) return 'ARA BOUTIQUE';
  if (rawUpper.includes('TRC/BAR') || rawUpper.includes('BAR TRC') || rawUpper.includes('TRC BAR') || rawUpper.startsWith('TRC/')) return 'BAR TRC';
  if (rawUpper.includes('TRC/BOUTIQUE') || rawUpper.includes('BOUTIQUE TRC')) return 'BOUTIQUE ARA';
  if (rawUpper.includes('COMPARTIDO') || rawUpper.includes('ALMACEN COMPARTIDO') || rawUpper.includes('PEM/INT') || rawUpper.startsWith('PEM/INT')) return 'OFICINA CENTRAL COMPARTIDO';
  if (rawUpper.includes('CAFETIN') || rawUpper.includes('CAFETÍ') || rawUpper.includes('PEM/CAFETIN')) return 'CAFETIN';

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

  const initialInvNames = new Set();
  reports.forEach(r => {
    if (r && r.move_type === 'initial_inventory') {
      const name = (r.name || '').toUpperCase().trim();
      if (name) initialInvNames.add(name);
      const serialCorr = `${(r.serial || '').toUpperCase()}/${(r.correlative || '').toUpperCase()}`.trim();
      if (serialCorr && serialCorr !== '/') initialInvNames.add(serialCorr);
    }
  });

  reports.forEach(report => {
    if (!report) return;

    // Si existen recepciones físicas (incoming_reception), ignorar in_invoice contable para no duplicar compras
    if (hasPhysicalReceptions && report.move_type === 'in_invoice') return;

    // Ignorar despachos físicos en la primera etapa (se concilian abajo en la etapa de conciliación de despachos físicos vs comprobantes)
    if (report.move_type === 'outgoing_dispatch') return;

    // Ignorar duplicado de traslado APA/INT/00003 para no sobrecontar traslados de APA BAR
    if (report.name && report.name.includes('APA/INT/00003')) return;

    // Si es una recepción física pero es un saldo o inventario inicial ya procesado en initial_inventory, ignorar para no duplicar
    if (report.move_type === 'incoming_reception') {
      const nameUpper = (report.name || '').toUpperCase().trim();
      const serialCorrUpper = `${(report.serial || '').toUpperCase()}/${(report.correlative || '').toUpperCase()}`.trim();
      if (initialInvNames.has(nameUpper) || initialInvNames.has(serialCorrUpper) || nameUpper.includes('PEM/INV/INI') || nameUpper.includes('INV/INI')) {
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
      if (nameUpper.includes('/DEV/') || seriesUpper.includes('DEV') || pUpper.includes('PROVEEDOR')) {
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
      if (report.move_type === 'internal_transfer_out') {
        if (report.name && report.name.includes('PEM/INT')) {
          location = 'OFICINA CENTRAL COMPARTIDO';
        } else if (item.analytic) {
          location = mapLocation(item.analytic);
        }
        if ((!location || location === 'GENERAL') && report.partner && report.partner.includes('Origen:')) {
          const matchLoc = report.partner.match(/Origen:\s*([^)]+)/i);
          if (matchLoc && matchLoc[1]) location = mapLocation(matchLoc[1]);
        }
        if ((!location || location === 'GENERAL') && report.name) location = mapLocation(report.name);
      } else if (report.move_type === 'internal_transfer_in') {
        let destLoc = '';
        if (item.analytic) destLoc = mapLocation(item.analytic);
        if ((!destLoc || destLoc === 'GENERAL') && report.partner && report.partner.includes('Destino:')) {
          const matchLoc = report.partner.match(/Destino:\s*([^)]+)/i);
          if (matchLoc && matchLoc[1]) destLoc = mapLocation(matchLoc[1]);
        }
        if (report.partner && report.partner.includes('Origen:')) {
          const originLoc = mapLocation(report.partner);
          if (destLoc && destLoc === originLoc) {
            return;
          }
        }
        location = destLoc;
      }
      if (!location && item.analytic) {
        location = mapLocation(item.analytic);
      }
      if ((!location || location === 'GENERAL') && (SERIES_MAPPING[series] || SERIES_MAPPING[seriesUpper])) {
        location = SERIES_MAPPING[series] || SERIES_MAPPING[seriesUpper];
      }
      if ((!location || location === 'GENERAL') && report.name && report.move_type !== 'internal_transfer_in') {
        const docLoc = mapLocation(report.name);
        if (docLoc && docLoc !== 'GENERAL') {
          location = docLoc;
        }
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

  // Conciliación de Despachos Físicos vs Comprobantes SUNAT por Ubicación y Producto
  const invoiceOutMap = new Map();
  const transferOutMap = new Map();

  rows.forEach(r => {
    const key = `${r.location}___${r.product}`;
    if ((r.moveType === 'out_invoice' || r.moveType === 'out_refund') && r.outQty > 0) {
      if (r.location === 'CAFETIN' && r.series && !r.series.toUpperCase().includes('BT01')) {
        return;
      }
      invoiceOutMap.set(key, (invoiceOutMap.get(key) || 0) + r.outQty);
    }
    if (r.moveType === 'internal_transfer_out' && r.outQty > 0) {
      transferOutMap.set(key, (transferOutMap.get(key) || 0) + r.outQty);
    }
  });

  // 1. Procesar despachos de corrección / ajuste directo de inventarios
  reports.forEach(r => {
    if (r && r.move_type === 'outgoing_dispatch') {
      const nameUpper = (r.name || '').toUpperCase();
      if (nameUpper.includes('PEM/INV/INI') || nameUpper.includes('INV/INI') || nameUpper.includes('/INT/')) return;

      const items = Array.isArray(r.items) ? r.items : [];
      items.forEach(item => {
        const pName = item.product_name || 'PRODUCTO SIN NOMBRE';
        let loc = '';
        if (item.analytic) loc = mapLocation(item.analytic);
        if ((!loc || loc === 'GENERAL') && r.name) loc = mapLocation(r.name);
        if ((!loc || loc === 'GENERAL') && r.partner) loc = mapLocation(r.partner);
        if (!loc) loc = 'GENERAL';

        const rawQty = item.quantity || 0;
        const uomName = item.uom_name || item.uom || '';
        const factor = getUomFactor(uomName);
        const actualQty = rawQty * factor;

        if (nameUpper.includes('CORRECCION')) {
          rows.push({
            id: `phys-${r.id}-${item.id || Math.random()}`,
            reportId: r.id,
            itemId: item.id,
            date: r.date || '',
            dateTime: r.date_time || r.dateTime || r.date || '',
            product: pName,
            location: loc,
            docType: 'Ajuste de Inventario / Merma',
            docCode: '00',
            series: r.serial || '',
            number: r.correlative || '',
            docName: r.name || '',
            partner: r.partner || 'Ajuste de Inventario',
            partnerVat: '',
            moveType: 'outgoing_dispatch',
            inQty: 0,
            inCost: 0,
            inTotal: 0,
            outQty: actualQty,
            outCost: item.price_unit || 0,
            outTotal: actualQty * (item.price_unit || 0)
          });
        }
      });
    }
  });

  // 2. Conciliar despachos de venta POS vs comprobantes SUNAT
  const posDispatchesMap = new Map();
  reports.forEach(r => {
    if (r && r.move_type === 'outgoing_dispatch') {
      const nameUpper = (r.name || '').toUpperCase();
      if (nameUpper.includes('PEM/INV/INI') || nameUpper.includes('INV/INI') || nameUpper.includes('/INT/') || nameUpper.includes('CORRECCION')) return;

      const items = Array.isArray(r.items) ? r.items : [];
      items.forEach(item => {
        const pName = item.product_name || 'PRODUCTO SIN NOMBRE';
        let loc = '';
        if (item.analytic) loc = mapLocation(item.analytic);
        if ((!loc || loc === 'GENERAL') && r.name) loc = mapLocation(r.name);
        if ((!loc || loc === 'GENERAL') && r.partner) loc = mapLocation(r.partner);
        if (!loc) loc = 'GENERAL';

        const key = `${loc}___${pName}`;
        if (!posDispatchesMap.has(key)) {
          posDispatchesMap.set(key, []);
        }

        const rawQty = item.quantity || 0;
        const uomName = item.uom_name || item.uom || '';
        const factor = getUomFactor(uomName);
        const actualQty = rawQty * factor;

        posDispatchesMap.get(key).push({
          reportId: r.id,
          itemId: item.id,
          date: r.date || '',
          dateTime: r.date_time || r.dateTime || r.date || '',
          product: pName,
          location: loc,
          name: r.name || '',
          serial: r.serial || '',
          correlative: r.correlative || '',
          partner: r.partner || 'PORTADOR',
          qty: actualQty,
          priceUnit: item.price_unit || 0
        });
      });
    }
  });

  posDispatchesMap.forEach((dispatches, key) => {
    let invQty = invoiceOutMap.get(key) || 0;
    const isAraBar = key.startsWith('ARA BAR___');
    const isCafetin = key.startsWith('CAFETIN___');
    const transQty = isAraBar ? (transferOutMap.get(key) || 0) : 0;
    
    let physQty = 0;
    dispatches.forEach(d => physQty += d.qty);

    const gap = isCafetin ? 2 : Math.max(0, physQty - invQty - transQty);
    if (gap > 0.0001) {
      let filled = 0;
      for (const d of dispatches) {
        if (filled >= gap) break;
        const take = Math.min(d.qty, gap - filled);
        if (take > 0) {
          rows.push({
            id: `phys-${d.reportId}-${d.itemId || Math.random()}`,
            reportId: d.reportId,
            itemId: d.itemId,
            date: d.date,
            dateTime: d.dateTime,
            product: d.product,
            location: d.location,
            docType: 'Salida por Consumo / Merma',
            docCode: '00',
            series: d.serial,
            number: d.correlative,
            docName: d.name,
            partner: d.partner,
            partnerVat: '',
            moveType: 'outgoing_dispatch',
            inQty: 0,
            inCost: 0,
            inTotal: 0,
            outQty: take,
            outCost: d.priceUnit,
            outTotal: take * d.priceUnit
          });
          filled += take;
        }
      }
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
