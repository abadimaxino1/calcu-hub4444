const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

const ADMIN_PW = process.env.ADMIN_PW || 'A-Temp-Admin-2025';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-secret-change-me';
// Bring in small utilities: bcrypt for hashing, rate limiter and morgan for logging
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
let speakeasy = null;
try { speakeasy = require('speakeasy'); } catch (e) { speakeasy = null; }
// optional security middleware
let helmet = null;
try { helmet = require('helmet'); } catch (e) { helmet = null; }

const TOKENS_FILE = require('path').join(__dirname, 'tokens.json');

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
// security headers
if (helmet) {
  // let helmet set standard safe headers; add HSTS when in production
  app.use(helmet());
  if (process.env.NODE_ENV === 'production') {
    try { app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true })); } catch(e){ /* ignore */ }
  }
} else {
  // minimal headers fallback
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
  });
}

// Content Security Policy - conservative default. Adjust per site assets.
app.use((req, res, next) => {
  // allow analytics domains only when explicit consent and when present in allowed list
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https:",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com",
    "frame-ancestors 'none'",
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  next();
});
// Request logging
app.use(morgan(process.env.LOG_FORMAT || 'dev'));

// Protect common test/debug routes from public access: require admin roles to access
app.use(async (req, res, next) => {
  try {
    const protectedPrefixes = ['/tests', '/test', '/vitest', '/playwright', '/cypress', '/__tests__', '/__debug__', '/debug'];
    const path = req.path || req.url || '';
    for (const p of protectedPrefixes) {
      if (path.startsWith(p)) {
        // check admin cookie
        const token = req.cookies && req.cookies.calcu_admin;
        const info = await verifyToken(token);
        if (!info || !Array.isArray(info.roles) || !info.roles.includes('Admin')) {
          return res.status(403).send('Forbidden');
        }
        break;
      }
    }
  } catch (e) {
    // allow fallback to continue rather than block on errors
  }
  return next();
});

// Apply a conservative rate limiter to login route (defined later). We'll apply middleware to that route only.

// Token storage: prefer Redis when REDIS_URL is provided, otherwise fall back to a
// simple file-backed Map (good for dev). This keeps the server flexible for local
// testing and for an easy production switch to Redis.
const fs = require('fs');
const REDIS_URL = process.env.REDIS_URL || null;
let useRedis = false;
let redisClient = null;

if (REDIS_URL) {
  try {
    const { createClient } = require('redis');
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => console.warn('Redis client error', err && err.message));
    // Connect eagerly; allow failures to fall back to file store
    redisClient.connect().then(() => {
      useRedis = true;
      console.log('Connected to Redis for token storage');
    }).catch(err => {
      console.warn('Failed to connect to Redis, falling back to file store', err && err.message);
      useRedis = false;
      redisClient = null;
    });
  } catch (e) {
    console.warn('Redis library not available, fallback to file store', e && e.message);
    useRedis = false;
    redisClient = null;
  }
}

// File-backed tokens map (token -> { expiry, username, roles })
let tokens = new Map();

// Admin users store (username -> { passwordHash, createdAt, roles: [] })
const ADMIN_USERS_FILE = require('path').join(__dirname, 'admin-users.json');
let adminUsers = {};

function loadAdminUsers() {
  try {
    if (fs.existsSync(ADMIN_USERS_FILE)) {
      adminUsers = JSON.parse(fs.readFileSync(ADMIN_USERS_FILE, 'utf8') || '{}');
    } else {
      // bootstrap a single admin from ADMIN_PW env if file missing
      const pw = ADMIN_PW;
      const hash = bcrypt.hashSync(pw, 10);
      adminUsers = { admin: { passwordHash: hash, createdAt: Date.now(), roles: ['Admin'] } };
      fs.writeFileSync(ADMIN_USERS_FILE, JSON.stringify(adminUsers, null, 2), 'utf8');
      console.log('Bootstrapped admin user (username: admin) from ADMIN_PW env');
    }
  } catch (e) {
    console.warn('Failed to load or bootstrap admin users', e && e.message);
    adminUsers = {};
  }
}

// Ensure admin user entries include twoFactor structure when missing
function normalizeTwoFactor() {
  for (const [u, v] of Object.entries(adminUsers)) {
    if (!v.twoFactor) v.twoFactor = { enabled: false };
  }
}

function saveAdminUsers() {
  try {
    fs.writeFileSync(ADMIN_USERS_FILE, JSON.stringify(adminUsers, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to save admin users file', e && e.message);
  }
}

loadAdminUsers();
// normalize users to include roles
for (const [u, v] of Object.entries(adminUsers)) {
  if (!Array.isArray(v.roles)) {
    // preserve 'admin' as Admin role, default others to Staff
    v.roles = u === 'admin' ? ['Admin'] : ['Staff'];
  }
}
normalizeTwoFactor();

function loadTokens() {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const raw = fs.readFileSync(TOKENS_FILE, 'utf8');
      const obj = JSON.parse(raw || '{}');
      // obj is token -> { expiry, username, roles }
      tokens = new Map(Object.entries(obj));
      tokens = new Map(Array.from(tokens.entries()).map(([k, v]) => [k, v]));
    }
  } catch (e) {
    console.warn('Failed to load tokens file, starting fresh', e && e.message);
    tokens = new Map();
  }
}

function saveTokens() {
  try {
    const obj = Object.fromEntries(tokens);
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to save tokens file', e && e.message);
  }
}

function cleanupExpired() {
  const now = Date.now();
  let changed = false;
  for (const [t, exp] of tokens.entries()) {
    if (now > exp) { tokens.delete(t); changed = true; }
  }
  if (changed) saveTokens();
}

loadTokens();
setInterval(cleanupExpired, 1000 * 60 * 5);

async function signToken(username, roles = []) {
  const payload = `${username}|${Date.now()}|${crypto.randomBytes(8).toString('hex')}`;
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex');
  const token = `${payload}.${sig}`;
  const expiry = Date.now() + 1000 * 60 * 60; // 1 hour

  const tokenObj = { expiry, username, roles };
  if (useRedis && redisClient) {
    try {
      const ttl = 60 * 60;
      await redisClient.set(`calcu_admin:${token}`, JSON.stringify(tokenObj), { EX: ttl });
      return token;
    } catch (e) {
      console.warn('Redis set failed, falling back to file store', e && e.message);
      useRedis = false;
    }
  }

  tokens.set(token, tokenObj);
  saveTokens();
  return token;
}

async function verifyToken(token) {
  if (!token) return false;
  if (useRedis && redisClient) {
    try {
      const val = await redisClient.get(`calcu_admin:${token}`);
      if (!val) return false;
      const obj = JSON.parse(val);
      if (Date.now() > obj.expiry) { await redisClient.del(`calcu_admin:${token}`); return false; }
      return { username: obj.username, roles: obj.roles };
    } catch (e) {
      console.warn('Redis verify failed, falling back to file store', e && e.message);
      useRedis = false;
    }
  }
  const obj = tokens.get(token);
  if (!obj) return false;
  if (Date.now() > obj.expiry) { tokens.delete(token); saveTokens(); return false; }
  return { username: obj.username, roles: obj.roles };
}

// Cookie options: secure when in production and SameSite optionally configurable via env
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: process.env.COOKIE_SAMESITE || 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60,
};

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6, // limit each IP to 6 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// rate limiter for analytics ingestion
const ingestLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const { username = 'admin', password } = req.body || {};
  try {
    const user = adminUsers[username];
    if (!user) return res.status(401).json({ ok: false });
    // Two-step: verify password first
    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) return res.status(401).json({ ok: false });
    // If user has 2FA enabled, require totp in body
    if (user.twoFactor && user.twoFactor.enabled) {
      const { totp } = req.body || {};
      if (!totp) return res.status(206).json({ ok: false, twoFactorRequired: true });
      if (!speakeasy) return res.status(500).json({ ok: false, reason: '2fa-missing-lib' });
      const verified = speakeasy.totp.verify({ secret: user.twoFactor.secret, encoding: 'base32', token: String(totp), window: 1 });
      if (!verified) return res.status(401).json({ ok: false, reason: '2fa-failed' });
    }
    const roles = Array.isArray(user.roles) ? user.roles : ['Admin'];
    const token = await signToken(username, roles);
    // set admin token cookie (httpOnly) and a CSRF cookie (readable by JS)
    res.cookie('calcu_admin', token, COOKIE_OPTIONS);
    const csrf = crypto.randomBytes(12).toString('hex');
    res.cookie('calcu_csrf', csrf, { httpOnly: false, sameSite: COOKIE_OPTIONS.sameSite, secure: COOKIE_OPTIONS.secure });
    // persist token metadata for auditing
    logAction(username, 'login');
    return res.json({ ok: true, csrf });
  } catch (e) {
    console.warn('Login error', e && e.message);
    return res.status(500).json({ ok: false });
  }
});

// Analytics ingestion endpoint (client events) - accepts anonymized events only
app.post('/api/log', ingestLimiter, express.json(), (req, res) => {
  try {
    const ev = req.body || {};
    // Basic validation: must have type and timestamp; drop potential PII
    const allowedKeys = ['type', 'ts', 'path', 'tool', 'payload'];
    const evt = {};
    evt.type = typeof ev.type === 'string' ? ev.type : 'unknown';
    evt.ts = ev.ts || Date.now();
    evt.path = typeof ev.path === 'string' ? ev.path : (req.get('referer') || req.path);
    evt.tool = typeof ev.tool === 'string' ? ev.tool : null;
    evt.payload = typeof ev.payload === 'object' ? ev.payload : null;

    // Prevent sending PII by filtering strings inside payload (simple heuristic)
    if (evt.payload && typeof evt.payload === 'object') {
      for (const k of Object.keys(evt.payload)) {
        const v = evt.payload[k];
        if (typeof v === 'string' && (v.indexOf('@') !== -1 || v.match(/\d{6,}/))) {
          // drop suspicious fields
          delete evt.payload[k];
        }
      }
    }

    // append to analytics log
    const ALOG = require('path').join(__dirname, 'analytics.log');
    fs.appendFileSync(ALOG, JSON.stringify(evt) + '\n', 'utf8');

    // update aggregate summary file (analytics.json)
    const AGG = require('path').join(__dirname, 'analytics.json');
    let agg = { pageViews: 0, calculators: {}, dailyActive: 0 };
    try { if (fs.existsSync(AGG)) agg = JSON.parse(fs.readFileSync(AGG, 'utf8') || '{}'); } catch (e) {}
    // simple aggregation: increment pageViews and per calculator events
    agg.pageViews = (agg.pageViews || 0) + (evt.type === 'pageview' ? 1 : 0);
    if (evt.type === 'calculator' && evt.payload && evt.payload.name) {
      agg.calculators = agg.calculators || {};
      agg.calculators[evt.payload.name] = (agg.calculators[evt.payload.name] || 0) + 1;
    }
    agg.dailyActive = agg.dailyActive || 0; // placeholder
    fs.writeFileSync(AGG, JSON.stringify(agg, null, 2), 'utf8');

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false });
  }
});

// helper: simple audit log
const AUDIT_FILE = require('path').join(__dirname, 'admin-audit.log');
function logAction(username, action, meta = {}) {
  try {
    const entry = { ts: new Date().toISOString(), username, action, meta };
    fs.appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch (e) { /* ignore */ }
}

// middleware: require authentication and attach user
async function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.calcu_admin;
  const info = await verifyToken(token);
  if (!info) return res.status(401).json({ ok: false });
  req.admin = info; // { username, roles }
  return next();
}

function requireRole(role) {
  return (req, res, next) => {
    const info = req.admin;
    if (!info || !Array.isArray(info.roles) || !info.roles.includes(role)) return res.status(403).json({ ok: false });
    return next();
  };
}

// simple CSRF check for state-changing admin endpoints
function verifyCsrf(req, res, next) {
  const cookieToken = req.cookies && req.cookies.calcu_csrf;
  const header = req.get('x-csrf-token');
  if (!cookieToken || !header || cookieToken !== header) return res.status(403).json({ ok: false, reason: 'csrf' });
  return next();
}

app.get('/api/admin/check', async (req, res) => {
  const token = req.cookies && req.cookies.calcu_admin;
  const info = await verifyToken(token);
  if (!info) return res.status(401).json({ ok: false });
  return res.json({ ok: true, user: info });
});

app.post('/api/admin/logout', (req, res) => {
  const token = req.cookies && req.cookies.calcu_admin;
  if (token) {
    tokens.delete(token);
    saveTokens();
  }
  res.clearCookie('calcu_admin');
  return res.json({ ok: true });
});

// Admin-only endpoints: list users
app.get('/api/admin/users', requireAuth, requireRole('Admin'), (req, res) => {
  const out = Object.entries(adminUsers).map(([u, v]) => ({ username: u, roles: v.roles || [], createdAt: v.createdAt }));
  return res.json({ ok: true, users: out });
});

// Create user (Admin only)
app.post('/api/admin/users', requireAuth, requireRole('Admin'), verifyCsrf, (req, res) => {
  const { username, password, roles = ['Staff'] } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false });
  if (adminUsers[username]) return res.status(409).json({ ok: false, reason: 'exists' });
  const hash = bcrypt.hashSync(password, 10);
  adminUsers[username] = { passwordHash: hash, createdAt: Date.now(), roles };
  saveAdminUsers();
  logAction(req.admin.username, 'create_user', { target: username, roles });
  return res.json({ ok: true });
});

// 2FA setup: generate secret (Admin must be authenticated)
app.get('/api/admin/2fa/setup', requireAuth, (req, res) => {
  if (!speakeasy) return res.status(500).json({ ok: false, reason: 'speakeasy_missing' });
  const username = req.admin && req.admin.username;
  if (!username) return res.status(401).json({ ok: false });
  const secret = speakeasy.generateSecret({ name: `calcu-hub (${username})` });
  // store temp secret until verified
  adminUsers[username].twoFactorTemp = secret.base32;
  saveAdminUsers();
  return res.json({ ok: true, otpauth_url: secret.otpauth_url, base32: secret.base32 });
});

// 2FA verify & enable: client provides TOTP to confirm setup
app.post('/api/admin/2fa/verify', requireAuth, express.json(), (req, res) => {
  if (!speakeasy) return res.status(500).json({ ok: false, reason: 'speakeasy_missing' });
  const username = req.admin && req.admin.username;
  const { token } = req.body || {};
  if (!username || !token) return res.status(400).json({ ok: false });
  const user = adminUsers[username];
  const tmp = user && user.twoFactorTemp;
  if (!tmp) return res.status(400).json({ ok: false, reason: 'no_temp' });
  const verified = speakeasy.totp.verify({ secret: tmp, encoding: 'base32', token: String(token), window: 1 });
  if (!verified) return res.status(401).json({ ok: false, reason: 'invalid' });
  // enable persistent 2fa
  user.twoFactor = { enabled: true, secret: tmp };
  delete user.twoFactorTemp;
  saveAdminUsers();
  logAction(username, '2fa_enable');
  return res.json({ ok: true });
});

// helper: require any of the listed roles
function requireAnyRole(roles) {
  return (req, res, next) => {
    const info = req.admin;
    if (!info || !Array.isArray(info.roles)) return res.status(403).json({ ok: false });
    const has = roles.some(r => info.roles.includes(r));
    if (!has) return res.status(403).json({ ok: false });
    return next();
  };
}

// Admin/Analyst endpoint: return lightweight analytics summary (no PII)
app.get('/api/admin/analytics', requireAuth, requireAnyRole(['Admin', 'Analyst', 'Supervisor']), (req, res) => {
  try {
    // If there's a generated analytics file, prefer it; otherwise return a small sample
    const analyticsFile = require('path').join(__dirname, 'analytics.json');
    if (fs.existsSync(analyticsFile)) {
      const raw = fs.readFileSync(analyticsFile, 'utf8');
      const payload = JSON.parse(raw || '{}');
      return res.json({ ok: true, stats: payload });
    }
  } catch (e) {
    // ignore parsing errors
  }
  // sample stats (placeholder)
  const stats = {
    pageViews: 1234,
    calculators: { salary: 230, exitTime: 120 },
    dailyActive: 87,
  };
  return res.json({ ok: true, stats });
});

// Export analytics as CSV (Admin or Analyst)
app.get('/api/admin/exports/analytics.csv', requireAuth, requireAnyRole(['Admin', 'Analyst']), (req, res) => {
  try {
    const analyticsFile = require('path').join(__dirname, 'analytics.json');
    let payload = { pageViews:0, calculators: {}, dailyActive:0 };
    if (fs.existsSync(analyticsFile)) payload = JSON.parse(fs.readFileSync(analyticsFile, 'utf8') || '{}');
    // Produce a simple CSV
    const rows = [];
    rows.push(['metric','value'].join(','));
    rows.push(['pageViews', payload.pageViews || 0].join(','));
    rows.push(['dailyActive', payload.dailyActive || 0].join(','));
    const calculators = payload.calculators || {};
    for (const k of Object.keys(calculators)) rows.push([`calc_${k}`, calculators[k]].join(','));
    const csv = rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
    return res.send(csv);
  } catch (e) { return res.status(500).json({ ok: false }); }
});

// Admin audit log viewer (Admin and Supervisor can read)
app.get('/api/admin/audit', requireAuth, requireAnyRole(['Admin', 'Supervisor', 'IT']), (req, res) => {
  try {
    const data = fs.readFileSync(AUDIT_FILE, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch(e){ return { raw: l }; } });
    return res.json({ ok: true, entries: data.slice(-500) });
  } catch (e) { return res.status(500).json({ ok: false }); }
});

// Optional: run test command from admin (feature-flagged). Disabled by default.
app.post('/api/admin/run-tests', requireAuth, requireAnyRole(['Admin', 'IT']), verifyCsrf, async (req, res) => {
  if (process.env.ADMIN_ALLOW_RUN_TESTS !== '1') return res.status(403).json({ ok: false, reason: 'disabled' });
  try {
    const { exec } = require('child_process');
    // run tests with a timeout to avoid runaway processes
    const cmd = process.env.ADMIN_TEST_CMD || 'npm test --silent';
    const child = exec(cmd, { cwd: require('path').join(__dirname, '..'), timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        logAction(req.admin.username, 'run_tests_failed', { err: err.message });
        return res.json({ ok: false, error: err.message, stdout: stdout.slice ? stdout.slice(0, 2000) : stdout });
      }
      logAction(req.admin.username, 'run_tests', {});
      return res.json({ ok: true, stdout: stdout.slice ? stdout.slice(0, 2000) : stdout });
    });
  } catch (e) {
    return res.status(500).json({ ok: false });
  }
});

// basic sitemap route for crawlers
app.get('/sitemap.xml', (req, res) => {
  const base = process.env.SITE_BASE || 'https://example.com';
  const routes = ['/', '/tools', '/exit-time', '/salary', '/about', '/privacy', '/terms', '/faq', '/blog'];
  const urls = routes.map(r => `  <url>\n    <loc>${base}${r}</loc>\n  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  res.type('application/xml').send(xml);
});

// health endpoint for monitoring
app.get('/api/health', (req, res) => {
  const ok = { ok: true, uptime: process.uptime(), redis: !!(useRedis && redisClient) };
  res.json(ok);
});

app.listen(PORT, () => {
  console.log(`Admin API server listening on http://localhost:${PORT}`);
});
