import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('/Users/luisangel/.gemini/antigravity-ide/brain/6b0c015f-af87-4a48-9e3c-6a318a8d20ac/scratch/reports_dump.json', 'utf8'));

const match = dump.find(r => r && r.name && r.name.includes('APA/POS/01283'));

console.log("Found APA/POS/01283:", JSON.stringify(match, null, 2));
