const { prisma } = require('../db.cjs');

/**
 * Shared repository for Static Page operations
 */
const pagesRepo = {
  /**
   * Get all pages
   */
  async getPages({ locale = 'ar', includeDeleted = false } = {}) {
    const where = { locale };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return await prisma.staticPageContent.findMany({
      where,
      orderBy: { slug: 'asc' }
    });
  },

  /**
   * Get a single page by slug and locale
   */
  async getPageBySlug(slug, locale = 'ar') {
    return await prisma.staticPageContent.findUnique({
      where: { 
        slug_locale: { slug, locale } 
      }
    });
  },

  /**
   * Save a page (upsert)
   */
  async savePage(data, adminId) {
    const { slug, locale = 'ar', title, bodyMarkdown, blocksJson, status } = data;

    if (!slug || !title) {
      throw new Error('Slug and title are required');
    }

    return await prisma.staticPageContent.upsert({
      where: { slug_locale: { slug, locale } },
      update: {
        title,
        bodyMarkdown: bodyMarkdown || '',
        blocksJson: blocksJson || null,
        status: status || 'published',
        updatedById: adminId,
        updatedAt: new Date()
      },
      create: {
        slug,
        locale,
        title,
        bodyMarkdown: bodyMarkdown || '',
        blocksJson: blocksJson || null,
        status: status || 'published',
        createdById: adminId,
        lastEditedById: adminId
      }
    });
  },

  /**
   * Delete a page (soft delete)
   */
  async deletePage(slug, locale, adminId) {
    // Prisma wrapper might not support update on composite key easily if not implemented
    // Let's find it first
    const page = await this.getPageBySlug(slug, locale);
    if (!page) return null;

    return await prisma.staticPageContent.update({
      where: { id: page.id },
      data: {
        deletedAt: new Date(),
        deletedById: adminId
      }
    });
  }
};

module.exports = pagesRepo;
