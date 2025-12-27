// Database client singleton for the server using better-sqlite3
// Prisma 7 requires ESM imports which are problematic in CJS context
// Using better-sqlite3 directly for simplicity

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Helper to get columns for a table to handle schema mismatches gracefully
const tableColumnsCache = {};
function getTableColumns(tableName) {
  if (tableColumnsCache[tableName]) return tableColumnsCache[tableName];
  try {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all().map(c => c.name);
    tableColumnsCache[tableName] = new Set(columns);
    return tableColumnsCache[tableName];
  } catch (e) {
    return new Set();
  }
}

// Helper to run queries with proper error handling
const prisma = {
  _db: db,
  
  // User operations
  user: {
    findUnique: ({ where }) => {
      let user = null;
      if (where.id) user = db.prepare('SELECT * FROM users WHERE id = ?').get(where.id);
      if (where.email) user = db.prepare('SELECT * FROM users WHERE email = ?').get(where.email);
      if (user) user.isActive = !!user.isActive;
      return user;
    },
    findFirst: ({ where }) => {
      let user = null;
      if (where.role) user = db.prepare('SELECT * FROM users WHERE role = ?').get(where.role);
      if (user) user.isActive = !!user.isActive;
      return user;
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
      return db.prepare(sql).all(...params).map(u => ({ ...u, isActive: !!u.isActive }));
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
      const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(where.id);
      if (updated) updated.isActive = !!updated.isActive;
      return updated;
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
      if (where.token) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(where.token);
        return;
      }
      if (where.id) {
        db.prepare('DELETE FROM sessions WHERE id = ?').run(where.id);
      }
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
          const gte = where.createdAt.gte instanceof Date ? where.createdAt.gte.toISOString() : where.createdAt.gte;
          params.push(gte);
        }
      }
      return db.prepare(sql).get(...params).count;
    },
    findMany: ({ where, orderBy, take } = {}) => {
      let sql = 'SELECT * FROM page_views';
      const params = [];
      if (where && where.createdAt && where.createdAt.gte) {
        sql += ' WHERE createdAt >= ?';
        const gte = where.createdAt.gte instanceof Date ? where.createdAt.gte.toISOString() : where.createdAt.gte;
        params.push(gte);
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
        const gte = where.createdAt.gte instanceof Date ? where.createdAt.gte.toISOString() : where.createdAt.gte;
        params.push(gte);
      }
      sql += ` GROUP BY ${field}`;
      if (orderBy && orderBy._count) {
        const dir = orderBy._count._all || orderBy._count[field] || 'DESC';
        sql += ` ORDER BY _count ${dir}`;
      }
      const results = db.prepare(sql).all(...params);
      
      if (_count) {
        return results.map(r => ({
          ...r,
          _count: { _all: r._count }
        }));
      }
      return results;
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
        const gte = where.createdAt.gte instanceof Date ? where.createdAt.gte.toISOString() : where.createdAt.gte;
        params.push(gte);
      }
      return db.prepare(sql).get(...params).count;
    },
    groupBy: ({ by, _count, where, orderBy }) => {
      const field = by[0];
      let sql = `SELECT ${field}, COUNT(*) as _count FROM calculation_events`;
      const params = [];
      if (where && where.createdAt && where.createdAt.gte) {
        sql += ' WHERE createdAt >= ?';
        const gte = where.createdAt.gte instanceof Date ? where.createdAt.gte.toISOString() : where.createdAt.gte;
        params.push(gte);
      }
      sql += ` GROUP BY ${field}`;
      if (orderBy && orderBy._count) {
        const dir = orderBy._count._all || orderBy._count[field] || 'DESC';
        sql += ` ORDER BY _count ${dir}`;
      }
      const results = db.prepare(sql).all(...params);
      
      if (_count) {
        return results.map(r => ({
          ...r,
          _count: { _all: r._count }
        }));
      }
      return results;
    },
  },
  
  // AdEvent operations
  adEvent: {
    create: ({ data }) => {
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO ad_events (id, adSlotId, eventType, sessionId, pagePath, country, device, locale, ipAddress, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, 
        data.adSlotId, 
        data.eventType, 
        data.sessionId, 
        data.pagePath, 
        data.country || null, 
        data.device || null, 
        data.locale || null, 
        data.ipAddress || null, 
        now
      );
      return { id, ...data, createdAt: now };
    },
    findMany: ({ where, include, orderBy } = {}) => {
      let sql = 'SELECT * FROM ad_events';
      const conditions = [];
      const params = [];
      
      if (where) {
        if (where.createdAt) {
          if (where.createdAt.gte) {
            conditions.push('createdAt >= ?');
            params.push(where.createdAt.gte instanceof Date ? where.createdAt.gte.toISOString() : where.createdAt.gte);
          }
          if (where.createdAt.lte) {
            conditions.push('createdAt <= ?');
            params.push(where.createdAt.lte instanceof Date ? where.createdAt.lte.toISOString() : where.createdAt.lte);
          }
        }
        if (where.eventType) {
          conditions.push('eventType = ?');
          params.push(where.eventType);
        }
      }
      
      if (conditions.length) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key].toUpperCase()}`;
      }
      
      const events = db.prepare(sql).all(...params);
      
      // Handle include: { adSlot: true }
      if (include && include.adSlot) {
        const slots = db.prepare('SELECT * FROM ad_slots').all();
        const slotMap = {};
        slots.forEach(s => slotMap[s.id] = s);
        
        return events.map(e => ({
          ...e,
          adSlot: slotMap[e.adSlotId] || null
        }));
      }
      
      return events;
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
          const gte = where.createdAt.gte instanceof Date ? where.createdAt.gte.toISOString() : where.createdAt.gte;
          params.push(gte);
        }
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      return db.prepare(sql).get(...params).count;
    },
    groupBy: ({ by, _count, where, orderBy }) => {
      const field = by[0];
      let sql = `SELECT ${field}, COUNT(*) as _count FROM ad_events`;
      const conditions = [];
      const params = [];
      if (where) {
        if (where.eventType) {
          conditions.push('eventType = ?');
          params.push(where.eventType);
        }
        if (where.createdAt && where.createdAt.gte) {
          conditions.push('createdAt >= ?');
          const gte = where.createdAt.gte instanceof Date ? where.createdAt.gte.toISOString() : where.createdAt.gte;
          params.push(gte);
        }
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ` GROUP BY ${field}`;
      if (orderBy && orderBy._count) {
        sql += ` ORDER BY _count ${orderBy._count[field]}`;
      }
      const results = db.prepare(sql).all(...params);
      
      // Transform to Prisma format if _count is requested
      if (_count) {
        return results.map(r => ({
          ...r,
          _count: { _all: r._count }
        }));
      }
      return results;
    },
  },
  
  // AdSlot operations
  adSlot: {
    findMany: ({ where } = {}) => {
      let sql = 'SELECT * FROM ad_slots';
      let results;
      if (where && where.isActive !== undefined) {
        sql += ' WHERE isActive = ?';
        results = db.prepare(sql).all(where.isActive ? 1 : 0);
      } else {
        results = db.prepare(sql).all();
      }
      return results.map(r => ({ ...r, isActive: !!r.isActive }));
    },
    findUnique: ({ where }) => {
      let result;
      if (where.id) result = db.prepare('SELECT * FROM ad_slots WHERE id = ?').get(where.id);
      else if (where.name) result = db.prepare('SELECT * FROM ad_slots WHERE name = ?').get(where.name);
      
      if (result) result.isActive = !!result.isActive;
      return result || null;
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
      const updated = db.prepare('SELECT * FROM ad_slots WHERE id = ?').get(where.id);
      if (updated) updated.isActive = !!updated.isActive;
      return updated;
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
          const gte = where.dateTime.gte instanceof Date ? where.dateTime.gte.toISOString() : where.dateTime.gte;
          const lte = where.dateTime.lte instanceof Date ? where.dateTime.lte.toISOString() : where.dateTime.lte;
          params.push(gte, lte);
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
          const gte = where.dateTime.gte instanceof Date ? where.dateTime.gte.toISOString() : where.dateTime.gte;
          const lte = where.dateTime.lte instanceof Date ? where.dateTime.lte.toISOString() : where.dateTime.lte;
          params.push(gte, lte);
        } else if (where.dateTime.gte) {
          sql += ' WHERE dateTime >= ?';
          const gte = where.dateTime.gte instanceof Date ? where.dateTime.gte.toISOString() : where.dateTime.gte;
          params.push(gte);
        }
      }
      const result = db.prepare(sql).get(...params);
      return { _sum: { revenueAmount: result.revenueAmount || 0 } };
    },
  },
  
  // SeoConfig operations
  seoConfig: {
    findMany: () => {
      const results = db.prepare('SELECT * FROM seo_configs').all();
      return results.map(r => ({ ...r, isIndexable: !!r.isIndexable }));
    },
    findUnique: ({ where }) => {
      let result;
      if (where.id) result = db.prepare('SELECT * FROM seo_configs WHERE id = ?').get(where.id);
      else if (where.pageKey_locale) {
        result = db.prepare('SELECT * FROM seo_configs WHERE pageKey = ? AND locale = ?').get(where.pageKey_locale.pageKey, where.pageKey_locale.locale);
      }
      
      if (result) result.isIndexable = !!result.isIndexable;
      return result || null;
    },
    findFirst: ({ where }) => {
      let result;
      if (where.pageKey && where.locale) {
        result = db.prepare('SELECT * FROM seo_configs WHERE pageKey = ? AND locale = ?').get(where.pageKey, where.locale);
      }
      
      if (result) result.isIndexable = !!result.isIndexable;
      return result || null;
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
        const updated = db.prepare('SELECT * FROM seo_configs WHERE id = ?').get(existing.id);
        if (updated) updated.isIndexable = !!updated.isIndexable;
        return updated;
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
    findMany: async ({ where, orderBy } = {}) => {
      let sql = 'SELECT * FROM static_page_contents';
      const params = [];
      const conditions = [];
      
      if (where) {
        if (where.locale) {
          conditions.push('locale = ?');
          params.push(where.locale);
        }
        if (where.deletedAt === null) {
          conditions.push('deletedAt IS NULL');
        }
        if (where.status) {
          conditions.push('status = ?');
          params.push(where.status);
        }
      }
      
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      
      return db.prepare(sql).all(...params);
    },
    count: async ({ where } = {}) => {
      let sql = 'SELECT COUNT(*) as count FROM static_page_contents';
      const params = [];
      const conditions = [];
      
      if (where) {
        if (where.locale) {
          conditions.push('locale = ?');
          params.push(where.locale);
        }
        if (where.deletedAt === null) {
          conditions.push('deletedAt IS NULL');
        }
      }
      
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      const result = db.prepare(sql).get(...params);
      return result ? result.count : 0;
    },
    findUnique: async ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM static_page_contents WHERE id = ?').get(where.id);
      if (where.slug_locale) {
        return db.prepare('SELECT * FROM static_page_contents WHERE slug = ? AND locale = ?').get(where.slug_locale.slug, where.slug_locale.locale);
      }
      return null;
    },
    findFirst: async ({ where }) => {
      if (where.slug && where.locale) {
        return db.prepare('SELECT * FROM static_page_contents WHERE slug = ? AND locale = ?').get(where.slug, where.locale);
      }
      return null;
    },
    upsert: async ({ where, update, create }) => {
      const slug = where.slug_locale?.slug || create.slug;
      const locale = where.slug_locale?.locale || create.locale || 'ar';
      const existing = db.prepare('SELECT * FROM static_page_contents WHERE slug = ? AND locale = ?').get(slug, locale);
      const now = new Date().toISOString();
      const columns = getTableColumns('static_page_contents');
      
      if (existing) {
        const sets = [];
        const params = [];
        Object.keys(update).forEach(key => {
          if (columns.has(key) && key !== 'id') {
            sets.push(`${key} = ?`);
            params.push(update[key]);
          }
        });
        sets.push('updatedAt = ?');
        params.push(now);
        params.push(existing.id);
        db.prepare(`UPDATE static_page_contents SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        return db.prepare('SELECT * FROM static_page_contents WHERE id = ?').get(existing.id);
      } else {
        const id = require('uuid').v4();
        const fields = ['id', 'createdAt', 'updatedAt'];
        const placeholders = ['?', '?', '?'];
        const params = [id, now, now];
        
        Object.keys(create).forEach(key => {
          if (columns.has(key) && key !== 'id') {
            fields.push(key);
            placeholders.push('?');
            params.push(create[key]);
          }
        });
        
        const sql = `INSERT INTO static_page_contents (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
        db.prepare(sql).run(...params);
        return { id, ...create, createdAt: now, updatedAt: now };
      }
    },
    update: async ({ where, data }) => {
      const now = new Date().toISOString();
      const columns = getTableColumns('static_page_contents');
      const sets = [];
      const params = [];
      
      Object.keys(data).forEach(key => {
        if (columns.has(key) && key !== 'id') {
          sets.push(`${key} = ?`);
          params.push(data[key]);
        }
      });
      
      sets.push('updatedAt = ?');
      params.push(now);
      params.push(where.id);
      
      db.prepare(`UPDATE static_page_contents SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM static_page_contents WHERE id = ?').get(where.id);
    }
  },

  // PageRegistry operations
  pageRegistry: {
    findMany: ({ where } = {}) => {
      let sql = 'SELECT * FROM page_registry';
      const params = [];
      if (where && where.isVisible !== undefined) {
        sql += ' WHERE isVisible = ?';
        params.push(where.isVisible ? 1 : 0);
      }
      const results = db.prepare(sql).all(...params);
      return results.map(r => ({ ...r, isVisible: !!r.isVisible }));
    },
    findUnique: ({ where }) => {
      let result;
      if (where.id) result = db.prepare('SELECT * FROM page_registry WHERE id = ?').get(where.id);
      else if (where.routeKey) result = db.prepare('SELECT * FROM page_registry WHERE routeKey = ?').get(where.routeKey);
      
      if (result) result.isVisible = !!result.isVisible;
      return result || null;
    },
    create: ({ data }) => {
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO page_registry (id, routeKey, path, nameAr, nameEn, isVisible, configJson, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.routeKey, data.path, data.nameAr, data.nameEn, data.isVisible !== false ? 1 : 0, data.configJson || null, now, now);
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
      db.prepare(`UPDATE page_registry SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      const updated = db.prepare('SELECT * FROM page_registry WHERE id = ?').get(where.id);
      if (updated) updated.isVisible = !!updated.isVisible;
      return updated;
    },
    delete: ({ where }) => {
      const item = db.prepare('SELECT * FROM page_registry WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM page_registry WHERE id = ?').run(where.id);
      return item;
    },
  },
  
  // BlogPost operations
  blogPost: {
    findMany: async ({ where, orderBy, skip, take } = {}) => {
      let sql = 'SELECT * FROM blog_posts';
      const params = [];
      const conditions = [];
      
      if (where) {
        if (where.isPublished !== undefined) {
          conditions.push('isPublished = ?');
          params.push(where.isPublished ? 1 : 0);
        }
        if (where.deletedAt === null) {
          conditions.push('deletedAt IS NULL');
        }
      }
      
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      
      if (take) sql += ` LIMIT ${take}`;
      if (skip) sql += ` OFFSET ${skip}`;
      
      const results = db.prepare(sql).all(...params);
      return results.map(r => ({ ...r, isPublished: !!r.isPublished }));
    },
    count: async ({ where } = {}) => {
      let sql = 'SELECT COUNT(*) as count FROM blog_posts';
      const params = [];
      const conditions = [];
      
      if (where) {
        if (where.isPublished !== undefined) {
          conditions.push('isPublished = ?');
          params.push(where.isPublished ? 1 : 0);
        }
        if (where.deletedAt === null) {
          conditions.push('deletedAt IS NULL');
        }
      }
      
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      
      const result = db.prepare(sql).get(...params);
      return result ? result.count : 0;
    },
    findUnique: async ({ where }) => {
      let result;
      if (where.id) result = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(where.id);
      else if (where.slug) result = db.prepare('SELECT * FROM blog_posts WHERE slug = ?').get(where.slug);
      
      if (result) result.isPublished = !!result.isPublished;
      return result || null;
    },
    create: async ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      const columns = getTableColumns('blog_posts');
      
      const fields = ['id', 'createdAt', 'updatedAt'];
      const placeholders = ['?', '?', '?'];
      const params = [id, now, now];
      
      Object.keys(data).forEach(key => {
        if (columns.has(key) && key !== 'id') {
          fields.push(key);
          placeholders.push('?');
          let val = data[key];
          if (typeof val === 'boolean') val = val ? 1 : 0;
          if (val instanceof Date) val = val.toISOString();
          params.push(val);
        }
      });
      
      const sql = `INSERT INTO blog_posts (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
      db.prepare(sql).run(...params);
      return { id, ...data, createdAt: now, updatedAt: now };
    },
    update: async ({ where, data }) => {
      const now = new Date().toISOString();
      const columns = getTableColumns('blog_posts');
      const sets = [];
      const params = [];
      
      Object.keys(data).forEach(key => {
        if (columns.has(key) && key !== 'id') {
          sets.push(`${key} = ?`);
          let val = data[key];
          if (typeof val === 'boolean') val = val ? 1 : 0;
          if (val instanceof Date) val = val.toISOString();
          params.push(val);
        }
      });
      
      sets.push('updatedAt = ?');
      params.push(now);
      params.push(where.id);
      
      db.prepare(`UPDATE blog_posts SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      const updated = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(where.id);
      if (updated) updated.isPublished = !!updated.isPublished;
      return updated;
    },
    delete: async ({ where }) => {
      const post = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM blog_posts WHERE id = ?').run(where.id);
      return post;
    },
  },
  
  // FAQ operations
  fAQ: {
    findMany: async ({ where, orderBy } = {}) => {
      let sql = 'SELECT * FROM faqs';
      const conditions = [];
      const params = [];
      if (where) {
        if (where.category) {
          conditions.push('category = ?');
          params.push(where.category);
        }
        if (where.scope) {
          conditions.push('scope = ?');
          params.push(where.scope);
        }
        if (where.locale) {
          conditions.push('locale = ?');
          params.push(where.locale);
        }
        if (where.isPublished !== undefined) {
          conditions.push('isPublished = ?');
          params.push(where.isPublished ? 1 : 0);
        }
        if (where.questionAr) {
          conditions.push('questionAr = ?');
          params.push(where.questionAr);
        }
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      const results = db.prepare(sql).all(...params);
      return results.map(r => ({ ...r, isPublished: !!r.isPublished }));
    },
    findFirst: async ({ where } = {}) => {
      let sql = 'SELECT * FROM faqs';
      const conditions = [];
      const params = [];
      if (where) {
        if (where.category) {
          conditions.push('category = ?');
          params.push(where.category);
        }
        if (where.questionAr) {
          conditions.push('questionAr = ?');
          params.push(where.questionAr);
        }
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' LIMIT 1';
      const result = db.prepare(sql).get(...params);
      if (result) result.isPublished = !!result.isPublished;
      return result || null;
    },
    count: async ({ where } = {}) => {
      let sql = 'SELECT COUNT(*) as count FROM faqs';
      const conditions = [];
      const params = [];
      if (where) {
        if (where.category) {
          conditions.push('category = ?');
          params.push(where.category);
        }
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      const res = db.prepare(sql).get(...params);
      return res ? res.count : 0;
    },
    create: async ({ data }) => {
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO faqs (id, category, locale, question, answer, questionAr, questionEn, answerAr, answerEn, sortOrder, isPublished, scope, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, 
        data.category, 
        data.locale || 'ar', 
        data.question || data.questionAr || '', 
        data.answer || data.answerAr || '', 
        data.questionAr || '', 
        data.questionEn || '', 
        data.answerAr || '', 
        data.answerEn || '', 
        data.sortOrder || 0, 
        data.isPublished !== false ? 1 : 0, 
        data.scope || 'global',
        now, 
        now
      );
      return { id, ...data, createdAt: now, updatedAt: now };
    },
    update: async ({ where, data }) => {
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
      const updated = db.prepare('SELECT * FROM faqs WHERE id = ?').get(where.id);
      if (updated) updated.isPublished = !!updated.isPublished;
      return updated;
    },
    delete: async ({ where }) => {
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
    findMany: ({ include } = {}) => {
      const flags = db.prepare('SELECT * FROM feature_flags').all();
      if (include && include.rules) {
        flags.forEach(flag => {
          flag.rules = db.prepare('SELECT * FROM feature_flag_rules WHERE flagId = ?').all(flag.id);
        });
      }
      return flags;
    },
    findUnique: ({ where, include }) => {
      let flag;
      if (where.key) flag = db.prepare('SELECT * FROM feature_flags WHERE key = ?').get(where.key);
      else if (where.id) flag = db.prepare('SELECT * FROM feature_flags WHERE id = ?').get(where.id);
      
      if (flag && include && include.rules) {
        flag.rules = db.prepare('SELECT * FROM feature_flag_rules WHERE flagId = ?').all(flag.id);
      }
      return flag;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO feature_flags (id, key, name, description, enabledByDefault, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.key, data.name, data.description || null, data.enabledByDefault ? 1 : 0, now, now);
      return { id, ...data, createdAt: now, updatedAt: now };
    },
    update: ({ where, data }) => {
      const now = new Date().toISOString();
      const sets = [];
      const params = [];
      Object.keys(data).forEach(key => {
        if (key !== 'id' && key !== 'rules') {
          sets.push(`${key} = ?`);
          params.push(data[key] === true ? 1 : (data[key] === false ? 0 : data[key]));
        }
      });
      sets.push('updatedAt = ?');
      params.push(now);
      
      let sql = `UPDATE feature_flags SET ${sets.join(', ')} WHERE `;
      if (where.id) {
        sql += 'id = ?';
        params.push(where.id);
      } else {
        sql += 'key = ?';
        params.push(where.key);
      }
      
      db.prepare(sql).run(...params);
      return prisma.featureFlag.findUnique({ where });
    },
    delete: ({ where }) => {
      const flag = prisma.featureFlag.findUnique({ where });
      if (flag) {
        db.prepare('DELETE FROM feature_flags WHERE id = ?').run(flag.id);
      }
      return flag;
    }
  },

  // FeatureFlagRule operations
  featureFlagRule: {
    findMany: ({ where } = {}) => {
      let sql = 'SELECT * FROM feature_flag_rules';
      const params = [];
      if (where) {
        const conditions = [];
        if (where.flagId) { conditions.push('flagId = ?'); params.push(where.flagId); }
        if (where.environment) { conditions.push('environment = ?'); params.push(where.environment); }
        if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      }
      return db.prepare(sql).all(...params);
    },
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM feature_flag_rules WHERE id = ?').get(where.id);
      if (where.flagId_environment) {
        return db.prepare('SELECT * FROM feature_flag_rules WHERE flagId = ? AND environment = ?')
          .get(where.flagId_environment.flagId, where.flagId_environment.environment);
      }
      return null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO feature_flag_rules (id, flagId, environment, enabled, rolloutPercentage, targetingJson, dependenciesJson, createdById, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, 
        data.flagId, 
        data.environment, 
        data.enabled ? 1 : 0, 
        data.rolloutPercentage || 0, 
        data.targetingJson || null, 
        data.dependenciesJson || null, 
        data.createdById || null, 
        now, 
        now
      );
      return { id, ...data, createdAt: now, updatedAt: now };
    },
    update: ({ where, data }) => {
      const now = new Date().toISOString();
      const sets = [];
      const params = [];
      Object.keys(data).forEach(key => {
        if (key !== 'id' && key !== 'flagId' && key !== 'environment') {
          sets.push(`${key} = ?`);
          params.push(data[key] === true ? 1 : (data[key] === false ? 0 : data[key]));
        }
      });
      sets.push('updatedAt = ?');
      params.push(now);
      params.push(where.id);
      db.prepare(`UPDATE feature_flag_rules SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM feature_flag_rules WHERE id = ?').get(where.id);
    },
    delete: ({ where }) => {
      const rule = db.prepare('SELECT * FROM feature_flag_rules WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM feature_flag_rules WHERE id = ?').run(where.id);
      return rule;
    }
  },

  // AnalyticsEvent operations
  analyticsEvent: {
    findMany: ({ include } = {}) => {
      const events = db.prepare('SELECT * FROM analytics_events').all();
      if (include && include.properties) {
        events.forEach(event => {
          event.properties = db.prepare('SELECT * FROM analytics_event_properties WHERE eventId = ?').all(event.id);
        });
      }
      return events;
    },
    findUnique: ({ where, include }) => {
      let event;
      if (where.id) event = db.prepare('SELECT * FROM analytics_events WHERE id = ?').get(where.id);
      else if (where.key) event = db.prepare('SELECT * FROM analytics_events WHERE key = ?').get(where.key);
      
      if (event && include && include.properties) {
        event.properties = db.prepare('SELECT * FROM analytics_event_properties WHERE eventId = ?').all(event.id);
      }
      return event;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO analytics_events (id, key, name, description, category, enabled, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.key, data.name, data.description || null, data.category || 'general', data.enabled !== false ? 1 : 0, now, now);
      return { id, ...data, createdAt: now, updatedAt: now };
    },
    update: ({ where, data }) => {
      const now = new Date().toISOString();
      const sets = [];
      const params = [];
      Object.keys(data).forEach(key => {
        if (key !== 'id' && key !== 'properties') {
          sets.push(`${key} = ?`);
          params.push(data[key] === true ? 1 : (data[key] === false ? 0 : data[key]));
        }
      });
      sets.push('updatedAt = ?');
      params.push(now);
      params.push(where.id);
      db.prepare(`UPDATE analytics_events SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return prisma.analyticsEvent.findUnique({ where });
    },
    delete: ({ where }) => {
      const event = prisma.analyticsEvent.findUnique({ where });
      if (event) db.prepare('DELETE FROM analytics_events WHERE id = ?').run(event.id);
      return event;
    }
  },

  // AnalyticsEventProperty operations
  analyticsEventProperty: {
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO analytics_event_properties (id, eventId, key, type, required, exampleValue, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.eventId, data.key, data.type || 'string', data.required ? 1 : 0, data.exampleValue || null, now, now);
      return { id, ...data, createdAt: now, updatedAt: now };
    },
    delete: ({ where }) => {
      const prop = db.prepare('SELECT * FROM analytics_event_properties WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM analytics_event_properties WHERE id = ?').run(where.id);
      return prop;
    }
  },

  // AnalyticsProvider operations
  analyticsProvider: {
    findMany: () => db.prepare('SELECT * FROM analytics_providers').all(),
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM analytics_providers WHERE id = ?').get(where.id);
      if (where.key) return db.prepare('SELECT * FROM analytics_providers WHERE key = ?').get(where.key);
      return null;
    },
    upsert: ({ where, update, create }) => {
      const existing = db.prepare('SELECT * FROM analytics_providers WHERE key = ?').get(where.key);
      const now = new Date().toISOString();
      if (existing) {
        db.prepare('UPDATE analytics_providers SET enabled = ?, settingsJson = ?, updatedAt = ? WHERE key = ?')
          .run(update.enabled ? 1 : 0, update.settingsJson || null, now, where.key);
        return db.prepare('SELECT * FROM analytics_providers WHERE key = ?').get(where.key);
      } else {
        const id = require('uuid').v4();
        db.prepare(`
          INSERT INTO analytics_providers (id, key, enabled, settingsJson, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, create.key, create.enabled ? 1 : 0, create.settingsJson || null, now, now);
        return { id, ...create, createdAt: now, updatedAt: now };
      }
    }
  },

  // Funnel operations
  funnel: {
    findMany: () => db.prepare('SELECT * FROM funnels').all(),
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM funnels WHERE id = ?').get(where.id);
      if (where.key) return db.prepare('SELECT * FROM funnels WHERE key = ?').get(where.key);
      return null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO funnels (id, key, name, stepsJson, scope, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.key, data.name, data.stepsJson, data.scope || 'site', now, now);
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
      db.prepare(`UPDATE funnels SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM funnels WHERE id = ?').get(where.id);
    },
    delete: ({ where }) => {
      const funnel = db.prepare('SELECT * FROM funnels WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM funnels WHERE id = ?').run(where.id);
      return funnel;
    }
  },

  // Cohort operations
  cohort: {
    findMany: () => db.prepare('SELECT * FROM cohorts').all(),
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM cohorts WHERE id = ?').get(where.id);
      if (where.key) return db.prepare('SELECT * FROM cohorts WHERE key = ?').get(where.key);
      return null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO cohorts (id, key, name, ruleJson, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, data.key, data.name, data.ruleJson, now, now);
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
      db.prepare(`UPDATE cohorts SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM cohorts WHERE id = ?').get(where.id);
    },
    delete: ({ where }) => {
      const cohort = db.prepare('SELECT * FROM cohorts WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM cohorts WHERE id = ?').run(where.id);
      return cohort;
    }
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

  // AdSlot operations
  adSlot: {
    findMany: () => db.prepare('SELECT * FROM ad_slots').all(),
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM ad_slots WHERE id = ?').get(where.id);
      if (where.key) return db.prepare('SELECT * FROM ad_slots WHERE key = ?').get(where.key);
      return null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO ad_slots (id, key, name, pageRoute, pageType, placement, responsiveRulesJson, enabled, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.key, data.name, data.pageRoute || null, data.pageType || null, data.placement, data.responsiveRulesJson || null, data.enabled !== false ? 1 : 0, now, now);
      return { id, ...data, createdAt: now, updatedAt: now };
    },
    update: ({ where, data }) => {
      const now = new Date().toISOString();
      const sets = [];
      const params = [];
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          sets.push(`${key} = ?`);
          params.push(data[key] === true ? 1 : (data[key] === false ? 0 : data[key]));
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
    }
  },

  // AdProfile operations
  adProfile: {
    findMany: () => db.prepare('SELECT * FROM ad_profiles').all(),
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM ad_profiles WHERE id = ?').get(where.id);
      if (where.name) return db.prepare('SELECT * FROM ad_profiles WHERE name = ?').get(where.name);
      return null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO ad_profiles (id, name, slotsOrderJson, policiesJson, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, data.name, data.slotsOrderJson || null, data.policiesJson || null, now, now);
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
      db.prepare(`UPDATE ad_profiles SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM ad_profiles WHERE id = ?').get(where.id);
    },
    delete: ({ where }) => {
      const profile = db.prepare('SELECT * FROM ad_profiles WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM ad_profiles WHERE id = ?').run(where.id);
      return profile;
    }
  },

  // Experiment operations
  experiment: {
    findMany: () => db.prepare('SELECT * FROM experiments').all(),
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM experiments WHERE id = ?').get(where.id);
      if (where.key) return db.prepare('SELECT * FROM experiments WHERE key = ?').get(where.key);
      return null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO experiments (id, key, name, status, allocationJson, targetingJson, startAt, endAt, primaryMetric, variantsJson, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.key, data.name, data.status || 'draft', data.allocationJson || null, data.targetingJson || null, data.startAt || null, data.endAt || null, data.primaryMetric || null, data.variantsJson || null, now, now);
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
      db.prepare(`UPDATE experiments SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM experiments WHERE id = ?').get(where.id);
    },
    delete: ({ where }) => {
      const exp = db.prepare('SELECT * FROM experiments WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM experiments WHERE id = ?').run(where.id);
      return exp;
    }
  },

  // Redirect operations
  redirect: {
    findMany: () => db.prepare('SELECT * FROM redirects').all(),
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM redirects WHERE id = ?').get(where.id);
      if (where.fromPath) return db.prepare('SELECT * FROM redirects WHERE fromPath = ?').get(where.fromPath);
      return null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO redirects (id, fromPath, toPath, type, enabled, hitCount, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.fromPath, data.toPath, data.type || 301, data.enabled !== false ? 1 : 0, 0, now, now);
      return { id, ...data, hitCount: 0, createdAt: now, updatedAt: now };
    },
    update: ({ where, data }) => {
      const now = new Date().toISOString();
      const sets = [];
      const params = [];
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          sets.push(`${key} = ?`);
          params.push(data[key] === true ? 1 : (data[key] === false ? 0 : data[key]));
        }
      });
      sets.push('updatedAt = ?');
      params.push(now);
      params.push(where.id);
      db.prepare(`UPDATE redirects SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM redirects WHERE id = ?').get(where.id);
    },
    delete: ({ where }) => {
      const r = db.prepare('SELECT * FROM redirects WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM redirects WHERE id = ?').run(where.id);
      return r;
    }
  },

  // BrokenLink operations
  brokenLink: {
    findMany: ({ where } = {}) => {
      let sql = 'SELECT * FROM broken_links';
      const params = [];
      if (where && where.isFixed !== undefined) {
        sql += ' WHERE isFixed = ?';
        params.push(where.isFixed ? 1 : 0);
      }
      return db.prepare(sql).all(...params);
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO broken_links (id, url, sourceUrl, statusCode, errorMessage, lastChecked, isFixed, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.url, data.sourceUrl, data.statusCode || null, data.errorMessage || null, now, 0, now);
      return { id, ...data, isFixed: false, lastChecked: now, createdAt: now };
    },
    update: ({ where, data }) => {
      const sets = [];
      const params = [];
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          sets.push(`${key} = ?`);
          params.push(data[key] === true ? 1 : (data[key] === false ? 0 : data[key]));
        }
      });
      params.push(where.id);
      db.prepare(`UPDATE broken_links SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM broken_links WHERE id = ?').get(where.id);
    }
  },

  // SeoGlobalSetting operations
  seoGlobalSetting: {
    findMany: () => db.prepare('SELECT * FROM seo_global_settings').all(),
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM seo_global_settings WHERE id = ?').get(where.id);
      if (where.key) return db.prepare('SELECT * FROM seo_global_settings WHERE key = ?').get(where.key);
      return null;
    },
    upsert: ({ where, update, create }) => {
      const existing = db.prepare('SELECT * FROM seo_global_settings WHERE key = ?').get(where.key);
      const now = new Date().toISOString();
      if (existing) {
        db.prepare('UPDATE seo_global_settings SET value = ?, updatedAt = ? WHERE key = ?')
          .run(update.value, now, where.key);
        return db.prepare('SELECT * FROM seo_global_settings WHERE key = ?').get(where.key);
      } else {
        const id = require('uuid').v4();
        db.prepare(`
          INSERT INTO seo_global_settings (id, key, value, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, create.key, create.value, now, now);
        return { id, ...create, createdAt: now, updatedAt: now };
      }
    }
  },

  // SchemaTemplate operations
  schemaTemplate: {
    findMany: () => db.prepare('SELECT * FROM schema_templates').all(),
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM schema_templates WHERE id = ?').get(where.id);
      if (where.name) return db.prepare('SELECT * FROM schema_templates WHERE name = ?').get(where.name);
      return null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO schema_templates (id, name, template, description, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, data.name, data.template, data.description || null, now, now);
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
      db.prepare(`UPDATE schema_templates SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM schema_templates WHERE id = ?').get(where.id);
    }
  },

  // AI Management Suite
  aiPromptTemplate: {
    findMany: () => db.prepare('SELECT * FROM ai_prompt_templates').all(),
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM ai_prompt_templates WHERE id = ?').get(where.id);
      if (where.key) return db.prepare('SELECT * FROM ai_prompt_templates WHERE key = ?').get(where.key);
      return null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO ai_prompt_templates (id, key, name, purpose, activeVersionId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.key, data.name, data.purpose || null, data.activeVersionId || null, now, now);
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
      db.prepare(`UPDATE ai_prompt_templates SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM ai_prompt_templates WHERE id = ?').get(where.id);
    },
    delete: ({ where }) => {
      const template = db.prepare('SELECT * FROM ai_prompt_templates WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM ai_prompt_templates WHERE id = ?').run(where.id);
      return template;
    }
  },

  aiPromptVersion: {
    findMany: ({ where } = {}) => {
      let sql = 'SELECT * FROM ai_prompt_versions';
      const params = [];
      if (where && where.templateId) {
        sql += ' WHERE templateId = ?';
        params.push(where.templateId);
      }
      sql += ' ORDER BY versionNumber DESC';
      return db.prepare(sql).all(...params);
    },
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM ai_prompt_versions WHERE id = ?').get(where.id);
      if (where.templateId && where.versionNumber) {
        return db.prepare('SELECT * FROM ai_prompt_versions WHERE templateId = ? AND versionNumber = ?').get(where.templateId, where.versionNumber);
      }
      return null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO ai_prompt_versions (id, templateId, versionNumber, modelPreferencesJson, promptText, createdById, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.templateId, data.versionNumber, data.modelPreferencesJson || null, data.promptText, data.createdById || null, now);
      return { id, ...data, createdAt: now };
    },
    delete: ({ where }) => {
      const version = db.prepare('SELECT * FROM ai_prompt_versions WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM ai_prompt_versions WHERE id = ?').run(where.id);
      return version;
    }
  },

  aiUsageLog: {
    findMany: ({ where, orderBy, take } = {}) => {
      let sql = 'SELECT * FROM ai_usage_logs';
      const params = [];
      if (where) {
        const conditions = [];
        if (where.featureKey) {
          conditions.push('featureKey = ?');
          params.push(where.featureKey);
        }
        if (where.provider) {
          conditions.push('provider = ?');
          params.push(where.provider);
        }
        if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      }
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      } else {
        sql += ' ORDER BY createdAt DESC';
      }
      if (take) sql += ` LIMIT ${take}`;
      return db.prepare(sql).all(...params);
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO ai_usage_logs (id, provider, model, featureKey, tokensIn, tokensOut, latencyMs, estimatedCost, userId, status, errorCode, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, 
        data.provider, 
        data.model, 
        data.featureKey, 
        data.tokensIn || 0, 
        data.tokensOut || 0, 
        data.latencyMs || 0, 
        data.estimatedCost || 0, 
        data.userId || null, 
        data.status || 'success', 
        data.errorCode || null, 
        now
      );
      return { id, ...data, createdAt: now };
    },
    count: ({ where } = {}) => {
      let sql = 'SELECT COUNT(*) as count FROM ai_usage_logs';
      const params = [];
      if (where && where.featureKey) {
        sql += ' WHERE featureKey = ?';
        params.push(where.featureKey);
      }
      return db.prepare(sql).get(...params).count;
    }
  },

  aiFallbackRule: {
    findMany: () => db.prepare('SELECT * FROM ai_fallback_rules').all(),
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM ai_fallback_rules WHERE id = ?').get(where.id);
      if (where.featureKey) return db.prepare('SELECT * FROM ai_fallback_rules WHERE featureKey = ?').get(where.featureKey);
      return null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO ai_fallback_rules (id, featureKey, primaryProvider, fallbackChainJson, timeoutMs, maxRetries, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.featureKey, data.primaryProvider, data.fallbackChainJson, data.timeoutMs || 10000, data.maxRetries || 2, now, now);
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
      db.prepare(`UPDATE ai_fallback_rules SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM ai_fallback_rules WHERE id = ?').get(where.id);
    },
    delete: ({ where }) => {
      const rule = db.prepare('SELECT * FROM ai_fallback_rules WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM ai_fallback_rules WHERE id = ?').run(where.id);
      return rule;
    }
  },

  // ============================================
  // CMS: Tool Cards
  // ============================================
  toolCard: {
    findMany: ({ where, orderBy } = {}) => {
      let sql = 'SELECT * FROM tool_cards';
      const conditions = [];
      const params = [];
      if (where) {
        if (where.isPublished !== undefined) {
          conditions.push('isPublished = ?');
          params.push(where.isPublished ? 1 : 0);
        }
        if (where.isFeaturedOnHome !== undefined) {
          conditions.push('isFeaturedOnHome = ?');
          params.push(where.isFeaturedOnHome ? 1 : 0);
        }
        if (where.isVisibleOnTools !== undefined) {
          conditions.push('isVisibleOnTools = ?');
          params.push(where.isVisibleOnTools ? 1 : 0);
        }
        if (where.slug) {
          conditions.push('slug = ?');
          params.push(where.slug);
        }
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      return db.prepare(sql).all(...params).map(t => ({
        ...t,
        isFeaturedOnHome: !!t.isFeaturedOnHome,
        isVisibleOnTools: !!t.isVisibleOnTools,
        isPublished: !!t.isPublished
      }));
    },
    findUnique: ({ where }) => {
      let card = null;
      if (where.id) card = db.prepare('SELECT * FROM tool_cards WHERE id = ?').get(where.id);
      if (where.slug) card = db.prepare('SELECT * FROM tool_cards WHERE slug = ?').get(where.slug);
      if (card) {
        card.isFeaturedOnHome = !!card.isFeaturedOnHome;
        card.isVisibleOnTools = !!card.isVisibleOnTools;
        card.isPublished = !!card.isPublished;
      }
      return card;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO tool_cards (id, slug, titleAr, titleEn, descAr, descEn, icon, color, sortOrder, isFeaturedOnHome, isVisibleOnTools, isPublished, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.slug,
        data.titleAr,
        data.titleEn,
        data.descAr || '',
        data.descEn || '',
        data.icon || '🔧',
        data.color || 'from-blue-500 to-indigo-600',
        data.sortOrder || 0,
        data.isFeaturedOnHome === undefined ? 1 : (data.isFeaturedOnHome ? 1 : 0),
        data.isVisibleOnTools === undefined ? 1 : (data.isVisibleOnTools ? 1 : 0),
        data.isPublished === undefined ? 1 : (data.isPublished ? 1 : 0),
        now,
        now
      );
      const created = db.prepare('SELECT * FROM tool_cards WHERE id = ?').get(id);
      if (created) {
        created.isFeaturedOnHome = !!created.isFeaturedOnHome;
        created.isVisibleOnTools = !!created.isVisibleOnTools;
        created.isPublished = !!created.isPublished;
      }
      return created;
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
      db.prepare(`UPDATE tool_cards SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      const updated = db.prepare('SELECT * FROM tool_cards WHERE id = ?').get(where.id);
      if (updated) {
        updated.isFeaturedOnHome = !!updated.isFeaturedOnHome;
        updated.isVisibleOnTools = !!updated.isVisibleOnTools;
        updated.isPublished = !!updated.isPublished;
      }
      return updated;
    },
    delete: ({ where }) => {
      const existing = db.prepare('SELECT * FROM tool_cards WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM tool_cards WHERE id = ?').run(where.id);
      return existing;
    },
    upsert: ({ where, update, create }) => {
      const existing = where.id
        ? db.prepare('SELECT * FROM tool_cards WHERE id = ?').get(where.id)
        : (where.slug ? db.prepare('SELECT * FROM tool_cards WHERE slug = ?').get(where.slug) : null);
      if (existing) {
        return prisma.toolCard.update({ where: { id: existing.id }, data: update });
      }
      return prisma.toolCard.create({ data: create });
    },
  },

  // ============================================
  // CMS: Benefit Features
  // ============================================
  benefitFeature: {
    findMany: ({ where, orderBy } = {}) => {
      let sql = 'SELECT * FROM benefit_features';
      const conditions = [];
      const params = [];
      if (where && where.isPublished !== undefined) {
        conditions.push('isPublished = ?');
        params.push(where.isPublished ? 1 : 0);
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      return db.prepare(sql).all(...params).map(f => ({ ...f, isPublished: !!f.isPublished }));
    },
    count: ({ where } = {}) => {
      let sql = 'SELECT COUNT(*) as count FROM benefit_features';
      const params = [];
      if (where && where.isPublished !== undefined) {
        sql += ' WHERE isPublished = ?';
        params.push(where.isPublished ? 1 : 0);
      }
      return db.prepare(sql).get(...params).count;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO benefit_features (id, titleAr, titleEn, descAr, descEn, icon, sortOrder, isPublished, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.titleAr,
        data.titleEn,
        data.descAr || '',
        data.descEn || '',
        data.icon || '✓',
        data.sortOrder || 0,
        data.isPublished === undefined ? 1 : (data.isPublished ? 1 : 0),
        now,
        now
      );
      const created = db.prepare('SELECT * FROM benefit_features WHERE id = ?').get(id);
      if (created) created.isPublished = !!created.isPublished;
      return created;
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
      db.prepare(`UPDATE benefit_features SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      const updated = db.prepare('SELECT * FROM benefit_features WHERE id = ?').get(where.id);
      if (updated) updated.isPublished = !!updated.isPublished;
      return updated;
    },
    delete: ({ where }) => {
      const existing = db.prepare('SELECT * FROM benefit_features WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM benefit_features WHERE id = ?').run(where.id);
      return existing;
    },
  },

  // ============================================
  // Admin: AI Integrations
  // ============================================
  aIIntegration: {
    findMany: () => db.prepare('SELECT * FROM ai_integrations').all().map(r => ({ ...r, isEnabled: !!r.isEnabled })),
    findFirst: ({ where } = {}) => {
      let sql = 'SELECT * FROM ai_integrations';
      const conditions = [];
      const params = [];
      if (where) {
        if (where.provider) {
          conditions.push('provider = ?');
          params.push(where.provider);
        }
        if (where.isEnabled !== undefined) {
          conditions.push('isEnabled = ?');
          params.push(where.isEnabled ? 1 : 0);
        }
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' LIMIT 1';
      const res = db.prepare(sql).get(...params);
      if (res) res.isEnabled = !!res.isEnabled;
      return res;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO ai_integrations (id, provider, isEnabled, apiKey, model, features, quota, used, lastReset, config, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.provider,
        data.isEnabled ? 1 : 0,
        data.apiKey || null,
        data.model || null,
        data.features || '[]',
        data.quota || 0,
        data.used || 0,
        data.lastReset || now,
        data.config || null,
        now,
        now
      );
      const created = db.prepare('SELECT * FROM ai_integrations WHERE id = ?').get(id);
      if (created) created.isEnabled = !!created.isEnabled;
      return created;
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
      db.prepare(`UPDATE ai_integrations SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      const updated = db.prepare('SELECT * FROM ai_integrations WHERE id = ?').get(where.id);
      if (updated) updated.isEnabled = !!updated.isEnabled;
      return updated;
    },
  },

  // ============================================
  // Admin: Maintenance Mode
  // ============================================
  maintenanceMode: {
    findFirst: () => {
      const res = db.prepare('SELECT * FROM maintenance_mode ORDER BY createdAt ASC LIMIT 1').get();
      if (res) res.isEnabled = !!res.isEnabled;
      return res;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO maintenance_mode (id, isEnabled, title, messageAr, messageEn, startTime, endTime, allowedIPs, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.isEnabled ? 1 : 0,
        data.title,
        data.messageAr,
        data.messageEn,
        data.startTime || null,
        data.endTime || null,
        data.allowedIPs || null,
        now,
        now
      );
      const created = db.prepare('SELECT * FROM maintenance_mode WHERE id = ?').get(id);
      if (created) created.isEnabled = !!created.isEnabled;
      return created;
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
      db.prepare(`UPDATE maintenance_mode SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      const updated = db.prepare('SELECT * FROM maintenance_mode WHERE id = ?').get(where.id);
      if (updated) updated.isEnabled = !!updated.isEnabled;
      return updated;
    },
  },

  // ============================================
  // Admin: Revenue Goals
  // ============================================
  revenueGoal: {
    findMany: ({ where, orderBy, take } = {}) => {
      let sql = 'SELECT * FROM revenue_goals';
      const conditions = [];
      const params = [];
      if (where) {
        if (where.year !== undefined) {
          conditions.push('year = ?');
          params.push(where.year);
        }
        if (where.month !== undefined) {
          conditions.push('month = ?');
          params.push(where.month);
        }
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      if (orderBy) {
        const keys = Array.isArray(orderBy) ? orderBy : [orderBy];
        const clauses = keys.map(ob => {
          const k = Object.keys(ob)[0];
          return `${k} ${ob[k]}`;
        });
        sql += ` ORDER BY ${clauses.join(', ')}`;
      }
      if (take) sql += ` LIMIT ${take}`;
      return db.prepare(sql).all(...params);
    },
    upsert: ({ where, update, create }) => {
      const year = where.year_month?.year;
      const month = where.year_month?.month;
      const existing = db.prepare('SELECT * FROM revenue_goals WHERE year = ? AND month = ?').get(year, month);
      const now = new Date().toISOString();
      if (existing) {
        const sets = [];
        const params = [];
        Object.keys(update).forEach(key => {
          if (key !== 'id') {
            sets.push(`${key} = ?`);
            params.push(update[key]);
          }
        });
        sets.push('updatedAt = ?');
        params.push(now);
        params.push(existing.id);
        db.prepare(`UPDATE revenue_goals SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        return db.prepare('SELECT * FROM revenue_goals WHERE id = ?').get(existing.id);
      }
      const id = create.id || require('uuid').v4();
      db.prepare(`
        INSERT INTO revenue_goals (id, year, month, targetRevenue, targetPageviews, targetRPM, actualRevenue, actualPageviews, actualRPM, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        create.year,
        create.month,
        create.targetRevenue || 0,
        create.targetPageviews || 0,
        create.targetRPM || 0,
        create.actualRevenue || 0,
        create.actualPageviews || 0,
        create.actualRPM || 0,
        create.notes || null,
        now,
        now
      );
      return db.prepare('SELECT * FROM revenue_goals WHERE id = ?').get(id);
    },
  },

  // ============================================
  // Admin: Revenue Projections
  // ============================================
  revenueProjection: {
    findMany: ({ where, orderBy, take } = {}) => {
      let sql = 'SELECT * FROM revenue_projections';
      const conditions = [];
      const params = [];
      if (where && where.projectionDate && where.projectionDate.gte) {
        conditions.push('projectionDate >= ?');
        params.push(where.projectionDate.gte instanceof Date ? where.projectionDate.gte.toISOString() : where.projectionDate.gte);
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      if (take) sql += ` LIMIT ${take}`;
      return db.prepare(sql).all(...params);
    },
    upsert: ({ where, update, create }) => {
      const projectionDate = where.projectionDate instanceof Date ? where.projectionDate.toISOString() : where.projectionDate;
      const existing = db.prepare('SELECT * FROM revenue_projections WHERE projectionDate = ?').get(projectionDate);
      const now = new Date().toISOString();
      if (existing) {
        const sets = [];
        const params = [];
        Object.keys(update).forEach(key => {
          if (key !== 'id' && key !== 'projectionDate') {
            sets.push(`${key} = ?`);
            params.push(update[key]);
          }
        });
        sets.push('updatedAt = ?');
        params.push(now);
        params.push(existing.id);
        db.prepare(`UPDATE revenue_projections SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        return db.prepare('SELECT * FROM revenue_projections WHERE id = ?').get(existing.id);
      }
      const id = create.id || require('uuid').v4();
      db.prepare(`
        INSERT INTO revenue_projections (id, projectionDate, projectedRevenue, confidence, basedOnDays, growthRate, seasonalFactor, assumptions, actualRevenue, accuracy, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        create.projectionDate instanceof Date ? create.projectionDate.toISOString() : create.projectionDate,
        create.projectedRevenue,
        create.confidence || 'MEDIUM',
        create.basedOnDays,
        create.growthRate,
        create.seasonalFactor === undefined ? 1.0 : create.seasonalFactor,
        create.assumptions,
        create.actualRevenue || null,
        create.accuracy || null,
        now,
        now
      );
      return db.prepare('SELECT * FROM revenue_projections WHERE id = ?').get(id);
    },
  },

  // ============================================
  // Monetization: Revenue Models (used by monetization routes)
  // ============================================
  revenueModel: {
    findMany: ({ where, orderBy, take } = {}) => {
      let sql = 'SELECT * FROM revenue_models';
      const conditions = [];
      const params = [];
      if (where && where.isActive !== undefined) {
        conditions.push('isActive = ?');
        params.push(where.isActive ? 1 : 0);
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      if (take) sql += ` LIMIT ${take}`;
      const results = db.prepare(sql).all(...params);
      return results.map(r => ({ ...r, isActive: !!r.isActive }));
    },
    findFirst: ({ where, orderBy } = {}) => {
      const rows = prisma.revenueModel.findMany({ where, orderBy, take: 1 });
      return rows[0] || null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO revenue_models (id, name, description, effectiveFrom, effectiveTo, isActive, assumptions, createdById, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.name,
        data.description || null,
        data.effectiveFrom instanceof Date ? data.effectiveFrom.toISOString() : data.effectiveFrom,
        data.effectiveTo ? (data.effectiveTo instanceof Date ? data.effectiveTo.toISOString() : data.effectiveTo) : null,
        data.isActive === undefined ? 1 : (data.isActive ? 1 : 0),
        data.assumptions,
        data.createdById || null,
        now,
        now
      );
      const created = db.prepare('SELECT * FROM revenue_models WHERE id = ?').get(id);
      if (created) created.isActive = !!created.isActive;
      return created;
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
      db.prepare(`UPDATE revenue_models SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      const updated = db.prepare('SELECT * FROM revenue_models WHERE id = ?').get(where.id);
      if (updated) updated.isActive = !!updated.isActive;
      return updated;
    },
    delete: ({ where }) => {
      const existing = db.prepare('SELECT * FROM revenue_models WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM revenue_models WHERE id = ?').run(where.id);
      return existing;
    },
  },
  
  // MonetizationAlert operations
  monetizationAlert: {
    findMany: ({ where, orderBy, take } = {}) => {
      let sql = 'SELECT * FROM monetization_alerts';
      const conditions = [];
      const params = [];
      
      if (where) {
        if (where.isResolved !== undefined) {
          conditions.push('isResolved = ?');
          params.push(where.isResolved ? 1 : 0);
        }
        if (where.severity) {
          conditions.push('severity = ?');
          params.push(where.severity);
        }
        if (where.alertType) {
          conditions.push('alertType = ?');
          params.push(where.alertType);
        }
      }
      
      if (conditions.length) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key].toUpperCase()}`;
      }
      
      if (take) sql += ` LIMIT ${take}`;
      
      const results = db.prepare(sql).all(...params);
      return results.map(r => ({ ...r, isResolved: !!r.isResolved }));
    },
    findFirst: ({ where, orderBy } = {}) => {
      const rows = prisma.monetizationAlert.findMany({ where, orderBy, take: 1 });
      return rows[0] || null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO monetization_alerts (
          id, alertType, severity, adSlotId, pagePath, country, device, 
          periodStart, periodEnd, metrics, message, isResolved, 
          resolvedById, resolvedAt, resolvedNote, createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.alertType,
        data.severity || 'MEDIUM',
        data.adSlotId || null,
        data.pagePath || null,
        data.country || null,
        data.device || null,
        data.periodStart instanceof Date ? data.periodStart.toISOString() : data.periodStart,
        data.periodEnd instanceof Date ? data.periodEnd.toISOString() : data.periodEnd,
        data.metrics,
        data.message,
        data.isResolved ? 1 : 0,
        data.resolvedById || null,
        data.resolvedAt ? (data.resolvedAt instanceof Date ? data.resolvedAt.toISOString() : data.resolvedAt) : null,
        data.resolvedNote || null,
        now
      );
      const created = db.prepare('SELECT * FROM monetization_alerts WHERE id = ?').get(id);
      if (created) created.isResolved = !!created.isResolved;
      return created;
    },
    update: ({ where, data }) => {
      const sets = [];
      const params = [];
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          sets.push(`${key} = ?`);
          let val = data[key];
          if (typeof val === 'boolean') val = val ? 1 : 0;
          if (val instanceof Date) val = val.toISOString();
          params.push(val);
        }
      });
      params.push(where.id);
      db.prepare(`UPDATE monetization_alerts SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      const updated = db.prepare('SELECT * FROM monetization_alerts WHERE id = ?').get(where.id);
      if (updated) updated.isResolved = !!updated.isResolved;
      return updated;
    },
    groupBy: ({ by, _count, where, orderBy }) => {
      const fields = by.join(', ');
      let sql = `SELECT ${fields}, COUNT(*) as _count FROM monetization_alerts`;
      const conditions = [];
      const params = [];
      
      if (where) {
        if (where.isResolved !== undefined) {
          conditions.push('isResolved = ?');
          params.push(where.isResolved ? 1 : 0);
        }
      }
      
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      
      sql += ` GROUP BY ${fields}`;
      
      if (orderBy && orderBy._count) {
        const sortKey = Object.keys(orderBy._count)[0];
        sql += ` ORDER BY _count ${orderBy._count[sortKey]}`;
      }
      
      const results = db.prepare(sql).all(...params);
      
      const transformed = results.map(r => {
        const res = { ...r };
        if (res.isResolved !== undefined) res.isResolved = !!res.isResolved;
        return res;
      });
      
      if (_count) {
        return transformed.map(r => ({
          ...r,
          _count: { _all: r._count }
        }));
      }
      return transformed;
    },
  },

  // Job Definition operations
  jobDefinition: {
    findMany: ({ where = {}, orderBy = {} } = {}) => {
      let query = 'SELECT * FROM job_definitions';
      const conditions = [];
      const values = [];
      if (where.enabled !== undefined) { conditions.push('enabled = ?'); values.push(where.enabled ? 1 : 0); }
      if (where.scheduleCron && where.scheduleCron.not === null) { conditions.push('scheduleCron IS NOT NULL'); }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      const sortKey = Object.keys(orderBy)[0] || 'key';
      const sortDir = orderBy[sortKey] || 'asc';
      query += ` ORDER BY ${sortKey} ${sortDir}`;
      return db.prepare(query).all(...values).map(d => ({ ...d, enabled: !!d.enabled }));
    },
    findUnique: ({ where }) => {
      const def = db.prepare('SELECT * FROM job_definitions WHERE key = ?').get(where.key);
      if (def) def.enabled = !!def.enabled;
      return def;
    },
    update: ({ where, data }) => {
      const fields = [];
      const values = [];
      if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
      if (data.scheduleCron !== undefined) { fields.push('scheduleCron = ?'); values.push(data.scheduleCron); }
      if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
      if (data.updatedById !== undefined) { fields.push('updatedById = ?'); values.push(data.updatedById); }
      fields.push('updatedAt = ?'); values.push(new Date().toISOString());
      values.push(where.key);
      db.prepare(`UPDATE job_definitions SET ${fields.join(', ')} WHERE key = ?`).run(...values);
      return db.prepare('SELECT * FROM job_definitions WHERE key = ?').get(where.key);
    },
    upsert: ({ where, update, create }) => {
      const existing = db.prepare('SELECT * FROM job_definitions WHERE key = ?').get(where.key);
      if (existing) {
        const fields = [];
        const values = [];
        if (update.enabled !== undefined) { fields.push('enabled = ?'); values.push(update.enabled ? 1 : 0); }
        if (update.scheduleCron !== undefined) { fields.push('scheduleCron = ?'); values.push(update.scheduleCron); }
        if (update.description !== undefined) { fields.push('description = ?'); values.push(update.description); }
        fields.push('updatedAt = ?'); values.push(new Date().toISOString());
        values.push(where.key);
        db.prepare(`UPDATE job_definitions SET ${fields.join(', ')} WHERE key = ?`).run(...values);
      } else {
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO job_definitions (key, name, description, scheduleCron, enabled, defaultPayload, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          create.key, create.name, create.description || null, create.scheduleCron || null, 
          create.enabled ? 1 : 0, create.defaultPayload || '{}', now, now
        );
      }
      return db.prepare('SELECT * FROM job_definitions WHERE key = ?').get(where.key);
    }
  },

  // Job Run operations
  jobRun: {
    create: ({ data }) => {
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO job_runs (id, jobKey, status, payloadJson, requestId, triggeredById, maxAttempts, attempt, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, data.jobKey, data.status || 'QUEUED', data.payloadJson || '{}', 
        data.requestId || null, data.triggeredById || null, data.maxAttempts || 3, 
        data.attempt || 1, now, now
      );
      return { id, ...data, createdAt: now, updatedAt: now };
    },
    findFirst: ({ where, orderBy }) => {
      let query = 'SELECT * FROM job_runs';
      const conditions = [];
      const values = [];
      if (where.status) { conditions.push('status = ?'); values.push(where.status); }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        query += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      query += ' LIMIT 1';
      return db.prepare(query).get(...values);
    },
    findMany: ({ where = {}, orderBy = {}, take, skip } = {}) => {
      let query = 'SELECT * FROM job_runs';
      const conditions = [];
      const values = [];
      if (where.status) { conditions.push('status = ?'); values.push(where.status); }
      if (where.jobKey) { conditions.push('jobKey = ?'); values.push(where.jobKey); }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      const sortKey = Object.keys(orderBy)[0] || 'createdAt';
      const sortDir = orderBy[sortKey] || 'desc';
      query += ` ORDER BY ${sortKey} ${sortDir}`;
      if (take) query += ` LIMIT ${take}`;
      if (skip) query += ` OFFSET ${skip}`;
      return db.prepare(query).all(...values);
    },
    findUnique: ({ where }) => {
      return db.prepare('SELECT * FROM job_runs WHERE id = ?').get(where.id);
    },
    update: ({ where, data }) => {
      const fields = [];
      const values = [];
      if (data.status) { fields.push('status = ?'); values.push(data.status); }
      if (data.startedAt) { fields.push('startedAt = ?'); values.push(data.startedAt.toISOString()); }
      if (data.finishedAt) { fields.push('finishedAt = ?'); values.push(data.finishedAt.toISOString()); }
      if (data.durationMs !== undefined) { fields.push('durationMs = ?'); values.push(data.durationMs); }
      if (data.resultJson !== undefined) { fields.push('resultJson = ?'); values.push(data.resultJson); }
      if (data.errorJson !== undefined) { fields.push('errorJson = ?'); values.push(data.errorJson); }
      if (data.attempt && data.attempt.increment !== undefined) {
        fields.push('attempt = attempt + ?');
        values.push(data.attempt.increment);
      } else if (data.attempt !== undefined) {
        fields.push('attempt = ?');
        values.push(data.attempt);
      }
      fields.push('updatedAt = ?'); values.push(new Date().toISOString());
      values.push(where.id);
      db.prepare(`UPDATE job_runs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      return db.prepare('SELECT * FROM job_runs WHERE id = ?').get(where.id);
    },
    count: ({ where = {} } = {}) => {
      let query = 'SELECT COUNT(*) as count FROM job_runs';
      const conditions = [];
      const values = [];
      if (where.status) { conditions.push('status = ?'); values.push(where.status); }
      if (where.jobKey) { conditions.push('jobKey = ?'); values.push(where.jobKey); }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      const res = db.prepare(query).get(...values);
      return res ? res.count : 0;
    }
  },

  // Audit Log operations
  systemHealth: {
    create: ({ data }) => {
      const id = require('uuid').v4();
      const checkTime = data.checkTime instanceof Date ? data.checkTime.toISOString() : data.checkTime;
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO system_health (id, checkTime, cpuUsage, memoryUsage, diskUsage, responseTime, errorRate, activeUsers, databaseSize, cacheHitRate, status, issues, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, checkTime, data.cpuUsage || null, data.memoryUsage || null, data.diskUsage || null,
        data.responseTime || null, data.errorRate || null, data.activeUsers || null,
        data.databaseSize || null, data.cacheHitRate || null, data.status || 'HEALTHY',
        data.issues || null, now
      );
      return { id, ...data, createdAt: now };
    },
    findMany: ({ take = 10, orderBy = { checkTime: 'desc' } } = {}) => {
      const sortKey = Object.keys(orderBy)[0] || 'checkTime';
      const sortDir = orderBy[sortKey] || 'desc';
      return db.prepare(`SELECT * FROM system_health ORDER BY ${sortKey} ${sortDir} LIMIT ?`).all(take);
    },
    findFirst: ({ orderBy = { checkTime: 'desc' } } = {}) => {
      const sortKey = Object.keys(orderBy)[0] || 'checkTime';
      const sortDir = orderBy[sortKey] || 'desc';
      return db.prepare(`SELECT * FROM system_health ORDER BY ${sortKey} ${sortDir} LIMIT 1`).get();
    }
  },

  errorEvent: {
    create: ({ data }) => {
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO error_events (id, occurredAt, message, stack, level, source, route, pagePath, requestId, sessionId, userId, actorRole, userAgent, ipAddress, metadataJson, isResolved, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, now, data.message, data.stack || null, data.level || 'error', data.source || null,
        data.route || null, data.pagePath || null, data.requestId || null, data.sessionId || null,
        data.userId || null, data.actorRole || null, data.userAgent || null, data.ipAddress || null,
        data.metadataJson || '{}', data.isResolved ? 1 : 0, now
      );
      return { id, ...data, occurredAt: now, isResolved: !!data.isResolved };
    },
    findMany: ({ where = {}, orderBy = { occurredAt: 'desc' }, take = 50, skip = 0 } = {}) => {
      let query = 'SELECT * FROM error_events';
      const conditions = [];
      const values = [];
      if (where.isResolved !== undefined) {
        conditions.push('isResolved = ?');
        values.push(where.isResolved ? 1 : 0);
      }
      if (where.level) {
        conditions.push('level = ?');
        values.push(where.level);
      }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      const sortKey = Object.keys(orderBy)[0] || 'occurredAt';
      const sortDir = orderBy[sortKey] || 'desc';
      query += ` ORDER BY ${sortKey} ${sortDir} LIMIT ? OFFSET ?`;
      values.push(take, skip);
      return db.prepare(query).all(...values).map(e => ({ ...e, isResolved: !!e.isResolved }));
    },
    count: ({ where = {} } = {}) => {
      let query = 'SELECT COUNT(*) as count FROM error_events';
      const conditions = [];
      const values = [];
      if (where.isResolved !== undefined) {
        conditions.push('isResolved = ?');
        values.push(where.isResolved ? 1 : 0);
      }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      return db.prepare(query).get(...values).count;
    },
    update: ({ where, data }) => {
      const fields = [];
      const values = [];
      for (const key in data) {
        if (key === 'isResolved') {
          fields.push('isResolved = ?');
          values.push(data[key] ? 1 : 0);
        } else if (key === 'resolvedAt') {
          fields.push('resolvedAt = ?');
          values.push(data[key] instanceof Date ? data[key].toISOString() : data[key]);
        } else {
          fields.push(`${key} = ?`);
          values.push(data[key]);
        }
      }
      values.push(where.id);
      db.prepare(`UPDATE error_events SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      return { id: where.id, ...data };
    }
  },

  auditLog: {
    create: ({ data }) => {
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      const stmt = db.prepare(`
        INSERT INTO audit_logs (id, occurredAt, severity, actorUserId, actorRole, actorIp, userAgent, requestId, sessionId, action, entityType, entityId, entityLabel, beforeJson, afterJson, diffJson, metadataJson)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id, now, data.severity || 'info', data.actorUserId || null, data.actorRole || null, 
        data.actorIp || null, data.userAgent || null, data.requestId || null, data.sessionId || null,
        data.action, data.entityType, data.entityId || null, data.entityLabel || null,
        data.beforeJson || null, data.afterJson || null, data.diffJson || null, data.metadataJson || '{}'
      );
      return { id, ...data, occurredAt: now };
    },
    findMany: ({ where = {}, orderBy = {}, take, skip } = {}) => {
      let query = 'SELECT * FROM audit_logs';
      const conditions = [];
      const values = [];
      
      if (where.entityType) { conditions.push('entityType = ?'); values.push(where.entityType); }
      if (where.action) { conditions.push('action = ?'); values.push(where.action); }
      if (where.actorUserId) { conditions.push('actorUserId = ?'); values.push(where.actorUserId); }
      if (where.requestId) { conditions.push('requestId = ?'); values.push(where.requestId); }
      if (where.occurredAt) {
        if (where.occurredAt.gte) { conditions.push('occurredAt >= ?'); values.push(where.occurredAt.gte instanceof Date ? where.occurredAt.gte.toISOString() : where.occurredAt.gte); }
        if (where.occurredAt.lte) { conditions.push('occurredAt <= ?'); values.push(where.occurredAt.lte instanceof Date ? where.occurredAt.lte.toISOString() : where.occurredAt.lte); }
        if (where.occurredAt.gt) { conditions.push('occurredAt > ?'); values.push(where.occurredAt.gt instanceof Date ? where.occurredAt.gt.toISOString() : where.occurredAt.gt); }
        if (where.occurredAt.lt) { conditions.push('occurredAt < ?'); values.push(where.occurredAt.lt instanceof Date ? where.occurredAt.lt.toISOString() : where.occurredAt.lt); }
      }

      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      
      let sortKey = 'occurredAt';
      let sortDir = 'desc';
      
      if (Array.isArray(orderBy)) {
        const first = orderBy[0];
        if (first) {
          sortKey = Object.keys(first)[0];
          sortDir = first[sortKey];
        }
      } else if (typeof orderBy === 'object') {
        const keys = Object.keys(orderBy);
        if (keys.length > 0) {
          sortKey = keys[0];
          sortDir = orderBy[sortKey];
        }
      }
      
      query += ` ORDER BY ${sortKey} ${sortDir}`;
      if (take) query += ` LIMIT ${take}`;
      if (skip) query += ` OFFSET ${skip}`;
      return db.prepare(query).all(...values);
    },
    count: ({ where = {} } = {}) => {
      let query = 'SELECT COUNT(*) as count FROM audit_logs';
      const conditions = [];
      const values = [];
      if (where.entityType) { conditions.push('entityType = ?'); values.push(where.entityType); }
      if (where.action) { conditions.push('action = ?'); values.push(where.action); }
      if (where.actorUserId) { conditions.push('actorUserId = ?'); values.push(where.actorUserId); }
      if (where.requestId) { conditions.push('requestId = ?'); values.push(where.requestId); }
      if (where.occurredAt) {
        if (where.occurredAt.gte) { conditions.push('occurredAt >= ?'); values.push(where.occurredAt.gte instanceof Date ? where.occurredAt.gte.toISOString() : where.occurredAt.gte); }
        if (where.occurredAt.lte) { conditions.push('occurredAt <= ?'); values.push(where.occurredAt.lte instanceof Date ? where.occurredAt.lte.toISOString() : where.occurredAt.lte); }
      }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      const res = db.prepare(query).get(...values);
      return res ? res.count : 0;
    },
    deleteMany: ({ where = {} } = {}) => {
      let query = 'DELETE FROM audit_logs';
      const conditions = [];
      const values = [];
      if (where.occurredAt && where.occurredAt.lte) {
        conditions.push('occurredAt <= ?');
        values.push(where.occurredAt.lte.toISOString());
      }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      const result = db.prepare(query).run(...values);
      return { count: result.changes };
    }
  },

  // Backup operations
  backup: {
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO backups (id, type, storageProvider, filePath, fileSizeBytes, checksum, durationMs, status, errorJson, createdAt, createdById)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, data.type, data.storageProvider || 'local', data.filePath, data.fileSizeBytes, 
        data.checksum || null, data.durationMs || null, data.status || 'success', 
        data.errorJson || null, now, data.createdById || null
      );
      return { id, ...data, createdAt: now };
    },
    findMany: ({ where = {}, orderBy = {}, take, skip } = {}) => {
      let query = 'SELECT * FROM backups';
      const conditions = [];
      const values = [];
      if (where.type) { conditions.push('type = ?'); values.push(where.type); }
      if (where.status) { conditions.push('status = ?'); values.push(where.status); }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      const sortKey = Object.keys(orderBy)[0] || 'createdAt';
      const sortDir = orderBy[sortKey] || 'desc';
      query += ` ORDER BY ${sortKey} ${sortDir}`;
      if (take) query += ` LIMIT ${take}`;
      if (skip) query += ` OFFSET ${skip}`;
      return db.prepare(query).all(...values);
    },
    findUnique: ({ where }) => {
      return db.prepare('SELECT * FROM backups WHERE id = ?').get(where.id);
    },
    delete: ({ where }) => {
      const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM backups WHERE id = ?').run(where.id);
      return backup;
    },
    count: ({ where = {} } = {}) => {
      let query = 'SELECT COUNT(*) as count FROM backups';
      const conditions = [];
      const values = [];
      if (where.type) { conditions.push('type = ?'); values.push(where.type); }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      return db.prepare(query).get(...values).count;
    }
  },

  // Backup Schedule operations
  backupSchedule: {
    findMany: ({ where = {} } = {}) => {
      let query = 'SELECT * FROM backup_schedules';
      const conditions = [];
      const values = [];
      if (where.enabled !== undefined) { conditions.push('enabled = ?'); values.push(where.enabled ? 1 : 0); }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      return db.prepare(query).all(...values).map(s => ({ ...s, enabled: !!s.enabled }));
    },
    findUnique: ({ where }) => {
      const s = db.prepare('SELECT * FROM backup_schedules WHERE id = ?').get(where.id);
      if (s) s.enabled = !!s.enabled;
      return s;
    },
    findFirst: () => {
      const s = db.prepare('SELECT * FROM backup_schedules LIMIT 1').get();
      if (s) s.enabled = !!s.enabled;
      return s;
    },
    update: ({ where, data }) => {
      const fields = [];
      const values = [];
      if (data.cron !== undefined) { fields.push('cron = ?'); values.push(data.cron); }
      if (data.retentionCount !== undefined) { fields.push('retentionCount = ?'); values.push(data.retentionCount); }
      if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
      if (data.lastRunAt !== undefined) { fields.push('lastRunAt = ?'); values.push(data.lastRunAt instanceof Date ? data.lastRunAt.toISOString() : data.lastRunAt); }
      if (data.nextRunAt !== undefined) { fields.push('nextRunAt = ?'); values.push(data.nextRunAt instanceof Date ? data.nextRunAt.toISOString() : data.nextRunAt); }
      fields.push('updatedAt = ?'); values.push(new Date().toISOString());
      values.push(where.id);
      db.prepare(`UPDATE backup_schedules SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      const updated = db.prepare('SELECT * FROM backup_schedules WHERE id = ?').get(where.id);
      if (updated) updated.enabled = !!updated.enabled;
      return updated;
    },
    upsert: ({ where, update, create }) => {
      const existing = db.prepare('SELECT * FROM backup_schedules WHERE id = ?').get(where.id);
      if (existing) {
        const fields = [];
        const values = [];
        if (update.cron !== undefined) { fields.push('cron = ?'); values.push(update.cron); }
        if (update.retentionCount !== undefined) { fields.push('retentionCount = ?'); values.push(update.retentionCount); }
        if (update.enabled !== undefined) { fields.push('enabled = ?'); values.push(update.enabled ? 1 : 0); }
        fields.push('updatedAt = ?'); values.push(new Date().toISOString());
        values.push(where.id);
        db.prepare(`UPDATE backup_schedules SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      } else {
        const id = where.id || require('uuid').v4();
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO backup_schedules (id, cron, retentionCount, enabled, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, create.cron, create.retentionCount || 7, create.enabled !== false ? 1 : 0, now);
      }
      const result = db.prepare('SELECT * FROM backup_schedules WHERE id = ?').get(where.id);
      if (result) result.enabled = !!result.enabled;
      return result;
    }
  },

  // CMS Page operations
  // Calculator operations
  calculator: {
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM calculators WHERE id = ?').get(where.id);
      if (where.key) return db.prepare('SELECT * FROM calculators WHERE "key" = ?').get(where.key);
      return null;
    },
    findMany: ({ where, orderBy } = {}) => {
      let sql = 'SELECT * FROM calculators';
      const params = [];
      if (where) {
        const conditions = [];
        if (where.status) {
          conditions.push('status = ?');
          params.push(where.status);
        }
        if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      }
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY "${key}" ${orderBy[key]}`;
      }
      return db.prepare(sql).all(...params);
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO calculators (id, "key", nameAr, nameEn, status, routePath, configJson, analyticsNamespace, adProfileId, createdById, updatedById, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, 
        data.key, 
        data.nameAr, 
        data.nameEn, 
        data.status || 'hidden', 
        data.routePath, 
        data.configJson || null, 
        data.analyticsNamespace || null, 
        data.adProfileId || null, 
        data.createdById || null, 
        data.updatedById || null, 
        now, 
        now
      );
      return { id, ...data, createdAt: now, updatedAt: now };
    },
    update: ({ where, data }) => {
      const now = new Date().toISOString();
      const sets = [];
      const params = [];
      Object.keys(data).forEach(key => {
        if (key !== 'id') {
          sets.push(`"${key}" = ?`);
          params.push(data[key]);
        }
      });
      sets.push('updatedAt = ?');
      params.push(now);
      params.push(where.id);
      db.prepare(`UPDATE calculators SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM calculators WHERE id = ?').get(where.id);
    },
    delete: ({ where }) => {
      const calc = db.prepare('SELECT * FROM calculators WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM calculators WHERE id = ?').run(where.id);
      return calc;
    },
  },

  cmsPage: {
    findMany: ({ where = {}, orderBy = {} } = {}) => {
      let query = 'SELECT * FROM cms_pages';
      const conditions = [];
      const values = [];
      if (where.status) { conditions.push('status = ?'); values.push(where.status); }
      if (where.pageType) { conditions.push('pageType = ?'); values.push(where.pageType); }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      const sortKey = Object.keys(orderBy)[0] || 'updatedAt';
      const sortDir = orderBy[sortKey] || 'desc';
      query += ` ORDER BY ${sortKey} ${sortDir}`;
      return db.prepare(query).all(...values);
    },
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM cms_pages WHERE id = ?').get(where.id);
      if (where.slug) return db.prepare('SELECT * FROM cms_pages WHERE slug = ?').get(where.slug);
      return null;
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO cms_pages (id, slug, pageType, status, currentVersionId, createdAt, updatedAt, createdById, updatedById)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.slug, data.pageType, data.status || 'draft', data.currentVersionId || null, now, now, data.createdById || null, data.updatedById || null);
      return { id, ...data, createdAt: now, updatedAt: now };
    },
    update: ({ where, data }) => {
      const now = new Date().toISOString();
      const fields = [];
      const values = [];
      Object.keys(data).forEach(key => {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      });
      fields.push('updatedAt = ?');
      values.push(now);
      values.push(where.id || where.slug);
      const whereClause = where.id ? 'id = ?' : 'slug = ?';
      db.prepare(`UPDATE cms_pages SET ${fields.join(', ')} WHERE ${whereClause}`).run(...values);
      return db.prepare(`SELECT * FROM cms_pages WHERE ${whereClause}`).get(where.id || where.slug);
    },
    delete: ({ where }) => {
      const page = db.prepare('SELECT * FROM cms_pages WHERE id = ?').get(where.id);
      db.prepare('DELETE FROM cms_pages WHERE id = ?').run(where.id);
      return page;
    }
  },

  // CMS Page Version operations
  cmsPageVersion: {
    findMany: ({ where = {}, orderBy = {} } = {}) => {
      let query = 'SELECT * FROM cms_page_versions';
      const conditions = [];
      const values = [];
      if (where.pageId) { conditions.push('pageId = ?'); values.push(where.pageId); }
      if (where.locale) { conditions.push('locale = ?'); values.push(where.locale); }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      const sortKey = Object.keys(orderBy)[0] || 'versionNumber';
      const sortDir = orderBy[sortKey] || 'desc';
      query += ` ORDER BY ${sortKey} ${sortDir}`;
      return db.prepare(query).all(...values);
    },
    findUnique: ({ where }) => {
      if (where.id) return db.prepare('SELECT * FROM cms_page_versions WHERE id = ?').get(where.id);
      return null;
    },
    findFirst: ({ where, orderBy }) => {
      let query = 'SELECT * FROM cms_page_versions';
      const conditions = [];
      const values = [];
      if (where.pageId) { conditions.push('pageId = ?'); values.push(where.pageId); }
      if (where.locale) { conditions.push('locale = ?'); values.push(where.locale); }
      if (where.versionNumber) { conditions.push('versionNumber = ?'); values.push(where.versionNumber); }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        query += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      query += ' LIMIT 1';
      return db.prepare(query).get(...values);
    },
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO cms_page_versions (id, pageId, versionNumber, locale, title, description, bodyRichJson, examplesJson, faqJson, legalNotes, seoOverridesJson, publishNotes, createdAt, createdById)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, data.pageId, data.versionNumber, data.locale, data.title, data.description || null,
        data.bodyRichJson || null, data.examplesJson || null, data.faqJson || null,
        data.legalNotes || null, data.seoOverridesJson || null, data.publishNotes || null,
        now, data.createdById || null
      );
      return { id, ...data, createdAt: now };
    },
    count: ({ where = {} } = {}) => {
      let query = 'SELECT COUNT(*) as count FROM cms_page_versions';
      const conditions = [];
      const values = [];
      if (where.pageId) { conditions.push('pageId = ?'); values.push(where.pageId); }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      return db.prepare(query).get(...values).count;
    }
  },

  // CMS Preview Token operations
  cmsPreviewToken: {
    create: ({ data }) => {
      const now = new Date().toISOString();
      const expiresAt = data.expiresAt instanceof Date ? data.expiresAt.toISOString() : data.expiresAt;
      db.prepare(`
        INSERT INTO cms_preview_tokens (token, pageId, expiresAt, createdAt, createdById)
        VALUES (?, ?, ?, ?, ?)
      `).run(data.token, data.pageId, expiresAt, now, data.createdById || null);
      return { ...data, createdAt: now };
    },
    findUnique: ({ where }) => {
      return db.prepare('SELECT * FROM cms_preview_tokens WHERE token = ?').get(where.token);
    },
    delete: ({ where }) => {
      db.prepare('DELETE FROM cms_preview_tokens WHERE token = ?').run(where.token);
    }
  },

  // Analytics Event operations
  analyticsEvent: {
    findUnique: ({ where }) => {
      return db.prepare('SELECT * FROM analytics_events WHERE key = ?').get(where.key);
    },
    findMany: () => {
      return db.prepare('SELECT * FROM analytics_events').all();
    }
  },

  analyticsEventLog: {
    create: ({ data }) => {
      const id = data.id || require('uuid').v4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO analytics_event_logs (id, sessionId, eventKey, pagePath, propertiesJson, occurredAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, data.sessionId, data.eventKey, data.pagePath || null, data.propertiesJson || '{}', now);
      return { id, ...data, occurredAt: now };
    }
  },

  trafficSession: {
    upsert: ({ where, update, create }) => {
      const columns = getTableColumns('traffic_sessions');
      const existing = db.prepare('SELECT * FROM traffic_sessions WHERE sessionId = ?').get(where.sessionId);
      
      if (existing) {
        const sets = [];
        const params = [];
        
        if (update.pageViews && update.pageViews.increment) {
          sets.push('pageViews = pageViews + ?');
          params.push(update.pageViews.increment);
        }
        
        // Adaptive timestamp update
        const now = (update.lastSeenAt || new Date()).toISOString();
        if (columns.has('lastSeenAt')) {
          sets.push('lastSeenAt = ?');
          params.push(now);
        } else if (columns.has('updatedAt')) {
          sets.push('updatedAt = ?');
          params.push(now);
        }
        
        if (sets.length > 0) {
          params.push(where.sessionId);
          db.prepare(`UPDATE traffic_sessions SET ${sets.join(', ')} WHERE sessionId = ?`).run(...params);
        }
        return db.prepare('SELECT * FROM traffic_sessions WHERE sessionId = ?').get(where.sessionId);
      } else {
        const now = new Date().toISOString();
        const fields = ['sessionId', 'firstPagePath', 'referrer', 'utmSource', 'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent', 'pageViews'];
        const values = [
          create.sessionId,
          create.firstPagePath,
          create.referrer || null,
          create.utmSource || null,
          create.utmMedium || null,
          create.utmCampaign || null,
          create.utmTerm || null,
          create.utmContent || null,
          create.pageViews || 1
        ];

        // Adaptive timestamp insert
        if (columns.has('startedAt')) {
          fields.push('startedAt');
          values.push(now);
        } else if (columns.has('createdAt')) {
          fields.push('createdAt');
          values.push(now);
        }

        if (columns.has('lastSeenAt')) {
          fields.push('lastSeenAt');
          values.push(now);
        } else if (columns.has('updatedAt')) {
          fields.push('updatedAt');
          values.push(now);
        }

        const placeholders = fields.map(() => '?').join(', ');
        db.prepare(`
          INSERT INTO traffic_sessions (${fields.join(', ')})
          VALUES (${placeholders})
        `).run(...values);
        
        return db.prepare('SELECT * FROM traffic_sessions WHERE sessionId = ?').get(create.sessionId);
      }
    },
    update: ({ where, data }) => {
      const columns = getTableColumns('traffic_sessions');
      const sets = [];
      const params = [];
      
      for (const [key, value] of Object.entries(data)) {
        if (key === 'lastSeenAt') {
          if (columns.has('lastSeenAt')) {
            sets.push('lastSeenAt = ?');
            params.push(value instanceof Date ? value.toISOString() : value);
          } else if (columns.has('updatedAt')) {
            sets.push('updatedAt = ?');
            params.push(value instanceof Date ? value.toISOString() : value);
          }
        } else if (key === 'isBounced' && columns.has('isBounced')) {
          sets.push('isBounced = ?');
          params.push(value ? 1 : 0);
        } else if (key === 'durationSeconds' && columns.has('durationSeconds')) {
          sets.push('durationSeconds = ?');
          params.push(value);
        } else if (columns.has(key)) {
          sets.push(`${key} = ?`);
          params.push(value);
        }
      }
      
      if (sets.length > 0) {
        params.push(where.sessionId);
        db.prepare(`UPDATE traffic_sessions SET ${sets.join(', ')} WHERE sessionId = ?`).run(...params);
      }
      return db.prepare('SELECT * FROM traffic_sessions WHERE sessionId = ?').get(where.sessionId);
    },
    findMany: ({ where, orderBy, take, skip } = {}) => {
      let sql = 'SELECT * FROM traffic_sessions';
      const params = [];
      // Simplified where for now
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        sql += ` ORDER BY ${key} ${orderBy[key]}`;
      }
      if (take) sql += ` LIMIT ${take}`;
      if (skip) sql += ` OFFSET ${skip}`;
      return db.prepare(sql).all(...params);
    }
  },
  
  // Utility functions
  $connect: async () => {
    // SQLite doesn't need explicit connection, just verify db exists
    return Promise.resolve();
  },
  $disconnect: () => {
    db.close();
  },
  $queryRaw: (strings, ...values) => {
    if (Array.isArray(strings)) {
      const sql = strings.join('?');
      return db.prepare(sql).all(...values);
    }
    return db.prepare(strings).all(...values);
  },
  $queryRawUnsafe: (sql, ...params) => {
    return db.prepare(sql).all(...params);
  },
};

module.exports = { prisma, db };