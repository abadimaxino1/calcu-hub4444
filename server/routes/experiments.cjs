const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');
const { logAudit } = require('../lib/audit.cjs');

// All routes require growth:experiments:manage
router.use(requirePermission(PERMISSIONS.GROWTH_EXPERIMENTS_MANAGE));

router.get('/', async (req, res) => {
  try {
    const experiments = await prisma.experiment.findMany();
    res.json(experiments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const experiment = await prisma.experiment.create({ data: req.body });
    
    // Performance: Piggyback on feature flags
    // Create a corresponding feature flag for the experiment
    await prisma.featureFlag.create({
      data: {
        key: `exp_${experiment.key}`,
        name: `Experiment: ${experiment.name}`,
        description: `Auto-generated flag for experiment ${experiment.key}`,
        enabledByDefault: false
      }
    });

    await logAudit(req.user.id, 'CREATE', 'Experiment', experiment.id, req.body);
    res.status(201).json(experiment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const experiment = await prisma.experiment.update({
      where: { id: req.params.id },
      data: req.body
    });
    await logAudit(req.user.id, 'UPDATE', 'Experiment', experiment.id, req.body);
    res.json(experiment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const experiment = await prisma.experiment.findUnique({ where: { id: req.params.id } });
    if (experiment) {
      // Delete corresponding feature flag
      const flag = await prisma.featureFlag.findUnique({ where: { key: `exp_${experiment.key}` } });
      if (flag) {
        await prisma.featureFlag.delete({ where: { id: flag.id } });
      }
      await prisma.experiment.delete({ where: { id: req.params.id } });
      await logAudit(req.user.id, 'DELETE', 'Experiment', req.params.id);
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
