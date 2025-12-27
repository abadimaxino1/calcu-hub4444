const express = require('express');
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission, hasPermission } = require('../rbac.cjs');
const { writeAuditLog } = require('../lib/audit.cjs');
const blogRepo = require('../repos/blogRepo.cjs');
const pagesRepo = require('../repos/pagesRepo.cjs');

const router = express.Router();

// ============================================
// Static Pages
// ============================================

// Get all static pages
router.get('/pages', requirePermission(PERMISSIONS.CONTENT_READ), async (req, res) => {
  try {
    const { locale = 'ar', includeDeleted = 'false' } = req.query;
    const pages = await pagesRepo.listAdmin({ 
      locale, 
      includeDeleted: includeDeleted === 'true' 
    });
    return res.json({ pages });
  } catch (error) {
    console.error('Admin pages list error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get single page by slug
router.get('/pages/:slug', requirePermission(PERMISSIONS.CONTENT_READ), async (req, res) => {
  try {
    const { locale = 'ar' } = req.query;
    const page = await pagesRepo.getBySlugPublic(req.params.slug, locale);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    return res.json({ page });
  } catch (error) {
    console.error('Admin page fetch error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create/Update page (upsert)
router.post('/pages', requirePermission(PERMISSIONS.CONTENT_UPDATE), async (req, res) => {
  try {
    const { slug, locale = 'ar' } = req.body;
    const before = await pagesRepo.getBySlugPublic(slug, locale);
    const page = await pagesRepo.save(req.body, req.user.id);

    await writeAuditLog({
      action: before ? 'PAGE_UPDATE' : 'PAGE_CREATE',
      entityType: 'STATIC_PAGE',
      entityId: page.id,
      entityLabel: `${slug} (${locale})`,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: before ? JSON.stringify(before) : null,
      afterJson: JSON.stringify(page)
    });

    return res.json(page);
  } catch (error) {
    console.error('Admin page save error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete page
router.delete('/pages/:id', requirePermission(PERMISSIONS.CONTENT_DELETE), async (req, res) => {
  try {
    const before = await pagesRepo.getById(req.params.id);
    if (!before) return res.status(404).json({ error: 'Page not found' });

    await pagesRepo.delete(req.params.id, req.user.id);

    await writeAuditLog({
      action: 'PAGE_DELETE',
      entityType: 'STATIC_PAGE',
      entityId: req.params.id,
      entityLabel: before.slug,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before)
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Admin page delete error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Blog Posts
// ============================================

// Get all blog posts
router.get('/blog', requirePermission(PERMISSIONS.BLOG_READ), async (req, res) => {
  try {
    const { page = 1, limit = 10, locale = 'ar', search = '' } = req.query;
    const result = await blogRepo.listAdmin({ page, limit, locale, search });
    return res.json(result);
  } catch (error) {
    console.error('Admin blog list error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get single blog post by ID
router.get('/blog/:id', requirePermission(PERMISSIONS.BLOG_READ), async (req, res) => {
  try {
    const { locale = 'ar' } = req.query;
    const post = await blogRepo.getById(req.params.id, locale);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ post });
  } catch (error) {
    console.error('Admin blog fetch error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create blog post
router.post('/blog', requirePermission(PERMISSIONS.BLOG_CREATE), async (req, res) => {
  try {
    const post = await blogRepo.create(req.body, req.user.id);

    await writeAuditLog({
      action: 'BLOG_CREATE',
      entityType: 'BLOG_POST',
      entityId: post.id,
      entityLabel: post.slug,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      afterJson: JSON.stringify(post)
    });

    return res.json(post);
  } catch (error) {
    console.error('Admin blog create error:', error);
    return res.status(400).json({ error: error.message });
  }
});

// Update blog post
router.put('/blog/:id', requirePermission(PERMISSIONS.BLOG_UPDATE), async (req, res) => {
  try {
    const before = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Post not found' });

    const post = await blogRepo.update(req.params.id, req.body, req.user.id);

    await writeAuditLog({
      action: 'BLOG_UPDATE',
      entityType: 'BLOG_POST',
      entityId: post.id,
      entityLabel: post.slug,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify(post)
    });

    return res.json(post);
  } catch (error) {
    console.error('Admin blog update error:', error);
    return res.status(400).json({ error: error.message });
  }
});

// Delete blog post
router.delete('/blog/:id', requirePermission(PERMISSIONS.BLOG_DELETE), async (req, res) => {
  try {
    const before = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });

    await blogRepo.delete(req.params.id, req.user.id);

    await writeAuditLog({
      action: 'BLOG_DELETE',
      entityType: 'BLOG_POST',
      entityId: req.params.id,
      entityLabel: before.slug,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before)
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Admin blog delete error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// FAQs
// ============================================

// Get FAQs
router.get('/faqs', async (req, res) => {
  try {
    const { category, scope = 'global' } = req.query;

    const where = { 
      isPublished: true,
      deletedAt: null,
      scope
    };
    if (category) where.category = category;

    const faqs = await prisma.fAQ.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return res.json(faqs);
  } catch (error) {
    console.error('Get FAQs error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all FAQs (admin)
router.get('/faq', requirePermission(PERMISSIONS.CONTENT_READ), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      sortBy = 'sortOrder', 
      sortOrder = 'asc',
      scope,
      includeDeleted = 'false'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      deletedAt: includeDeleted === 'true' ? undefined : null,
      scope: scope || undefined,
      OR: search ? [
        { questionAr: { contains: search } },
        { questionEn: { contains: search } },
        { category: { contains: search } }
      ] : undefined
    };

    const faqs = await prisma.fAQ.findMany({
      where,
      orderBy: sortBy === 'category' 
        ? [{ category: sortOrder }, { sortOrder: 'asc' }]
        : { [sortBy]: sortOrder },
      skip,
      take,
    });
    const allFaqs = await prisma.fAQ.findMany({ where });
    const total = allFaqs.length;

    return res.json({ 
      faqs, 
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Get all FAQs error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create FAQ
router.post('/faqs', requirePermission(PERMISSIONS.CONTENT_CREATE), async (req, res) => {
  try {
    const { category, questionAr, questionEn, answerAr, answerEn, sortOrder, isPublished, scope = 'global' } = req.body;

    if (!category || !questionAr || !answerAr) {
      return res.status(400).json({ error: 'category, questionAr, and answerAr required' });
    }

    const faq = await prisma.fAQ.create({
      data: {
        category,
        questionAr,
        questionEn: questionEn || '',
        answerAr,
        answerEn: answerEn || '',
        // Write-through for legacy fields
        question: questionAr || '',
        answer: answerAr || '',
        sortOrder: parseInt(sortOrder) || 0,
        isPublished: isPublished !== undefined ? isPublished : true,
        scope,
        createdById: req.user.id
      },
    });

    await writeAuditLog({
      action: 'FAQ_CREATE',
      entityType: 'FAQ',
      entityId: faq.id,
      entityLabel: faq.questionAr.substring(0, 50),
      actorUserId: req.user.id,
      actorRole: req.user.role,
      afterJson: JSON.stringify(faq)
    });

    return res.json(faq);
  } catch (error) {
    console.error('Create FAQ error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update FAQ
router.put('/faqs/:id', requirePermission(PERMISSIONS.CONTENT_UPDATE), async (req, res) => {
  try {
    const { category, questionAr, questionEn, answerAr, answerEn, sortOrder, isPublished, scope } = req.body;

    const before = await prisma.fAQ.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'FAQ not found' });

    const updateData = {
      updatedById: req.user.id
    };
    if (category) updateData.category = category;
    if (questionAr !== undefined) {
      updateData.questionAr = questionAr;
      updateData.question = questionAr; // Write-through
    }
    if (questionEn !== undefined) updateData.questionEn = questionEn;
    if (answerAr !== undefined) {
      updateData.answerAr = answerAr;
      updateData.answer = answerAr; // Write-through
    }
    if (answerEn !== undefined) updateData.answerEn = answerEn;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (scope) updateData.scope = scope;

    const faq = await prisma.fAQ.update({
      where: { id: req.params.id },
      data: updateData,
    });

    await writeAuditLog({
      action: 'FAQ_UPDATE',
      entityType: 'FAQ',
      entityId: faq.id,
      entityLabel: faq.questionAr.substring(0, 50),
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify(faq)
    });

    return res.json(faq);
  } catch (error) {
    console.error('Update FAQ error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete FAQ
router.delete('/faqs/:id', requirePermission(PERMISSIONS.CONTENT_DELETE), async (req, res) => {
  try {
    const before = await prisma.fAQ.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });

    const faq = await prisma.fAQ.update({
      where: { id: req.params.id },
      data: { 
        deletedAt: new Date(),
        deletedById: req.user.id
      }
    });

    await writeAuditLog({
      action: 'FAQ_DELETE',
      entityType: 'FAQ',
      entityId: faq.id,
      entityLabel: before.questionAr.substring(0, 50),
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before)
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Page Registry
// ============================================

// Get registry
router.get('/registry', async (req, res) => {
  try {
    const pages = await prisma.pageRegistry.findMany({
      where: { isVisible: true },
    });
    return res.json(pages);
  } catch (error) {
    console.error('Get registry error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get registry (admin)
router.get('/registry/all', requirePermission(PERMISSIONS.CONTENT_READ), async (req, res) => {
  try {
    const pages = await prisma.pageRegistry.findMany();
    return res.json(pages);
  } catch (error) {
    console.error('Get all registry error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Upsert registry item
router.post('/registry', requirePermission(PERMISSIONS.CONTENT_UPDATE), async (req, res) => {
  try {
    const { routeKey, path, nameAr, nameEn, isVisible, configJson } = req.body;
    
    const existing = await prisma.pageRegistry.findUnique({ where: { routeKey } });
    
    if (existing) {
      const page = await prisma.pageRegistry.update({
        where: { id: existing.id },
        data: {
          path, nameAr, nameEn, isVisible, configJson
        }
      });
      return res.json(page);
    } else {
      const page = await prisma.pageRegistry.create({
        data: {
          routeKey, path, nameAr, nameEn, isVisible, configJson
        }
      });
      return res.json(page);
    }
  } catch (error) {
    console.error('Upsert registry error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Bulk Actions
// ============================================

router.post('/bulk-action', requirePermission(PERMISSIONS.CONTENT_UPDATE), async (req, res) => {
  try {
    const { type, action, ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }

    let model;
    let entityType;
    switch (type) {
      case 'pages': 
        model = prisma.staticPageContent; 
        entityType = 'STATIC_PAGE';
        break;
      case 'blog': 
        model = prisma.blogPost; 
        entityType = 'BLOG_POST';
        break;
      case 'faq': 
        model = prisma.fAQ; 
        entityType = 'FAQ';
        break;
      default: return res.status(400).json({ error: 'Invalid type' });
    }

    const beforeData = await model.findMany({ where: { id: { in: ids } } });

    let updateData = {};
    if (action === 'delete') {
      updateData = { deletedAt: new Date(), deletedById: req.user.id };
    } else if (action === 'restore') {
      updateData = { deletedAt: null, deletedById: null };
    } else if (action === 'publish') {
      if (type === 'pages') updateData = { status: 'published' };
      else updateData = { isPublished: true };
    } else if (action === 'unpublish') {
      if (type === 'pages') updateData = { status: 'draft' };
      else updateData = { isPublished: false };
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await model.updateMany({
      where: { id: { in: ids } },
      data: { ...updateData, updatedById: req.user.id }
    });

    const afterData = await model.findMany({ where: { id: { in: ids } } });

    await writeAuditLog({
      action: `BULK_${action.toUpperCase()}`,
      entityType,
      entityId: 'BULK',
      entityLabel: `${ids.length} items`,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(beforeData),
      afterJson: JSON.stringify(afterData),
      metadata: JSON.stringify({ ids })
    });

    return res.json({ ok: true, count: ids.length });
  } catch (error) {
    console.error('Bulk action error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Clone Actions
// ============================================

router.post('/blog/:id/clone', requirePermission(PERMISSIONS.BLOG_UPDATE), async (req, res) => {
  try {
    const original = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ error: 'Post not found' });

    const { id, createdAt, updatedAt, ...data } = original;
    const clone = await prisma.blogPost.create({
      data: {
        ...data,
        slug: `${data.slug}-clone-${Date.now()}`,
        titleAr: `${data.titleAr} (نسخة)`,
        titleEn: data.titleEn ? `${data.titleEn} (Clone)` : null,
        isPublished: false,
        createdById: req.user.id
      }
    });

    await writeAuditLog({
      action: 'BLOG_CLONE',
      entityType: 'BLOG_POST',
      entityId: clone.id,
      entityLabel: clone.slug,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify({ originalId: id }),
      afterJson: JSON.stringify(clone)
    });

    return res.json(clone);
  } catch (error) {
    console.error('Blog clone error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/faqs/:id/clone', requirePermission(PERMISSIONS.CONTENT_UPDATE), async (req, res) => {
  try {
    const original = await prisma.fAQ.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ error: 'FAQ not found' });

    const { id, createdAt, updatedAt, ...data } = original;
    const clone = await prisma.fAQ.create({
      data: {
        ...data,
        questionAr: `${data.questionAr} (نسخة)`,
        questionEn: data.questionEn ? `${data.questionEn} (Clone)` : null,
        isPublished: false,
        createdById: req.user.id
      }
    });

    await writeAuditLog({
      action: 'FAQ_CLONE',
      entityType: 'FAQ',
      entityId: clone.id,
      entityLabel: clone.questionAr,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify({ originalId: id }),
      afterJson: JSON.stringify(clone)
    });

    return res.json(clone);
  } catch (error) {
    console.error('FAQ clone error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
