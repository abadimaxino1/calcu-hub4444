const { prisma } = require('../db.cjs');

// Masking rules: any key containing "secret", "token", "password", "apiKey", "key"
const SENSITIVE_PATTERN = /secret|token|password|apiKey|key/i;

function maskData(data) {
  if (!data) return data;
  if (typeof data !== 'object') return data;

  const masked = Array.isArray(data) ? [...data] : { ...data };
  
  const mask = (obj) => {
    for (const key in obj) {
      if (SENSITIVE_PATTERN.test(key)) {
        obj[key] = '***';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Deep copy to avoid mutating original if it's a nested object
        obj[key] = Array.isArray(obj[key]) ? [...obj[key]] : { ...obj[key] };
        mask(obj[key]);
      }
    }
  };
  
  mask(masked);
  return masked;
}

function calculateDiff(before, after) {
  if (!before || !after) return null;
  const diffs = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  for (const key of allKeys) {
    const bVal = before[key];
    const aVal = after[key];
    if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      diffs.push({
        path: key,
        before: bVal,
        after: aVal
      });
    }
  }
  return diffs.length > 0 ? diffs : null;
}

/**
 * Logs an audit entry.
 * If a job queue is available, it will attempt to queue the write.
 * Otherwise, it falls back to a minimal synchronous write.
 */
async function logAudit({
  req,
  action,
  entityType,
  entityId,
  entityLabel,
  beforeData,
  afterData,
  severity = 'info',
  metadata = {},
  actorUserId,
  actorRole,
  forceSync = false
}) {
  try {
    const maskedBefore = maskData(beforeData);
    const maskedAfter = maskData(afterData);
    const diff = calculateDiff(maskedBefore, maskedAfter);

    const auditData = {
      severity,
      actorUserId: actorUserId || req?.user?.id,
      actorRole: actorRole || req?.user?.role,
      actorIp: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId,
      sessionId: req?.sessionID || req?.cookies?.['session-id'],
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      entityLabel,
      beforeJson: maskedBefore ? JSON.stringify(maskedBefore) : null,
      afterJson: maskedAfter ? JSON.stringify(maskedAfter) : null,
      diffJson: diff ? JSON.stringify(diff) : null,
      metadataJson: JSON.stringify(metadata),
    };

    // Try to use the job queue for async writing if not forced sync
    if (!forceSync) {
      try {
        // Use the job system to write audit logs asynchronously
        const { enqueueJob } = require('./jobs.cjs');
        await enqueueJob('AUDIT_WRITE', auditData, { id: auditData.actorUserId, role: auditData.actorRole }, auditData.requestId);
        return;
      } catch (queueError) {
        console.warn('Failed to queue audit log, falling back to sync write:', queueError.message);
      }
    }

    // Fallback: Minimal synchronous write to avoid latency
    await prisma.auditLog.create({
      data: forceSync ? auditData : {
        ...auditData,
        beforeJson: null,
        afterJson: null,
        diffJson: null,
        metadataJson: JSON.stringify({ ...metadata, _fallback: true, _originalAction: action })
      }
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

/**
 * Legacy wrapper for writeAuditLog
 */
async function writeAuditLog(params) {
  return logAudit(params);
}

module.exports = {
  logAudit,
  writeAuditLog,
  maskData,
  calculateDiff
};
