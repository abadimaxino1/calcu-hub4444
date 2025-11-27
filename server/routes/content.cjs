// Content management routes (static pages, blog, FAQ)
const express = require('express');
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');

const router = express.Router();

// ============================================
// Static Pages
// ============================================

// Get all static pages
router.get('/pages', async (req, res) => {
  try {
    const { locale = 'ar' } = req.query;
    const pages = await prisma.staticPageContent.findMany({
      where: { locale },
      orderBy: { slug: 'asc' },
    });
    return res.json({ pages });
  } catch (error) {
    console.error('Get pages error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get single page by slug
router.get('/pages/:slug', async (req, res) => {
  try {
    const { locale = 'ar' } = req.query;
    const page = await prisma.staticPageContent.findUnique({
      where: { slug_locale: { slug: req.params.slug, locale } },
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    return res.json({ page });
  } catch (error) {
    console.error('Get page error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create/Update page (upsert)
router.post('/pages', requirePermission(PERMISSIONS.CONTENT_UPDATE), async (req, res) => {
  try {
    const { slug, locale = 'ar', title, bodyMarkdown } = req.body;

    if (!slug || !title || !bodyMarkdown) {
      return res.status(400).json({ error: 'slug, title, and bodyMarkdown required' });
    }

    const page = await prisma.staticPageContent.upsert({
      where: { slug_locale: { slug, locale } },
      update: {
        title,
        bodyMarkdown,
        lastEditedById: req.user?.id,
      },
      create: {
        slug,
        locale,
        title,
        bodyMarkdown,
        lastEditedById: req.user?.id,
      },
    });

    // Log activity
    if (req.user) {
      await prisma.adminActivityLog.create({
        data: {
          adminUserId: req.user.id,
          actionType: 'UPDATE_PAGE',
          targetType: 'static_page',
          targetId: page.id,
          detailsJson: JSON.stringify({ slug, locale }),
          ipAddress: req.ip,
        },
      });
    }

    return res.json({ ok: true, page });
  } catch (error) {
    console.error('Update page error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Blog Posts
// ============================================

// Get all published blog posts (public)
router.get('/blog', async (req, res) => {
  try {
    const { page = 1, limit = 10, includeUnpublished } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where = {};
    if (!includeUnpublished) {
      where.isPublished = true;
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: { author: { select: { name: true } } },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: parseInt(limit, 10),
      }),
      prisma.blogPost.count({ where }),
    ]);

    return res.json({
      posts: posts.map(p => ({
        ...p,
        authorName: p.author?.name,
        author: undefined,
      })),
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (error) {
    console.error('Get blog posts error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get single blog post by slug
router.get('/blog/:slug', async (req, res) => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug: req.params.slug },
      include: { author: { select: { name: true } } },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Increment view count
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });

    return res.json({
      post: {
        ...post,
        authorName: post.author?.name,
        author: undefined,
      },
    });
  } catch (error) {
    console.error('Get blog post error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create blog post
router.post('/blog', requirePermission(PERMISSIONS.BLOG_CREATE), async (req, res) => {
  try {
    const { slug, title, excerpt, bodyMarkdown, heroImageUrl, tags, isPublished } = req.body;

    if (!slug || !title || !bodyMarkdown) {
      return res.status(400).json({ error: 'slug, title, and bodyMarkdown required' });
    }

    const post = await prisma.blogPost.create({
      data: {
        slug,
        title,
        excerpt: excerpt || '',
        bodyMarkdown,
        heroImageUrl,
        tags: Array.isArray(tags) ? tags.join(',') : (tags || ''),
        authorId: req.user.id,
        isPublished: isPublished || false,
        publishedAt: isPublished ? new Date() : null,
      },
    });

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: req.user.id,
        actionType: 'CREATE_BLOG_POST',
        targetType: 'blog_post',
        targetId: post.id,
        detailsJson: JSON.stringify({ slug, title }),
        ipAddress: req.ip,
      },
    });

    return res.json({ ok: true, post });
  } catch (error) {
    console.error('Create blog post error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update blog post
router.put('/blog/:id', requirePermission(PERMISSIONS.BLOG_UPDATE), async (req, res) => {
  try {
    const { title, excerpt, bodyMarkdown, heroImageUrl, tags, isPublished } = req.body;

    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (bodyMarkdown) updateData.bodyMarkdown = bodyMarkdown;
    if (heroImageUrl !== undefined) updateData.heroImageUrl = heroImageUrl;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags.join(',') : tags;

    if (typeof isPublished === 'boolean') {
      updateData.isPublished = isPublished;
      if (isPublished && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: updateData,
    });

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: req.user.id,
        actionType: 'UPDATE_BLOG_POST',
        targetType: 'blog_post',
        targetId: post.id,
        detailsJson: JSON.stringify({ changes: Object.keys(updateData) }),
        ipAddress: req.ip,
      },
    });

    return res.json({ ok: true, post });
  } catch (error) {
    console.error('Update blog post error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete blog post
router.delete('/blog/:id', requirePermission(PERMISSIONS.BLOG_DELETE), async (req, res) => {
  try {
    await prisma.blogPost.delete({ where: { id: req.params.id } });

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: req.user.id,
        actionType: 'DELETE_BLOG_POST',
        targetType: 'blog_post',
        targetId: req.params.id,
        ipAddress: req.ip,
      },
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete blog post error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// FAQs - Updated with bilingual support
// ============================================

// Get FAQs by category
router.get('/faqs', async (req, res) => {
  try {
    const { category } = req.query;

    const where = { isPublished: true };
    if (category) where.category = category;

    const faqs = await prisma.fAQ.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return res.json({ faqs });
  } catch (error) {
    console.error('Get FAQs error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all FAQs (admin) - includes all categories and languages
router.get('/faq', requirePermission(PERMISSIONS.CONTENT_READ), async (req, res) => {
  try {
    const faqs = await prisma.fAQ.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
    return res.json({ faqs });
  } catch (error) {
    console.error('Get all FAQs error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all FAQs alternate endpoint for backward compatibility
router.get('/faqs/all', requirePermission(PERMISSIONS.CONTENT_READ), async (req, res) => {
  try {
    const faqs = await prisma.fAQ.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
    return res.json({ faqs });
  } catch (error) {
    console.error('Get all FAQs error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create FAQ with bilingual support
router.post('/faqs', requirePermission(PERMISSIONS.CONTENT_CREATE), async (req, res) => {
  try {
    const { category, questionAr, questionEn, answerAr, answerEn, sortOrder = 0, isPublished = true } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'category required' });
    }

    // Support legacy single-language API
    const { question, answer, locale = 'ar' } = req.body;

    const faq = await prisma.fAQ.create({
      data: { 
        category, 
        questionAr: questionAr || question || '', 
        questionEn: questionEn || '', 
        answerAr: answerAr || answer || '', 
        answerEn: answerEn || '', 
        sortOrder, 
        isPublished,
        // Legacy fields for backward compatibility
        locale,
        question: questionAr || question || '',
        answer: answerAr || answer || '',
      },
    });

    return res.json({ ok: true, faq });
  } catch (error) {
    console.error('Create FAQ error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create FAQ endpoint for ContentPanel
router.post('/faq', requirePermission(PERMISSIONS.CONTENT_CREATE), async (req, res) => {
  try {
    const { category, questionAr, questionEn, answerAr, answerEn, order = 0, isActive = true } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'category required' });
    }

    const faq = await prisma.fAQ.create({
      data: { 
        category, 
        questionAr: questionAr || '', 
        questionEn: questionEn || '', 
        answerAr: answerAr || '', 
        answerEn: answerEn || '', 
        sortOrder: order, 
        isPublished: isActive,
        question: questionAr || '',
        answer: answerAr || '',
      },
    });

    return res.json({ ok: true, faq });
  } catch (error) {
    console.error('Create FAQ error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update FAQ with bilingual support
router.put('/faqs/:id', requirePermission(PERMISSIONS.CONTENT_UPDATE), async (req, res) => {
  try {
    const { category, questionAr, questionEn, answerAr, answerEn, sortOrder, isPublished } = req.body;

    const updateData = {};
    if (category) updateData.category = category;
    if (questionAr !== undefined) {
      updateData.questionAr = questionAr;
      updateData.question = questionAr;
    }
    if (questionEn !== undefined) updateData.questionEn = questionEn;
    if (answerAr !== undefined) {
      updateData.answerAr = answerAr;
      updateData.answer = answerAr;
    }
    if (answerEn !== undefined) updateData.answerEn = answerEn;
    if (typeof sortOrder === 'number') updateData.sortOrder = sortOrder;
    if (typeof isPublished === 'boolean') updateData.isPublished = isPublished;

    // Legacy support
    const { question, answer } = req.body;
    if (question && !questionAr) {
      updateData.question = question;
      updateData.questionAr = question;
    }
    if (answer && !answerAr) {
      updateData.answer = answer;
      updateData.answerAr = answer;
    }

    const faq = await prisma.fAQ.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return res.json({ ok: true, faq });
  } catch (error) {
    console.error('Update FAQ error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update FAQ endpoint for ContentPanel
router.put('/faq/:id', requirePermission(PERMISSIONS.CONTENT_UPDATE), async (req, res) => {
  try {
    const { category, questionAr, questionEn, answerAr, answerEn, order, isActive } = req.body;

    const updateData = {};
    if (category) updateData.category = category;
    if (questionAr !== undefined) {
      updateData.questionAr = questionAr;
      updateData.question = questionAr;
    }
    if (questionEn !== undefined) updateData.questionEn = questionEn;
    if (answerAr !== undefined) {
      updateData.answerAr = answerAr;
      updateData.answer = answerAr;
    }
    if (answerEn !== undefined) updateData.answerEn = answerEn;
    if (typeof order === 'number') updateData.sortOrder = order;
    if (typeof isActive === 'boolean') updateData.isPublished = isActive;

    const faq = await prisma.fAQ.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return res.json({ ok: true, faq });
  } catch (error) {
    console.error('Update FAQ error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete FAQ
router.delete('/faqs/:id', requirePermission(PERMISSIONS.CONTENT_DELETE), async (req, res) => {
  try {
    await prisma.fAQ.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete FAQ endpoint for ContentPanel
router.delete('/faq/:id', requirePermission(PERMISSIONS.CONTENT_DELETE), async (req, res) => {
  try {
    await prisma.fAQ.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
