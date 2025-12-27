const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { requirePermission, PERMISSIONS } = require('../rbac.cjs');
const Sentry = require("@sentry/node");
const { enqueueJob } = require('../lib/jobs.cjs');
const jobsRoutes = require('./jobs.cjs');
const backupRoutes = require('./backups.cjs');

// Sub-routers for Ops
router.use('/jobs', jobsRoutes);
router.use('/backups', backupRoutes);

/**
 * GET /api/admin/ops/health
 * Fast, cached health summary
 */
router.get('/health', requirePermission(PERMISSIONS.OPS_HEALTH_VIEW), async (req, res) => {
  try {
    // Try to get latest health check from DB
    const latestHealth = await prisma.systemHealth.findFirst({
      orderBy: { checkTime: 'desc' }
    });

    // If no health check in last 5 minutes, return stale or trigger background check
    const isStale = !latestHealth || (new Date() - new Date(latestHealth.checkTime)) > 5 * 60 * 1000;

    res.json({
      status: latestHealth?.status || 'UNKNOWN',
      lastCheck: latestHealth?.checkTime,
      isStale,
      metrics: {
        cpu: latestHealth?.cpuUsage,
        memory: latestHealth?.memoryUsage,
        dbLatency: latestHealth?.responseTime,
        activeUsers: latestHealth?.activeUsers
      },
      issues: latestHealth?.issues ? JSON.parse(latestHealth.issues) : []
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health status' });
  }
});

/**
 * POST /api/admin/ops/diagnostics/run
 * Enqueue deep checks as Jobs
 */
router.post('/diagnostics/run', requirePermission(PERMISSIONS.OPS_DIAGNOSTICS_RUN), async (req, res) => {
  try {
    const run = await enqueueJob('SYSTEM_DIAGNOSTICS', {}, req.user, req.requestId);
    res.json({ ok: true, jobId: run.id, message: 'Diagnostics job enqueued' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger diagnostics' });
  }
});

/**
 * GET /api/admin/ops/errors
 * Fetches recent errors from local ErrorEvent table
 */
router.get('/errors', requirePermission(PERMISSIONS.OPS_ERRORS_VIEW), async (req, res) => {
  try {
    const { status, level, take = 50, skip = 0 } = req.query;
    
    const where = {};
    if (status === 'resolved') where.isResolved = true;
    if (status === 'unresolved') where.isResolved = false;
    if (level) where.level = level;

    const errors = await prisma.errorEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: parseInt(take),
      skip: parseInt(skip)
    });

    const total = await prisma.errorEvent.count({ where });

    res.json({ errors, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch error logs' });
  }
});

/**
 * PATCH /api/admin/ops/errors/:id
 * Resolve/Unresolve an error
 */
router.patch('/errors/:id', requirePermission(PERMISSIONS.OPS_ERRORS_MANAGE), async (req, res) => {
  try {
    const { id } = req.params;
    const { isResolved } = req.body;

    const error = await prisma.errorEvent.update({
      where: { id },
      data: {
        isResolved: !!isResolved,
        resolvedAt: isResolved ? new Date() : null,
        resolvedById: isResolved ? req.user.id : null
      }
    });

    res.json(error);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update error' });
  }
});

/**
 * POST /api/admin/ops/errors/test
 * Manually trigger an error for testing the pipeline
 */
router.post('/errors/test', requirePermission(PERMISSIONS.OPS_DIAGNOSTICS_RUN), (req, res) => {
  const { message = "Manual test error from Admin UI", level = "error" } = req.body;
  
  try {
    Sentry.withScope(scope => {
      scope.setLevel(level);
      scope.setTag("manual_test", "true");
      scope.setUser({ id: req.user.id, role: req.user.role });
      Sentry.captureMessage(message);
    });
    
    res.json({ ok: true, message: "Test error captured by Sentry" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;