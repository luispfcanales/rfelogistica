import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('/Users/luisangel/.gemini/antigravity-ide/brain/6b0c015f-af87-4a48-9e3c-6a318a8d20ac/scratch/reports_dump.json', 'utf8'));

const gladysReports = dump.filter(r => r && r.partner && r.partner.includes('GLADYS MILAGROS REYES'));

console.log(`Found ${gladysReports.length} reports for Gladys:`);
gladysReports.forEach(r => {
  console.log(`- ID: ${r.id} | Name: ${r.name} | Type: ${r.move_type} | Date: ${r.date} | Serial: ${r.serial} | Corr: ${r.correlative}`);
});
