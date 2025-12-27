const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');
const { writeAuditLog } = require('../lib/audit.cjs');

// Get all settings
router.get('/', requirePermission(PERMISSIONS.SETTINGS_READ), async (req, res) => {
  try {
    const { category } = req.query;
    const where = category ? { category } : {};

    const settings = await prisma.systemSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get single setting (public-ish or internal)
router.get('/:key', async (req, res) => {
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
    else if (setting.type === 'json') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        // Keep as string if parse fails
      }
    }

    return res.json({ ...setting, value });
  } catch (error) {
    console.error('Get setting error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update setting
router.put('/:key', requirePermission(PERMISSIONS.SETTINGS_UPDATE), async (req, res) => {
  try {
    const { value, type, category } = req.body;
    const { key } = req.params;

    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    const before = await prisma.systemSetting.findUnique({
      where: { key }
    });

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value: stringValue,
        type: type || (before ? before.type : 'string'),
        category: category || (before ? before.category : 'general'),
      },
      create: {
        key,
        value: stringValue,
        type: type || 'string',
        category: category || 'general',
      },
    });

    await writeAuditLog({
      action: before ? 'SETTING_UPDATE' : 'SETTING_CREATE',
      entityType: 'SYSTEM_SETTING',
      entityId: setting.id,
      entityLabel: key,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: before ? JSON.stringify(before) : null,
      afterJson: JSON.stringify(setting)
    });

    return res.json(setting);
  } catch (error) {
    console.error('Update setting error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
