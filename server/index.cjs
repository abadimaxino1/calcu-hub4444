// Main Express server - Production Ready Version
// Using Prisma for database, RBAC for access control

require('dotenv').config();

const Sentry = require("@sentry/node");
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Initialize Sentry
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || "https://placeholder@sentry.io/123",
    integrations: [
      Sentry.httpIntegration({ tracing: true }),
      Sentry.expressIntegration({ app }),
    ],
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    release: process.env.RELEASE_VERSION || "1.0.0",
    beforeSend(event) {
      // Sanitize request body
      if (event.request && event.request.data) {
        try {
          const data = typeof event.request.data === 'string' ? JSON.parse(event.request.data) : event.request.data;
          const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'key'];
          const sanitize = (obj) => {
            for (const key in obj) {
              if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
                obj[key] = '[MASKED]';
              } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitize(obj[key]);
              }
            }
          };
          sanitize(data);
          event.request.data = JSON.stringify(data);
        } catch (e) {
          event.request.data = '[UNPARSABLE]';
        }
      }
      return event;
    },
  });
}

const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const requestIdMiddleware = require('./middleware/requestId.cjs');
const auditMiddleware = require('./middleware/audit.cjs');
const { processJobs, initScheduler } = require('./lib/jobs.cjs');

// Import database and routes
const { prisma } = require('./db.cjs');
const { PERMISSIONS, hasPermission } = require('./rbac.cjs');
const authRoutes = require('./routes/auth.cjs');
const userRoutes = require('./routes/users.cjs');
const analyticsRoutes = require('./routes/analytics.cjs');
const contentRoutes = require('./routes/content.cjs');
const contentPublicRoutes = require('./routes/content_public.cjs');
const seoRoutes = require('./routes/seo.cjs');
const adsRoutes = require('./routes/ads.cjs');
const settingsRoutes = require('./routes/settings.cjs');
const monetizationRoutes = require('./routes/monetization.cjs');
const cmsRoutes = require('./routes/cms.cjs');
const calculatorRoutes = require('./routes/calculators.cjs');
const flagRoutes = require('./routes/flags.cjs');
const analyticsMgmtRoutes = require('./routes/analytics_mgmt.cjs');
const adsMgmtRoutes = require('./routes/ads_mgmt.cjs');
const experimentRoutes = require('./routes/experiments.cjs');
const seoMgmtRoutes = require('./routes/seo_mgmt.cjs');
const aiMgmtRoutes = require('./routes/ai_mgmt.cjs');
const adminRoutes = require('./routes/admin.cjs');
const aiRoutes = require('./routes/ai.cjs');
const opsRoutes = require('./routes/ops.cjs');
const auditLogRoutes = require('./routes/audit.cjs');
const { scheduleBackup } = require('./backup.cjs');

const PORT = process.env.PORT || 4000;

// ============================================
// Middleware Setup
// ============================================

app.use(requestIdMiddleware);
app.use(auditMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(compression());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan(process.env.LOG_FORMAT || 'dev'));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // CSP
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https:",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://pagead2.googlesyndication.com",
    "frame-src https://googleads.g.doubleclick.net https://www.google.com",
    "frame-ancestors 'none'",
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  
  next();
});

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);

// ============================================
// Authentication Middleware
// ============================================

async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies.calcu_admin;
    
    if (!token) {
      req.user = null;
      return next();
    }

    const session = await prisma.session.findUnique({
      where: { token },
    });

    const expiresAt = session?.expiresAt ? new Date(session.expiresAt) : null;
    if (!session || !expiresAt || expiresAt < new Date()) {
      req.user = null;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.isActive) {
      req.user = null;
      return next();
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.user = null;
    next();
  }
}

// Apply auth middleware to all routes
app.use(authMiddleware);

// Require authentication middleware
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// ============================================
// Protected Routes Check
// ============================================

// Protect test/debug routes
app.use((req, res, next) => {
  const protectedPrefixes = ['/tests', '/test', '/vitest', '/playwright', '/cypress', '/__tests__', '/__debug__', '/debug'];
  const path = req.path || req.url || '';
  
  for (const p of protectedPrefixes) {
    if (path.startsWith(p)) {
      if (!req.user || !hasPermission(req.user.role, PERMISSIONS.TESTS_VIEW)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      break;
    }
  }
  
  next();
});

// ============================================
// Public Static Files
// ============================================

app.get('/sitemap.xml', (req, res) => {
  const sitemapPath = path.join(__dirname, 'runtime', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(sitemapPath);
  }
  res.status(404).send('Sitemap not generated yet');
});

app.get('/robots.txt', (req, res) => {
  const robotsPath = path.join(__dirname, 'runtime', 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(robotsPath);
  }
  res.setHeader('Content-Type', 'text/plain');
  res.send("User-agent: *\nDisallow: /admin\nDisallow: /api/admin\n");
});

// ============================================
// API Routes
// ============================================

// Auth routes
app.use('/api/auth', authLimiter, authRoutes);

// Admin Management
app.use('/api/admin/users', requireAuth, userRoutes);
app.use('/api/admin/audit-logs', requireAuth, auditLogRoutes);
app.use('/api/admin/calculators', requireAuth, calculatorRoutes);
app.use('/api/admin/flags', requireAuth, flagRoutes);
app.use('/api/admin/settings', requireAuth, settingsRoutes);

// Ops & Health
app.use('/api/admin/ops', requireAuth, opsRoutes);

// Growth & Marketing
app.use('/api/admin/growth/analytics', requireAuth, analyticsMgmtRoutes);
app.use('/api/admin/growth/experiments', requireAuth, experimentRoutes);
app.use('/api/admin/growth/seo', requireAuth, seoMgmtRoutes);

// Revenue & Ads
app.use('/api/admin/revenue/ads', requireAuth, adsMgmtRoutes);
app.use('/api/admin/monetization', requireAuth, monetizationRoutes);

// AI Management
app.use('/api/admin/ai', requireAuth, aiMgmtRoutes);

// Content & CMS
app.use('/api/admin/content', requireAuth, contentRoutes);
app.use('/api/admin/cms', requireAuth, cmsRoutes);
app.use('/api/content', contentPublicRoutes);

// Public & Mixed APIs
app.use('/api/calculators', calculatorRoutes);
app.use('/api/flags', flagRoutes);
app.use('/api/analytics', trackingLimiter, analyticsRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/ai', requireAuth, aiRoutes);

// Simple health check without auth
app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================
// Aliases & Legacy Compatibility
// ============================================

// Forward /admin/audit-logs to /api/admin/audit-logs
app.get('/admin/audit-logs', (req, res) => res.redirect('/api/admin/audit-logs'));
app.get('/admin/backups', (req, res) => res.redirect('/api/admin/ops/backups'));
app.get('/admin/jobs', (req, res) => res.redirect('/api/admin/ops/jobs'));
app.get('/admin/health', (req, res) => res.redirect('/api/admin/ops/health'));

// Legacy check endpoint
app.get('/api/admin/check', async (req, res) => {
  if (!req.user) {
    return res.json({ ok: false });
  }
  
  return res.json({
    ok: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      username: req.user.name, // backward compat
      roles: [req.user.role], // backward compat
    },
  });
});

// Legacy log endpoint
app.post('/api/log', trackingLimiter, async (req, res) => {
  try {
    const ev = req.body || {};
    const sessionId = ev.sessionId || 'anonymous';
    
    if (ev.type === 'pageview') {
      await prisma.pageView.create({
        data: {
          sessionId,
          pagePath: ev.path || '/',
          referrer: ev.referrer,
          userAgent: req.headers['user-agent'],
        },
      });
    } else if (ev.type === 'calculator') {
      await prisma.calculationEvent.create({
        data: {
          sessionId,
          calculatorType: ev.tool || ev.payload?.name || 'unknown',
          inputSummary: JSON.stringify(ev.payload?.inputs || {}),
          resultSummary: JSON.stringify(ev.payload?.results || {}),
        },
      });
    }
    
    return res.json({ ok: true });
  } catch (error) {
    console.error('Log error:', error);
    return res.json({ ok: true }); // Don't expose errors
  }
});

// ============================================
// SEO Routes
// ============================================

// Dynamic sitemap
app.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.SITE_URL || 'https://calcuhub.com';
    
    const blogPosts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    });

    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/calculator/salary', priority: '0.9', changefreq: 'weekly' },
      { url: '/calculator/eos', priority: '0.9', changefreq: 'weekly' },
      { url: '/calculator/workhours', priority: '0.9', changefreq: 'weekly' },
      { url: '/calculator/dates', priority: '0.8', changefreq: 'weekly' },
      { url: '/tools', priority: '0.8', changefreq: 'weekly' },
      { url: '/faq', priority: '0.7', changefreq: 'monthly' },
      { url: '/blog', priority: '0.7', changefreq: 'daily' },
      { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
      { url: '/terms', priority: '0.3', changefreq: 'yearly' },
      { url: '/about', priority: '0.5', changefreq: 'monthly' },
    ];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    for (const page of staticPages) {
      sitemap += `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    for (const post of blogPosts) {
      sitemap += `  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${post.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    }

    sitemap += '</urlset>';

    res.setHeader('Content-Type', 'application/xml');
    return res.send(sitemap);
  } catch (error) {
    console.error('Sitemap error:', error);
    return res.status(500).send('Error generating sitemap');
  }
});

// Robots.txt
app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.SITE_URL || 'https://calcuhub.com';
  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /__tests__/
Disallow: /tests/

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.type('text/plain').send(robots);
});

// ============================================
// Health Check
// ============================================

app.get('/api/health', async (req, res) => {
  try {
    // Quick DB check
    await prisma.$queryRaw`SELECT 1`;
    
    return res.json({
      ok: true,
      status: 'healthy',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// ============================================
// Static Files (Production)
// ============================================

const distPath = path.join(__dirname, '../dist');

// Serve static files with caching
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.includes('assets')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// SPA Fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// ============================================
// Error Handling
// ============================================

// Sentry error handler must be before any other error middleware and after all controllers
if (process.env.NODE_ENV === 'production') {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ============================================
// Server Startup
// ============================================

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Database connected successfully');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Initialize Job Scheduler
      if (typeof initScheduler === 'function') initScheduler();
      
      // Start background job processor
      setInterval(processJobs, 5000); // Every 5 seconds
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
