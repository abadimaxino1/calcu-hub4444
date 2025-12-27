const { prisma } = require('../db.cjs');

const pagesRepo = {
  formatPage(page) {
    if (!page) return null;
    return {
      ...page,
      // Ensure blocksJson is parsed if it's a string
      blocksJson: typeof page.blocksJson === 'string' ? JSON.parse(page.blocksJson) : page.blocksJson
    };
  },

  async listPublic({ locale = 'ar' } = {}) {
    const pages = await prisma.staticPageContent.findMany({
      where: {
        locale,
        deletedAt: null,
        status: 'published'
      },
      orderBy: { slug: 'asc' }
    });
    return pages.map(p => this.formatPage(p));
  },

  async listAdmin({ locale = 'ar', includeDeleted = false } = {}) {
    const where = { locale };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    const pages = await prisma.staticPageContent.findMany({
      where,
      orderBy: { slug: 'asc' }
    });
    return pages.map(p => this.formatPage(p));
  },

  async getBySlugPublic(slug, locale = 'ar') {
    const page = await prisma.staticPageContent.findUnique({
      where: { slug_locale: { slug, locale } }
    });

    if (!page || page.deletedAt || page.status !== 'published') return null;
    return this.formatPage(page);
  },

  async getById(id) {
    const page = await prisma.staticPageContent.findUnique({
      where: { id }
    });
    return this.formatPage(page);
  },

  async save(data, adminId) {
    const { slug, locale = 'ar', title, bodyMarkdown, blocksJson, status } = data;

    if (!slug || !title) {
      throw new Error('Slug and title are required');
    }

    const pageData = {
      title,
      bodyMarkdown: bodyMarkdown || '',
      blocksJson: blocksJson ? (typeof blocksJson === 'string' ? blocksJson : JSON.stringify(blocksJson)) : null,
      status: status || 'published',
      updatedById: adminId,
      updatedAt: new Date()
    };

    return await prisma.staticPageContent.upsert({
      where: { slug_locale: { slug, locale } },
      update: pageData,
      create: {
        ...pageData,
        slug,
        locale,
        createdById: adminId,
        lastEditedById: adminId
      }
    });
  },

  async delete(id, adminId) {
    return await prisma.staticPageContent.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: adminId
      }
    });
  }
};

module.exports = pagesRepo;
