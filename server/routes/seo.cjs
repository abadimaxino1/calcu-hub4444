// SEO configuration routes
const express = require('express');
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');

const router = express.Router();

// Get SEO config for a page
router.get('/:pageKey', async (req, res) => {
  try {
    const { locale = 'ar' } = req.query;
    const config = await prisma.seoConfig.findUnique({
      where: { pageKey_locale: { pageKey: req.params.pageKey, locale } },
    });

    if (!config) {
      // Return default
      return res.json({
        config: {
          pageKey: req.params.pageKey,
          locale,
          title: 'حاسبات العمل والرواتب | Calcu-Hub',
          description: 'أدوات حساب الراتب وساعات العمل ونهاية الخدمة للموظفين في السعودية',
          isIndexable: true,
        },
      });
    }

    return res.json({ config });
  } catch (error) {
    console.error('Get SEO config error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all SEO configs (admin)
router.get('/', requirePermission(PERMISSIONS.SEO_READ), async (req, res) => {
  try {
    const configs = await prisma.seoConfig.findMany({
      orderBy: [{ pageKey: 'asc' }, { locale: 'asc' }],
    });
    return res.json({ configs });
  } catch (error) {
    console.error('Get all SEO configs error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create/Update SEO config
router.post('/', requirePermission(PERMISSIONS.SEO_UPDATE), async (req, res) => {
  try {
    const {
      pageKey,
      locale = 'ar',
      title,
      description,
      canonicalUrl,
      ogTitle,
      ogDescription,
      ogImageUrl,
      twitterCardType,
      jsonLd,
      isIndexable,
    } = req.body;

    if (!pageKey || !title || !description) {
      return res.status(400).json({ error: 'pageKey, title, and description required' });
    }

    const config = await prisma.seoConfig.upsert({
      where: { pageKey_locale: { pageKey, locale } },
      update: {
        title,
        description,
        canonicalUrl,
        ogTitle,
        ogDescription,
        ogImageUrl,
        twitterCardType,
        jsonLd,
        isIndexable: isIndexable !== false,
      },
      create: {
        pageKey,
        locale,
        title,
        description,
        canonicalUrl,
        ogTitle,
        ogDescription,
        ogImageUrl,
        twitterCardType,
        jsonLd,
        isIndexable: isIndexable !== false,
      },
    });

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: req.user.id,
        actionType: 'UPDATE_SEO',
        targetType: 'seo_config',
        targetId: config.id,
        detailsJson: JSON.stringify({ pageKey, locale }),
        ipAddress: req.ip,
      },
    });

    return res.json({ ok: true, config });
  } catch (error) {
    console.error('Update SEO config error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete SEO config
router.delete('/:id', requirePermission(PERMISSIONS.SEO_UPDATE), async (req, res) => {
  try {
    await prisma.seoConfig.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete SEO config error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Generate dynamic sitemap
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.SITE_URL || 'https://calcuhub.com';

    // Get all published blog posts
    const blogPosts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    });

    // Static pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/calculator/salary', priority: '0.9', changefreq: 'weekly' },
      { url: '/calculator/eos', priority: '0.9', changefreq: 'weekly' },
      { url: '/calculator/workhours', priority: '0.9', changefreq: 'weekly' },
      { url: '/calculator/dates', priority: '0.8', changefreq: 'weekly' },
      { url: '/tools', priority: '0.8', changefreq: 'weekly' },
      { url: '/faq', priority: '0.7', changefreq: 'monthly' },
      { url: '/blog', priority: '0.7', changefreq: 'daily' },
      { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
      { url: '/terms', priority: '0.3', changefreq: 'yearly' },
      { url: '/about', priority: '0.5', changefreq: 'monthly' },
    ];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add static pages
    for (const page of staticPages) {
      sitemap += `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Add blog posts
    for (const post of blogPosts) {
      sitemap += `  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${post.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    }

    sitemap += '</urlset>';

    res.setHeader('Content-Type', 'application/xml');
    return res.send(sitemap);
  } catch (error) {
    console.error('Generate sitemap error:', error);
    return res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;
