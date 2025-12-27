const { prisma } = require('../db.cjs');
const { getBreaker } = require('./circuitBreaker.cjs');
const os = require('os');

let healthCache = null;
let lastCheckTime = 0;
const CACHE_TTL = 30000; // 30 seconds

async function getSystemHealth() {
  const now = Date.now();
  if (healthCache && (now - lastCheckTime < CACHE_TTL)) {
    return healthCache;
  }

  const health = {
    db: await checkDbHealth(),
    queue: await checkQueueHealth(),
    externalProviders: await checkExternalProviders(),
    app: getAppMetrics(),
    timestamp: new Date().toISOString()
  };

  healthCache = health;
  lastCheckTime = now;
  return health;
}

async function checkDbHealth() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'OK',
      latencyMs: Date.now() - start,
      lastOkAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'ERROR',
      error: error.message,
      latencyMs: Date.now() - start
    };
  }
}

async function checkQueueHealth() {
  try {
    const [pendingCount, failedCount, workersOnline] = await Promise.all([
      prisma.job.count({ where: { status: 'PENDING' } }),
      prisma.job.count({ where: { status: 'FAILED' } }),
      // In this simple setup, "workers" are just the server instances. 
      // We'll assume 1 for now or check recent job activity.
      Promise.resolve(1) 
    ]);

    return {
      status: pendingCount > 100 ? 'DEGRADED' : 'OK',
      workersOnline,
      pendingCount,
      failedCount,
      lastOkAt: new Date().toISOString()
    };
  } catch (error) {
    return { status: 'ERROR', error: error.message };
  }
}

async function checkExternalProviders() {
  const providers = {
    analytics: { url: 'https://www.google-analytics.com', timeout: 2000 },
    ads: { url: 'https://adservice.google.com', timeout: 2000 },
    ai: { url: 'https://api.openai.com/v1/models', timeout: 2000 } // Example
  };

  const results = {};

  for (const [name, config] of Object.entries(providers)) {
    const breaker = getBreaker(`provider_${name}`, { failureThreshold: 3, resetTimeout: 60000 });
    
    try {
      results[name] = await breaker.execute(async () => {
        const start = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        try {
          await fetch(config.url, { 
            method: 'HEAD', 
            signal: controller.signal,
            credentials: 'omit'
          });
          return {
            status: 'OK',
            latencyMs: Date.now() - start,
            lastOkAt: new Date().toISOString()
          };
        } finally {
          clearTimeout(timeoutId);
        }
      });
    } catch (error) {
      results[name] = {
        status: 'DEGRADED',
        error: error.message,
        lastFailureAt: new Date().toISOString()
      };
    }
  }

  return results;
}

function getAppMetrics() {
  const uptime = process.uptime();
  const mem = process.memoryUsage();
  const load = os.loadavg();

  return {
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor(uptime),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB'
    },
    cpuLoad: load[0].toFixed(2)
  };
}

module.exports = { getSystemHealth };
