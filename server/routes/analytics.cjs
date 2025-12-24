// Analytics routes
const express = require('express');
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');

const router = express.Router();

// Track page view
router.post('/pageview', async (req, res) => {
  try {
    const { sessionId, pagePath, referrer, device, locale, utmSource, utmMedium, utmCampaign, utmTerm, utmContent } = req.body;

    if (!sessionId || !pagePath) {
      return res.status(400).json({ error: 'sessionId and pagePath required' });
    }

    // Parse user agent
    const userAgent = req.headers['user-agent'] || '';
    let detectedDevice = device || 'desktop';
    let browser = 'unknown';

    if (!device) {
      if (/mobile/i.test(userAgent)) detectedDevice = 'mobile';
      else if (/tablet|ipad/i.test(userAgent)) detectedDevice = 'tablet';
    }

    // Browser detection - Edge must be checked before Chrome
    if (/edg/i.test(userAgent)) browser = 'edge';
    else if (/chrome/i.test(userAgent)) browser = 'chrome';
    else if (/firefox/i.test(userAgent)) browser = 'firefox';
    else if (/safari/i.test(userAgent)) browser = 'safari';

    // Get country from header (set by CDN/proxy) or IP geolocation service
    const country = req.headers['cf-ipcountry'] || req.headers['x-country'] || null;

    await prisma.pageView.create({
      data: {
        sessionId,
        pagePath,
        referrer: referrer || null,
        userAgent,
        device: detectedDevice,
        browser,
        locale: locale || null,
        country,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmTerm: utmTerm || null,
        utmContent: utmContent || null,
      },
    });

    // Update or create traffic session using upsert to avoid race conditions
    try {
      await prisma.trafficSession.upsert({
        where: { sessionId },
        update: {
          pageViews: { increment: 1 },
          lastSeenAt: new Date(),
        },
        create: {
          sessionId,
          firstPagePath: pagePath,
          referrer: referrer || null,
          utmSource: utmSource || null,
          utmMedium: utmMedium || null,
          utmCampaign: utmCampaign || null,
          utmTerm: utmTerm || null,
          utmContent: utmContent || null,
          country,
          device: detectedDevice,
          locale: locale || null,
          pageViews: 1,
          lastSeenAt: new Date(),
        },
      });
    } catch (sessionErr) {
      // Non-critical, don't fail the request
      console.warn('Failed to update traffic session:', sessionErr.message);
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Track pageview error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/analytics/events
 * Public endpoint to track custom events
 */
router.post('/events', async (req, res) => {
  try {
    const { sessionId, eventKey, properties = {}, pagePath } = req.body;

    if (!sessionId || !eventKey) {
      return res.status(400).json({ error: 'sessionId and eventKey required' });
    }

    // Validate eventKey exists in AnalyticsEvent table
    const eventDef = await prisma.analyticsEvent.findUnique({
      where: { key: eventKey }
    });

    if (!eventDef || !eventDef.enabled) {
      // Silently drop or return 204 to avoid leaking info
      return res.status(204).end();
    }

    // Store event
    await prisma.analyticsEventLog.create({
      data: {
        sessionId,
        eventKey,
        pagePath: pagePath || null,
        propertiesJson: JSON.stringify(properties),
        occurredAt: new Date()
      }
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Track event error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Helper to safely stringify JSON
function safeStringify(obj) {
  try {
    if (typeof obj === 'string') return obj;
    return JSON.stringify(obj || {});
  } catch (e) {
    console.warn('JSON stringify failed:', e.message);
    return '{}';
  }
}

// Track calculation event
router.post('/calculation', async (req, res) => {
  try {
    const { sessionId, calculatorType, pagePath, inputSummary, resultSummary, durationMs, device, locale, utmSource, utmMedium, utmCampaign } = req.body;

    if (!sessionId || !calculatorType) {
      return res.status(400).json({ error: 'sessionId and calculatorType required' });
    }

    // Get country from header
    const country = req.headers['cf-ipcountry'] || req.headers['x-country'] || null;

    await prisma.calculationEvent.create({
      data: {
        sessionId,
        calculatorType,
        pagePath: pagePath || null,
        inputSummary: safeStringify(inputSummary),
        resultSummary: safeStringify(resultSummary),
        durationMs: durationMs || 0,
        device: device || null,
        locale: locale || null,
        country,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
      },
    });

    // Update traffic session calculation count
    try {
      await prisma.trafficSession.update({
        where: { sessionId },
        data: {
          calculations: { increment: 1 },
          lastSeenAt: new Date(),
        },
      });
    } catch (e) {
      // Session might not exist, non-critical
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Track calculation error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get analytics history (last 30 days)
router.get('/history', requirePermission(PERMISSIONS.ANALYTICS_READ), async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString();

    // Use raw query via the exposed _db instance in our shim
    const pageViews = prisma._db.prepare(`
      SELECT date(createdAt) as date, COUNT(*) as count 
      FROM page_views 
      WHERE createdAt >= ? 
      GROUP BY date(createdAt)
      ORDER BY date ASC
    `).all(dateStr);

    const revenue = prisma._db.prepare(`
      SELECT date(dateTime) as date, SUM(revenueAmount) as amount 
      FROM revenue_snapshots 
      WHERE dateTime >= ? 
      GROUP BY date(dateTime)
      ORDER BY date ASC
    `).all(dateStr);

    return res.json({ pageViews, revenue });
  } catch (error) {
    console.error('Get analytics history error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get analytics dashboard data (admin)
router.get('/dashboard', requirePermission(PERMISSIONS.ANALYTICS_READ), async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    // Get counts
    const [
      todayPageViews,
      weekPageViews,
      monthPageViews,
      todayCalculations,
      todayAdImpressions,
      todayAdClicks,
      uniqueVisitorsGrouped,
      topPages,
      topCalculators,
    ] = await Promise.all([
      prisma.pageView.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.pageView.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.pageView.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.calculationEvent.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.adEvent.count({ where: { eventType: 'IMPRESSION', createdAt: { gte: todayStart } } }),
      prisma.adEvent.count({ where: { eventType: 'CLICK', createdAt: { gte: todayStart } } }),
      prisma.pageView.groupBy({
        by: ['sessionId'],
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.pageView.groupBy({
        by: ['pagePath'],
        where: { createdAt: { gte: weekStart } },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } },
        take: 10,
      }),
      prisma.calculationEvent.groupBy({
        by: ['calculatorType'],
        where: { createdAt: { gte: weekStart } },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } },
        take: 10,
      }),
    ]);

    // Get today's revenue
    const todayRevenue = await prisma.revenueSnapshot.aggregate({
      where: { dateTime: { gte: todayStart } },
      _sum: { revenueAmount: true },
    });

    // Get monthly revenue
    const monthRevenue = await prisma.revenueSnapshot.aggregate({
      where: { dateTime: { gte: monthStart } },
      _sum: { revenueAmount: true },
    });

    const uniqueVisitorsToday = uniqueVisitorsGrouped ? uniqueVisitorsGrouped.length : 0;

    return res.json({
      today: {
        pageViews: todayPageViews,
        calculations: todayCalculations,
        uniqueVisitors: uniqueVisitorsToday,
        adImpressions: todayAdImpressions,
        adClicks: todayAdClicks,
        revenue: todayRevenue._sum.revenueAmount || 0,
      },
      week: {
        pageViews: weekPageViews,
      },
      month: {
        pageViews: monthPageViews,
        revenue: monthRevenue._sum.revenueAmount || 0,
      },
      topPages: topPages.map(p => ({ path: p.pagePath, count: p._count._all })),
      topCalculators: topCalculators.map(c => ({ type: c.calculatorType, count: c._count._all })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get time-series data
router.get('/timeseries', requirePermission(PERMISSIONS.ANALYTICS_READ), async (req, res) => {
  try {
    const { period = 'day', days = 30, metric = 'pageviews' } = req.query;
    const daysNum = parseInt(days, 10) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    let data = [];

    if (metric === 'pageviews') {
      const views = await prisma.pageView.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      // Group by day
      const grouped = {};
      views.forEach(v => {
        const date = v.createdAt.toISOString().split('T')[0];
        grouped[date] = (grouped[date] || 0) + 1;
      });

      data = Object.entries(grouped).map(([date, count]) => ({ date, count }));
    } else if (metric === 'calculations') {
      const calcs = await prisma.calculationEvent.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true, calculatorType: true },
        orderBy: { createdAt: 'asc' },
      });

      const grouped = {};
      calcs.forEach(c => {
        const date = c.createdAt.toISOString().split('T')[0];
        grouped[date] = (grouped[date] || 0) + 1;
      });

      data = Object.entries(grouped).map(([date, count]) => ({ date, count }));
    } else if (metric === 'revenue') {
      const snapshots = await prisma.revenueSnapshot.findMany({
        where: { dateTime: { gte: startDate } },
        select: { dateTime: true, revenueAmount: true },
        orderBy: { dateTime: 'asc' },
      });

      const grouped = {};
      snapshots.forEach(s => {
        const date = s.dateTime.toISOString().split('T')[0];
        grouped[date] = (grouped[date] || 0) + s.revenueAmount;
      });

      data = Object.entries(grouped).map(([date, amount]) => ({ date, amount }));
    }

    return res.json({ data, metric, period, days: daysNum });
  } catch (error) {
    console.error('Timeseries error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Export analytics data
router.get('/export', requirePermission(PERMISSIONS.ANALYTICS_EXPORT), async (req, res) => {
  try {
    const { type = 'pageviews', format = 'json', days = 30 } = req.query;
    const daysNum = parseInt(days, 10) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    let data = [];

    if (type === 'pageviews') {
      data = await prisma.pageView.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'desc' },
      });
    } else if (type === 'calculations') {
      data = await prisma.calculationEvent.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'desc' },
      });
    } else if (type === 'adevents') {
      data = await prisma.adEvent.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (format === 'csv') {
      if (data.length === 0) {
        return res.type('text/csv').send('No data');
      }

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row =>
        Object.values(row)
          .map(v => (typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v))
          .join(',')
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-export.csv`);
      return res.send([headers, ...rows].join('\n'));
    }

    return res.json({ data, count: data.length });
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
