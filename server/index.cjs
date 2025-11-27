// Main Express server - Production Ready Version
// Using Prisma for database, RBAC for access control

require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import database and routes
const { prisma } = require('./db.cjs');
const { PERMISSIONS, hasPermission } = require('./rbac.cjs');
const authRoutes = require('./routes/auth.cjs');
const userRoutes = require('./routes/users.cjs');
const analyticsRoutes = require('./routes/analytics.cjs');
const contentRoutes = require('./routes/content.cjs');
const seoRoutes = require('./routes/seo.cjs');
const adsRoutes = require('./routes/ads.cjs');
const systemRoutes = require('./routes/system.cjs');
const monetizationRoutes = require('./routes/monetization.cjs');

const app = express();
const PORT = process.env.PORT || 4000;

// ============================================
// Middleware Setup
// ============================================

app.use(express.json({ limit: '10mb' }));
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
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      req.user = null;
      return next();
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
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
// API Routes
// ============================================

// Auth routes (with rate limiting)
app.use('/api/auth', authLimiter, authRoutes);
// Also keep /api/admin for backward compatibility
app.use('/api/admin', authLimiter, authRoutes);

// User management
app.use('/api/admin/users', requireAuth, userRoutes);

// Analytics (tracking endpoints have their own limiter)
app.use('/api/analytics', trackingLimiter, analyticsRoutes);

// Content management
app.use('/api/content', contentRoutes);

// SEO configuration
app.use('/api/seo', seoRoutes);

// Ads management
app.use('/api/ads', adsRoutes);

// Monetization (revenue models, analytics, alerts, forecasting)
app.use('/api/admin/monetization', monetizationRoutes);

// System settings
app.use('/api/system', systemRoutes);

// Simple health check without auth
app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================
// Legacy API Compatibility
// ============================================

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
// Error Handling
// ============================================

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
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

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
