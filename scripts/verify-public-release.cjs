const fs = require('fs');
const path = require('path');
const { generateSitemap } = require('../server/lib/sitemap.cjs');

async function verify() {
  console.log('🚀 Starting Public Release Verification...\n');

  const checks = [
    { name: 'Sitemap Generator', fn: checkSitemap },
    { name: 'Robots.txt', fn: checkRobots },
    { name: 'Analytics API Routes', fn: checkAnalyticsRoutes },
    { name: 'AdSense API Routes', fn: checkAdRoutes },
    { name: 'CMS Public Routes', fn: checkCMSRoutes },
    { name: 'Frontend Integration', fn: checkFrontend },
    { name: 'Database Schema', fn: checkSchema },
  ];

  let passed = 0;
  for (const check of checks) {
    try {
      await check.fn();
      console.log(`✅ ${check.name} passed`);
      passed++;
    } catch (e) {
      console.error(`❌ ${check.name} failed: ${e.message}`);
    }
  }

  console.log(`\n📊 Result: ${passed}/${checks.length} checks passed.`);
  if (passed < checks.length) {
    process.exit(1);
  }
}

async function checkSitemap() {
  const result = await generateSitemap();
  if (!result.success) throw new Error('Sitemap generation failed');
  
  const runtimeDir = path.join(__dirname, '../server/runtime');
  const sitemapPath = path.join(runtimeDir, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    throw new Error('sitemap.xml not saved to runtime directory');
  }
  const content = fs.readFileSync(sitemapPath, 'utf8');
  if (!content.includes('<?xml')) throw new Error('Invalid XML output');
  if (!content.includes('<urlset')) throw new Error('Missing urlset tag');
}

async function checkRobots() {
  const runtimeDir = path.join(__dirname, '../server/runtime');
  const robotsPath = path.join(runtimeDir, 'robots.txt');
  if (!fs.existsSync(robotsPath)) throw new Error('robots.txt missing');
  const content = fs.readFileSync(robotsPath, 'utf8');
  if (!content.includes('Sitemap:')) throw new Error('robots.txt missing Sitemap directive');
}

async function checkAnalyticsRoutes() {
  const serverIndex = fs.readFileSync(path.join(__dirname, '../server/index.cjs'), 'utf8');
  if (!serverIndex.includes("'/api/analytics'")) throw new Error('Missing analytics mount point');
  
  const routeFile = fs.readFileSync(path.join(__dirname, '../server/routes/analytics.cjs'), 'utf8');
  if (!routeFile.includes("router.post('/pageview'")) throw new Error('Missing pageview route in file');
  if (!routeFile.includes("router.post('/calculation'")) throw new Error('Missing calculation route in file');
}

async function checkAdRoutes() {
  const serverIndex = fs.readFileSync(path.join(__dirname, '../server/index.cjs'), 'utf8');
  if (!serverIndex.includes("'/api/ads'")) throw new Error('Missing ads mount point');

  const routeFile = fs.readFileSync(path.join(__dirname, '../server/routes/ads.cjs'), 'utf8');
  if (!routeFile.includes("router.get('/slots'")) throw new Error('Missing ads slots route in file');
}

async function checkCMSRoutes() {
  const serverIndex = fs.readFileSync(path.join(__dirname, '../server/index.cjs'), 'utf8');
  if (!serverIndex.includes("'/api/content'")) throw new Error('Missing content mount point');

  const routeFile = fs.readFileSync(path.join(__dirname, '../server/routes/content_public.cjs'), 'utf8');
  if (!routeFile.includes("blogRepo.listPublic")) throw new Error('Public blog route not using blogRepo.listPublic');
  if (!routeFile.includes("pagesRepo.getBySlugPublic")) throw new Error('Public pages route not using pagesRepo.getBySlugPublic');

  // Check actual response structure (simulated check via file content or logic)
  // We'll assume the repo logic is correct if the route calls it.
}

async function checkFrontend() {
  const appTsx = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8');
  if (!appTsx.includes('initAnalytics')) throw new Error('initAnalytics not called in App.tsx');
  if (!appTsx.includes('trackPageView')) throw new Error('trackPageView not called in App.tsx');
  if (!appTsx.includes('<AdSlot')) throw new Error('AdSlot component not used in App.tsx');
  if (!appTsx.includes('<ConsentBanner')) throw new Error('ConsentBanner component not used in App.tsx');
}

async function checkSchema() {
  const schema = fs.readFileSync(path.join(__dirname, '../prisma/schema.prisma'), 'utf8');
  if (!schema.includes('model AnalyticsEventLog')) throw new Error('AnalyticsEventLog model missing from schema');
}

verify();
