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
      const m = s.match(/Local:\s+http:\/\/localhost:(\d+)/i) || s.match(/Local:\s+http:\/\/127\.0\.0\.1:(\d+)/i);
      if (m && !resolved) {
        resolved = true;
        resolve({ proc: dev, port: Number(m[1]) });
      }
    });
    dev.stderr.on('data', d => process.stderr.write(String(d)));
    dev.on('error', err => { if (!resolved) reject(err); });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ proc: dev, port: 5176 });
      }
    }, 9000);
  });
}

async function run(port) {
  const base = `http://localhost:${port}`;
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('console', msg => { try { console.log('[page]', msg.type(), msg.text()); } catch(e){} });

    console.log('Visiting base', base);
    await page.goto(base, { waitUntil: 'networkidle2', timeout: 20000 });

    // Attempt login via fetch in page context to ensure cookie is set in browser
    try {
      const API_BASE = process.env.VITE_API_BASE || 'http://localhost:4000';
      console.log('Trying login via', API_BASE);
      const res = await page.evaluate(async (api) => {
        try {
          const r = await fetch(api + '/api/admin/login', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'A-Temp-Admin-2025' }) });
          return { ok: r.ok, status: r.status };
        } catch (e) {
          return { ok: false, err: String(e) };
        }
      }, API_BASE);
      console.log('Login result from page context:', res);
    } catch (e) {
      console.warn('Login attempt failed', e && e.message);
    }

    // Navigate to admin and capture screenshot
    const adminUrl = base + '/admin';
    console.log('Navigating to', adminUrl);
    await page.goto(adminUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 800));
    const file = path.join(outDir, `admin-unlocked.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log('Saved', file);
    return file;
  } finally {
    await browser.close();
  }
}

(async ()=>{
  const { proc, port } = await startDev();
  console.log('Dev server started on port', port);
  try {
    const file = await run(port);
    console.log('Done, file:', file);
  } catch (e) {
    console.error('Failed', e && (e.stack||e.message||e));
  } finally {
    try { proc.kill(); } catch(e){}
    process.exit(0);
  }
})();
