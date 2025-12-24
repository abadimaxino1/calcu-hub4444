const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { PERMISSIONS, hasPermission } = require('../rbac.cjs');
const { writeAuditLog } = require('../lib/audit.cjs');

// Middleware to check permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Forbidden: Missing permission ' + permission });
    }
    next();
  };
};

// ============================================
// Public API
// ============================================

// Cache invalidation helper
const invalidatePublicCalculatorsCache = () => {
  publicCache = null;
  lastCacheTime = 0;
};

// Get all published calculators (cached)
// Simple in-memory cache for public endpoint
let publicCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

router.get('/public', async (req, res) => {
  try {
    const now = Date.now();
    
    // Add caching headers
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');

    if (publicCache && (now - lastCacheTime < CACHE_TTL)) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(publicCache);
    }

    res.setHeader('X-Cache', 'MISS');
    const calculators = await prisma.calculator.findMany({
      where: { status: 'published' },
      orderBy: { nameAr: 'asc' }
    });

    // Map to small payload
    const result = calculators.map(c => ({
      key: c.key,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      routePath: c.routePath,
      config: c.configJson ? JSON.parse(c.configJson) : {},
      analyticsNamespace: c.analyticsNamespace,
      adProfileId: c.adProfileId
    }));

    publicCache = result;
    lastCacheTime = now;

    return res.json(result);
  } catch (error) {
    console.error('Get public calculators error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Admin API
// ============================================

// Get all calculators
router.get('/', requirePermission(PERMISSIONS.PRODUCT_CALCULATORS_MANAGE), async (req, res) => {
  try {
    const calculators = await prisma.calculator.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    return res.json(calculators);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create calculator
router.post('/', requirePermission(PERMISSIONS.PRODUCT_CALCULATORS_MANAGE), async (req, res) => {
  try {
    const { key, nameAr, nameEn, status, routePath, configJson, analyticsNamespace, adProfileId } = req.body;
    
    if (!key || !nameAr || !nameEn || !routePath) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await prisma.calculator.findUnique({ where: { key } });
    if (existing) return res.status(400).json({ error: 'Calculator key already exists' });

    const calculator = await prisma.calculator.create({
      data: {
        key,
        nameAr,
        nameEn,
        status: status || 'hidden',
        routePath,
        configJson: configJson || null,
        analyticsNamespace: analyticsNamespace || null,
        adProfileId: adProfileId || null,
        createdById: req.user.id,
        updatedById: req.user.id
      }
    });

    await writeAuditLog({
      action: 'CALCULATOR_CREATE',
      entityType: 'CALCULATOR',
      entityId: calculator.id,
      entityLabel: key,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      afterJson: JSON.stringify(calculator)
    });

    // Invalidate cache
    invalidatePublicCalculatorsCache();

    return res.json(calculator);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update calculator
router.put('/:id', requirePermission(PERMISSIONS.PRODUCT_CALCULATORS_MANAGE), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const before = await prisma.calculator.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'Calculator not found' });

    const updated = await prisma.calculator.update({
      where: { id },
      data: {
        ...data,
        updatedById: req.user.id
      }
    });

    await writeAuditLog({
      action: 'CALCULATOR_UPDATE',
      entityType: 'CALCULATOR',
      entityId: id,
      entityLabel: updated.key,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify(updated)
    });

    // Invalidate cache
    invalidatePublicCalculatorsCache();

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete calculator
router.delete('/:id', requirePermission(PERMISSIONS.PRODUCT_CALCULATORS_MANAGE), async (req, res) => {
  try {
    const { id } = req.params;
    const before = await prisma.calculator.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'Calculator not found' });

    await prisma.calculator.delete({ where: { id } });

    await writeAuditLog({
      action: 'CALCULATOR_DELETE',
      entityType: 'CALCULATOR',
      entityId: id,
      entityLabel: before.key,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before)
    });

    // Invalidate cache
    invalidatePublicCalculatorsCache();

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
