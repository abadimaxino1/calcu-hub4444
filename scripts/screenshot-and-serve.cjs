const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const projectRoot = path.join(__dirname, '..');
const outDir = path.join(projectRoot, '.tmp_screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function startDev() {
  return new Promise((resolve, reject) => {
    const dev = spawn('npm', ['run', 'dev'], { cwd: projectRoot, shell: true });
    let resolved = false;
    dev.stdout.on('data', data => {
      const s = String(data);
      process.stdout.write(s);
      // look for Local: http://localhost:PORT
      const m = s.match(/Local:\s+http:\/\/localhost:(\d+)/i) || s.match(/Local:\s+http:\/\/127\.0\.0\.1:(\d+)/i);
      if (m && !resolved) {
        resolved = true;
        resolve({ proc: dev, port: Number(m[1]) });
      }
    });
    dev.stderr.on('data', d => process.stderr.write(String(d)));
    dev.on('error', err => { if (!resolved) reject(err); });
    // fallback if not detected in 8s
    setTimeout(() => {
      if (!resolved) {
        // try resolving with common port 5176
        resolved = true;
        resolve({ proc: dev, port: 5176 });
      }
    }, 8000);
  });
}

async function capture(port) {
  const base = `http://localhost:${port}`;
  const pages = [
    { path: '/', name: 'home' },
    { path: '/faq', name: 'faq' },
    { path: '/tools', name: 'tools' },
    { path: '/blog', name: 'blog' },
    { path: '/article?slug=eos-guide', name: 'article-eos-guide' },
    { path: '/admin', name: 'admin-locked' }
  ];

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    const saved = [];
    page.on('console', msg => { try { console.log('[page]', msg.type(), msg.text()); } catch(e){} });

    for (const p of pages) {
      const url = base + p.path;
      try {
        console.log('Visiting', url);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
        await new Promise(r => setTimeout(r, 800));
        if (p.name === 'admin-locked') {
          try {
            await page.waitForSelector('input', { timeout: 3000 });
            await page.type('input', 'A-Temp-Admin-2025');
            const buttons = await page.$$('button');
            for (const b of buttons) {
              const txt = await page.evaluate(el => el.innerText || '', b);
              if (/Unlock|تسجيل|فتح|Unlock|Login|تسجيل/.test(txt)) { try { await b.click(); } catch(e){} }
            }
            await new Promise(r => setTimeout(r, 800));
          } catch (e) {
            console.log('Admin input not found or unlock failed', e && e.message);
          }
        }
        const file = path.join(outDir, `${p.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log('Saved', file);
        saved.push({ page: p.path, file });
        await new Promise(r => setTimeout(r, 300));
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
  const { proc, port } = await startDev();
  console.log('Dev server started on port', port);
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
