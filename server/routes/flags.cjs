const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');
const { writeAuditLog } = require('../lib/audit.cjs');

// Cache for feature flags
let flagsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

async function getFlagsWithRules() {
  const now = Date.now();
  if (flagsCache && (now - cacheTimestamp < CACHE_TTL)) {
    return flagsCache;
  }

  const flags = await prisma.featureFlag.findMany({
    include: { rules: true }
  });
  
  flagsCache = flags;
  cacheTimestamp = now;
  return flags;
}

// --- Admin Routes ---

// List all flags
router.get('/', requirePermission(PERMISSIONS.PRODUCT_FLAGS_MANAGE), async (req, res) => {
  try {
    const flags = await prisma.featureFlag.findMany({
      include: { rules: true }
    });
    res.json(flags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create flag
router.post('/', requirePermission(PERMISSIONS.PRODUCT_FLAGS_MANAGE), async (req, res) => {
  try {
    const { key, name, description, enabledByDefault } = req.body;
    const flag = await prisma.featureFlag.create({
      data: { key, name, description, enabledByDefault }
    });

    // Create default rules for each environment
    const environments = ['dev', 'staging', 'prod'];
    for (const env of environments) {
      await prisma.featureFlagRule.create({
        data: {
          flagId: flag.id,
          environment: env,
          enabled: enabledByDefault || false,
          rolloutPercentage: enabledByDefault ? 100 : 0,
          createdById: req.user.id
        }
      });
    }

    await writeAuditLog({
      action: 'FLAG_CREATE',
      entityType: 'FEATURE_FLAG',
      entityId: flag.id,
      entityLabel: flag.key,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      afterJson: JSON.stringify(flag)
    });

    flagsCache = null; // Invalidate cache
    res.status(201).json(flag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update flag
router.put('/:id', requirePermission(PERMISSIONS.PRODUCT_FLAGS_MANAGE), async (req, res) => {
  try {
    const { name, description, enabledByDefault } = req.body;
    const before = await prisma.featureFlag.findUnique({ where: { id: req.params.id } });
    
    const flag = await prisma.featureFlag.update({
      where: { id: req.params.id },
      data: { name, description, enabledByDefault }
    });

    await writeAuditLog({
      action: 'FLAG_UPDATE',
      entityType: 'FEATURE_FLAG',
      entityId: flag.id,
      entityLabel: flag.key,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify(flag)
    });

    flagsCache = null;
    res.json(flag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update rule
router.put('/:flagId/rules/:ruleId', requirePermission(PERMISSIONS.PRODUCT_FLAGS_MANAGE), async (req, res) => {
  try {
    const { enabled, rolloutPercentage, targetingJson, dependenciesJson } = req.body;
    const before = await prisma.featureFlagRule.findUnique({ where: { id: req.params.ruleId } });

    const rule = await prisma.featureFlagRule.update({
      where: { id: req.params.ruleId },
      data: { 
        enabled, 
        rolloutPercentage: parseInt(rolloutPercentage) || 0, 
        targetingJson: typeof targetingJson === 'string' ? targetingJson : JSON.stringify(targetingJson),
        dependenciesJson: typeof dependenciesJson === 'string' ? dependenciesJson : JSON.stringify(dependenciesJson),
        updatedById: req.user.id
      }
    });

    await writeAuditLog({
      action: 'FLAG_RULE_UPDATE',
      entityType: 'FEATURE_FLAG_RULE',
      entityId: rule.id,
      entityLabel: `Rule for ${req.params.flagId}`,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify(rule)
    });

    flagsCache = null;
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete flag
router.delete('/:id', requirePermission(PERMISSIONS.PRODUCT_FLAGS_MANAGE), async (req, res) => {
  try {
    const before = await prisma.featureFlag.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Flag not found' });

    await prisma.featureFlag.delete({ where: { id: req.params.id } });
    
    await writeAuditLog({
      action: 'FLAG_DELETE',
      entityType: 'FEATURE_FLAG',
      entityId: req.params.id,
      entityLabel: before.key,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before)
    });

    flagsCache = null;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Public Evaluation ---

router.get('/evaluate', async (req, res) => {
  try {
    const { env = 'prod', userId, country, role } = req.query;
    const flags = await getFlagsWithRules();
    
    const results = {};
    
    // First pass: basic evaluation without dependencies
    for (const flag of flags) {
      const rule = flag.rules.find(r => r.environment === env);
      if (!rule) {
        results[flag.key] = !!flag.enabledByDefault;
        continue;
      }

      if (!rule.enabled) {
        results[flag.key] = false;
        continue;
      }

      // Check targeting
      if (rule.targetingJson) {
        try {
          const targeting = JSON.parse(rule.targetingJson);
          let targeted = true;

          if (targeting.userIds && targeting.userIds.length > 0) {
            if (!userId || !targeting.userIds.includes(userId)) targeted = false;
          }
          if (targeted && targeting.countries && targeting.countries.length > 0) {
            if (!country || !targeting.countries.includes(country)) targeted = false;
          }
          if (targeted && targeting.roles && targeting.roles.length > 0) {
            if (!role || !targeting.roles.includes(role)) targeted = false;
          }

          if (!targeted) {
            results[flag.key] = false;
            continue;
          }
        } catch (e) {
          console.error('Failed to parse targeting JSON', e);
        }
      }

      // Rollout percentage
      if (rule.rolloutPercentage < 100) {
        if (rule.rolloutPercentage <= 0) {
          results[flag.key] = false;
          continue;
        }
        
        // Deterministic hash based on userId or random if no userId
        const seed = userId || Math.random().toString();
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
          hash = ((hash << 5) - hash) + seed.charCodeAt(i);
          hash |= 0; // Convert to 32bit integer
        }
        const bucket = Math.abs(hash) % 100;
        
        if (bucket >= rule.rolloutPercentage) {
          results[flag.key] = false;
          continue;
        }
      }

      results[flag.key] = true;
    }

    // Second pass: handle dependencies (simple one-level for now)
    for (const flag of flags) {
      const rule = flag.rules.find(r => r.environment === env);
      if (rule && rule.dependenciesJson && results[flag.key] === true) {
        try {
          const deps = JSON.parse(rule.dependenciesJson);
          if (Array.isArray(deps)) {
            const allDepsMet = deps.every(depKey => results[depKey] === true);
            if (!allDepsMet) {
              results[flag.key] = false;
            }
          }
        } catch (e) {
          console.error('Failed to parse dependencies JSON', e);
        }
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
