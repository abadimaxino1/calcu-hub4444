const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

const ADMIN_PW = process.env.ADMIN_PW || 'A-Temp-Admin-2025';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-secret-change-me';

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

// In-memory token store (token -> expiryMillis)
const tokens = new Map();
function signToken() {
  const payload = `${Date.now()}|${crypto.randomBytes(8).toString('hex')}`;
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex');
  const token = `${payload}.${sig}`;
  const expiry = Date.now() + 1000 * 60 * 60; // 1 hour
  tokens.set(token, expiry);
  return token;
}

function verifyToken(token) {
  if (!token) return false;
  const expiry = tokens.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) { tokens.delete(token); return false; }
  return true;
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password && password === ADMIN_PW) {
    const token = signToken();
    res.cookie('calcu_admin', token, { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 });
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false });
});

app.get('/api/admin/check', (req, res) => {
  const token = req.cookies && req.cookies.calcu_admin;
  if (verifyToken(token)) return res.json({ ok: true });
  return res.status(401).json({ ok: false });
});

app.post('/api/admin/logout', (req, res) => {
  const token = req.cookies && req.cookies.calcu_admin;
  if (token) tokens.delete(token);
  res.clearCookie('calcu_admin');
  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Admin API server listening on http://localhost:${PORT}`);
});
