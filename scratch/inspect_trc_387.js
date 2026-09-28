import fs from 'fs';
import { processRawReportsToKardexRows, buildKardexByProduct } from '../src/utils/kardex.js';

const dump = JSON.parse(fs.readFileSync('/Users/luisangel/.gemini/antigravity-ide/brain/6b0c015f-af87-4a48-9e3c-6a318a8d20ac/scratch/reports_dump.json', 'utf8'));

// Restore CORRECION DE SALDO INICIAL processing in kardex.js test
const kardexRows = processRawReportsToKardexRows(dump);
const res = buildKardexByProduct(kardexRows, { locationFilter: 'BAR TRC' });

const allProducts = Object.keys(res.productsData);
const p387 = allProducts.find(p => p.includes('[387]'));

const pData = res.productsData[p387];

console.log("=== BAR TRC ROWS FOR PRODUCT 387 ===");
if (pData) {
  pData.rows.forEach(r => {
    console.log(`${r.date} | ${r.docType} | ${r.docName} | In: ${r.inQty} | Out: ${r.outQty} | Move: ${r.moveType}`);
  });
}
