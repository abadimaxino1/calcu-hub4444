// System settings and feature flags routes
const express = require('express');
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');

const router = express.Router();

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

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: req.user.id,
        actionType: 'UPDATE_SETTING',
        targetType: 'system_setting',
        targetId: setting.id,
        detailsJson: JSON.stringify({ key: req.params.key }),
        ipAddress: req.ip,
      },
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

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: req.user.id,
        actionType: 'UPDATE_FEATURE_FLAG',
        targetType: 'feature_flag',
        targetId: feature.id,
        detailsJson: JSON.stringify({ key: req.params.key, isEnabled: feature.isEnabled }),
        ipAddress: req.ip,
      },
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
