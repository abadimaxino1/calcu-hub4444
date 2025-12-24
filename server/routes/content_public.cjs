const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const blogRepo = require('../repos/blogRepo.cjs');
const pagesRepo = require('../repos/pagesRepo.cjs');

/**
 * GET /api/content/pages
 * List all public static pages
 */
router.get('/pages', async (req, res) => {
  try {
    const { locale = 'ar' } = req.query;
    const pages = await pagesRepo.listPublic({ locale });
    return res.json({ pages });
  } catch (error) {
    console.error('Public pages list error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/content/pages/:slug
 * Public read-only access to static pages (Privacy, Terms, etc.)
 */
router.get('/pages/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { locale = 'ar' } = req.query;

    const page = await pagesRepo.getBySlugPublic(slug, locale);

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({ page });
  } catch (error) {
    console.error('Public page fetch error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/content/blog
 * Public read-only access to blog posts
 */
router.get('/blog', async (req, res) => {
  try {
    const { page = 1, limit = 10, locale = 'ar' } = req.query;
    
    const result = await blogRepo.listPublic({ 
      page, 
      limit, 
      locale
    });

    // Cache for 1 minute
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json(result);
  } catch (error) {
    console.error('Public blog fetch error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/content/blog/:slug
 * Public read-only access to a single blog post
 */
router.get('/blog/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { locale = 'ar' } = req.query;

    const post = await blogRepo.getBySlugPublic(slug, locale);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({ post });
  } catch (error) {
    console.error('Public blog post fetch error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/content/faqs
 * Public read-only access to FAQs
 */
router.get('/faqs', async (req, res) => {
  try {
    const { category, locale = 'ar' } = req.query;
    
    const where = { 
      isPublished: true,
      // locale 
    };
    if (category) where.category = category;

    const faqs = await prisma.fAQ.findMany({
      where,
      orderBy: { sortOrder: 'asc' }
    });

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({ faqs });
  } catch (error) {
    console.error('Public FAQ fetch error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/content/cms/:slug
 * Public read-only access to CMS page content (used by calculators)
 */
router.get('/cms/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { locale = 'ar' } = req.query;

    const page = await prisma.cmsPage.findUnique({
      where: { slug }
    });

    if (!page || page.status !== 'published') {
      return res.status(404).json({ error: 'Page not found' });
    }

    const version = await prisma.cmsPageVersion.findFirst({
      where: { 
        pageId: page.id,
        locale
      },
      orderBy: { versionNumber: 'desc' }
    });

    if (!version) {
      // Try to find any version if locale-specific one is missing
      const anyVersion = await prisma.cmsPageVersion.findFirst({
        where: { pageId: page.id },
        orderBy: { versionNumber: 'desc' }
      });
      
      if (!anyVersion) {
        return res.status(404).json({ error: 'Content version not found' });
      }
      return res.json(anyVersion);
    }

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json(version);
  } catch (error) {
    console.error('Public CMS fetch error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/content/preview/:token
 * Public (but token-protected) access to preview content
 */
router.get('/preview/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Simple implementation: token is the version ID
    const version = await prisma.cmsPageVersion.findUnique({
      where: { id: token }
    });

    if (!version) {
      return res.status(404).json({ error: 'Preview not found' });
    }

    return res.json(version);
  } catch (error) {
    console.error('CMS preview error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/content/tools
 * Public read-only access to tool cards
 */
router.get('/tools', async (req, res) => {
  try {
    const { featured, tools: onTools } = req.query;

    const where = { isPublished: true, deletedAt: null };
    if (featured === 'true') where.isFeaturedOnHome = true;
    if (onTools === 'true') where.isVisibleOnTools = true;

    const tools = await prisma.toolCard.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({ tools });
  } catch (error) {
    console.error('Public tools fetch error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/content/features
 * Public read-only access to benefit features
 */
router.get('/features', async (req, res) => {
  try {
    const where = { isPublished: true, deletedAt: null };

    const features = await prisma.benefitFeature.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({ features });
  } catch (error) {
    console.error('Public features fetch error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
