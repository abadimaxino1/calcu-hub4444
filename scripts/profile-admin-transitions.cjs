const puppeteer = require('puppeteer');
const { prisma } = require('../server/db.cjs');
const crypto = require('crypto');

async function run() {
  console.log('Starting performance profiling...');

  // 1. Create Session
  // The mock db.cjs findFirst implementation is very limited and expects a single value for role
  // It does: if (where.role) user = db.prepare('SELECT * FROM users WHERE role = ?').get(where.role);
  // It doesn't support { in: [...] }
  
  let user = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' }
  });
  
  if (!user) {
     user = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
     });
  }

  if (!user) {
    console.error('No admin user found. Please seed the database.');
    process.exit(1);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1);

  await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt
    }
  });

  console.log(`Created session for user ${user.email}`);

  // 2. Launch Browser
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // 3. Set Cookie
  await page.setCookie({
    name: 'calcu_admin',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true
  });

  // 4. Navigate to Admin
  console.log('Navigating to Admin Dashboard...');
  await page.goto('http://localhost:4173/admin', { waitUntil: 'networkidle0' });

  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Perf]')) {
      console.log(text);
    }
  });

  // 5. Click Analytics
  console.log('Hovering Analytics tab...');
  const analyticsBtn = await page.waitForSelector('[data-testid="nav-analytics"]');
  if (analyticsBtn) {
      await analyticsBtn.hover();
      // Simulate user hesitation/reaction time which allows prefetch to start
      await new Promise(r => setTimeout(r, 300));
      
      console.log('Clicking Analytics tab...');
      await analyticsBtn.click();
      // Wait for data loaded
      try {
        await page.waitForFunction(
            () => performance.getEntriesByName('Analytics-data-loaded').length > 0,
            { timeout: 10000 }
        );
      } catch (e) {
          console.log('Timeout waiting for Analytics data load');
      }
  } else {
      console.error('Analytics button not found');
  }

  // 6. Click Content
  console.log('Hovering Content tab...');
  const contentBtn = await page.waitForSelector('[data-testid="nav-content"]');
  if (contentBtn) {
      await contentBtn.hover();
      await new Promise(r => setTimeout(r, 300));

      console.log('Clicking Content tab...');
      await contentBtn.click();
      try {
        await page.waitForFunction(
            () => performance.getEntriesByName('Content-data-loaded').length > 0,
            { timeout: 10000 }
        );
      } catch (e) {
          console.log('Timeout waiting for Content data load');
      }
  } else {
      console.error('Content button not found');
  }

  await browser.close();
  console.log('Profiling complete.');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
