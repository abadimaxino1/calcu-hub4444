const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
  const port = 5176; // dev server port observed earlier
  const base = `http://localhost:${port}`;
  const outDir = path.join(__dirname, '..', '.tmp_screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

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
        // wait a bit for client rendering
        await page.waitForTimeout(800);

        // special admin flow: enter password and unlock
        if (p.name === 'admin-locked') {
          // try to find input
          try {
            await page.waitForSelector('input', { timeout: 3000 });
            await page.type('input', 'A-Temp-Admin-2025');
            const buttons = await page.$$('button');
            for (const b of buttons) {
              const txt = await page.evaluate(el => el.innerText || '', b);
              if (/Unlock|تسجيل|فتح|Unlock|Login|تسجيل/.test(txt)) { try { await b.click(); } catch(e){} }
            }
            await page.waitForTimeout(800);
          } catch (e) {
            console.log('Admin input not found or unlock failed', e && e.message);
          }
        }

        const file = path.join(outDir, `${p.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log('Saved', file);
        saved.push({ page: p.path, file });
        // small pause between pages
        await page.waitForTimeout(300);
      } catch (e) {
        console.error('Failed to capture', url, e && e.message);
      }
    }

    console.log('Screenshots complete:', saved);
    return saved;
  } finally {
    await browser.close();
  }
}

run().then(()=>process.exit(0)).catch(err=>{ console.error(err && (err.stack||err.message||err)); process.exit(2); });
