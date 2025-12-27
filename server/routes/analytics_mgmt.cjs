const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');

// All routes require growth:analytics:manage
router.use(requirePermission(PERMISSIONS.GROWTH_ANALYTICS_MANAGE));

// --- Analytics Events ---

router.get('/events', async (req, res) => {
  try {
    const events = await prisma.analyticsEvent.findMany({
      include: { properties: true }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/events', async (req, res) => {
  try {
    const { key, name, description, category, enabled, properties } = req.body;
    const event = await prisma.analyticsEvent.create({
      data: { key, name, description, category, enabled }
    });

    if (properties && Array.isArray(properties)) {
      for (const prop of properties) {
        await prisma.analyticsEventProperty.create({
          data: { ...prop, eventId: event.id }
        });
      }
    }

    const finalEvent = await prisma.analyticsEvent.findUnique({
      where: { id: event.id },
      include: { properties: true }
    });
    res.status(201).json(finalEvent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/events/:id', async (req, res) => {
  try {
    const { key, name, description, category, enabled } = req.body;
    const event = await prisma.analyticsEvent.update({
      where: { id: req.params.id },
      data: { key, name, description, category, enabled }
    });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/events/:id', async (req, res) => {
  try {
    await prisma.analyticsEvent.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Analytics Providers ---

router.get('/providers', async (req, res) => {
  try {
    const providers = await prisma.analyticsProvider.findMany();
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/providers', async (req, res) => {
  try {
    const { key, enabled, settingsJson } = req.body;
    const provider = await prisma.analyticsProvider.upsert({
      where: { key },
      update: { enabled, settingsJson },
      create: { key, enabled, settingsJson }
    });
    res.json(provider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/providers/:key/test', async (req, res) => {
  try {
    const { key } = req.params;
    const { eventName, properties } = req.body;
    
    // In a real app, this would trigger a test event to the provider's API
    // For now, we'll just log it and return success
    console.log(`[Analytics Test] Provider: ${key}, Event: ${eventName}`, properties);
    
    res.json({ ok: true, message: `Test event sent to ${key}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Funnels ---

router.get('/funnels', async (req, res) => {
  try {
    const funnels = await prisma.funnel.findMany();
    res.json(funnels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/funnels', async (req, res) => {
  try {
    const { key, name, stepsJson, scope } = req.body;
    const funnel = await prisma.funnel.create({
      data: { key, name, stepsJson, scope }
    });
    res.status(201).json(funnel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/funnels/:id', async (req, res) => {
  try {
    const funnel = await prisma.funnel.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(funnel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/funnels/:id', async (req, res) => {
  try {
    await prisma.funnel.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Cohorts ---

router.get('/cohorts', async (req, res) => {
  try {
    const cohorts = await prisma.cohort.findMany();
    res.json(cohorts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/cohorts', async (req, res) => {
  try {
    const { key, name, ruleJson } = req.body;
    const cohort = await prisma.cohort.create({
      data: { key, name, ruleJson }
    });
    res.status(201).json(cohort);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/cohorts/:id', async (req, res) => {
  try {
    const cohort = await prisma.cohort.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(cohort);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/cohorts/:id', async (req, res) => {
  try {
    await prisma.cohort.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
