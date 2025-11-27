const fs = require('fs');
const path = require('path');

const baseUrl = process.env.SITE_URL || 'https://example.com';
const outputDir = path.join(__dirname, '..', 'dist');

// Define all routes and articles
const routes = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/faq', changefreq: 'monthly', priority: '0.9' },
  { path: '/tools', changefreq: 'weekly', priority: '0.8' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/article?slug=eos-guide', changefreq: 'monthly', priority: '0.8' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.5' },
  { path: '/terms', changefreq: 'yearly', priority: '0.5' },
  { path: '/about', changefreq: 'yearly', priority: '0.5' },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(r => `  <url>
    <loc>${baseUrl}${r.path}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), sitemap, 'utf8');
console.log('Generated sitemap.xml');

const robots = `User-agent: *
Allow: /
Disallow: /admin
Sitemap: ${baseUrl}/sitemap.xml
`;

fs.writeFileSync(path.join(outputDir, 'robots.txt'), robots, 'utf8');
console.log('Generated robots.txt');
