import fs from 'fs';
import { processRawReportsToKardexRows, mapLocation } from '../src/utils/kardex.js';

const dump = JSON.parse(fs.readFileSync('/Users/luisangel/.gemini/antigravity-ide/brain/6b0c015f-af87-4a48-9e3c-6a318a8d20ac/scratch/reports_dump.json', 'utf8'));

const p387Rows = [];

dump.forEach(r => {
  if (!r || !r.items) return;
  r.items.forEach(it => {
    if (it.product_name && it.product_name.includes('[387]')) {
      let loc = '';
      if (it.analytic) loc = mapLocation(it.analytic);
      if ((!loc || loc === 'GENERAL') && r.name) loc = mapLocation(r.name);
      p387Rows.push({
        move_type: r.move_type,
        name: r.name,
        loc,
        qty: it.quantity,
        analytic: it.analytic,
        partner: r.partner
      });
    }
  });
});

const byLoc = {};
p387Rows.forEach(row => {
  if (!byLoc[row.loc]) byLoc[row.loc] = [];
  byLoc[row.loc].push(row);
});

Object.keys(byLoc).forEach(loc => {
  console.log(`\n=== LOCATION: ${loc} ===`);
  const group = byLoc[loc];
  const summary = {};
  group.forEach(g => {
    const k = `${g.move_type} (${g.name})`;
    summary[k] = (summary[k] || 0) + g.qty;
  });
  console.log(summary);
});
