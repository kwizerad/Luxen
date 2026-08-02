const fs = require('fs');
const enContent = fs.readFileSync('c:\\Users\\Coding\\Desktop\\Projects\\Luxen\\lib\\translations\\en.ts', 'utf8');
const enKeys = new Set();
const enMatches = enContent.matchAll(/"([^"]+)":\s*"/g);
for (const m of enMatches) enKeys.add(m[1]);

const usedKeys = JSON.parse(fs.readFileSync('c:\\Users\\Coding\\Desktop\\Projects\\Luxen\\__used-keys.json', 'utf8'));
const missing = usedKeys.filter(k => !enKeys.has(k));
console.log(JSON.stringify(missing, null, 2));
