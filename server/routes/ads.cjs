// Ad slots and revenue routes
const express = require('express');
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');

const router = express.Router();

// ============================================
// Ad Slots
// ============================================

// Get all active ad slots (public)
router.get('/slots', async (req, res) => {
  try {
    const slots = await prisma.adSlot.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        positionKey: true,
        pagePathPattern: true,
      },
    });
    return res.json({ slots });
  } catch (error) {
    console.error('Get ad slots error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all ad slots (admin)
router.get('/slots/all', requirePermission(PERMISSIONS.ADS_READ), async (req, res) => {
  try {
    const slots = await prisma.adSlot.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ slots });
  } catch (error) {
    console.error('Get all ad slots error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create ad slot
router.post('/slots', requirePermission(PERMISSIONS.ADS_CREATE), async (req, res) => {
  try {
    const { name, pagePathPattern, positionKey, isActive = true, eCPM = 0, cpc = 0, notes } = req.body;

    if (!name || !pagePathPattern || !positionKey) {
      return res.status(400).json({ error: 'name, pagePathPattern, and positionKey required' });
    }

    const slot = await prisma.adSlot.create({
      data: { name, pagePathPattern, positionKey, isActive, eCPM, cpc, notes },
    });

    // Log activity
    await prisma.adminActivityLog.create({
      data: {
        adminUserId: req.user.id,
        actionType: 'CREATE_AD_SLOT',
        targetType: 'ad_slot',
        targetId: slot.id,
        detailsJson: JSON.stringify({ name, positionKey }),
        ipAddress: req.ip,
      },
    });

    return res.json({ ok: true, slot });
  } catch (error) {
    console.error('Create ad slot error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update ad slot
router.put('/slots/:id', requirePermission(PERMISSIONS.ADS_UPDATE), async (req, res) => {
  try {
    const { name, pagePathPattern, positionKey, isActive, eCPM, cpc, notes } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (pagePathPattern) updateData.pagePathPattern = pagePathPattern;
    if (positionKey) updateData.positionKey = positionKey;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof eCPM === 'number') updateData.eCPM = eCPM;
    if (typeof cpc === 'number') updateData.cpc = cpc;
    if (notes !== undefined) updateData.notes = notes;

    const slot = await prisma.adSlot.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return res.json({ ok: true, slot });
  } catch (error) {
    console.error('Update ad slot error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete ad slot
router.delete('/slots/:id', requirePermission(PERMISSIONS.ADS_DELETE), async (req, res) => {
  try {
    await prisma.adSlot.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete ad slot error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Ad Events (Tracking)
// ============================================

// Track ad event (impression or click)
router.post('/event', async (req, res) => {
  try {
    const { adSlotId, eventType, sessionId, pagePath, device, locale } = req.body;

    if (!adSlotId || !eventType || !sessionId || !pagePath) {
      return res.status(400).json({ error: 'adSlotId, eventType, sessionId, and pagePath required' });
    }

    if (!['IMPRESSION', 'CLICK'].includes(eventType)) {
      return res.status(400).json({ error: 'eventType must be IMPRESSION or CLICK' });
    }

    // Get country and IP from headers
    const country = req.headers['cf-ipcountry'] || req.headers['x-country'] || null;
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || null;

    await prisma.adEvent.create({
      data: { 
        adSlotId, 
        eventType, 
        sessionId, 
        pagePath,
        device: device || null,
        locale: locale || null,
        country,
        ipAddress,
      },
    });

    // Update traffic session ad stats
    try {
      const updateData = eventType === 'IMPRESSION' 
        ? { adImpressions: { increment: 1 } }
        : { adClicks: { increment: 1 } };
      
      await prisma.trafficSession.update({
        where: { sessionId },
        data: {
          ...updateData,
          lastSeenAt: new Date(),
        },
      });
    } catch (e) {
      // Session might not exist, non-critical
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Track ad event error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get ad event stats (admin)
router.get('/stats', requirePermission(PERMISSIONS.ADS_READ), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days, 10) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const [impressions, clicks, slotStats] = await Promise.all([
      prisma.adEvent.count({
        where: { eventType: 'IMPRESSION', createdAt: { gte: startDate } },
      }),
      prisma.adEvent.count({
        where: { eventType: 'CLICK', createdAt: { gte: startDate } },
      }),
      prisma.adEvent.groupBy({
        by: ['adSlotId', 'eventType'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
    ]);

    // Get slot names
    const slots = await prisma.adSlot.findMany();
    const slotMap = Object.fromEntries(slots.map(s => [s.id, s]));

    // Process stats
    const slotStatsProcessed = {};
    slotStats.forEach(stat => {
      const slotId = stat.adSlotId;
      if (!slotStatsProcessed[slotId]) {
        slotStatsProcessed[slotId] = {
          slot: slotMap[slotId],
          impressions: 0,
          clicks: 0,
        };
      }
      if (stat.eventType === 'IMPRESSION') {
        slotStatsProcessed[slotId].impressions = stat._count;
      } else {
        slotStatsProcessed[slotId].clicks = stat._count;
      }
    });

    // Calculate CTR and estimated revenue
    Object.values(slotStatsProcessed).forEach(stat => {
      stat.ctr = stat.impressions > 0 ? (stat.clicks / stat.impressions * 100).toFixed(2) : 0;
      const slot = stat.slot;
      if (slot) {
        stat.estimatedRevenue = (stat.impressions / 1000 * slot.eCPM) + (stat.clicks * slot.cpc);
      }
    });

    const ctr = impressions > 0 ? (clicks / impressions * 100).toFixed(2) : 0;

    return res.json({
      total: { impressions, clicks, ctr },
      bySlot: Object.values(slotStatsProcessed),
      days: daysNum,
    });
  } catch (error) {
    console.error('Get ad stats error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Revenue Snapshots
// ============================================

// Get revenue data
router.get('/revenue', requirePermission(PERMISSIONS.REVENUE_READ), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days, 10) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const snapshots = await prisma.revenueSnapshot.findMany({
      where: { dateTime: { gte: startDate } },
      orderBy: { dateTime: 'desc' },
    });

    const total = snapshots.reduce((sum, s) => sum + s.revenueAmount, 0);

    return res.json({ snapshots, total, days: daysNum });
  } catch (error) {
    console.error('Get revenue error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Add revenue snapshot
router.post('/revenue', requirePermission(PERMISSIONS.REVENUE_CREATE), async (req, res) => {
  try {
    const { source = 'MANUAL', dateTime, revenueAmount, currency = 'SAR', impressions = 0, clicks = 0, notes } = req.body;

    if (!dateTime || typeof revenueAmount !== 'number') {
      return res.status(400).json({ error: 'dateTime and revenueAmount required' });
    }

    const snapshot = await prisma.revenueSnapshot.create({
      data: {
        source,
        dateTime: new Date(dateTime),
        revenueAmount,
        currency,
        impressions,
        clicks,
        notes,
      },
    });

    return res.json({ ok: true, snapshot });
  } catch (error) {
    console.error('Add revenue error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get revenue forecast
router.get('/forecast', requirePermission(PERMISSIONS.REVENUE_READ), async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get last 30 days revenue
    const snapshots = await prisma.revenueSnapshot.findMany({
      where: { dateTime: { gte: thirtyDaysAgo } },
      orderBy: { dateTime: 'asc' },
    });

    const totalRevenue = snapshots.reduce((sum, s) => sum + s.revenueAmount, 0);
    const avgDaily = totalRevenue / 30;

    // Get ad stats for forecasting
    const [impressions, clicks] = await Promise.all([
      prisma.adEvent.count({ where: { eventType: 'IMPRESSION', createdAt: { gte: thirtyDaysAgo } } }),
      prisma.adEvent.count({ where: { eventType: 'CLICK', createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    const avgDailyImpressions = impressions / 30;
    const avgDailyClicks = clicks / 30;

    // Get average eCPM and CPC from slots
    const slots = await prisma.adSlot.findMany({ where: { isActive: true } });
    const avgECPM = slots.length > 0 ? slots.reduce((sum, s) => sum + s.eCPM, 0) / slots.length : 1;
    const avgCPC = slots.length > 0 ? slots.reduce((sum, s) => sum + s.cpc, 0) / slots.length : 0.1;

    // Forecast based on ad metrics
    const forecastDaily = (avgDailyImpressions / 1000 * avgECPM) + (avgDailyClicks * avgCPC);

    return res.json({
      historical: {
        totalRevenue,
        avgDaily,
        impressions,
        clicks,
      },
      forecast: {
        daily: forecastDaily || avgDaily,
        weekly: (forecastDaily || avgDaily) * 7,
        monthly: (forecastDaily || avgDaily) * 30,
        yearly: (forecastDaily || avgDaily) * 365,
      },
      assumptions: {
        avgECPM,
        avgCPC,
        avgDailyImpressions,
        avgDailyClicks,
      },
    });
  } catch (error) {
    console.error('Get forecast error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
