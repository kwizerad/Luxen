const fs = require('fs');
const files = [
  'components/module-exam-runner.tsx',
  'app/dashboard/course/page.tsx',
  'app/Admin/retake-requests/page.tsx',
];
const keys = new Set();
for (const f of files) {
  const c = fs.readFileSync('c:\\Users\\Coding\\Desktop\\Projects\\Luxen\\' + f, 'utf8');
  const matches = c.matchAll(/t\("([^"]+)"\)/g);
  for (const m of matches) {
    keys.add(m[1]);
  }
}
const sorted = [...keys].sort();
console.log(JSON.stringify(sorted, null, 2));
