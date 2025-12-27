const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { requirePermission, PERMISSIONS } = require('../rbac.cjs');
const { enqueueJob, scheduleJob } = require('../lib/jobs.cjs');
const { writeAuditLog } = require('../lib/audit.cjs');

/**
 * GET /api/admin/ops/jobs
 * List all job definitions
 */
router.get('/', requirePermission(PERMISSIONS.OPS_JOBS_VIEW), async (req, res) => {
  try {
    const definitions = await prisma.jobDefinition.findMany({
      include: {
        _count: {
          select: { runs: true }
        }
      },
      orderBy: { key: 'asc' }
    });
    res.json(definitions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/admin/ops/jobs/:key
 * Update job definition (enable/disable, scheduleCron)
 */
router.patch('/:key', requirePermission(PERMISSIONS.OPS_JOBS_SCHEDULE), async (req, res) => {
  try {
    const { key } = req.params;
    const { enabled, scheduleCron, description } = req.body;

    const oldDef = await prisma.jobDefinition.findUnique({ where: { key } });
    if (!oldDef) return res.status(404).json({ error: 'Job definition not found' });

    const definition = await prisma.jobDefinition.update({
      where: { key },
      data: {
        enabled: enabled !== undefined ? enabled : undefined,
        scheduleCron: scheduleCron !== undefined ? scheduleCron : undefined,
        description: description !== undefined ? description : undefined,
        updatedById: req.user.id
      }
    });

    // Update active schedule
    scheduleJob(definition);

    // Audit log
    await writeAuditLog({
      action: 'UPDATE',
      entityType: 'JOB_DEFINITION',
      entityId: key,
      entityLabel: definition.name,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      requestId: req.requestId,
      beforeJson: JSON.stringify(oldDef),
      afterJson: JSON.stringify(definition)
    });

    res.json(definition);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/ops/jobs/:key/run
 * Manually trigger a job
 */
router.post('/:key/run', requirePermission(PERMISSIONS.OPS_JOBS_RUN), async (req, res) => {
  try {
    const { key } = req.params;
    const { payload } = req.body;

    const run = await enqueueJob(key, payload || {}, req.user, req.requestId);
    res.json(run);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/ops/jobs/runs
 * List job runs with filters
 */
router.get('/runs', requirePermission(PERMISSIONS.OPS_JOBS_VIEW), async (req, res) => {
  try {
    const { status, jobKey, limit = 50, offset = 0 } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (jobKey) where.jobKey = jobKey;

    const [runs, total] = await Promise.all([
      prisma.jobRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          definition: {
            select: { name: true }
          }
        }
      }),
      prisma.jobRun.count({ where })
    ]);

    res.json({ runs, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/ops/jobs/runs/:id/retry
 * Retry a failed job
 */
router.post('/runs/:id/retry', requirePermission(PERMISSIONS.OPS_JOBS_RUN), async (req, res) => {
  try {
    const { id } = req.params;
    const oldRun = await prisma.jobRun.findUnique({ where: { id } });
    
    if (!oldRun) return res.status(404).json({ error: 'Job run not found' });

    const run = await prisma.jobRun.update({
      where: { id },
      data: {
        status: 'QUEUED',
        attempt: 1,
        startedAt: null,
        finishedAt: null,
        errorJson: null,
        resultJson: null,
        updatedAt: new Date()
      }
    });

    // Audit log
    await writeAuditLog({
      action: 'JOB_RETRY',
      entityType: 'JOB',
      entityId: id,
      entityLabel: `Retry ${oldRun.jobKey}`,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      requestId: req.requestId,
      beforeJson: JSON.stringify(oldRun),
      afterJson: JSON.stringify(run)
    });

    res.json(run);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;