const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const aiService = require('../lib/ai.cjs');
const { writeAuditLog } = require('../lib/audit.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');

// Middleware to check ai:manage permission
router.use(requirePermission(PERMISSIONS.AI_MANAGE));

// --- Templates ---

router.get('/templates', async (req, res) => {
  try {
    const templates = await prisma.aiPromptTemplate.findMany();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const { key, name, purpose } = req.body;
    const template = await prisma.aiPromptTemplate.create({
      data: { key, name, purpose }
    });
    
    await writeAuditLog({
      action: 'AI_TEMPLATE_CREATE',
      entityType: 'AI_PROMPT_TEMPLATE',
      entityId: template.id,
      entityLabel: key,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      afterJson: JSON.stringify(template)
    });

    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/templates/:id', async (req, res) => {
  try {
    const before = await prisma.aiPromptTemplate.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });

    const template = await prisma.aiPromptTemplate.update({
      where: { id: req.params.id },
      data: req.body
    });

    await writeAuditLog({
      action: 'AI_TEMPLATE_UPDATE',
      entityType: 'AI_PROMPT_TEMPLATE',
      entityId: template.id,
      entityLabel: template.key,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify(template)
    });

    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Usage Logs ---

router.get('/usage', async (req, res) => {
  try {
    const { featureKey, take = 100 } = req.query;
    const where = {};
    if (featureKey) where.featureKey = featureKey;

    const logs = await prisma.aiUsageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(take)
    });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Fallback Rules ---

router.get('/fallbacks', async (req, res) => {
  try {
    const rules = await prisma.aiFallbackRule.findMany();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/fallbacks', async (req, res) => {
  try {
    const { featureKey, primaryProvider, fallbackChainJson, timeoutMs, maxRetries } = req.body;
    
    const before = await prisma.aiFallbackRule.findUnique({ where: { featureKey } });

    const rule = await prisma.aiFallbackRule.upsert({
      where: { featureKey },
      update: { primaryProvider, fallbackChainJson: JSON.stringify(fallbackChainJson), timeoutMs, maxRetries },
      create: { featureKey, primaryProvider, fallbackChainJson: JSON.stringify(fallbackChainJson), timeoutMs, maxRetries }
    });

    await writeAuditLog({
      action: before ? 'AI_FALLBACK_UPDATE' : 'AI_FALLBACK_CREATE',
      entityType: 'AI_FALLBACK_RULE',
      entityId: rule.id,
      entityLabel: featureKey,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: before ? JSON.stringify(before) : null,
      afterJson: JSON.stringify(rule)
    });

    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Usage Logs ---

router.get('/usage', async (req, res) => {
  try {
    const { featureKey, provider, take = 50 } = req.query;
    const logs = await prisma.aiUsageLog.findMany({
      where: { featureKey, provider },
      take: parseInt(take),
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Fallback Rules ---

router.get('/fallback', async (req, res) => {
  try {
    const rules = await prisma.aiFallbackRule.findMany();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/fallback', async (req, res) => {
  try {
    const rule = await prisma.aiFallbackRule.create({ data: req.body });
    
    await auditLog({
      adminUserId: req.user.id,
      actionType: 'CREATE',
      targetType: 'AiFallbackRule',
      targetId: rule.id,
      detailsJson: JSON.stringify(rule)
    });

    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/fallback/:id', async (req, res) => {
  try {
    const rule = await prisma.aiFallbackRule.update({
      where: { id: req.params.id },
      data: req.body
    });

    await auditLog({
      adminUserId: req.user.id,
      actionType: 'UPDATE',
      targetType: 'AiFallbackRule',
      targetId: rule.id,
      detailsJson: JSON.stringify(req.body)
    });

    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Test Execution ---

router.post('/test', async (req, res) => {
  try {
    const { featureKey, variables, options } = req.body;
    const result = await aiService.execute(featureKey, variables, {
      ...options,
      userId: req.user.id
    });
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
