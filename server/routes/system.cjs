// System settings and feature flags routes
const express = require('express');
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');

const { logAudit } = require('../lib/audit.cjs');
const { createJob, JOB_TYPES } = require('../lib/jobs.cjs');
const { getSystemHealth } = require('../lib/health.cjs');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const diagnosticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 diagnostic runs per window
  message: { error: 'Too many diagnostic requests, please try again later.' }
});

// ============================================
// Ops & Health
// ============================================

router.get('/health', requirePermission(PERMISSIONS.OPS_HEALTH_VIEW), async (req, res) => {
  try {
    const health = await getSystemHealth();
    return res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({ error: 'Failed to retrieve system health' });
  }
});

router.post('/diagnostics/run', requirePermission(PERMISSIONS.OPS_DIAGNOSTICS_RUN), diagnosticsLimiter, async (req, res) => {
  try {
    const { checks } = req.body;
    const job = await createJob(JOB_TYPES.DIAGNOSTICS, { checks }, req);
    
    return res.json({ 
      ok: true, 
      jobId: job.id, 
      requestId: req.requestId 
    });
  } catch (error) {
    console.error('Diagnostics run error:', error);
    return res.status(500).json({ error: 'Failed to start diagnostics' });
  }
});

router.get('/diagnostics/runs', requirePermission(PERMISSIONS.OPS_DIAGNOSTICS_RUN), async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;
    const runs = await prisma.job.findMany({
      where: { 
        type: JOB_TYPES.DIAGNOSTICS,
        status: status || undefined
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });
    return res.json({ ok: true, runs });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch diagnostic runs' });
  }
});

router.get('/diagnostics/runs/:id', requirePermission(PERMISSIONS.OPS_DIAGNOSTICS_RUN), async (req, res) => {
  try {
    const run = await prisma.job.findUnique({
      where: { id: req.params.id }
    });
    if (!run) return res.status(404).json({ error: 'Run not found' });
    return res.json({ ok: true, run });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch diagnostic run' });
  }
});

// ============================================
// Audit Logs
// ============================================

router.get('/audit-logs', requirePermission(PERMISSIONS.LOGS_READ), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      entityType, 
      entityId, 
      actorUserId, 
      action,
      severity,
      startDate,
      endDate,
      search = '',
      sortBy = 'occurredAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      actorUserId: actorUserId || undefined,
      action: action || undefined,
      severity: severity || undefined,
      occurredAt: (startDate || endDate) ? {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      } : undefined,
      OR: search ? [
        { entityType: { contains: search } },
        { entityId: { contains: search } },
        { action: { contains: search } },
        { entityLabel: { contains: search } },
        { actorRole: { contains: search } },
        { actorIp: { contains: search } },
      ] : undefined
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
      }),
      prisma.auditLog.count({ where })
    ]);

    // Enrich with user names if possible
    const userIds = [...new Set(logs.map(l => l.actorUserId).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

    const enrichedLogs = logs.map(log => ({
      ...log,
      actorName: log.actorUserId ? userMap[log.actorUserId] : 'System'
    }));

    return res.json({ 
      ok: true,
      logs: enrichedLogs, 
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/audit-logs/export', requirePermission(PERMISSIONS.LOGS_FULL), async (req, res) => {
  try {
    const { 
      format = 'csv',
      entityType, 
      severity,
      startDate,
      endDate,
      search = ''
    } = req.query;

    const where = {
      entityType: entityType || undefined,
      severity: severity || undefined,
      occurredAt: (startDate || endDate) ? {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      } : undefined,
      OR: search ? [
        { entityType: { contains: search } },
        { action: { contains: search } },
        { entityLabel: { contains: search } },
      ] : undefined
    };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: 5000 // Limit export size
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
      return res.send(JSON.stringify(logs, null, 2));
    }

    // CSV Export
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    
    const headers = ['ID', 'Time', 'Severity', 'Action', 'Entity', 'EntityID', 'Actor', 'Role', 'IP', 'Changes'];
    res.write(headers.join(',') + '\n');

    for (const log of logs) {
      const row = [
        log.id,
        log.occurredAt.toISOString(),
        log.severity,
        log.action,
        log.entityType,
        log.entityId || '',
        log.actorUserId || 'System',
        log.actorRole || '',
        log.actorIp || '',
        (log.diffJson || '').replace(/"/g, '""') // Escape quotes for CSV
      ];
      res.write(row.map(val => `"${val}"`).join(',') + '\n');
    }

    return res.end();
  } catch (error) {
    console.error('Export audit logs error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Jobs
// ============================================

router.get('/jobs', requirePermission(PERMISSIONS.SYSTEM_READ), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { status: status || undefined };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.job.count({ where })
    ]);

    return res.json({ 
      jobs, 
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/jobs/:id', requirePermission(PERMISSIONS.SYSTEM_READ), async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id }
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    return res.json({ job });
  } catch (error) {
    console.error('Get job error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/jobs', requirePermission(PERMISSIONS.SYSTEM_UPDATE), async (req, res) => {
  try {
    const { type, payload } = req.body;
    const job = await createJob(type, payload);
    return res.json({ ok: true, job });
  } catch (error) {
    console.error('Create job error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// System Settings
// ============================================

// Get all settings
router.get('/settings', requirePermission(PERMISSIONS.SETTINGS_READ), async (req, res) => {
  try {
    const { category } = req.query;
    const where = category ? { category } : {};

    const settings = await prisma.systemSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get single setting
router.get('/settings/:key', async (req, res) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: req.params.key },
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    // Parse value based on type
    let value = setting.value;
    if (setting.type === 'number') value = parseFloat(value);
    else if (setting.type === 'boolean') value = value === 'true';
    else if (setting.type === 'json') value = JSON.parse(value);

    return res.json({ setting: { ...setting, value } });
  } catch (error) {
    console.error('Get setting error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update setting
router.put('/settings/:key', requirePermission(PERMISSIONS.SETTINGS_UPDATE), async (req, res) => {
  try {
    const { value, type, category } = req.body;

    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    const before = await prisma.systemSetting.findUnique({
      where: { key: req.params.key }
    });

    const setting = await prisma.systemSetting.upsert({
      where: { key: req.params.key },
      update: {
        value: stringValue,
        type: type || 'string',
        category: category || 'general',
      },
      create: {
        key: req.params.key,
        value: stringValue,
        type: type || 'string',
        category: category || 'general',
      },
    });

    await logAudit({
      req,
      action: before ? 'UPDATE' : 'CREATE',
      entityType: 'SystemSetting',
      entityId: setting.id,
      beforeData: before,
      afterData: setting
    });

    return res.json({ ok: true, setting });
  } catch (error) {
    console.error('Update setting error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Feature Flags
// ============================================

// Get all feature flags
router.get('/features', requirePermission(PERMISSIONS.FEATURES_READ), async (req, res) => {
  try {
    const features = await prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });
    return res.json({ features });
  } catch (error) {
    console.error('Get features error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Check if feature is enabled (public)
router.get('/features/:key/check', async (req, res) => {
  try {
    const feature = await prisma.featureFlag.findUnique({
      where: { key: req.params.key },
    });
    return res.json({ enabled: feature?.isEnabled || false });
  } catch (error) {
    console.error('Check feature error:', error);
    return res.json({ enabled: false });
  }
});

// Toggle feature flag
router.put('/features/:key', requirePermission(PERMISSIONS.FEATURES_UPDATE), async (req, res) => {
  try {
    const { isEnabled, description } = req.body;

    const before = await prisma.featureFlag.findUnique({
      where: { key: req.params.key }
    });

    const feature = await prisma.featureFlag.upsert({
      where: { key: req.params.key },
      update: {
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        description: description || undefined,
      },
      create: {
        key: req.params.key,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        description: description || null,
      },
    });

    await logAudit({
      req,
      action: before ? 'UPDATE' : 'CREATE',
      entityType: 'FeatureFlag',
      entityId: feature.id,
      beforeData: before,
      afterData: feature
    });

    return res.json({ ok: true, feature });
  } catch (error) {
    console.error('Toggle feature error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Activity Logs
// ============================================

// Get activity logs
router.get('/logs', requirePermission(PERMISSIONS.LOGS_READ), async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, actionType } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where = {};
    if (userId) where.adminUserId = userId;
    if (actionType) where.actionType = actionType;

    const [logs, total] = await Promise.all([
      prisma.adminActivityLog.findMany({
        where,
        include: { adminUser: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit, 10),
      }),
      prisma.adminActivityLog.count({ where }),
    ]);

    return res.json({
      logs: logs.map(l => ({
        ...l,
        adminUserName: l.adminUser?.name,
        adminUserEmail: l.adminUser?.email,
        adminUser: undefined,
      })),
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (error) {
    console.error('Get logs error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// System Health
// ============================================

// Get system health info
router.get('/health', requirePermission(PERMISSIONS.SETTINGS_READ), async (req, res) => {
  try {
    const startTime = process.uptime();
    const memoryUsage = process.memoryUsage();

    // Count records
    const [users, pageViews, calculations, blogPosts] = await Promise.all([
      prisma.user.count(),
      prisma.pageView.count(),
      prisma.calculationEvent.count(),
      prisma.blogPost.count(),
    ]);

    return res.json({
      status: 'healthy',
      uptime: startTime,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
      },
      database: {
        users,
        pageViews,
        calculations,
        blogPosts,
      },
      node: process.version,
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

module.exports = router;
