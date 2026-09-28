import fs from 'fs';
import { processRawReportsToKardexRows, buildKardexByProduct } from '../src/utils/kardex.js';

const dump = JSON.parse(fs.readFileSync('/Users/luisangel/.gemini/antigravity-ide/brain/6b0c015f-af87-4a48-9e3c-6a318a8d20ac/scratch/reports_dump.json', 'utf8'));

// Find reports with CORRECION DE SALDO INICIAL
dump.forEach(r => {
  if (r && r.name && r.name.toUpperCase().includes('CORRECION DE SALDO INICIAL')) {
    console.log("Found CORRECION DE SALDO INICIAL:", r.id, r.name, r.move_type);
  }
});
