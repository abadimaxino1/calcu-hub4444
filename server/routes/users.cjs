// User management routes
const express = require('express');
const bcrypt = require('bcryptjs');
const { prisma } = require('../db.cjs');
const { ROLES, PERMISSIONS, requirePermission, hasPermission } = require('../rbac.cjs');

const { logAudit } = require('../lib/audit.cjs');

const router = express.Router();

// Hash password
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// List users
router.get('/', requirePermission(PERMISSIONS.USERS_READ), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      role, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      includeDeleted = 'false'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      deletedAt: includeDeleted === 'true' ? undefined : null,
      role: role || undefined,
      OR: search ? [
        { email: { contains: search } },
        { name: { contains: search } }
      ] : undefined
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
      }),
      prisma.user.count({ where })
    ]);

    return res.json({ 
      users, 
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get single user
router.get('/:id', requirePermission(PERMISSIONS.USERS_READ), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        totpSecret: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        ...user,
        has2FA: !!user.totpSecret,
        totpSecret: undefined,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create user
router.post('/', requirePermission(PERMISSIONS.USERS_CREATE), async (req, res) => {
  try {
    const { email, name, password, role } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password required' });
    }

    // Check role permission
    const validRole = Object.values(ROLES).includes(role) ? role : ROLES.VIEW_ONLY;

    // Only SUPER_ADMIN can create SUPER_ADMIN
    if (validRole === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Cannot create super admin' });
    }

    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        hashedPassword,
        role: validRole,
        isActive: true,
        createdById: req.user.id
      },
    });

    await logAudit({
      req,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      afterData: user
    });

    return res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update user
router.put('/:id', requirePermission(PERMISSIONS.USERS_UPDATE), async (req, res) => {
  try {
    const { name, email, role, isActive, password } = req.body;
    const userId = req.params.id;

    const before = await prisma.user.findUnique({ where: { id: userId } });
    if (!before) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent non-super-admin from modifying super admin
    if (before.role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Cannot modify super admin' });
    }

    // Build update data
    const updateData = {
      updatedById: req.user.id
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    // Role changes require USERS_MANAGE_ROLES permission
    if (role && hasPermission(req.user.role, PERMISSIONS.USERS_MANAGE_ROLES)) {
      if (role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({ error: 'Cannot assign super admin role' });
      }
      updateData.role = role;
    }

    // Password change
    if (password) {
      updateData.hashedPassword = await hashPassword(password);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await logAudit({
      req,
      action: 'UPDATE',
      entityType: 'User',
      entityId: userId,
      beforeData: before,
      afterData: user
    });

    return res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Soft delete user
router.delete('/:id', requirePermission(PERMISSIONS.USERS_DELETE), async (req, res) => {
  try {
    const userId = req.params.id;
    const before = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!before) return res.status(404).json({ error: 'User not found' });
    if (before.role === ROLES.SUPER_ADMIN) return res.status(403).json({ error: 'Cannot delete super admin' });
    if (before.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { 
        deletedAt: new Date(),
        deletedById: req.user.id,
        isActive: false
      }
    });

    await logAudit({
      req,
      action: 'DELETE',
      entityType: 'User',
      entityId: userId,
      beforeData: before,
      afterData: user
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Restore user
router.post('/:id/restore', requirePermission(PERMISSIONS.USERS_UPDATE), async (req, res) => {
  try {
    const userId = req.params.id;
    const before = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!before) return res.status(404).json({ error: 'User not found' });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { 
        deletedAt: null,
        deletedById: null,
        isActive: true
      }
    });

    await logAudit({
      req,
      action: 'RESTORE',
      entityType: 'User',
      entityId: userId,
      beforeData: before,
      afterData: user
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('Restore user error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requirePermission(PERMISSIONS.ADMIN_USERS_MANAGE), async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot delete self
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Cannot delete super admin (unless you're super admin)
    if (user.role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Cannot delete super admin' });
    }

    await prisma.user.delete({ where: { id: userId } });

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: req.user.id,
        actionType: 'DELETE_USER',
        targetType: 'user',
        targetId: userId,
        detailsJson: JSON.stringify({ email: user.email }),
        ipAddress: req.ip,
      },
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
