const { prisma, db } = require('../db.cjs');

/**
 * Helper to pick localized string with fallback
 */
function pickLocalized(ar, en, locale) {
  const a = (ar ?? '').trim();
  const e = (en ?? '').trim();
  if (locale === 'ar') return a || e || '';
  return e || a || '';
}

/**
 * Shared repository for Blog Post operations
 */
const blogRepo = {
  /**
   * Get blog posts with computed multilingual fields
   */
  async getPosts({ page = 1, limit = 10, locale = 'ar', isPublished = true } = {}) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    const posts = await prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip,
      take,
    });

    const total = await this.countPosts(where);

    // Compute multilingual fields
    const formattedPosts = posts.map(post => this.formatPost(post, locale));

    return {
      posts: formattedPosts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / take)
      }
    };
  },

  /**
   * Get a single post by slug
   */
  async getPostBySlug(slug, locale = 'ar') {
    const post = await prisma.blogPost.findUnique({
      where: { slug }
    });

    if (!post) return null;

    return this.formatPost(post, locale);
  },

  /**
   * Get a single post by ID
   */
  async getPostById(id, locale = 'ar') {
    const post = await prisma.blogPost.findUnique({
      where: { id }
    });

    if (!post) return null;

    return this.formatPost(post, locale);
  },

  /**
   * Create or update a blog post
   */
  async savePost(data, adminId) {
    const { id, slug, titleAr, titleEn, excerptAr, excerptEn, bodyMarkdownAr, bodyMarkdownEn, isPublished, tags, heroImageUrl } = data;

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
      isPublished: !!isPublished,
      tags: tags || '',
      heroImageUrl: heroImageUrl || null,
      updatedById: adminId,
      updatedAt: new Date()
    };

    if (isPublished && !data.publishedAt) {
      postData.publishedAt = new Date();
    }

    if (id) {
      return await prisma.blogPost.update({
        where: { id },
        data: postData
      });
    } else {
      postData.authorId = adminId;
      postData.createdById = adminId;
      return await prisma.blogPost.create({
        data: postData
      });
    }
  },

  /**
   * Delete a blog post (soft delete)
   */
  async deletePost(id, adminId) {
    return await prisma.blogPost.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: adminId
      }
    });
  },

  /**
   * Count posts matching criteria
   */
  async countPosts(where = {}) {
    // Prisma wrapper in db.cjs might not have count for blogPost, let's check
    // If not, we can use findMany and get length or implement count in db.cjs
    const all = await prisma.blogPost.findMany({ where });
    return all.length;
  },

  /**
   * Format post for a specific locale
   */
  formatPost(row, locale = 'ar') {
    // Try localized fields first, then fallback to legacy fields
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
  }
};

module.exports = blogRepo;
