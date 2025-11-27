#!/usr/bin/env node
// scripts/find-analytics.cjs
// Scans the repository for common analytics/ad/test markers and writes findings
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const patterns = [
  'googletagmanager', 'gtag(', 'gtag.js', 'google-analytics', 'analytics.js', 'adsbygoogle', 'pagead2.googlesyndication', 'data-ad-client', 'adsense',
  'vitest', 'playwright', 'cypress', 'TestPanel', 'test-panel', '/tests', '/test'
];

const results = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    try {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (['node_modules', '.git', 'dist'].includes(e.name)) continue;
        walk(p);
      } else {
        const ext = path.extname(e.name).toLowerCase();
        if (!['.js', '.ts', '.tsx', '.jsx', '.html', '.json', '.md'].includes(ext)) continue;
        const txt = fs.readFileSync(p, 'utf8');
        for (const pat of patterns) {
          if (txt.indexOf(pat) !== -1) {
            results.push({ file: path.relative(root, p), pattern: pat });
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

walk(root);

const outDir = path.join(root, 'audit-artifacts');
try { fs.mkdirSync(outDir, { recursive: true }); } catch(e) {}
const outFile = path.join(outDir, 'analytics-findings.json');
fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf8');
console.log('Wrote findings to', outFile, 'matches:', results.length);
process.exit(0);
