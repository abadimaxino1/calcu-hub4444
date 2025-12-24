// Authentication routes
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { prisma } = require('../db.cjs');
const { ROLES } = require('../rbac.cjs');

const router = express.Router();

// Generate secure token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Hash password
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// Verify password
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await verifyPassword(password, user.hashedPassword);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if 2FA is enabled
    if (user.totpSecret) {
      // Return partial auth, require TOTP
      const tempToken = generateToken();
      // Store temp token for 2FA verification (expires in 5 minutes)
      await prisma.session.create({
        data: {
          userId: user.id,
          token: `2fa_${tempToken}`,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
        },
      });

      return res.json({
        ok: true,
        requires2FA: true,
        tempToken,
      });
    }

    // Create session
    const token = generateToken();
    const expiryHours = parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    });

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: user.id,
        actionType: 'LOGIN',
        ipAddress: req.ip,
      },
    });

    // Set cookie
    res.cookie('calcu_admin', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiryHours * 60 * 60 * 1000,
    });

    return res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Verify 2FA
router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ error: 'Token and code required' });
    }

    const tempSession = await prisma.session.findUnique({
      where: { token: `2fa_${tempToken}` },
    });

    const tempExpiresAt = tempSession?.expiresAt ? new Date(tempSession.expiresAt) : null;
    if (!tempSession || !tempExpiresAt || tempExpiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({ where: { id: tempSession.userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify TOTP code
    let speakeasy;
    try {
      speakeasy = require('speakeasy');
    } catch (e) {
      return res.status(500).json({ error: '2FA not configured on server' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    // Delete temp session
    await prisma.session.delete({ where: { token: `2fa_${tempToken}` } });

    // Create real session
    const token = generateToken();
    const expiryHours = parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    });

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: user.id,
        actionType: 'LOGIN_2FA',
        ipAddress: req.ip,
      },
    });

    res.cookie('calcu_admin', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiryHours * 60 * 60 * 1000,
    });

    return res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Check session
router.get('/check', async (req, res) => {
  try {
    const token = req.cookies.calcu_admin;

    if (!token) {
      return res.json({ ok: false });
    }

    const session = await prisma.session.findUnique({ where: { token } });
    const expiresAt = session?.expiresAt ? new Date(session.expiresAt) : null;
    if (!session || !expiresAt || expiresAt < new Date()) {
      return res.json({ ok: false });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.isActive) {
      return res.json({ ok: false });
    }

    return res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.name, // For backward compatibility
        roles: [user.role], // For backward compatibility
      },
    });
  } catch (error) {
    console.error('Check session error:', error);
    return res.json({ ok: false });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies.calcu_admin;

    if (token) {
      const session = await prisma.session.findUnique({ where: { token } });
      if (session) {
        await prisma.adminActivityLog.create({
          data: {
            adminUserId: session.userId,
            actionType: 'LOGOUT',
            ipAddress: req.ip,
          },
        });

        await prisma.session.delete({ where: { token } });
      }
    }

    res.clearCookie('calcu_admin');
    return res.json({ ok: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.clearCookie('calcu_admin');
    return res.json({ ok: true });
  }
});

// Initialize first admin user (run once)
router.post('/init', async (req, res) => {
  try {
    // Check if any admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: ROLES.SUPER_ADMIN },
    });

    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin already exists' });
    }

    const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@calcuhub.com';
    const password = process.env.INITIAL_ADMIN_PASSWORD || 'ChangeThisPassword123!';

    const hashedPassword = await hashPassword(password);

    const admin = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: 'Super Admin',
        hashedPassword,
        role: ROLES.SUPER_ADMIN,
        isActive: true,
      },
    });

    return res.json({
      ok: true,
      message: 'Admin created successfully',
      email: admin.email,
    });
  } catch (error) {
    console.error('Init admin error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
