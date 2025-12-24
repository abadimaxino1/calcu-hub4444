const fs = require('fs');
const path = require('path');
const { prisma } = require('../db.cjs');

const SITE_URL = process.env.SITE_URL || 'https://calcu-hub.com';
const RUNTIME_DIR = path.join(__dirname, '..', 'runtime');

/**
 * Generate sitemap.xml and robots.txt
 */
async function generateSitemap() {
  try {
    console.log('[Sitemap] Generating sitemap...');
    
    if (!fs.existsSync(RUNTIME_DIR)) {
      fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    }

    const staticRoutes = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/faq', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools', priority: '0.9', changefreq: 'daily' },
      { path: '/blog', priority: '0.8', changefreq: 'daily' },
      { path: '/about', priority: '0.5', changefreq: 'monthly' },
      { path: '/privacy', priority: '0.3', changefreq: 'monthly' },
      { path: '/terms', priority: '0.3', changefreq: 'monthly' },
    ];

    // Fetch published CMS pages
    const cmsPages = await prisma.cmsPage.findMany({
      where: { status: 'published' },
      select: { slug: true, updatedAt: true }
    });

    // Fetch published blog posts
    const blogPosts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true }
    });

    const urls = [];

    // Add static routes (both ar and en)
    for (const route of staticRoutes) {
      urls.push({
        loc: `${SITE_URL}/ar${route.path === '/' ? '' : route.path}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: route.changefreq,
        priority: route.priority
      });
      urls.push({
        loc: `${SITE_URL}/en${route.path === '/' ? '' : route.path}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: route.changefreq,
        priority: route.priority
      });
    }

    // Add CMS pages
    for (const page of cmsPages) {
      const lastmod = page.updatedAt instanceof Date 
        ? page.updatedAt.toISOString().split('T')[0]
        : new Date(page.updatedAt).toISOString().split('T')[0];
        
      urls.push({
        loc: `${SITE_URL}/ar/calculator/${page.slug}`,
        lastmod,
        changefreq: 'weekly',
        priority: '0.8'
      });
      urls.push({
        loc: `${SITE_URL}/en/calculator/${page.slug}`,
        lastmod,
        changefreq: 'weekly',
        priority: '0.8'
      });
    }

    // Add Blog posts
    for (const post of blogPosts) {
      const lastmod = post.updatedAt instanceof Date 
        ? post.updatedAt.toISOString().split('T')[0]
        : new Date(post.updatedAt).toISOString().split('T')[0];

      urls.push({
        loc: `${SITE_URL}/ar/blog/${post.slug}`,
        lastmod,
        changefreq: 'monthly',
        priority: '0.7'
      });
      urls.push({
        loc: `${SITE_URL}/en/blog/${post.slug}`,
        lastmod,
        changefreq: 'monthly',
        priority: '0.7'
      });
    }

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    fs.writeFileSync(path.join(RUNTIME_DIR, 'sitemap.xml'), sitemapXml);
    
    const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin
Disallow: /api/auth

Sitemap: ${SITE_URL}/sitemap.xml
`;
    fs.writeFileSync(path.join(RUNTIME_DIR, 'robots.txt'), robotsTxt);

    console.log(`[Sitemap] Generated with ${urls.length} URLs`);
    return { success: true, urlCount: urls.length };
  } catch (error) {
    console.error('[Sitemap] Generation failed:', error);
    throw error;
  }
}

module.exports = { generateSitemap };
