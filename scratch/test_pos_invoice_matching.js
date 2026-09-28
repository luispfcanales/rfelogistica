import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('/Users/luisangel/.gemini/antigravity-ide/brain/6b0c015f-af87-4a48-9e3c-6a318a8d20ac/scratch/reports_dump.json', 'utf8'));

// Build map of invoices by partner + date
const invoiceMap = new Map();
dump.forEach(r => {
  if (r && (r.move_type === 'out_invoice' || r.move_type === 'out_refund')) {
    const key = `${(r.partner || '').trim().toUpperCase()}___${r.date}`;
    if (!invoiceMap.has(key)) invoiceMap.set(key, []);
    invoiceMap.get(key).push(r);
  }
});

let matchedCount = 0;
let totalPosDispatches = 0;

dump.forEach(r => {
  if (r && r.move_type === 'outgoing_dispatch' && r.name && r.name.includes('/POS/')) {
    totalPosDispatches++;
    const key = `${(r.partner || '').trim().toUpperCase()}___${r.date}`;
    const invs = invoiceMap.get(key);
    if (invs && invs.length > 0) {
      matchedCount++;
    }
  }
});

console.log(`Matched ${matchedCount} out of ${totalPosDispatches} POS dispatches to SUNAT invoices!`);
