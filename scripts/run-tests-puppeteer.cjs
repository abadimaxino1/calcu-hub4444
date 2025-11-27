const puppeteer = require('puppeteer');

async function run() {
  const ports = [5176, 5174, 5173];
  const results = { console: [], tests: null };
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('console', msg => {
      try { results.console.push({ type: msg.type(), text: msg.text() }); } catch(e){}
    });
    let url = null;
    for (const p of ports) {
      const u = `http://localhost:${p}/`;
      try {
        await page.goto(u, { waitUntil: 'networkidle2', timeout: 10000 });
        // wait longer for React to hydrate and TestPanel to render
        try {
          await page.waitForFunction(() => {
            const secs = Array.from(document.querySelectorAll('section'));
            return secs.some(s => {
              const h = s.querySelector('h2');
              if (!h) return false;
              const t = h.innerText || '';
              return t.includes('Test Panel') || t.includes('لوحة الاختبارات');
            });
          }, { timeout: 15000 });
          url = u; break;
        } catch (e) {
          // not found on this port yet
        }
      } catch (e) {
        // try next port
      }
    }
    if (!url) throw new Error('Could not find dev server TestPanel on ports ' + ports.join(', '));

    // navigate to the chosen url (ensure fresh)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });

    // In-page: find the TestPanel section, click the re-run button, then extract test items
    const clicked = await page.evaluate(() => {
      const secs = Array.from(document.querySelectorAll('section'));
      const testSection = secs.find(s => {
        const h = s.querySelector('h2'); if (!h) return false;
        const t = h.innerText || '';
        return t.includes('Test Panel') || t.includes('لوحة الاختبارات');
      });
      if (!testSection) return false;
      const btn = Array.from(testSection.querySelectorAll('button')).find(b => {
        const txt = (b.innerText || '').trim();
        return /Re-run tests|إعادة تشغيل الاختبارات|Re-run/.test(txt);
      });
      if (btn) btn.click();
      return true;
    });
    if (!clicked) throw new Error('TestPanel section not found (page eval)');

    // wait for results to appear inside the TestPanel
    await page.waitForFunction(() => {
      const secs = Array.from(document.querySelectorAll('section'));
      const testSection = secs.find(s => {
        const h = s.querySelector('h2'); if (!h) return false;
        const t = h.innerText || '';
        return t.includes('Test Panel') || t.includes('لوحة الاختبارات');
      });
      if (!testSection) return false;
      return !!testSection.querySelector('.font-medium');
    }, { timeout: 10000 });

    // extract test items from the TestPanel
    const tests = await page.evaluate(() => {
      const secs = Array.from(document.querySelectorAll('section'));
      const testSection = secs.find(s => {
        const h = s.querySelector('h2'); if (!h) return false;
        const t = h.innerText || '';
        return t.includes('Test Panel') || t.includes('لوحة الاختبارات');
      });
      if (!testSection) return [];
      const out = [];
      const names = Array.from(testSection.querySelectorAll('.font-medium'));
      for (const n of names) {
        const name = n.innerText.trim();
        const s = n.nextElementSibling;
        const status = s ? s.innerText.replace(/\n/g,' ').trim() : '';
        out.push({ name, status });
      }
      return out;
    });

    results.tests = tests;
    console.log(JSON.stringify(results, null, 2));
    await page.close();
  } finally {
    await browser.close();
  }
}

run().catch(err => { console.error(err && (err.stack || err.message || err)); process.exit(2); });
