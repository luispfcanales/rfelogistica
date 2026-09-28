import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('/Users/luisangel/.gemini/antigravity-ide/brain/6b0c015f-af87-4a48-9e3c-6a318a8d20ac/scratch/reports_dump.json', 'utf8'));

// Find sample outgoing_dispatch reports
const posDispatches = dump.filter(r => r && r.move_type === 'outgoing_dispatch' && r.name && r.name.includes('/POS/'));

console.log(`Found ${posDispatches.length} POS dispatches. Sample report:`);
if (posDispatches.length > 0) {
  console.log(JSON.stringify(posDispatches[0], null, 2));
}

// Find if any POS dispatch has serial/correlative or origin doc
const withDoc = posDispatches.filter(r => r.serial || r.correlative || (r.partner && r.partner.includes('B-')) || (r.partner && r.partner.includes('F-')));
console.log(`POS dispatches with doc info: ${withDoc.length}`);
if (withDoc.length > 0) {
  console.log("Sample with doc info:", JSON.stringify(withDoc[0], null, 2));
}
