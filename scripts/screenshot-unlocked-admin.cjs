const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const projectRoot = path.join(__dirname, '..');
const outDir = path.join(projectRoot, '.tmp_screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function startServer() {
  return new Promise((resolve, reject) => {
    const srv = spawn('node', ['server/index.cjs'], { cwd: projectRoot, shell: true });
    let resolved = false;
    srv.stdout.on('data', (data) => {
      const s = String(data);
      process.stdout.write(s);
      if (s.includes('Server running on http://localhost:4000') && !resolved) {
        resolved = true;
        resolve({ proc: srv, port: 4000 });
      }
    });
    srv.stderr.on('data', (d) => process.stderr.write(String(d)));
    srv.on('error', (err) => {
      if (!resolved) reject(err);
    });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ proc: srv, port: 4000 });
      }
    }, 9000);
  });
}

function startDev() {
  return new Promise((resolve, reject) => {
    const dev = spawn('npm', ['run', 'dev'], { cwd: projectRoot, shell: true });
    let resolved = false;
    dev.stdout.on('data', data => {
      const s = String(data);
      process.stdout.write(s);
      const m = s.match(/http:\/\/(?:localhost|127\.0\.0\.1):(\d+)/i);
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
        resolve({ proc: dev, port: 5173 });
      }
    }, 9000);
  });
}

async function run(port) {
  const base = `http://localhost:${port}`;
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    page.on('console', msg => { try { console.log('[page]', msg.type(), msg.text()); } catch(e){} });

    console.log('Visiting base', base);
    await page.goto(base, { waitUntil: 'networkidle2', timeout: 20000 });

    // Attempt login via fetch in page context to ensure cookie is set in browser
    try {
      const email = process.env.ADMIN_EMAIL || 'admin@calcuhub.com';
      const password = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';
      console.log('Trying login via same-origin /api as', email);
      const res = await page.evaluate(async (email, password) => {
        try {
          const r = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          let body = null;
          try { body = await r.json(); } catch (e) {}
          return { ok: r.ok, status: r.status, body };
        } catch (e) {
          return { ok: false, err: String(e) };
        }
      }, email, password);
      console.log('Login result from page context:', res);
    } catch (e) {
      console.warn('Login attempt failed', e && e.message);
    }

    // Navigate to admin and capture screenshots
    const adminUrl = base + '/admin';
    console.log('Navigating to', adminUrl);
    await page.goto(adminUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(1200);

    async function clickTab(label) {
      const found = await page.evaluate((label) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const el = buttons.find((b) => (b.textContent || '').includes(label));
        if (!el) return false;
        el.click();
        return true;
      }, label);
      if (!found) {
        console.warn('Could not find tab button containing:', label);
      }
      await sleep(900);
      return found;
    }

    const files = [];

    const dashboardFile = path.join(outDir, `admin-dashboard.png`);
    await page.screenshot({ path: dashboardFile, fullPage: true });
    console.log('Saved', dashboardFile);
    files.push(dashboardFile);

    // New CMS-related tabs requested for verification
    if (await clickTab('الحاسبات والمميزات')) {
      const f = path.join(outDir, `admin-tools-features.png`);
      await page.screenshot({ path: f, fullPage: true });
      console.log('Saved', f);
      files.push(f);
    }
    if (await clickTab('الذكاء الاصطناعي')) {
      const f = path.join(outDir, `admin-ai-integrations.png`);
      await page.screenshot({ path: f, fullPage: true });
      console.log('Saved', f);
      files.push(f);
    }
    if (await clickTab('الصيانة')) {
      const f = path.join(outDir, `admin-maintenance.png`);
      await page.screenshot({ path: f, fullPage: true });
      console.log('Saved', f);
      files.push(f);
    }

    return files;
  } finally {
    await browser.close();
  }
}

(async ()=>{
  const { proc: serverProc, port: apiPort } = await startServer();
  console.log('API server started on port', apiPort);
  const { proc, port } = await startDev();
  console.log('Dev server started on port', port);
  try {
    const files = await run(port);
    console.log('Done, files:', files);
  } catch (e) {
    console.error('Failed', e && (e.stack||e.message||e));
  } finally {
    try { proc.kill(); } catch(e){}
    try { serverProc.kill(); } catch(e){}
    process.exit(0);
  }
})();
