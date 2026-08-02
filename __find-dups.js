const fs = require('fs');
const enContent = fs.readFileSync('c:\\Users\\Coding\\Desktop\\Projects\\Luxen\\lib\\translations\\en.ts', 'utf8');
// Find all duplicate keys
const keys = [];
const matches = enContent.matchAll(/^\s*"([^"]+)":\s*"/gm);
for (const m of matches) keys.push(m[1]);
const counts = {};
keys.forEach(k => counts[k] = (counts[k] || 0) + 1);
const dups = Object.entries(counts).filter(([k, v]) => v > 1).map(([k]) => k).sort();
console.log(JSON.stringify(dups, null, 2));
