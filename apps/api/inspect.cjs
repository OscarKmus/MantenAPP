// Usage: node inspect.cjs [path-to-pdf]
// If no path given, reads the most recent PDF from apps/api/storage/pdfs/
const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

function latestPdfIn(dir) {
  if (!fs.existsSync(dir)) return null;
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.endsWith('.pdf')) {
        out.push({ p, m: fs.statSync(p).mtime.getTime() });
      }
    }
  };
  walk(dir);
  out.sort((a, b) => b.m - a.m);
  return out.length ? out[0].p : null;
}

const apiRoot = path.resolve(__dirname);
const argPath = process.argv[2];
const pdfPath = argPath
  ? path.resolve(argPath)
  : latestPdfIn(path.join(apiRoot, 'storage', 'pdfs'));

if (!pdfPath || !fs.existsSync(pdfPath)) {
  console.error('No PDF found. Pass a path: node inspect.cjs <path>');
  process.exit(1);
}

console.log('Inspecting:', path.relative(apiRoot, pdfPath));

new PDFParse({ data: fs.readFileSync(pdfPath) })
  .getText()
  .then(d => {
    console.log('=== PDF PARSED ===');
    console.log('Total pages:', d.total);
    console.log('--- TEXT ---');
    console.log(d.text);
    console.log('--- END ---');
  })
  .catch(e => { console.error('Parse error:', e.message); process.exit(1); });
