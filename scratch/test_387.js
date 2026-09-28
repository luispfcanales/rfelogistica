import fs from 'fs';
import { processRawReportsToKardexRows, buildKardexByProduct } from '../src/utils/kardex.js';

const dump = JSON.parse(fs.readFileSync('/Users/luisangel/.gemini/antigravity-ide/brain/6b0c015f-af87-4a48-9e3c-6a318a8d20ac/scratch/reports_dump.json', 'utf8'));

// Modifying mapping logic test
const kardexRows = processRawReportsToKardexRows(dump);

const allProducts = Object.keys(buildKardexByProduct(kardexRows, { locationFilter: 'ALL' }).productsData);
const p387 = allProducts.find(p => p.includes('[387]'));
const p352 = allProducts.find(p => p.includes('[352]'));

console.log(`Found p387: "${p387}"`);
console.log(`Found p352: "${p352}"`);

console.log("\n--- TEST PRODUCT 387 ---");
['APA BAR', 'ARA BAR', 'BAR TRC', 'CAFETIN', 'OFICINA CENTRAL COMPARTIDO', 'ALL'].forEach(loc => {
  const res = buildKardexByProduct(kardexRows, { locationFilter: loc });
  const pData = res.productsData[p387];
  console.log(`Loc: ${loc} -> Stock:`, pData ? pData.summary.finalBalanceQty : 'N/A');
});

console.log("\n--- TEST PRODUCT 352 ---");
['APA BAR', 'ARA BAR', 'BAR TRC', 'CAFETIN', 'OFICINA CENTRAL COMPARTIDO', 'ALL'].forEach(loc => {
  const res = buildKardexByProduct(kardexRows, { locationFilter: loc });
  const pData = res.productsData[p352];
  console.log(`Loc: ${loc} -> Stock:`, pData ? pData.summary.finalBalanceQty : 'N/A');
});

