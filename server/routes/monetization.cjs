// Monetization routes - Revenue model, analytics, anomaly detection, forecasting
const express = require('express');
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');

const router = express.Router();

// ============================================
// Revenue Model Configuration
// ============================================

// Default assumptions template
const DEFAULT_ASSUMPTIONS = {
  eCPM: {
    bySlot: {
      CALC_TOP: { desktop: 2.5, mobile: 1.8, tablet: 2.0 },
      CALC_SIDEBAR: { desktop: 1.5, mobile: 1.0, tablet: 1.2 },
      BLOG_INLINE: { desktop: 3.0, mobile: 2.2, tablet: 2.5 },
      BLOG_SIDEBAR: { desktop: 1.8, mobile: 1.2, tablet: 1.5 },
      FOOTER_BANNER: { desktop: 0.8, mobile: 0.5, tablet: 0.6 },
      DEFAULT: { desktop: 1.5, mobile: 1.0, tablet: 1.2 },
    },
    byCountry: {
      SA: 1.0,    // Saudi Arabia baseline
      AE: 1.2,    // UAE premium
      KW: 1.1,    // Kuwait
      QA: 1.15,   // Qatar
      BH: 1.05,   // Bahrain
      OM: 0.95,   // Oman
      GCC: 1.0,   // Other GCC
      OTHER: 0.6, // Non-GCC
    },
  },
  CPC: {
    bySlot: {
      CALC_TOP: { desktop: 0.15, mobile: 0.10, tablet: 0.12 },
      CALC_SIDEBAR: { desktop: 0.10, mobile: 0.06, tablet: 0.08 },
      BLOG_INLINE: { desktop: 0.20, mobile: 0.12, tablet: 0.15 },
      BLOG_SIDEBAR: { desktop: 0.12, mobile: 0.08, tablet: 0.10 },
      FOOTER_BANNER: { desktop: 0.05, mobile: 0.03, tablet: 0.04 },
      DEFAULT: { desktop: 0.10, mobile: 0.06, tablet: 0.08 },
    },
    byCountry: {
      SA: 1.0,
      AE: 1.3,
      KW: 1.15,
      QA: 1.2,
      BH: 1.0,
      OM: 0.9,
      GCC: 1.0,
      OTHER: 0.5,
    },
  },
  CTR: {
    expected: {
      CALC_TOP: 0.8,
      CALC_SIDEBAR: 0.5,
      BLOG_INLINE: 1.2,
      BLOG_SIDEBAR: 0.6,
      FOOTER_BANNER: 0.3,
      DEFAULT: 0.6,
    },
    thresholds: {
      warning: 5.0,   // 5% CTR triggers warning
      critical: 10.0, // 10% CTR is suspicious
      danger: 15.0,   // 15% CTR likely invalid traffic
    },
  },
  RPM: {
    thresholds: {
      minExpected: 0.5,
      maxExpected: 15.0,
      warningMultiplier: 2.0,
      criticalMultiplier: 3.0,
    },
  },
  clickVelocity: {
    maxClicksPerSessionPerMinute: 3,
    maxClicksPerIPPerHour: 10,
  },
};

// Get all revenue models
router.get('/models', requirePermission(PERMISSIONS.REVENUE_READ), async (req, res) => {
  try {
    const models = await prisma.revenueModel.findMany({
      orderBy: { effectiveFrom: 'desc' },
    });
    return res.json({ models });
  } catch (error) {
    console.error('Get revenue models error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get active revenue model
router.get('/models/active', requirePermission(PERMISSIONS.REVENUE_READ), async (req, res) => {
  try {
    const now = new Date();
    const model = await prisma.revenueModel.findFirst({
      where: {
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: now } },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!model) {
      // Return default assumptions if no model exists
      return res.json({
        model: null,
        assumptions: DEFAULT_ASSUMPTIONS,
        isDefault: true,
      });
    }

    return res.json({
      model,
      assumptions: JSON.parse(model.assumptions),
      isDefault: false,
    });
  } catch (error) {
    console.error('Get active revenue model error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create revenue model (SUPER_ADMIN, ADS_MANAGER only)
router.post('/models', requirePermission(PERMISSIONS.REVENUE_CREATE), async (req, res) => {
  try {
    // Check role
    if (!['SUPER_ADMIN', 'ADS_MANAGER'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only SUPER_ADMIN or ADS_MANAGER can create revenue models' });
    }

    const { name, description, effectiveFrom, effectiveTo, assumptions } = req.body;

    if (!name || !effectiveFrom) {
      return res.status(400).json({ error: 'name and effectiveFrom required' });
    }

    const model = await prisma.revenueModel.create({
      data: {
        name,
        description,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        assumptions: JSON.stringify(assumptions || DEFAULT_ASSUMPTIONS),
        createdById: req.user.id,
      },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminUserId: req.user.id,
        actionType: 'CREATE_REVENUE_MODEL',
        targetType: 'revenue_model',
        targetId: model.id,
        detailsJson: JSON.stringify({ name }),
        ipAddress: req.ip,
      },
    });

    return res.json({ ok: true, model });
  } catch (error) {
    console.error('Create revenue model error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update revenue model
router.put('/models/:id', requirePermission(PERMISSIONS.REVENUE_UPDATE), async (req, res) => {
  try {
    if (!['SUPER_ADMIN', 'ADS_MANAGER'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only SUPER_ADMIN or ADS_MANAGER can update revenue models' });
    }

    const { name, description, effectiveFrom, effectiveTo, assumptions, isActive } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (effectiveFrom) updateData.effectiveFrom = new Date(effectiveFrom);
    if (effectiveTo !== undefined) updateData.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;
    if (assumptions) updateData.assumptions = JSON.stringify(assumptions);
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const model = await prisma.revenueModel.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return res.json({ ok: true, model });
  } catch (error) {
    console.error('Update revenue model error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete revenue model
router.delete('/models/:id', requirePermission(PERMISSIONS.REVENUE_UPDATE), async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can delete revenue models' });
    }

    await prisma.revenueModel.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete revenue model error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Revenue Computation & Summary
// ============================================

// Helper: Get assumptions for calculation
async function getActiveAssumptions() {
  const now = new Date();
  const model = await prisma.revenueModel.findFirst({
    where: {
      isActive: true,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  });
  return model ? JSON.parse(model.assumptions) : DEFAULT_ASSUMPTIONS;
}

// Helper: Calculate eCPM for given dimensions
function getECPM(assumptions, slotName, device, country) {
  const slotKey = assumptions.eCPM.bySlot[slotName] ? slotName : 'DEFAULT';
  const deviceKey = device || 'desktop';
  const baseECPM = assumptions.eCPM.bySlot[slotKey][deviceKey] || assumptions.eCPM.bySlot[slotKey].desktop || 1.5;
  
  const countryKey = assumptions.eCPM.byCountry[country] ? country : 
    ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'].includes(country) ? 'GCC' : 'OTHER';
  const countryMultiplier = assumptions.eCPM.byCountry[countryKey] || 1.0;
  
  return baseECPM * countryMultiplier;
}

// Helper: Calculate CPC for given dimensions
function getCPC(assumptions, slotName, device, country) {
  const slotKey = assumptions.CPC.bySlot[slotName] ? slotName : 'DEFAULT';
  const deviceKey = device || 'desktop';
  const baseCPC = assumptions.CPC.bySlot[slotKey][deviceKey] || assumptions.CPC.bySlot[slotKey].desktop || 0.10;
  
  const countryKey = assumptions.CPC.byCountry[country] ? country : 
    ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'].includes(country) ? 'GCC' : 'OTHER';
  const countryMultiplier = assumptions.CPC.byCountry[countryKey] || 1.0;
  
  return baseCPC * countryMultiplier;
}

// Monetization summary
router.get('/summary', requirePermission(PERMISSIONS.REVENUE_READ), async (req, res) => {
  try {
    const { from, to } = req.query;
    const now = new Date();
    
    const endDate = to ? new Date(to) : now;
    const startDate = from ? new Date(from) : new Date(now.setDate(now.getDate() - 30));

    const assumptions = await getActiveAssumptions();

    // Get ad events with slot info
    const adEvents = await prisma.adEvent.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { adSlot: true },
    });

    // Get actual revenue snapshots
    const snapshots = await prisma.revenueSnapshot.findMany({
      where: { dateTime: { gte: startDate, lte: endDate } },
    });

    // Calculate metrics
    let totalImpressions = 0;
    let totalClicks = 0;
    let estimatedRevenue = 0;

    adEvents.forEach(event => {
      if (event.eventType === 'IMPRESSION') {
        totalImpressions++;
        const eCPM = getECPM(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country);
        estimatedRevenue += eCPM / 1000;
      } else if (event.eventType === 'CLICK') {
        totalClicks++;
        const cpc = getCPC(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country);
        estimatedRevenue += cpc;
      }
    });

    const actualRevenue = snapshots.reduce((sum, s) => sum + s.revenueAmount, 0);
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
    const rpm = totalImpressions > 0 ? (estimatedRevenue / totalImpressions * 1000) : 0;

    // Time period comparisons
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;
    
    // Today's metrics
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEvents = adEvents.filter(e => new Date(e.createdAt) >= todayStart);
    const todayImpressions = todayEvents.filter(e => e.eventType === 'IMPRESSION').length;
    const todayClicks = todayEvents.filter(e => e.eventType === 'CLICK').length;
    let todayEstimated = 0;
    todayEvents.forEach(event => {
      if (event.eventType === 'IMPRESSION') {
        todayEstimated += getECPM(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country) / 1000;
      } else if (event.eventType === 'CLICK') {
        todayEstimated += getCPC(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country);
      }
    });

    return res.json({
      period: { from: startDate, to: endDate, days: daysDiff },
      totals: {
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: ctr.toFixed(2),
        rpm: rpm.toFixed(2),
        estimatedRevenue: estimatedRevenue.toFixed(2),
        actualRevenue: actualRevenue.toFixed(2),
        variance: (estimatedRevenue - actualRevenue).toFixed(2),
        variancePercent: actualRevenue > 0 ? (((estimatedRevenue - actualRevenue) / actualRevenue) * 100).toFixed(1) : 0,
      },
      today: {
        impressions: todayImpressions,
        clicks: todayClicks,
        ctr: todayImpressions > 0 ? (todayClicks / todayImpressions * 100).toFixed(2) : 0,
        estimatedRevenue: todayEstimated.toFixed(2),
      },
      averages: {
        dailyImpressions: Math.round(totalImpressions / daysDiff),
        dailyClicks: Math.round(totalClicks / daysDiff),
        dailyRevenue: (estimatedRevenue / daysDiff).toFixed(2),
      },
    });
  } catch (error) {
    console.error('Get monetization summary error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// By slot breakdown
router.get('/by-slot', requirePermission(PERMISSIONS.REVENUE_READ), async (req, res) => {
  try {
    const { from, to } = req.query;
    const now = new Date();
    const endDate = to ? new Date(to) : now;
    const startDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const assumptions = await getActiveAssumptions();

    const adEvents = await prisma.adEvent.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { adSlot: true },
    });

    const slots = await prisma.adSlot.findMany();
    const slotMap = {};
    slots.forEach(slot => {
      slotMap[slot.id] = {
        id: slot.id,
        name: slot.name,
        positionKey: slot.positionKey,
        impressions: 0,
        clicks: 0,
        estimatedRevenue: 0,
      };
    });

    adEvents.forEach(event => {
      const slotId = event.adSlotId;
      if (!slotMap[slotId]) return;

      if (event.eventType === 'IMPRESSION') {
        slotMap[slotId].impressions++;
        slotMap[slotId].estimatedRevenue += getECPM(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country) / 1000;
      } else if (event.eventType === 'CLICK') {
        slotMap[slotId].clicks++;
        slotMap[slotId].estimatedRevenue += getCPC(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country);
      }
    });

    const totalRevenue = Object.values(slotMap).reduce((sum, s) => sum + s.estimatedRevenue, 0);

    const results = Object.values(slotMap).map(slot => ({
      ...slot,
      ctr: slot.impressions > 0 ? (slot.clicks / slot.impressions * 100).toFixed(2) : 0,
      eCPM: slot.impressions > 0 ? (slot.estimatedRevenue / slot.impressions * 1000).toFixed(2) : 0,
      estimatedRevenue: slot.estimatedRevenue.toFixed(2),
      shareOfTotal: totalRevenue > 0 ? ((slot.estimatedRevenue / totalRevenue) * 100).toFixed(1) : 0,
    })).sort((a, b) => parseFloat(b.estimatedRevenue) - parseFloat(a.estimatedRevenue));

    return res.json({ slots: results, totalRevenue: totalRevenue.toFixed(2) });
  } catch (error) {
    console.error('Get by-slot error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// By page/calculator breakdown
router.get('/by-page', requirePermission(PERMISSIONS.REVENUE_READ), async (req, res) => {
  try {
    const { from, to } = req.query;
    const now = new Date();
    const endDate = to ? new Date(to) : now;
    const startDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const assumptions = await getActiveAssumptions();

    // Get page views
    const pageViews = await prisma.pageView.groupBy({
      by: ['pagePath'],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _count: true,
    });

    // Get calculation events
    const calcEvents = await prisma.calculationEvent.groupBy({
      by: ['calculatorType'],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _count: true,
    });

    // Get ad events by page
    const adEvents = await prisma.adEvent.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { adSlot: true },
    });

    const pageStats = {};

    // Initialize from page views
    pageViews.forEach(pv => {
      const path = pv.pagePath;
      if (!pageStats[path]) {
        pageStats[path] = {
          pagePath: path,
          pageType: getPageType(path),
          pageViews: 0,
          calculations: 0,
          adImpressions: 0,
          adClicks: 0,
          estimatedRevenue: 0,
        };
      }
      pageStats[path].pageViews = pv._count;
    });

    // Add ad events
    adEvents.forEach(event => {
      const path = event.pagePath;
      if (!pageStats[path]) {
        pageStats[path] = {
          pagePath: path,
          pageType: getPageType(path),
          pageViews: 0,
          calculations: 0,
          adImpressions: 0,
          adClicks: 0,
          estimatedRevenue: 0,
        };
      }

      if (event.eventType === 'IMPRESSION') {
        pageStats[path].adImpressions++;
        pageStats[path].estimatedRevenue += getECPM(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country) / 1000;
      } else if (event.eventType === 'CLICK') {
        pageStats[path].adClicks++;
        pageStats[path].estimatedRevenue += getCPC(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country);
      }
    });

    const results = Object.values(pageStats)
      .map(page => ({
        ...page,
        ctr: page.adImpressions > 0 ? (page.adClicks / page.adImpressions * 100).toFixed(2) : 0,
        estimatedRevenue: page.estimatedRevenue.toFixed(2),
        revenuePerView: page.pageViews > 0 ? (page.estimatedRevenue / page.pageViews).toFixed(4) : 0,
      }))
      .sort((a, b) => parseFloat(b.estimatedRevenue) - parseFloat(a.estimatedRevenue))
      .slice(0, 50); // Top 50 pages

    return res.json({ pages: results });
  } catch (error) {
    console.error('Get by-page error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Helper: Determine page type from path
function getPageType(path) {
  if (path.includes('/calculator') || path.includes('/calc')) return 'calculator';
  if (path.includes('/salary') || path.includes('/payroll')) return 'calculator';
  if (path.includes('/eos') || path.includes('/end-of-service')) return 'calculator';
  if (path.includes('/workhours') || path.includes('/hours')) return 'calculator';
  if (path.includes('/dates')) return 'calculator';
  if (path.includes('/blog') || path.includes('/article')) return 'blog';
  if (path.includes('/faq')) return 'faq';
  if (path === '/' || path === '') return 'home';
  return 'other';
}

// By country breakdown
router.get('/by-country', requirePermission(PERMISSIONS.REVENUE_READ), async (req, res) => {
  try {
    const { from, to } = req.query;
    const now = new Date();
    const endDate = to ? new Date(to) : now;
    const startDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const assumptions = await getActiveAssumptions();

    const adEvents = await prisma.adEvent.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { adSlot: true },
    });

    const countryStats = {};

    adEvents.forEach(event => {
      const country = event.country || 'Unknown';
      if (!countryStats[country]) {
        countryStats[country] = { country, impressions: 0, clicks: 0, estimatedRevenue: 0 };
      }

      if (event.eventType === 'IMPRESSION') {
        countryStats[country].impressions++;
        countryStats[country].estimatedRevenue += getECPM(assumptions, event.adSlot?.name || 'DEFAULT', event.device, country) / 1000;
      } else if (event.eventType === 'CLICK') {
        countryStats[country].clicks++;
        countryStats[country].estimatedRevenue += getCPC(assumptions, event.adSlot?.name || 'DEFAULT', event.device, country);
      }
    });

    const results = Object.values(countryStats)
      .map(c => ({
        ...c,
        ctr: c.impressions > 0 ? (c.clicks / c.impressions * 100).toFixed(2) : 0,
        eCPM: c.impressions > 0 ? (c.estimatedRevenue / c.impressions * 1000).toFixed(2) : 0,
        estimatedRevenue: c.estimatedRevenue.toFixed(2),
      }))
      .sort((a, b) => parseFloat(b.estimatedRevenue) - parseFloat(a.estimatedRevenue));

    return res.json({ countries: results });
  } catch (error) {
    console.error('Get by-country error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// By device breakdown
router.get('/by-device', requirePermission(PERMISSIONS.REVENUE_READ), async (req, res) => {
  try {
    const { from, to } = req.query;
    const now = new Date();
    const endDate = to ? new Date(to) : now;
    const startDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const assumptions = await getActiveAssumptions();

    const adEvents = await prisma.adEvent.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { adSlot: true },
    });

    const deviceStats = {};

    adEvents.forEach(event => {
      const device = event.device || 'unknown';
      if (!deviceStats[device]) {
        deviceStats[device] = { device, impressions: 0, clicks: 0, estimatedRevenue: 0 };
      }

      if (event.eventType === 'IMPRESSION') {
        deviceStats[device].impressions++;
        deviceStats[device].estimatedRevenue += getECPM(assumptions, event.adSlot?.name || 'DEFAULT', device, event.country) / 1000;
      } else if (event.eventType === 'CLICK') {
        deviceStats[device].clicks++;
        deviceStats[device].estimatedRevenue += getCPC(assumptions, event.adSlot?.name || 'DEFAULT', device, event.country);
      }
    });

    const results = Object.values(deviceStats)
      .map(d => ({
        ...d,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions * 100).toFixed(2) : 0,
        eCPM: d.impressions > 0 ? (d.estimatedRevenue / d.impressions * 1000).toFixed(2) : 0,
        estimatedRevenue: d.estimatedRevenue.toFixed(2),
      }))
      .sort((a, b) => parseFloat(b.estimatedRevenue) - parseFloat(a.estimatedRevenue));

    return res.json({ devices: results });
  } catch (error) {
    console.error('Get by-device error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Revenue over time (for charts)
router.get('/over-time', requirePermission(PERMISSIONS.REVENUE_READ), async (req, res) => {
  try {
    const { from, to, granularity = 'day' } = req.query;
    const now = new Date();
    const endDate = to ? new Date(to) : now;
    const startDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const assumptions = await getActiveAssumptions();

    const adEvents = await prisma.adEvent.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { adSlot: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by time bucket
    const buckets = {};

    adEvents.forEach(event => {
      const date = new Date(event.createdAt);
      let key;
      
      if (granularity === 'hour') {
        key = `${date.toISOString().slice(0, 13)}:00`;
      } else if (granularity === 'day') {
        key = date.toISOString().slice(0, 10);
      } else if (granularity === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else if (granularity === 'month') {
        key = date.toISOString().slice(0, 7);
      } else {
        key = date.toISOString().slice(0, 10);
      }

      if (!buckets[key]) {
        buckets[key] = { period: key, impressions: 0, clicks: 0, estimatedRevenue: 0 };
      }

      if (event.eventType === 'IMPRESSION') {
        buckets[key].impressions++;
        buckets[key].estimatedRevenue += getECPM(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country) / 1000;
      } else if (event.eventType === 'CLICK') {
        buckets[key].clicks++;
        buckets[key].estimatedRevenue += getCPC(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country);
      }
    });

    const results = Object.values(buckets)
      .map(b => ({
        ...b,
        ctr: b.impressions > 0 ? (b.clicks / b.impressions * 100).toFixed(2) : 0,
        estimatedRevenue: b.estimatedRevenue.toFixed(2),
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return res.json({ data: results, granularity });
  } catch (error) {
    console.error('Get over-time error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Anomaly Detection & Alerts
// ============================================

// Run anomaly detection (can be called manually or via cron)
router.post('/detect-anomalies', requirePermission(PERMISSIONS.REVENUE_READ), async (req, res) => {
  try {
    const assumptions = await getActiveAssumptions();
    const alerts = [];

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Check for high CTR by slot
    const slotStats = await prisma.adEvent.groupBy({
      by: ['adSlotId', 'eventType'],
      where: { createdAt: { gte: dayAgo } },
      _count: true,
    });

    const slotMetrics = {};
    slotStats.forEach(stat => {
      if (!slotMetrics[stat.adSlotId]) {
        slotMetrics[stat.adSlotId] = { impressions: 0, clicks: 0 };
      }
      if (stat.eventType === 'IMPRESSION') slotMetrics[stat.adSlotId].impressions = stat._count;
      if (stat.eventType === 'CLICK') slotMetrics[stat.adSlotId].clicks = stat._count;
    });

    const slots = await prisma.adSlot.findMany();
    const slotMap = Object.fromEntries(slots.map(s => [s.id, s]));

    for (const [slotId, metrics] of Object.entries(slotMetrics)) {
      if (metrics.impressions < 100) continue; // Not enough data
      
      const ctr = (metrics.clicks / metrics.impressions) * 100;
      const slot = slotMap[slotId];
      
      if (ctr >= assumptions.CTR.thresholds.danger) {
        alerts.push({
          alertType: 'HIGH_CTR',
          severity: 'CRITICAL',
          adSlotId: slotId,
          periodStart: dayAgo,
          periodEnd: now,
          metrics: JSON.stringify({ ctr, threshold: assumptions.CTR.thresholds.danger, impressions: metrics.impressions, clicks: metrics.clicks }),
          message: `Critical: CTR of ${ctr.toFixed(2)}% for slot "${slot?.name || slotId}" exceeds danger threshold (${assumptions.CTR.thresholds.danger}%)`,
        });
      } else if (ctr >= assumptions.CTR.thresholds.critical) {
        alerts.push({
          alertType: 'HIGH_CTR',
          severity: 'HIGH',
          adSlotId: slotId,
          periodStart: dayAgo,
          periodEnd: now,
          metrics: JSON.stringify({ ctr, threshold: assumptions.CTR.thresholds.critical, impressions: metrics.impressions, clicks: metrics.clicks }),
          message: `High CTR of ${ctr.toFixed(2)}% for slot "${slot?.name || slotId}" exceeds critical threshold (${assumptions.CTR.thresholds.critical}%)`,
        });
      } else if (ctr >= assumptions.CTR.thresholds.warning) {
        alerts.push({
          alertType: 'HIGH_CTR',
          severity: 'MEDIUM',
          adSlotId: slotId,
          periodStart: dayAgo,
          periodEnd: now,
          metrics: JSON.stringify({ ctr, threshold: assumptions.CTR.thresholds.warning, impressions: metrics.impressions, clicks: metrics.clicks }),
          message: `Elevated CTR of ${ctr.toFixed(2)}% for slot "${slot?.name || slotId}" exceeds warning threshold (${assumptions.CTR.thresholds.warning}%)`,
        });
      }
    }

    // 2. Check for suspicious click velocity (same session, many clicks)
    const recentClicks = await prisma.adEvent.findMany({
      where: { eventType: 'CLICK', createdAt: { gte: hourAgo } },
      select: { sessionId: true, createdAt: true, ipAddress: true },
    });

    const sessionClicks = {};
    const ipClicks = {};

    recentClicks.forEach(click => {
      // Per session
      if (!sessionClicks[click.sessionId]) sessionClicks[click.sessionId] = [];
      sessionClicks[click.sessionId].push(click.createdAt);

      // Per IP
      if (click.ipAddress) {
        if (!ipClicks[click.ipAddress]) ipClicks[click.ipAddress] = [];
        ipClicks[click.ipAddress].push(click.createdAt);
      }
    });

    // Check session click velocity
    for (const [sessionId, clicks] of Object.entries(sessionClicks)) {
      if (clicks.length >= assumptions.clickVelocity.maxClicksPerSessionPerMinute * 10) {
        alerts.push({
          alertType: 'SUSPICIOUS_CLICKS',
          severity: 'HIGH',
          periodStart: hourAgo,
          periodEnd: now,
          metrics: JSON.stringify({ sessionId, clickCount: clicks.length, timeWindow: '1 hour' }),
          message: `Suspicious: Session ${sessionId.slice(0, 8)}... has ${clicks.length} clicks in the last hour`,
        });
      }
    }

    // Check IP click velocity
    for (const [ip, clicks] of Object.entries(ipClicks)) {
      if (clicks.length >= assumptions.clickVelocity.maxClicksPerIPPerHour) {
        alerts.push({
          alertType: 'SUSPICIOUS_CLICKS',
          severity: 'HIGH',
          periodStart: hourAgo,
          periodEnd: now,
          metrics: JSON.stringify({ ipAddress: ip, clickCount: clicks.length, timeWindow: '1 hour', threshold: assumptions.clickVelocity.maxClicksPerIPPerHour }),
          message: `Suspicious: IP ${ip} has ${clicks.length} clicks in the last hour (threshold: ${assumptions.clickVelocity.maxClicksPerIPPerHour})`,
        });
      }
    }

    // 3. Check for abnormal RPM
    const totalImpressions = Object.values(slotMetrics).reduce((sum, m) => sum + m.impressions, 0);
    const totalClicks = Object.values(slotMetrics).reduce((sum, m) => sum + m.clicks, 0);

    if (totalImpressions > 1000) {
      // Calculate actual RPM from revenue snapshots
      const snapshots = await prisma.revenueSnapshot.findMany({
        where: { dateTime: { gte: dayAgo } },
      });
      const actualRevenue = snapshots.reduce((sum, s) => sum + s.revenueAmount, 0);
      const actualRPM = (actualRevenue / totalImpressions) * 1000;

      if (actualRPM > assumptions.RPM.thresholds.maxExpected * assumptions.RPM.thresholds.criticalMultiplier) {
        alerts.push({
          alertType: 'ABNORMAL_RPM',
          severity: 'HIGH',
          periodStart: dayAgo,
          periodEnd: now,
          metrics: JSON.stringify({ rpm: actualRPM, maxExpected: assumptions.RPM.thresholds.maxExpected, impressions: totalImpressions }),
          message: `Abnormally high RPM of $${actualRPM.toFixed(2)} detected (expected max: $${assumptions.RPM.thresholds.maxExpected})`,
        });
      } else if (actualRPM < assumptions.RPM.thresholds.minExpected / 2 && actualRevenue > 0) {
        alerts.push({
          alertType: 'ABNORMAL_RPM',
          severity: 'MEDIUM',
          periodStart: dayAgo,
          periodEnd: now,
          metrics: JSON.stringify({ rpm: actualRPM, minExpected: assumptions.RPM.thresholds.minExpected, impressions: totalImpressions }),
          message: `Low RPM of $${actualRPM.toFixed(2)} detected (expected min: $${assumptions.RPM.thresholds.minExpected})`,
        });
      }
    }

    // Store new alerts (avoiding duplicates for same type/slot in same period)
    const createdAlerts = [];
    for (const alert of alerts) {
      // Check if similar alert already exists
      const existing = await prisma.monetizationAlert.findFirst({
        where: {
          alertType: alert.alertType,
          adSlotId: alert.adSlotId || null,
          isResolved: false,
          createdAt: { gte: dayAgo },
        },
      });

      if (!existing) {
        const created = await prisma.monetizationAlert.create({ data: alert });
        createdAlerts.push(created);
      }
    }

    return res.json({
      detected: alerts.length,
      created: createdAlerts.length,
      alerts: createdAlerts,
    });
  } catch (error) {
    console.error('Detect anomalies error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get alerts
router.get('/alerts', requirePermission(PERMISSIONS.REVENUE_READ), async (req, res) => {
  try {
    const { resolved, severity, type, limit = 50 } = req.query;

    const where = {};
    if (resolved !== undefined) where.isResolved = resolved === 'true';
    if (severity) where.severity = severity;
    if (type) where.alertType = type;

    const alerts = await prisma.monetizationAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
    });

    const counts = await prisma.monetizationAlert.groupBy({
      by: ['severity', 'isResolved'],
      _count: true,
    });

    return res.json({ alerts, counts });
  } catch (error) {
    console.error('Get alerts error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Resolve alert
router.put('/alerts/:id/resolve', requirePermission(PERMISSIONS.REVENUE_UPDATE), async (req, res) => {
  try {
    if (!['SUPER_ADMIN', 'ADS_MANAGER'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only SUPER_ADMIN or ADS_MANAGER can resolve alerts' });
    }

    const { note } = req.body;

    const alert = await prisma.monetizationAlert.update({
      where: { id: req.params.id },
      data: {
        isResolved: true,
        resolvedById: req.user.id,
        resolvedAt: new Date(),
        resolvedNote: note || null,
      },
    });

    return res.json({ ok: true, alert });
  } catch (error) {
    console.error('Resolve alert error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Forecasting
// ============================================

router.get('/forecast', requirePermission(PERMISSIONS.REVENUE_READ), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const forecastDays = period === '7d' ? 7 : period === '90d' ? 90 : 30;

    const assumptions = await getActiveAssumptions();

    // Get historical data (last 90 days for trend analysis)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const adEvents = await prisma.adEvent.findMany({
      where: { createdAt: { gte: ninetyDaysAgo } },
      include: { adSlot: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const dailyData = {};
    adEvents.forEach(event => {
      const day = event.createdAt.toISOString().slice(0, 10);
      if (!dailyData[day]) {
        dailyData[day] = { impressions: 0, clicks: 0, revenue: 0 };
      }
      if (event.eventType === 'IMPRESSION') {
        dailyData[day].impressions++;
        dailyData[day].revenue += getECPM(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country) / 1000;
      } else if (event.eventType === 'CLICK') {
        dailyData[day].clicks++;
        dailyData[day].revenue += getCPC(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country);
      }
    });

    const days = Object.keys(dailyData).sort();
    const revenues = days.map(d => dailyData[d].revenue);

    if (revenues.length < 7) {
      return res.json({
        forecast: null,
        message: 'Not enough historical data for forecasting (need at least 7 days)',
      });
    }

    // Simple linear regression for trend
    const n = revenues.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = revenues.reduce((a, b) => a + b, 0);
    const sumXY = revenues.reduce((sum, y, i) => sum + i * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Moving average (7-day)
    const last7 = revenues.slice(-7);
    const movingAvg = last7.reduce((a, b) => a + b, 0) / 7;

    // Generate forecast
    const forecast = [];
    let forecastTotal = 0;

    for (let i = 0; i < forecastDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      
      // Blend linear trend with moving average
      const trendValue = intercept + slope * (n + i);
      const blendedValue = (trendValue * 0.3 + movingAvg * 0.7);
      const dailyForecast = Math.max(0, blendedValue);
      
      forecast.push({
        date: date.toISOString().slice(0, 10),
        estimatedRevenue: dailyForecast.toFixed(2),
      });
      forecastTotal += dailyForecast;
    }

    // Monthly projections
    const monthlyProjections = [];
    for (let m = 0; m < 12; m++) {
      const monthValue = movingAvg * 30 * (1 + slope * 30 * m / movingAvg);
      monthlyProjections.push({
        month: m + 1,
        estimatedRevenue: Math.max(0, monthValue).toFixed(2),
      });
    }

    return res.json({
      historical: {
        days: n,
        totalRevenue: sumY.toFixed(2),
        avgDaily: (sumY / n).toFixed(2),
        trend: slope > 0 ? 'growing' : slope < 0 ? 'declining' : 'stable',
        trendPercent: ((slope / (sumY / n)) * 100).toFixed(1),
      },
      forecast: {
        period: `${forecastDays} days`,
        total: forecastTotal.toFixed(2),
        avgDaily: (forecastTotal / forecastDays).toFixed(2),
        daily: forecast,
      },
      monthlyProjections,
      methodology: 'Blended linear regression (30%) and 7-day moving average (70%)',
    });
  } catch (error) {
    console.error('Get forecast error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Traffic Source Analysis
// ============================================

router.get('/traffic-sources', requirePermission(PERMISSIONS.ANALYTICS_READ), async (req, res) => {
  try {
    const { from, to } = req.query;
    const now = new Date();
    const endDate = to ? new Date(to) : now;
    const startDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const assumptions = await getActiveAssumptions();

    // Get traffic sessions
    const sessions = await prisma.trafficSession.findMany({
      where: { startedAt: { gte: startDate, lte: endDate } },
    });

    // Get page views with UTM
    const pageViews = await prisma.pageView.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { sessionId: true, utmSource: true, utmMedium: true, utmCampaign: true, referrer: true },
    });

    // Get ad events
    const adEvents = await prisma.adEvent.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { adSlot: true },
    });

    // Build session to source mapping
    const sessionSource = {};
    pageViews.forEach(pv => {
      if (!sessionSource[pv.sessionId]) {
        sessionSource[pv.sessionId] = {
          source: pv.utmSource || extractDomain(pv.referrer) || 'direct',
          medium: pv.utmMedium || (pv.referrer ? 'referral' : 'none'),
          campaign: pv.utmCampaign || null,
        };
      }
    });

    // Aggregate by source
    const sourceStats = {};

    // From sessions
    sessions.forEach(session => {
      const source = session.utmSource || extractDomain(session.referrer) || 'direct';
      if (!sourceStats[source]) {
        sourceStats[source] = {
          source,
          sessions: 0,
          pageViews: 0,
          calculations: 0,
          adImpressions: 0,
          adClicks: 0,
          estimatedRevenue: 0,
        };
      }
      sourceStats[source].sessions++;
      sourceStats[source].pageViews += session.pageViews;
      sourceStats[source].calculations += session.calculations;
      sourceStats[source].adImpressions += session.adImpressions;
      sourceStats[source].adClicks += session.adClicks;
    });

    // Add revenue from ad events
    adEvents.forEach(event => {
      const sourceInfo = sessionSource[event.sessionId];
      const source = sourceInfo?.source || 'unknown';
      
      if (!sourceStats[source]) {
        sourceStats[source] = {
          source,
          sessions: 0,
          pageViews: 0,
          calculations: 0,
          adImpressions: 0,
          adClicks: 0,
          estimatedRevenue: 0,
        };
      }

      if (event.eventType === 'IMPRESSION') {
        sourceStats[source].estimatedRevenue += getECPM(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country) / 1000;
      } else if (event.eventType === 'CLICK') {
        sourceStats[source].estimatedRevenue += getCPC(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country);
      }
    });

    const results = Object.values(sourceStats)
      .map(s => ({
        ...s,
        ctr: s.adImpressions > 0 ? (s.adClicks / s.adImpressions * 100).toFixed(2) : 0,
        revenuePerSession: s.sessions > 0 ? (s.estimatedRevenue / s.sessions).toFixed(4) : 0,
        estimatedRevenue: s.estimatedRevenue.toFixed(2),
      }))
      .sort((a, b) => parseFloat(b.estimatedRevenue) - parseFloat(a.estimatedRevenue));

    return res.json({ sources: results });
  } catch (error) {
    console.error('Get traffic sources error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Helper: Extract domain from referrer URL
function extractDomain(referrer) {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.hostname.replace('www.', '');
  } catch {
    return referrer;
  }
}

// ============================================
// CSV Export
// ============================================

router.get('/export/summary', requirePermission(PERMISSIONS.ANALYTICS_EXPORT), async (req, res) => {
  try {
    const { from, to } = req.query;
    const now = new Date();
    const endDate = to ? new Date(to) : now;
    const startDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const assumptions = await getActiveAssumptions();

    const adEvents = await prisma.adEvent.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { adSlot: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const dailyData = {};
    adEvents.forEach(event => {
      const day = event.createdAt.toISOString().slice(0, 10);
      if (!dailyData[day]) {
        dailyData[day] = { date: day, impressions: 0, clicks: 0, revenue: 0 };
      }
      if (event.eventType === 'IMPRESSION') {
        dailyData[day].impressions++;
        dailyData[day].revenue += getECPM(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country) / 1000;
      } else if (event.eventType === 'CLICK') {
        dailyData[day].clicks++;
        dailyData[day].revenue += getCPC(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country);
      }
    });

    const rows = Object.values(dailyData).map(d => ({
      ...d,
      ctr: d.impressions > 0 ? (d.clicks / d.impressions * 100).toFixed(2) : 0,
      revenue: d.revenue.toFixed(2),
    }));

    // Generate CSV
    const headers = ['Date', 'Impressions', 'Clicks', 'CTR (%)', 'Estimated Revenue (SAR)'];
    const csv = [
      headers.join(','),
      ...rows.map(r => `${r.date},${r.impressions},${r.clicks},${r.ctr},${r.revenue}`),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=monetization-summary-${startDate.toISOString().slice(0, 10)}-to-${endDate.toISOString().slice(0, 10)}.csv`);
    return res.send(csv);
  } catch (error) {
    console.error('Export summary error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/by-slot', requirePermission(PERMISSIONS.ANALYTICS_EXPORT), async (req, res) => {
  try {
    const { from, to } = req.query;
    const now = new Date();
    const endDate = to ? new Date(to) : now;
    const startDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Reuse by-slot logic
    const data = await getBySlotData(startDate, endDate);

    const headers = ['Slot Name', 'Position', 'Impressions', 'Clicks', 'CTR (%)', 'eCPM (SAR)', 'Estimated Revenue (SAR)', 'Share (%)'];
    const csv = [
      headers.join(','),
      ...data.slots.map(s => `"${s.name}","${s.positionKey}",${s.impressions},${s.clicks},${s.ctr},${s.eCPM},${s.estimatedRevenue},${s.shareOfTotal}`),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=monetization-by-slot-${startDate.toISOString().slice(0, 10)}-to-${endDate.toISOString().slice(0, 10)}.csv`);
    return res.send(csv);
  } catch (error) {
    console.error('Export by-slot error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

async function getBySlotData(startDate, endDate) {
  const assumptions = await getActiveAssumptions();

  const adEvents = await prisma.adEvent.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
    include: { adSlot: true },
  });

  const slots = await prisma.adSlot.findMany();
  const slotMap = {};
  slots.forEach(slot => {
    slotMap[slot.id] = {
      id: slot.id,
      name: slot.name,
      positionKey: slot.positionKey,
      impressions: 0,
      clicks: 0,
      estimatedRevenue: 0,
    };
  });

  adEvents.forEach(event => {
    const slotId = event.adSlotId;
    if (!slotMap[slotId]) return;

    if (event.eventType === 'IMPRESSION') {
      slotMap[slotId].impressions++;
      slotMap[slotId].estimatedRevenue += getECPM(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country) / 1000;
    } else if (event.eventType === 'CLICK') {
      slotMap[slotId].clicks++;
      slotMap[slotId].estimatedRevenue += getCPC(assumptions, event.adSlot?.name || 'DEFAULT', event.device, event.country);
    }
  });

  const totalRevenue = Object.values(slotMap).reduce((sum, s) => sum + s.estimatedRevenue, 0);

  return {
    slots: Object.values(slotMap).map(slot => ({
      ...slot,
      ctr: slot.impressions > 0 ? (slot.clicks / slot.impressions * 100).toFixed(2) : 0,
      eCPM: slot.impressions > 0 ? (slot.estimatedRevenue / slot.impressions * 1000).toFixed(2) : 0,
      estimatedRevenue: slot.estimatedRevenue.toFixed(2),
      shareOfTotal: totalRevenue > 0 ? ((slot.estimatedRevenue / totalRevenue) * 100).toFixed(1) : 0,
    })).sort((a, b) => parseFloat(b.estimatedRevenue) - parseFloat(a.estimatedRevenue)),
    totalRevenue: totalRevenue.toFixed(2),
  };
}

router.get('/export/traffic-sources', requirePermission(PERMISSIONS.ANALYTICS_EXPORT), async (req, res) => {
  try {
    const { from, to } = req.query;
    const now = new Date();
    const endDate = to ? new Date(to) : now;
    const startDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Simplified traffic source export
    const pageViews = await prisma.pageView.groupBy({
      by: ['utmSource'],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _count: true,
    });

    const headers = ['Source', 'Page Views'];
    const csv = [
      headers.join(','),
      ...pageViews.map(pv => `"${pv.utmSource || 'direct'}",${pv._count}`),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=traffic-sources-${startDate.toISOString().slice(0, 10)}-to-${endDate.toISOString().slice(0, 10)}.csv`);
    return res.send(csv);
  } catch (error) {
    console.error('Export traffic sources error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
