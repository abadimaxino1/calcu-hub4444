const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { hasPermission } = require('../rbac.cjs');
const { maskData } = require('../lib/audit.cjs');

const canViewAudit = (req, res, next) => {
  if (!req.user || !hasPermission(req.user.role, 'logs:read')) {
    return res.status(403).json({ error: 'Forbidden: Requires logs:read permission' });
  }
  next();
};

const canExportAudit = (req, res, next) => {
  if (!req.user || !hasPermission(req.user.role, 'logs:export')) {
    return res.status(403).json({ error: 'Forbidden: Requires logs:export permission' });
  }
  next();
};

/**
 * GET /api/admin/audit-logs
 * List audit logs with filters
 */
router.get('/', canViewAudit, async (req, res) => {
  try {
    const { entityType, action, actorUserId, requestId, take = 50, skip = 0 } = req.query;
    
    const where = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (actorUserId) where.actorUserId = actorUserId;
    if (requestId) where.requestId = requestId;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: parseInt(take),
      skip: parseInt(skip)
    });

    const allLogs = await prisma.auditLog.findMany({ where });
    const total = allLogs.length;

    res.json({ logs, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/admin/audit-logs/export
 * Export audit logs as CSV or JSON (Chunked Streaming with Cursor)
 */
router.get('/export', canExportAudit, async (req, res) => {
  const { format = 'csv', entityType, action, startDate, endDate } = req.query;
  
  // Date range guard: default last 7 days unless SUPER_ADMIN
  let start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let end = endDate ? new Date(endDate) : new Date();
  
  if (req.user.role !== 'SUPER_ADMIN') {
    const maxRange = 31 * 24 * 60 * 60 * 1000; // 31 days
    if (end - start > maxRange) {
      return res.status(400).json({ error: 'Date range too large. Max 31 days for non-SUPER_ADMIN.' });
    }
  }

  try {
    const where = {
      occurredAt: {
        gte: start.toISOString(),
        lte: end.toISOString()
      }
    };
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `audit-logs-${timestamp}.${format}`;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.write('[\n');
      
      let lastId = null;
      let lastTime = null;
      const take = 500;
      let hasMore = true;
      
      while (hasMore) {
        const logs = await prisma.auditLog.findMany({
          where: {
            ...where,
            ...(lastId ? {
              OR: [
                { occurredAt: { lt: lastTime } },
                { occurredAt: lastTime, id: { lt: lastId } }
              ]
            } : {})
          },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          take
        });
        
        if (logs.length === 0) {
          hasMore = false;
          break;
        }
        
        const json = logs.map(l => JSON.stringify(maskData(l))).join(',\n');
        res.write(json);
        
        const last = logs[logs.length - 1];
        lastId = last.id;
        lastTime = last.occurredAt;

        if (logs.length < take) {
          hasMore = false;
        } else {
          res.write(',\n');
        }
      }
      
      res.write('\n]');
      return res.end();
    }

    // CSV Export
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const headers = ['ID', 'Occurred At', 'Actor', 'Action', 'Entity', 'Entity ID', 'Request ID', 'Before', 'After'];
    res.write(headers.join(',') + '\n');
    
    let lastId = null;
    let lastTime = null;
    const take = 500;
    let hasMore = true;

    // CSV Injection Protection
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      if (['=', '+', '-', '@'].includes(str[0])) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };
    
    while (hasMore) {
      const logs = await prisma.auditLog.findMany({
        where: {
          ...where,
          ...(lastTime ? {
            occurredAt: { lt: lastTime }
          } : {})
        },
        orderBy: { occurredAt: 'desc' },
        take
      });
      
      if (logs.length === 0) {
        hasMore = false;
        break;
      }
      
      logs.forEach(log => {
        const masked = maskData(log);
        const row = [
          masked.id,
          masked.occurredAt,
          masked.actorUserId || 'system',
          masked.action,
          masked.entityType,
          masked.entityId || '',
          masked.requestId || '',
          masked.beforeJson || '',
          masked.afterJson || ''
        ];
        res.write(row.map(escapeCsv).join(',') + '\n');
      });
      
      const last = logs[logs.length - 1];
      lastId = last.id;
      lastTime = last.occurredAt;

      if (logs.length < take) hasMore = false;
    }
    
    res.end();
  } catch (error) {
    console.error('Export failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Export failed' });
    } else {
      res.end();
    }
  }
});

module.exports = router;
