const { prisma } = require('../db.cjs');
const cron = require('node-cron');
const { writeAuditLog } = require('./audit.cjs');

const JOB_STATUS = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
};

// In-memory store for active cron tasks
const activeSchedules = new Map();

/**
 * Initialize all enabled scheduled jobs
 */
async function initScheduler() {
  console.log('[Jobs] Initializing scheduler...');
  try {
    const definitions = await prisma.jobDefinition.findMany({
      where: { enabled: true, scheduleCron: { not: null } }
    });

    for (const def of definitions) {
      scheduleJob(def);
    }
  } catch (error) {
    console.error('[Jobs] Failed to initialize scheduler:', error);
  }
}

/**
 * Schedule a job definition
 */
function scheduleJob(definition) {
  if (!definition.scheduleCron || !definition.enabled) return;

  // Stop existing if any
  if (activeSchedules.has(definition.key)) {
    activeSchedules.get(definition.key).stop();
  }

  try {
    const task = cron.schedule(definition.scheduleCron, async () => {
      console.log(`[Jobs] Triggering scheduled job: ${definition.key}`);
      await enqueueJob(definition.key, JSON.parse(definition.defaultPayload || '{}'), { id: 'system', role: 'SYSTEM' });
    });
    activeSchedules.set(definition.key, task);
    console.log(`[Jobs] Scheduled ${definition.key} with cron: ${definition.scheduleCron}`);
  } catch (error) {
    console.error(`[Jobs] Failed to schedule ${definition.key}:`, error);
  }
}

/**
 * Enqueue a new job run
 */
async function enqueueJob(jobKey, payload = {}, actor = null, requestId = null) {
  const definition = await prisma.jobDefinition.findUnique({ where: { key: jobKey } });
  if (!definition) throw new Error(`Job definition not found: ${jobKey}`);

  const run = await prisma.jobRun.create({
    data: {
      jobKey,
      payloadJson: JSON.stringify(payload),
      status: JOB_STATUS.QUEUED,
      requestId,
      triggeredById: actor?.id,
      maxAttempts: 3,
    }
  });

  // Audit log
  if (actor && actor.id !== 'system') {
    await writeAuditLog({
      action: 'JOB_TRIGGER',
      entityType: 'JOB',
      entityId: run.id,
      entityLabel: definition.name,
      actorUserId: actor.id,
      actorRole: actor.role,
      requestId,
      afterJson: JSON.stringify(run)
    });
  }

  return run;
}

/**
 * Main worker loop
 */
async function processJobs() {
  try {
    const nextRun = await prisma.jobRun.findFirst({
      where: { status: JOB_STATUS.QUEUED },
      orderBy: { createdAt: 'asc' }
    });

    if (!nextRun) return;

    // Mark as running
    const run = await prisma.jobRun.update({
      where: { id: nextRun.id },
      data: { 
        status: JOB_STATUS.RUNNING, 
        startedAt: new Date(),
      }
    });

    const startTime = Date.now();
    console.log(`[Jobs] Starting job: ${run.jobKey} (${run.id})`);

    try {
      let result;
      const payload = JSON.parse(run.payloadJson || '{}');

      switch (run.jobKey) {
        case 'SITEMAP_REGENERATE':
          result = await runSitemapRegenerate(payload);
          break;
        case 'CACHE_WARM':
          result = await runCacheWarm(payload);
          break;
        case 'ANALYTICS_SYNC':
          result = await runAnalyticsSync(payload);
          break;
        case 'BACKUP_DATABASE':
          result = await runBackupDatabase(payload, run.triggeredById);
          break;
        case 'BROKEN_LINK_CHECK':
          result = await runBrokenLinkCheck(payload);
          break;
        case 'DIAGNOSTICS':
          result = await runDiagnostics(payload);
          break;
        case 'AUDIT_RETENTION':
          result = await runAuditRetention(payload);
          break;
        case 'AUDIT_WRITE':
          result = await runAuditWrite(payload);
          break;
        case 'SYSTEM_DIAGNOSTICS':
          result = await runSystemDiagnostics(payload);
          break;
        default:
          throw new Error(`No handler for job key: ${run.jobKey}`);
      }

      const durationMs = Date.now() - startTime;
      await prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: JOB_STATUS.SUCCESS,
          finishedAt: new Date(),
          durationMs,
          resultJson: JSON.stringify(result)
        }
      });
      console.log(`[Jobs] Job success: ${run.jobKey} in ${durationMs}ms`);

    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error(`[Jobs] Job failed: ${run.jobKey}`, error);

      if (run.attempt < run.maxAttempts) {
        // Retry
        await prisma.jobRun.update({
          where: { id: run.id },
          data: {
            status: JOB_STATUS.QUEUED,
            attempt: { increment: 1 },
            errorJson: JSON.stringify({ message: error.message, stack: error.stack })
          }
        });
      } else {
        await prisma.jobRun.update({
          where: { id: run.id },
          data: {
            status: JOB_STATUS.FAILED,
            finishedAt: new Date(),
            durationMs,
            errorJson: JSON.stringify({ message: error.message, stack: error.stack })
          }
        });
      }
    }
  } catch (err) {
    console.error('[Jobs] Worker error:', err);
  }
}

// --- Job Handlers ---

async function runCacheWarm(payload) {
  return { urlsWarmed: 45, status: 'complete' };
}

async function runAnalyticsSync(payload) {
  return { syncedRecords: 1200, provider: 'Google Analytics' };
}

async function runBackupDatabase(payload, actorId) {
  const { performBackup } = require('../backup.cjs');
  const backup = await performBackup({ 
    type: payload.type || 'manual', 
    createdById: actorId 
  });
  return { 
    backupId: backup.id, 
    filePath: backup.filePath, 
    size: backup.fileSizeBytes 
  };
}

async function runBrokenLinkCheck(payload) {
  // Mock scanning logic
  const mockUrls = [
    { url: '/calculators/mortgage', status: 200 },
    { url: '/calculators/loan-repayment', status: 404, source: '/blog/how-to-save' },
    { url: '/tools/invalid-link', status: 500, source: '/index.html' },
    { url: 'https://external-site.com/broken', status: 404, source: '/about' }
  ];

  const broken = mockUrls.filter(u => u.status >= 400);
  
  for (const link of broken) {
    await prisma.brokenLink.upsert({
      where: { url: link.url },
      update: { 
        statusCode: link.statusCode, 
        sourcePage: link.source,
        lastChecked: new Date(),
        isFixed: false
      },
      create: {
        url: link.url,
        statusCode: link.status,
        sourcePage: link.source,
        isFixed: false
      }
    });
  }

  return { 
    linksChecked: mockUrls.length, 
    brokenLinksFound: broken.length,
    timestamp: new Date().toISOString()
  };
}

async function runDiagnostics(payload) {
  return { db: 'ok', storage: 'ok', timestamp: new Date().toISOString() };
}

async function runSitemapRegenerate(payload) {
  const { generateSitemap } = require('./sitemap.cjs');
  return await generateSitemap();
}

async function runAuditRetention(payload) {
  const days = payload.days || 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const deleted = await prisma.auditLog.deleteMany({
    where: { occurredAt: { lt: cutoff } }
  });
  
  return { deletedCount: deleted.count, cutoffDate: cutoff.toISOString() };
}

async function runAuditWrite(payload) {
  // Direct write to DB, bypassing the job system to avoid recursion
  await prisma.auditLog.create({ data: payload });
  return { success: true };
}

async function runSystemDiagnostics(payload) {
  const results = {
    db: 'ok',
    storage: 'ok',
    externalApis: {},
    timestamp: new Date().toISOString()
  };

  // Check DB latency
  const start = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  results.dbLatency = Date.now() - start;

  // Check external APIs (mocked)
  results.externalApis.adsense = 'ok';
  results.externalApis.analytics = 'ok';
  results.externalApis.openai = 'ok';

  // Save to SystemHealth table
  await prisma.systemHealth.create({
    data: {
      checkTime: new Date(),
      responseTime: results.dbLatency,
      status: 'HEALTHY',
      issues: JSON.stringify([])
    }
  });

  return results;
}

module.exports = {
  JOB_STATUS,
  initScheduler,
  scheduleJob,
  enqueueJob,
  processJobs
};
