const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');
const { performBackup, restoreBackup } = require('../backup.cjs');
const { enqueueJob } = require('../lib/jobs.cjs');

// List backups
router.get('/', requirePermission(PERMISSIONS.OPS_BACKUP_READ), async (req, res) => {
  try {
    const backups = await prisma.backup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download backup
router.get('/:id/download', requirePermission(PERMISSIONS.OPS_BACKUP_READ), async (req, res) => {
  try {
    const backup = await prisma.backup.findUnique({ where: { id: req.params.id } });
    if (!backup) return res.status(404).json({ error: 'Backup not found' });

    const path = require('path');
    const fs = require('fs');
    const filePath = path.join(__dirname, '..', '..', 'backups', backup.filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file missing on disk' });
    }

    res.download(filePath, backup.filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger manual backup
router.post('/', requirePermission(PERMISSIONS.OPS_BACKUP_CREATE), async (req, res) => {
  try {
    const run = await enqueueJob('BACKUP_DATABASE', { type: 'manual' }, req.user, req.id);
    res.json({ message: 'Backup job enqueued', jobId: run.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore from backup
router.post('/:id/restore', requirePermission(PERMISSIONS.OPS_BACKUP_RESTORE), async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Unauthorized: Only SUPER_ADMIN can restore backups' });
  }

  const { confirmation } = req.body || {};
  
  if (confirmation !== 'RESTORE') {
    return res.status(400).json({ error: 'Invalid confirmation phrase. Must be "RESTORE".' });
  }

  try {
    const result = await restoreBackup(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get backup schedule
router.get('/schedule', requirePermission(PERMISSIONS.OPS_BACKUP_READ), async (req, res) => {
  try {
    let schedule = await prisma.backupSchedule.findFirst();
    if (!schedule) {
      // Create default if not exists
      schedule = await prisma.backupSchedule.upsert({
        where: { id: 'default' },
        update: {},
        create: { id: 'default', cron: '0 0 * * *', retentionCount: 7, enabled: true }
      });
    }
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update backup schedule
router.put('/schedule', requirePermission(PERMISSIONS.OPS_BACKUP_MANAGE), async (req, res) => {
  const { cron, retentionCount, enabled } = req.body;
  try {
    const schedule = await prisma.backupSchedule.upsert({
      where: { id: 'default' },
      update: { cron, retentionCount, enabled },
      create: { id: 'default', cron, retentionCount, enabled }
    });
    
    // Update the job definition for scheduled backups if it exists
    await prisma.jobDefinition.update({
      where: { key: 'BACKUP_DATABASE' },
      data: { 
        scheduleCron: enabled ? cron : null,
        enabled: enabled
      }
    });

    // Re-schedule in the worker
    const { scheduleJob } = require('../lib/jobs.cjs');
    const def = await prisma.jobDefinition.findUnique({ where: { key: 'BACKUP_DATABASE' } });
    if (def) scheduleJob(def);

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
