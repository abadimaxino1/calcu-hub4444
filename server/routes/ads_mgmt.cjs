const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');
const { writeAuditLog } = require('../lib/audit.cjs');

// All routes require revenue:ads:manage
router.use(requirePermission(PERMISSIONS.REVENUE_ADS_MANAGE));

// --- Ad Slots ---

router.get('/slots', async (req, res) => {
  try {
    const slots = await prisma.adSlot.findMany();
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/slots', async (req, res) => {
  try {
    const slot = await prisma.adSlot.create({ data: req.body });
    
    await writeAuditLog({
      action: 'AD_SLOT_CREATE',
      entityType: 'AD_SLOT',
      entityId: slot.id,
      entityLabel: slot.slotId,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      afterJson: JSON.stringify(slot)
    });

    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/slots/:id', async (req, res) => {
  try {
    const before = await prisma.adSlot.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });

    const slot = await prisma.adSlot.update({
      where: { id: req.params.id },
      data: req.body
    });

    await writeAuditLog({
      action: 'AD_SLOT_UPDATE',
      entityType: 'AD_SLOT',
      entityId: slot.id,
      entityLabel: slot.slotId,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify(slot)
    });

    res.json(slot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/slots/:id', async (req, res) => {
  try {
    const before = await prisma.adSlot.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });

    await prisma.adSlot.delete({ where: { id: req.params.id } });

    await writeAuditLog({
      action: 'AD_SLOT_DELETE',
      entityType: 'AD_SLOT',
      entityId: req.params.id,
      entityLabel: before.slotId,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before)
    });

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Ad Profiles ---

router.get('/profiles', async (req, res) => {
  try {
    const profiles = await prisma.adProfile.findMany();
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/profiles', async (req, res) => {
  try {
    const profile = await prisma.adProfile.create({ data: req.body });
    
    await writeAuditLog({
      action: 'AD_PROFILE_CREATE',
      entityType: 'AD_PROFILE',
      entityId: profile.id,
      entityLabel: profile.name,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      afterJson: JSON.stringify(profile)
    });

    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/profiles/:id', async (req, res) => {
  try {
    const before = await prisma.adProfile.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });

    const profile = await prisma.adProfile.update({
      where: { id: req.params.id },
      data: req.body
    });

    await writeAuditLog({
      action: 'AD_PROFILE_UPDATE',
      entityType: 'AD_PROFILE',
      entityId: profile.id,
      entityLabel: profile.name,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before),
      afterJson: JSON.stringify(profile)
    });

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/profiles/:id', async (req, res) => {
  try {
    const before = await prisma.adProfile.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Not found' });

    await prisma.adProfile.delete({ where: { id: req.params.id } });

    await writeAuditLog({
      action: 'AD_PROFILE_DELETE',
      entityType: 'AD_PROFILE',
      entityId: req.params.id,
      entityLabel: before.name,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      beforeJson: JSON.stringify(before)
    });

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
