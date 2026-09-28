import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('/Users/luisangel/.gemini/antigravity-ide/brain/6b0c015f-af87-4a48-9e3c-6a318a8d20ac/scratch/reports_dump.json', 'utf8'));

// Test attaching rawReport & matching invoices
const reportMapById = new Map();
dump.forEach(r => {
  if (r && r.id) reportMapById.set(r.id, r);
});

const invoicesByPartnerDate = new Map();
dump.forEach(r => {
  if (r && (r.move_type === 'out_invoice' || r.move_type === 'out_refund')) {
    const k = `${(r.partner || '').trim().toUpperCase()}___${r.date}`;
    if (!invoicesByPartnerDate.has(k)) invoicesByPartnerDate.set(k, []);
    invoicesByPartnerDate.get(k).push(r);
  }
});

const dispatchesByPartnerDate = new Map();
dump.forEach(r => {
  if (r && r.move_type === 'outgoing_dispatch') {
    const k = `${(r.partner || '').trim().toUpperCase()}___${r.date}`;
    if (!dispatchesByPartnerDate.has(k)) dispatchesByPartnerDate.set(k, []);
    dispatchesByPartnerDate.get(k).push(r);
  }
});

console.log("Sample invoice match test:");
const sampleInvoice = dump.find(r => r && r.name === 'B-BT06-00001043');
if (sampleInvoice) {
  const k = `${(sampleInvoice.partner || '').trim().toUpperCase()}___${sampleInvoice.date}`;
  const matchedDisp = dispatchesByPartnerDate.get(k);
  console.log("Invoice B-BT06-00001043 matched dispatches:", matchedDisp ? matchedDisp.map(d => d.name) : 'None');
}
