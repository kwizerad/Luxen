const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes("node_modules") && !file.includes(".next") && !file.includes(".git")) {
        results = results.concat(walk(file));
      }
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      results.push(file);
    }
  });
  return results;
}

const files = walk("./app").concat(walk("./components")).concat(walk("./hooks")).concat(walk("./lib"));
const codeKeys = new Set();
const keyRegex = /\bt\(\s*["\x27]([a-zA-Z0-9_.\-]+)["\x27]/g;

files.forEach(f => {
  if (f.includes("/translations/")) return;
  const content = fs.readFileSync(f, "utf8");
  let m;
  while ((m = keyRegex.exec(content)) !== null) {
    codeKeys.add(m[1]);
  }
});

function parseDict(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const dict = {};
  const regex = /^\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    dict[match[1]] = match[2];
  }
  return dict;
}

const enDict = parseDict("lib/translations/en.ts");
const rwDict = parseDict("lib/translations/rw.ts");
const frDict = parseDict("lib/translations/fr.ts");

console.log("Initial loaded keys:", {
  codeKeys: codeKeys.size,
  enDict: Object.keys(enDict).length,
  rwDict: Object.keys(rwDict).length,
  frDict: Object.keys(frDict).length
});
