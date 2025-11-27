const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const projectRoot = path.join(__dirname, '..');
const outDir = path.join(projectRoot, '.tmp_screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['scripts/serve-dist.cjs'], { cwd: projectRoot, shell: true });
    proc.stdout.on('data', d => {
      const s = String(d);
      process.stdout.write(s);
      const m = s.match(/dist at http:\/\/localhost:(\d+)/i);
      if (m) return resolve({ proc, port: Number(m[1]) });
    });
    proc.stderr.on('data', d => process.stderr.write(String(d)));
    proc.on('error', reject);
    setTimeout(() => resolve({ proc, port: 5001 }), 7000);
  });
}

async function capture(port) {
  const base = `http://localhost:${port}`;
  const pages = [
    { path: '/', name: 'prod-home' },
    { path: '/faq', name: 'prod-faq' },
    { path: '/tools', name: 'prod-tools' },
    { path: '/blog', name: 'prod-blog' },
    { path: '/article?slug=eos-guide', name: 'prod-article-eos-guide' },
    { path: '/admin', name: 'prod-admin' }
  ];
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('console', msg => { try { console.log('[page]', msg.type(), msg.text()); } catch(e){} });
    const saved = [];
    for (const p of pages) {
      const url = base + p.path;
      try {
        console.log('Visiting', url);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
        await new Promise(r => setTimeout(r, 800));
        const file = path.join(outDir, `${p.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log('Saved', file);
        saved.push({ page: p.path, file });
      } catch (e) {
        console.error('Failed to capture', url, e && e.message);
      }
    }
    return saved;
  } finally {
    await browser.close();
  }
}

(async ()=>{
  const { proc, port } = await startServer();
  console.log('Static server started on port', port);
  try {
    const r = await capture(port);
    console.log('Screenshots:', r);
  } catch (e) {
    console.error('Capture failed', e && (e.stack||e.message||e));
  } finally {
    try { proc.kill(); } catch(e){}
    process.exit(0);
  }
})();
