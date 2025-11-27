// Database client singleton for the server using better-sqlite3
// Prisma 7 requires ESM imports which are problematic in CJS context
// Using better-sqlite3 directly for simplicity

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Helper to run queries with proper error handling
const prisma = {
  _db: db,
  
  // User operations
  user: {
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM users WHERE id = ?').get(where.id);
      if (where.email) return db.prepare('SELECT * FROM users WHERE email = ?').get(where.email);
      return null;
    },
    findFirst: ({ where }) => {
      if (where.role) return db.prepare('SELECT * FROM users WHERE role = ?').get(where.role);
      return null;
    },
    findMany: ({ where, orderBy } = {}) => {
      let sql = 'SELECT * FROM users';
      const params = [];
      if (where) {
        const conditions = [];
        if (where.isActive !== undefined) {
          conditions.push('isActive = ?');
          params.push(where.isActive ? 1 : 0);
        }
        if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      }
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      return db.prepare(sql).all(...params);
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO users (id, email, name, hashedPassword, role, isActive, totpSecret, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.email, data.name, data.hashedPassword, data.role || 'VIEW_ONLY', data.isActive ? 1 : 0, data.totpSecret || null, now, now);
      return { id, ...data, createdAt: now, updatedAt: now };
    },
    update: ({ where, data }) => {
      const now = new Date().toISOString();
      const sets = [];
      const params = [];
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          sets.push(`${key} = ?`);
          params.push(data[key]);
        }
      });
      sets.push('updatedAt = ?');
      params.push(now);
      params.push(where.id);
      db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM users WHERE id = ?').get(where.id);
    },
    delete: ({ where }) => {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(where.id);
      return user;
    },
  },
  
  // Session operations
  session: {
    findUnique: ({ where }) => {
      if (where.token) return db.prepare('SELECT * FROM sessions WHERE token = ?').get(where.token);
      if (where.id) return db.prepare('SELECT * FROM sessions WHERE id = ?').get(where.id);
      return null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      const expiresAt = data.expiresAt instanceof Date ? data.expiresAt.toISOString() : data.expiresAt;
      db.prepare(`
        INSERT INTO sessions (id, userId, token, expiresAt, userAgent, ipAddress, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.userId, data.token, expiresAt, data.userAgent || null, data.ipAddress || null, now);
      return { id, ...data, createdAt: now };
    },
    delete: ({ where }) => {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(where.token);
    },
    deleteMany: ({ where }) => {
      if (where.userId) {
        db.prepare('DELETE FROM sessions WHERE userId = ?').run(where.userId);
      }
      if (where.expiresAt && where.expiresAt.lt) {
        const lt = where.expiresAt.lt instanceof Date ? where.expiresAt.lt.toISOString() : where.expiresAt.lt;
        db.prepare('DELETE FROM sessions WHERE expiresAt < ?').run(lt);
      }
    },
  },
  
  // PageView operations
  pageView: {
    create: ({ data }) => {
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO page_views (id, sessionId, userId, pagePath, referrer, userAgent, country, device, browser, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.sessionId, data.userId || null, data.pagePath, data.referrer || null, data.userAgent || null, data.country || null, data.device || null, data.browser || null, now);
      return { id, ...data, createdAt: now };
    },
    count: ({ where } = {}) => {
      let sql = 'SELECT COUNT(*) as count FROM page_views';
      const params = [];
      if (where && where.createdAt) {
        if (where.createdAt.gte) {
          sql += ' WHERE createdAt >= ?';
          params.push(where.createdAt.gte);
        }
      }
      return db.prepare(sql).get(...params).count;
    },
    findMany: ({ where, orderBy, take } = {}) => {
      let sql = 'SELECT * FROM page_views';
      const params = [];
      if (where && where.createdAt && where.createdAt.gte) {
        sql += ' WHERE createdAt >= ?';
        params.push(where.createdAt.gte);
      }
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      if (take) sql += ` LIMIT ${take}`;
      return db.prepare(sql).all(...params);
    },
    groupBy: ({ by, _count, where, orderBy }) => {
      // Simplified groupBy for common use cases
      const field = by[0];
      let sql = `SELECT ${field}, COUNT(*) as _count FROM page_views`;
      const params = [];
      if (where && where.createdAt && where.createdAt.gte) {
        sql += ' WHERE createdAt >= ?';
        params.push(where.createdAt.gte);
      }
      sql += ` GROUP BY ${field}`;
      if (orderBy && orderBy._count) {
        sql += ` ORDER BY _count ${orderBy._count[field]}`;
      }
      return db.prepare(sql).all(...params);
    },
  },
  
  // CalculationEvent operations
  calculationEvent: {
    create: ({ data }) => {
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO calculation_events (id, sessionId, userId, calculatorType, inputSummary, resultSummary, durationMs, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.sessionId, data.userId || null, data.calculatorType, data.inputSummary, data.resultSummary, data.durationMs || 0, now);
      return { id, ...data, createdAt: now };
    },
    count: ({ where } = {}) => {
      let sql = 'SELECT COUNT(*) as count FROM calculation_events';
      const params = [];
      if (where && where.createdAt && where.createdAt.gte) {
        sql += ' WHERE createdAt >= ?';
        params.push(where.createdAt.gte);
      }
      return db.prepare(sql).get(...params).count;
    },
    groupBy: ({ by, _count, where, orderBy }) => {
      const field = by[0];
      let sql = `SELECT ${field}, COUNT(*) as _count FROM calculation_events`;
      const params = [];
      if (where && where.createdAt && where.createdAt.gte) {
        sql += ' WHERE createdAt >= ?';
        params.push(where.createdAt.gte);
      }
      sql += ` GROUP BY ${field}`;
      if (orderBy && orderBy._count) {
        sql += ` ORDER BY _count ${orderBy._count[field]}`;
      }
      return db.prepare(sql).all(...params);
    },
  },
  
  // AdEvent operations
  adEvent: {
    create: ({ data }) => {
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO ad_events (id, adSlotId, eventType, sessionId, pagePath, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, data.adSlotId, data.eventType, data.sessionId, data.pagePath, now);
      return { id, ...data, createdAt: now };
    },
    count: ({ where } = {}) => {
      let sql = 'SELECT COUNT(*) as count FROM ad_events';
      const conditions = [];
      const params = [];
      if (where) {
        if (where.eventType) {
          conditions.push('eventType = ?');
          params.push(where.eventType);
        }
        if (where.createdAt && where.createdAt.gte) {
          conditions.push('createdAt >= ?');
          params.push(where.createdAt.gte);
        }
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      return db.prepare(sql).get(...params).count;
    },
  },
  
  // AdSlot operations
  adSlot: {
    findMany: ({ where } = {}) => {
      let sql = 'SELECT * FROM ad_slots';
      if (where && where.isActive !== undefined) {
        sql += ' WHERE isActive = ?';
        return db.prepare(sql).all(where.isActive ? 1 : 0);
      }
      return db.prepare(sql).all();
    },
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM ad_slots WHERE id = ?').get(where.id);
      if (where.name) return db.prepare('SELECT * FROM ad_slots WHERE name = ?').get(where.name);
      return null;
    },
    create: ({ data }) => {
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO ad_slots (id, name, pagePathPattern, positionKey, isActive, eCPM, cpc, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.name, data.pagePathPattern, data.positionKey, data.isActive ? 1 : 0, data.eCPM || 0, data.cpc || 0, data.notes || null, now, now);
      return { id, ...data, createdAt: now, updatedAt: now };
    },
    update: ({ where, data }) => {
      const now = new Date().toISOString();
      const sets = [];
      const params = [];
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          sets.push(`${key} = ?`);
          params.push(typeof data[key] === 'boolean' ? (data[key] ? 1 : 0) : data[key]);
        }
      });
      sets.push('updatedAt = ?');
      params.push(now);
      params.push(where.id);
      db.prepare(`UPDATE ad_slots SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM ad_slots WHERE id = ?').get(where.id);
    },
    delete: ({ where }) => {
      const slot = db.prepare('SELECT * FROM ad_slots WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM ad_slots WHERE id = ?').run(where.id);
      return slot;
    },
  },
  
  // RevenueSnapshot operations
  revenueSnapshot: {
    findMany: ({ where, orderBy, take } = {}) => {
      let sql = 'SELECT * FROM revenue_snapshots';
      const params = [];
      if (where && where.dateTime) {
        if (where.dateTime.gte && where.dateTime.lte) {
          sql += ' WHERE dateTime >= ? AND dateTime <= ?';
          params.push(where.dateTime.gte, where.dateTime.lte);
        }
      }
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      if (take) sql += ` LIMIT ${take}`;
      return db.prepare(sql).all(...params);
    },
    create: ({ data }) => {
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO revenue_snapshots (id, source, dateTime, revenueAmount, currency, impressions, clicks, notes, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.source, data.dateTime, data.revenueAmount, data.currency || 'SAR', data.impressions || 0, data.clicks || 0, data.notes || null, now);
      return { id, ...data, createdAt: now };
    },
    aggregate: ({ _sum, where }) => {
      let sql = 'SELECT SUM(revenueAmount) as revenueAmount FROM revenue_snapshots';
      const params = [];
      if (where && where.dateTime) {
        if (where.dateTime.gte && where.dateTime.lte) {
          sql += ' WHERE dateTime >= ? AND dateTime <= ?';
          params.push(where.dateTime.gte, where.dateTime.lte);
        } else if (where.dateTime.gte) {
          sql += ' WHERE dateTime >= ?';
          params.push(where.dateTime.gte);
        }
      }
      const result = db.prepare(sql).get(...params);
      return { _sum: { revenueAmount: result.revenueAmount || 0 } };
    },
  },
  
  // SeoConfig operations
  seoConfig: {
    findMany: () => db.prepare('SELECT * FROM seo_configs').all(),
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM seo_configs WHERE id = ?').get(where.id);
      if (where.pageKey_locale) {
        return db.prepare('SELECT * FROM seo_configs WHERE pageKey = ? AND locale = ?').get(where.pageKey_locale.pageKey, where.pageKey_locale.locale);
      }
      return null;
    },
    findFirst: ({ where }) => {
      if (where.pageKey && where.locale) {
        return db.prepare('SELECT * FROM seo_configs WHERE pageKey = ? AND locale = ?').get(where.pageKey, where.locale);
      }
      return null;
    },
    upsert: ({ where, update, create }) => {
      const existing = db.prepare('SELECT * FROM seo_configs WHERE pageKey = ? AND locale = ?').get(where.pageKey_locale.pageKey, where.pageKey_locale.locale);
      const now = new Date().toISOString();
      if (existing) {
        const sets = [];
        const params = [];
        Object.keys(update).forEach(key => {
          sets.push(`${key} = ?`);
          params.push(typeof update[key] === 'boolean' ? (update[key] ? 1 : 0) : update[key]);
        });
        sets.push('updatedAt = ?');
        params.push(now);
        params.push(existing.id);
        db.prepare(`UPDATE seo_configs SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        return db.prepare('SELECT * FROM seo_configs WHERE id = ?').get(existing.id);
      } else {
        const id = require('uuid').v4();
        db.prepare(`
          INSERT INTO seo_configs (id, pageKey, locale, title, description, canonicalUrl, ogTitle, ogDescription, ogImageUrl, twitterCardType, jsonLd, isIndexable, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, create.pageKey, create.locale || 'ar', create.title, create.description, create.canonicalUrl || null, create.ogTitle || null, create.ogDescription || null, create.ogImageUrl || null, create.twitterCardType || 'summary_large_image', create.jsonLd || null, create.isIndexable !== false ? 1 : 0, now, now);
        return { id, ...create, createdAt: now, updatedAt: now };
      }
    },
  },
  
  // StaticPageContent operations
  staticPageContent: {
    findMany: ({ where } = {}) => {
      let sql = 'SELECT * FROM static_page_contents';
      if (where && where.locale) {
        sql += ' WHERE locale = ?';
        return db.prepare(sql).all(where.locale);
      }
      return db.prepare(sql).all();
    },
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM static_page_contents WHERE id = ?').get(where.id);
      if (where.slug_locale) {
        return db.prepare('SELECT * FROM static_page_contents WHERE slug = ? AND locale = ?').get(where.slug_locale.slug, where.slug_locale.locale);
      }
      return null;
    },
    findFirst: ({ where }) => {
      if (where.slug && where.locale) {
        return db.prepare('SELECT * FROM static_page_contents WHERE slug = ? AND locale = ?').get(where.slug, where.locale);
      }
      return null;
    },
    upsert: ({ where, update, create }) => {
      const existing = db.prepare('SELECT * FROM static_page_contents WHERE slug = ? AND locale = ?').get(where.slug_locale.slug, where.slug_locale.locale);
      const now = new Date().toISOString();
      if (existing) {
        const sets = [];
        const params = [];
        Object.keys(update).forEach(key => {
          sets.push(`${key} = ?`);
          params.push(update[key]);
        });
        sets.push('updatedAt = ?');
        params.push(now);
        params.push(existing.id);
        db.prepare(`UPDATE static_page_contents SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        return db.prepare('SELECT * FROM static_page_contents WHERE id = ?').get(existing.id);
      } else {
        const id = require('uuid').v4();
        db.prepare(`
          INSERT INTO static_page_contents (id, slug, locale, title, bodyMarkdown, lastEditedById, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, create.slug, create.locale || 'ar', create.title, create.bodyMarkdown, create.lastEditedById || null, now, now);
        return { id, ...create, createdAt: now, updatedAt: now };
      }
    },
  },
  
  // BlogPost operations
  blogPost: {
    findMany: ({ where, orderBy, take } = {}) => {
      let sql = 'SELECT * FROM blog_posts';
      const params = [];
      if (where) {
        if (where.isPublished !== undefined) {
          sql += ' WHERE isPublished = ?';
          params.push(where.isPublished ? 1 : 0);
        }
      }
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      if (take) sql += ` LIMIT ${take}`;
      return db.prepare(sql).all(...params);
    },
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(where.id);
      if (where.slug) return db.prepare('SELECT * FROM blog_posts WHERE slug = ?').get(where.slug);
      return null;
    },
    create: ({ data }) => {
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO blog_posts (id, slug, title, excerpt, bodyMarkdown, heroImageUrl, tags, authorId, isPublished, publishedAt, viewCount, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.slug, data.title, data.excerpt, data.bodyMarkdown, data.heroImageUrl || null, data.tags, data.authorId, data.isPublished ? 1 : 0, data.publishedAt || null, 0, now, now);
      return { id, ...data, createdAt: now, updatedAt: now };
    },
    update: ({ where, data }) => {
      const now = new Date().toISOString();
      const sets = [];
      const params = [];
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          sets.push(`${key} = ?`);
          params.push(typeof data[key] === 'boolean' ? (data[key] ? 1 : 0) : data[key]);
        }
      });
      sets.push('updatedAt = ?');
      params.push(now);
      params.push(where.id);
      db.prepare(`UPDATE blog_posts SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(where.id);
    },
    delete: ({ where }) => {
      const post = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM blog_posts WHERE id = ?').run(where.id);
      return post;
    },
  },
  
  // FAQ operations
  fAQ: {
    findMany: ({ where, orderBy } = {}) => {
      let sql = 'SELECT * FROM faqs';
      const conditions = [];
      const params = [];
      if (where) {
        if (where.category) {
          conditions.push('category = ?');
          params.push(where.category);
        }
        if (where.locale) {
          conditions.push('locale = ?');
          params.push(where.locale);
        }
        if (where.isPublished !== undefined) {
          conditions.push('isPublished = ?');
          params.push(where.isPublished ? 1 : 0);
        }
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      return db.prepare(sql).all(...params);
    },
    create: ({ data }) => {
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO faqs (id, category, locale, question, answer, sortOrder, isPublished, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.category, data.locale || 'ar', data.question, data.answer, data.sortOrder || 0, data.isPublished !== false ? 1 : 0, now, now);
      return { id, ...data, createdAt: now, updatedAt: now };
    },
    update: ({ where, data }) => {
      const now = new Date().toISOString();
      const sets = [];
      const params = [];
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          sets.push(`${key} = ?`);
          params.push(typeof data[key] === 'boolean' ? (data[key] ? 1 : 0) : data[key]);
        }
      });
      sets.push('updatedAt = ?');
      params.push(now);
      params.push(where.id);
      db.prepare(`UPDATE faqs SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM faqs WHERE id = ?').get(where.id);
    },
    delete: ({ where }) => {
      const faq = db.prepare('SELECT * FROM faqs WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM faqs WHERE id = ?').run(where.id);
      return faq;
    },
  },
  
  // AdminActivityLog operations
  adminActivityLog: {
    findMany: ({ where, orderBy, take } = {}) => {
      let sql = 'SELECT * FROM admin_activity_logs';
      const params = [];
      if (where && where.adminUserId) {
        sql += ' WHERE adminUserId = ?';
        params.push(where.adminUserId);
      }
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      if (take) sql += ` LIMIT ${take}`;
      return db.prepare(sql).all(...params);
    },
    create: ({ data }) => {
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO admin_activity_logs (id, adminUserId, actionType, targetType, targetId, detailsJson, ipAddress, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.adminUserId, data.actionType, data.targetType || null, data.targetId || null, data.detailsJson || null, data.ipAddress || null, now);
      return { id, ...data, createdAt: now };
    },
  },
  
  // SystemSetting operations
  systemSetting: {
    findMany: ({ where } = {}) => {
      let sql = 'SELECT * FROM system_settings';
      if (where && where.category) {
        sql += ' WHERE category = ?';
        return db.prepare(sql).all(where.category);
      }
      return db.prepare(sql).all();
    },
    findUnique: ({ where }) => {
      if (where.key) return db.prepare('SELECT * FROM system_settings WHERE key = ?').get(where.key);
      return null;
    },
    upsert: ({ where, update, create }) => {
      const existing = db.prepare('SELECT * FROM system_settings WHERE key = ?').get(where.key);
      const now = new Date().toISOString();
      if (existing) {
        db.prepare('UPDATE system_settings SET value = ?, updatedAt = ? WHERE key = ?').run(update.value, now, where.key);
        return db.prepare('SELECT * FROM system_settings WHERE key = ?').get(where.key);
      } else {
        const id = require('uuid').v4();
        db.prepare(`
          INSERT INTO system_settings (id, key, value, type, category, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, create.key, create.value, create.type || 'string', create.category || 'general', now, now);
        return { id, ...create, createdAt: now, updatedAt: now };
      }
    },
  },
  
  // FeatureFlag operations
  featureFlag: {
    findMany: () => db.prepare('SELECT * FROM feature_flags').all(),
    findUnique: ({ where }) => {
      if (where.key) return db.prepare('SELECT * FROM feature_flags WHERE key = ?').get(where.key);
      return null;
    },
    upsert: ({ where, update, create }) => {
      const existing = db.prepare('SELECT * FROM feature_flags WHERE key = ?').get(where.key);
      const now = new Date().toISOString();
      if (existing) {
        db.prepare('UPDATE feature_flags SET isEnabled = ?, updatedAt = ? WHERE key = ?').run(update.isEnabled ? 1 : 0, now, where.key);
        return db.prepare('SELECT * FROM feature_flags WHERE key = ?').get(where.key);
      } else {
        const id = require('uuid').v4();
        db.prepare(`
          INSERT INTO feature_flags (id, key, isEnabled, description, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, create.key, create.isEnabled ? 1 : 0, create.description || null, now, now);
        return { id, ...create, createdAt: now, updatedAt: now };
      }
    },
  },
  
  // AnalyticsDaily operations
  analyticsDaily: {
    findMany: ({ where, orderBy, take } = {}) => {
      let sql = 'SELECT * FROM analytics_daily';
      const params = [];
      if (where && where.date) {
        if (where.date.gte && where.date.lte) {
          sql += ' WHERE date >= ? AND date <= ?';
          params.push(where.date.gte, where.date.lte);
        }
      }
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      if (take) sql += ` LIMIT ${take}`;
      return db.prepare(sql).all(...params);
    },
    upsert: ({ where, update, create }) => {
      const existing = db.prepare('SELECT * FROM analytics_daily WHERE date = ?').get(where.date);
      const now = new Date().toISOString();
      if (existing) {
        const sets = [];
        const params = [];
        Object.keys(update).forEach(key => {
          if (key !== 'id' && key !== 'date') {
            sets.push(`${key} = ?`);
            params.push(update[key]);
          }
        });
        params.push(existing.id);
        db.prepare(`UPDATE analytics_daily SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        return db.prepare('SELECT * FROM analytics_daily WHERE id = ?').get(existing.id);
      } else {
        const id = require('uuid').v4();
        db.prepare(`
          INSERT INTO analytics_daily (id, date, pageViews, uniqueVisitors, calculations, adImpressions, adClicks, revenue, topPages, topCalculators, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, create.date, create.pageViews || 0, create.uniqueVisitors || 0, create.calculations || 0, create.adImpressions || 0, create.adClicks || 0, create.revenue || 0, create.topPages || null, create.topCalculators || null, now);
        return { id, ...create, createdAt: now };
      }
    },
  },
  
  // Utility functions
  $connect: async () => {
    // SQLite doesn't need explicit connection, just verify db exists
    return Promise.resolve();
  },
  $disconnect: () => {
    db.close();
  },
  $queryRaw: (sql, ...params) => {
    return db.prepare(sql).all(...params);
  },
};

module.exports = { prisma, db };