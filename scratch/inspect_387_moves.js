import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('/Users/luisangel/.gemini/antigravity-ide/brain/6b0c015f-af87-4a48-9e3c-6a318a8d20ac/scratch/reports_dump.json', 'utf8'));

const p387Moves = [];

dump.forEach(r => {
  if (!r || !r.items) return;
  r.items.forEach(it => {
    if (it.product_name && it.product_name.includes('[387]')) {
      p387Moves.push({
        reportId: r.id,
        name: r.name,
        move_type: r.move_type,
        date: r.date,
        partner: r.partner,
        qty: it.quantity,
        uom: it.uom_name || it.uom,
        analytic: it.analytic,
        price_unit: it.price_unit
      });
    }
  });
});

console.log(`Found ${p387Moves.length} movements for Product 387:`);
console.table(p387Moves);
