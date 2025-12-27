const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');
const { writeAuditLog } = require('../lib/audit.cjs');

// All routes require growth:seo:manage
router.use(requirePermission(PERMISSIONS.GROWTH_SEO_MANAGE));

// --- Redirects ---

router.get('/redirects', async (req, res) => {
  try {
    const redirects = await prisma.redirect.findMany();
    res.json(redirects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/redirects', async (req, res) => {
  try {
    const { fromPath, toPath, type, enabled } = req.body;
    
    // Conflict detection
    const existing = await prisma.redirect.findUnique({ where: { fromPath } });
    if (existing) {
      return res.status(400).json({ error: 'Redirect already exists for this path' });
    }

    const redirect = await prisma.redirect.create({
      data: { fromPath, toPath, type, enabled }
    });
    
    await writeAuditLog({
      action: 'SEO_REDIRECT_CREATE',
      entityType: 'REDIRECT',
      entityId: redirect.id,
      entityLabel: fromPath,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      afterJson: JSON.stringify(redirect)
    });

    res.status(201).json(redirect);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/redirects/:id', async (req, res) => {
  try {
    const before = await prisma.redirect.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });

    const redirect = await prisma.redirect.update({
      where: { id: req.params.id },
      data: req.body
    });

    await writeAuditLog({
      action: 'SEO_REDIRECT_UPDATE',
      entityType: 'REDIRECT',
      entityId: redirect.id,
      entityLabel: redirect.fromPath,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify(redirect)
    });

    res.json(redirect);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/redirects/:id', async (req, res) => {
  try {
    const before = await prisma.redirect.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });

    await prisma.redirect.delete({ where: { id: req.params.id } });

    await writeAuditLog({
      action: 'SEO_REDIRECT_DELETE',
      entityType: 'REDIRECT',
      entityId: req.params.id,
      entityLabel: before.fromPath,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before)
    });

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Broken Links ---

router.get('/broken-links', async (req, res) => {
  try {
    const links = await prisma.brokenLink.findMany({
      where: { isFixed: false }
    });
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/broken-links/scan', async (req, res) => {
  try {
    const { enqueueJob } = require('../lib/jobs.cjs');
    const run = await enqueueJob('BROKEN_LINK_CHECK', {}, req.user, req.requestId);
    res.json({ ok: true, jobId: run.id, message: 'Broken link scan enqueued' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SEO Config (Robots, Canonical) ---

router.get('/config', async (req, res) => {
  try {
    const configs = await prisma.seoGlobalSetting.findMany();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/config', async (req, res) => {
  try {
    const { key, value } = req.body;
    const config = await prisma.seoGlobalSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    await logAudit(req.user.id, 'UPDATE', 'SeoGlobalSetting', key, { value });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Schema Templates ---

router.get('/schema-templates', async (req, res) => {
  try {
    const templates = await prisma.schemaTemplate.findMany();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/schema-templates', async (req, res) => {
  try {
    const { name, template, description } = req.body;
    
    // Validate JSON parse
    try {
      JSON.parse(template);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON template' });
    }

    const schema = await prisma.schemaTemplate.create({
      data: { name, template, description }
    });
    await logAudit(req.user.id, 'CREATE', 'SchemaTemplate', schema.id, req.body);
    res.status(201).json(schema);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- OG Image Generator ---

router.get('/og-image', async (req, res) => {
  const { title } = req.query;
  if (!title) return res.status(400).send('Title is required');

  // In a real app, use canvas or sharp to generate an image
  // For now, we'll return a placeholder or a simple SVG
  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#4f46e5"/>
      <text x="50%" y="50%" font-family="Arial" font-size="60" fill="white" text-anchor="middle" dominant-baseline="middle">
        ${title}
      </text>
      <text x="50%" y="60%" font-family="Arial" font-size="30" fill="#c7d2fe" text-anchor="middle">
        calcu-hub.com
      </text>
    </svg>
  `;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
  res.send(svg);
});

module.exports = router;
