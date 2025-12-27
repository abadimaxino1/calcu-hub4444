const { prisma } = require('../db.cjs');
const { logAudit } = require('../lib/audit.cjs');

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Mapping of URL segments to Prisma models
const MODEL_MAP = {
  'content/pages': { model: 'staticPageContent', idField: 'id', labelField: 'slug' },
  'content/blog': { model: 'blogPost', idField: 'id', labelField: 'titleAr' },
  'content/faq': { model: 'fAQ', idField: 'id', labelField: 'questionAr' },
  'admin/users': { model: 'user', idField: 'id', labelField: 'email' },
  'ads/slots': { model: 'adSlot', idField: 'id', labelField: 'name' },
  'system/settings': { model: 'systemSetting', idField: 'key', labelField: 'key' },
  'system/features': { model: 'featureFlag', idField: 'id', labelField: 'name' },
};

async function auditMiddleware(req, res, next) {
  // Only audit mutating methods on API routes
  if (!MUTATING_METHODS.includes(req.method) || !req.path.startsWith('/api/')) {
    return next();
  }

  // Skip some specific routes that handle their own auditing or are too noisy
  if (req.path.includes('/api/analytics') || req.path.includes('/api/auth/login')) {
    return next();
  }

  // Try to identify the model and entity ID
  let modelInfo = null;
  let entityId = null;

  for (const [pattern, info] of Object.entries(MODEL_MAP)) {
    if (req.path.includes(pattern)) {
      modelInfo = info;
      
      // Extract ID from path (e.g., /api/content/pages/123)
      const parts = req.path.split('/');
      const lastPart = parts[parts.length - 1];
      const patternLastPart = pattern.split('/').pop();
      
      if (lastPart !== patternLastPart && lastPart.length > 2) {
        entityId = lastPart;
      } else if (req.body && req.body[info.idField]) {
        entityId = req.body[info.idField];
      }
      break;
    }
  }

  if (!modelInfo) {
    return next();
  }

  // Handle Bulk Actions
  if (req.path.includes('/bulk-action') || (req.body && Array.isArray(req.body.ids))) {
    return handleBulkAudit(req, res, next, modelInfo);
  }

  // Fetch "before" snapshot
  let beforeData = null;
  if (entityId) {
    try {
      beforeData = await prisma[modelInfo.model].findUnique({
        where: { [modelInfo.idField]: entityId }
      });
    } catch (e) {
      // Ignore fetch errors
    }
  }

  // Intercept response to capture "after" snapshot
  const originalJson = res.json;
  res.json = function (data) {
    res.json = originalJson;
    const result = res.json(data);
    
    // Log audit asynchronously
    if (res.statusCode >= 200 && res.statusCode < 300) {
      (async () => {
        try {
          const finalEntityId = entityId || data?.id || (data && data[modelInfo.model.toLowerCase()]?.id);
          let afterData = null;
          let entityLabel = null;

          if (finalEntityId) {
            afterData = await prisma[modelInfo.model].findUnique({
              where: { [modelInfo.idField]: finalEntityId }
            });
            entityLabel = afterData ? String(afterData[modelInfo.labelField] || finalEntityId) : null;
          }

          let action = 'UPDATE';
          if (req.method === 'POST') action = 'CREATE';
          if (req.method === 'DELETE') action = 'DELETE';
          if (req.path.includes('/restore')) action = 'RESTORE';

          await logAudit({
            req,
            action,
            entityType: modelInfo.model,
            entityId: finalEntityId,
            entityLabel,
            beforeData,
            afterData,
            severity: action === 'DELETE' ? 'warn' : 'info'
          });
        } catch (e) {
          console.error('Audit middleware capture error:', e);
        }
      })();
    }

    return result;
  };

  next();
}

async function handleBulkAudit(req, res, next, modelInfo) {
  const ids = req.body.ids || [];
  const action = req.body.action || 'BULK_ACTION';

  // Intercept response
  const originalJson = res.json;
  res.json = function (data) {
    res.json = originalJson;
    const result = res.json(data);

    if (res.statusCode >= 200 && res.statusCode < 300) {
      (async () => {
        try {
          // Log parent bulk action
          await logAudit({
            req,
            action: 'BULK_ACTION',
            entityType: modelInfo.model,
            entityLabel: `${action} on ${ids.length} items`,
            metadata: { ids, bulkAction: action },
            severity: action === 'delete' ? 'high' : 'info'
          });

          // Log individual child actions if list is small (< 50)
          if (ids.length > 0 && ids.length < 50) {
            for (const id of ids) {
              await logAudit({
                req,
                action: action.toUpperCase(),
                entityType: modelInfo.model,
                entityId: id,
                metadata: { partOfBulk: true },
                severity: action === 'delete' ? 'warn' : 'info'
              });
            }
          }
        } catch (e) {
          console.error('Bulk audit error:', e);
        }
      })();
    }
    return result;
  };

  next();
}

module.exports = auditMiddleware;
