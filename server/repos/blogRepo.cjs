const { prisma } = require('../db.cjs');

/**
 * Helper to pick localized string with fallback
 */
function pickLocalized(ar, en, locale) {
  const a = (ar ?? '').trim();
  const e = (en ?? '').trim();
  if (locale === 'ar') return a || e || '';
  return e || a || '';
}

const blogRepo = {
  /**
   * Format post for a specific locale
   */
  formatPost(row, locale = 'ar') {
    if (!row) return null;
    
    const title = pickLocalized(row.titleAr, row.titleEn, locale) || row.title;
    const excerpt = pickLocalized(row.excerptAr, row.excerptEn, locale) || row.excerpt;
    const bodyMarkdown = pickLocalized(row.bodyMarkdownAr, row.bodyMarkdownEn, locale) || row.bodyMarkdown;

    return {
      ...row,
      title: title || 'بدون عنوان',
      excerpt: excerpt || '',
      bodyMarkdown: bodyMarkdown || '',
      publishedAt: row.publishedAt || row.createdAt || null,
      updatedAt: row.updatedAt || null,

      // Ensure these are always strings for the UI
      titleAr: row.titleAr || '',
      titleEn: row.titleEn || '',
      excerptAr: row.excerptAr || '',
      excerptEn: row.excerptEn || '',
      bodyMarkdownAr: row.bodyMarkdownAr || '',
      bodyMarkdownEn: row.bodyMarkdownEn || '',
    };
  },

  async listPublic({ page = 1, limit = 10, locale = 'ar' } = {}) {
    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const where = {
        isPublished: true,
        deletedAt: null
      };

      const posts = await prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take,
      });

      const total = await prisma.blogPost.count({ where }).catch((err) => {
        console.error('[blogRepo] count error:', err);
        return prisma.blogPost.findMany({ where }).then(all => all.length);
      });

      return {
        posts: posts.map(p => this.formatPost(p, locale)),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / take)
        }
      };
    } catch (error) {
      console.error('[blogRepo] listPublic error:', error);
      throw error;
    }
  },

  async listAdmin({ page = 1, limit = 10, locale = 'ar', search = '' } = {}) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      deletedAt: null,
      OR: search ? [
        { slug: { contains: search } },
        { titleAr: { contains: search } },
        { titleEn: { contains: search } }
      ] : undefined
    };

    const posts = await prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        author: { select: { name: true } }
      }
    });

    const total = await prisma.blogPost.count({ where }).catch(() => {
      return prisma.blogPost.findMany({ where }).then(all => all.length);
    });

    return {
      posts: posts.map(p => ({
        ...this.formatPost(p, locale),
        authorName: p.author?.name
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / take)
      }
    };
  },

  async getBySlugPublic(slug, locale = 'ar') {
    const post = await prisma.blogPost.findUnique({
      where: { slug }
    });

    if (!post || !post.isPublished || post.deletedAt) return null;

    // Increment view count (async)
    prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } }
    }).catch(() => {});

    return this.formatPost(post, locale);
  },

  async getById(id, locale = 'ar') {
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: { author: { select: { name: true } } }
    });
    if (!post) return null;
    return {
      ...this.formatPost(post, locale),
      authorName: post.author?.name
    };
  },

  async create(data, adminId) {
    const { slug, titleAr, titleEn, excerptAr, excerptEn, bodyMarkdownAr, bodyMarkdownEn, isPublished, tags, heroImageUrl } = data;

    if (!slug || (!titleAr && !titleEn)) {
      throw new Error('Slug and at least one title (Ar/En) are required');
    }

    const postData = {
      slug,
      titleAr: titleAr || '',
      titleEn: titleEn || '',
      excerptAr: excerptAr || '',
      excerptEn: excerptEn || '',
      bodyMarkdownAr: bodyMarkdownAr || '',
      bodyMarkdownEn: bodyMarkdownEn || '',
      // Write-through for legacy fields (Arabic fallback)
      title: titleAr || '',
      excerpt: excerptAr || '',
      bodyMarkdown: bodyMarkdownAr || '',
      isPublished: !!isPublished,
      tags: Array.isArray(tags) ? tags.join(',') : (tags || ''),
      heroImageUrl: heroImageUrl || null,
      authorId: adminId,
      createdById: adminId,
      updatedById: adminId,
      publishedAt: isPublished ? new Date() : null
    };

    return await prisma.blogPost.create({ data: postData });
  },

  async update(id, data, adminId) {
    const before = await prisma.blogPost.findUnique({ where: { id } });
    if (!before) throw new Error('Post not found');

    const { slug, titleAr, titleEn, excerptAr, excerptEn, bodyMarkdownAr, bodyMarkdownEn, isPublished, tags, heroImageUrl } = data;

    const postData = {
      updatedById: adminId,
      updatedAt: new Date()
    };

    if (slug) postData.slug = slug;
    if (titleAr !== undefined) {
      postData.titleAr = titleAr;
      postData.title = titleAr; // Write-through
    }
    if (titleEn !== undefined) postData.titleEn = titleEn;
    if (excerptAr !== undefined) {
      postData.excerptAr = excerptAr;
      postData.excerpt = excerptAr; // Write-through
    }
    if (excerptEn !== undefined) postData.excerptEn = excerptEn;
    if (bodyMarkdownAr !== undefined) {
      postData.bodyMarkdownAr = bodyMarkdownAr;
      postData.bodyMarkdown = bodyMarkdownAr; // Write-through
    }
    if (bodyMarkdownEn !== undefined) postData.bodyMarkdownEn = bodyMarkdownEn;
    if (heroImageUrl !== undefined) postData.heroImageUrl = heroImageUrl;
    if (tags !== undefined) postData.tags = Array.isArray(tags) ? tags.join(',') : tags;

    if (typeof isPublished === 'boolean') {
      postData.isPublished = isPublished;
      if (isPublished && !before.publishedAt) {
        postData.publishedAt = new Date();
      }
    }

    return await prisma.blogPost.update({
      where: { id },
      data: postData
    });
  },

  async delete(id, adminId) {
    return await prisma.blogPost.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: adminId
      }
    });
  }
};

module.exports = blogRepo;
