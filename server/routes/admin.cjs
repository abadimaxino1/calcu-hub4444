const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ============================================
// AI Integrations
// ============================================

// Get all AI integrations
router.get('/ai-integrations', requireAuth, async (req, res) => {
  try {
    const integrations = await prisma.aIIntegration.findMany({
      select: {
        id: true,
        provider: true,
        isEnabled: true,
        model: true,
        features: true,
        quota: true,
        used: true,
        lastReset: true,
      },
    });

    // Parse features JSON
    const parsed = integrations.map((i) => ({
      ...i,
      features: i.features ? JSON.parse(i.features) : [],
    }));

    return res.json({ integrations: parsed });
  } catch (error) {
    console.error('Get AI integrations error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create AI integration
router.post('/ai-integrations', requireAuth, async (req, res) => {
  try {
    const { provider, isEnabled, apiKey, model, features, quota } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    const integration = await prisma.aIIntegration.create({
      data: {
        provider,
        isEnabled: Boolean(isEnabled),
        apiKey: apiKey || null, // TODO: Encrypt in production
        model: model || null,
        features: JSON.stringify(features || []),
        quota: parseInt(quota) || 1000,
        used: 0,
        lastReset: new Date(),
      },
    });

    return res.json({ ok: true, integration });
  } catch (error) {
    console.error('Create AI integration error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update AI integration
router.put('/ai-integrations/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isEnabled, apiKey, model, features, quota } = req.body;

    const updateData = {};
    if (typeof isEnabled === 'boolean') updateData.isEnabled = isEnabled;
    if (apiKey !== undefined) updateData.apiKey = apiKey || null;
    if (model !== undefined) updateData.model = model || null;
    if (features !== undefined) updateData.features = JSON.stringify(features);
    if (quota !== undefined) updateData.quota = parseInt(quota) || 1000;

    const integration = await prisma.aIIntegration.update({
      where: { id },
      data: updateData,
    });

    return res.json({ ok: true, integration });
  } catch (error) {
    console.error('Update AI integration error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Maintenance Mode
// ============================================

// Get maintenance settings
router.get('/maintenance', requireAuth, async (req, res) => {
  try {
    let settings = await prisma.maintenanceMode.findFirst();

    if (!settings) {
      // Create default settings
      settings = await prisma.maintenanceMode.create({
        data: {
          isEnabled: false,
          title: 'الموقع قيد الصيانة / Site Under Maintenance',
          messageAr: 'نعتذر عن الإزعاج. الموقع قيد الصيانة حالياً وسيعود قريباً.',
          messageEn:
            'Sorry for the inconvenience. The site is currently under maintenance and will be back soon.',
        },
      });
    }

    return res.json({ settings });
  } catch (error) {
    console.error('Get maintenance settings error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update maintenance settings
router.put('/maintenance', requireAuth, async (req, res) => {
  try {
    const { isEnabled, title, messageAr, messageEn, startTime, endTime, allowedIPs } = req.body;

    let settings = await prisma.maintenanceMode.findFirst();

    if (!settings) {
      settings = await prisma.maintenanceMode.create({
        data: {
          isEnabled: Boolean(isEnabled),
          title: title || 'الموقع قيد الصيانة / Site Under Maintenance',
          messageAr:
            messageAr || 'نعتذر عن الإزعاج. الموقع قيد الصيانة حالياً وسيعود قريباً.',
          messageEn:
            messageEn ||
            'Sorry for the inconvenience. The site is currently under maintenance and will be back soon.',
          startTime: startTime ? new Date(startTime) : null,
          endTime: endTime ? new Date(endTime) : null,
          allowedIPs: allowedIPs || null,
        },
      });
    } else {
      const updateData = {};
      if (typeof isEnabled === 'boolean') updateData.isEnabled = isEnabled;
      if (title) updateData.title = title;
      if (messageAr) updateData.messageAr = messageAr;
      if (messageEn) updateData.messageEn = messageEn;
      if (startTime !== undefined)
        updateData.startTime = startTime ? new Date(startTime) : null;
      if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;
      if (allowedIPs !== undefined) updateData.allowedIPs = allowedIPs || null;

      settings = await prisma.maintenanceMode.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    return res.json({ ok: true, settings });
  } catch (error) {
    console.error('Update maintenance settings error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Revenue Goals & Projections
// ============================================

// Get revenue goals
router.get('/revenue-goals', requireAuth, async (req, res) => {
  try {
    const { year, month } = req.query;

    const where = {};
    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);

    const goals = await prisma.revenueGoal.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 12, // Last 12 months
    });

    return res.json({ goals });
  } catch (error) {
    console.error('Get revenue goals error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create/Update revenue goal
router.post('/revenue-goals', requireAuth, async (req, res) => {
  try {
    const { year, month, targetRevenue, targetPageviews, targetRPM, notes } = req.body;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const goal = await prisma.revenueGoal.upsert({
      where: {
        year_month: {
          year: parseInt(year),
          month: parseInt(month),
        },
      },
      update: {
        targetRevenue: parseFloat(targetRevenue) || 0,
        targetPageviews: parseInt(targetPageviews) || 0,
        targetRPM: parseFloat(targetRPM) || 0,
        notes: notes || null,
      },
      create: {
        year: parseInt(year),
        month: parseInt(month),
        targetRevenue: parseFloat(targetRevenue) || 0,
        targetPageviews: parseInt(targetPageviews) || 0,
        targetRPM: parseFloat(targetRPM) || 0,
        notes: notes || null,
      },
    });

    return res.json({ ok: true, goal });
  } catch (error) {
    console.error('Create/Update revenue goal error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get revenue projections
router.get('/revenue-projections', requireAuth, async (req, res) => {
  try {
    const projections = await prisma.revenueProjection.findMany({
      where: {
        projectionDate: {
          gte: new Date(),
        },
      },
      orderBy: { projectionDate: 'asc' },
      take: 30, // Next 30 days
    });

    return res.json({ projections });
  } catch (error) {
    console.error('Get revenue projections error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Generate revenue projection
router.post('/revenue-projections/generate', requireAuth, async (req, res) => {
  try {
    // Simple projection algorithm
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get actual revenue from last 30 days
    const analytics = await prisma.analyticsDaily.findMany({
      where: {
        date: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: { date: 'asc' },
    });

    if (analytics.length === 0) {
      return res.json({ projections: [], message: 'Not enough data to generate projections' });
    }

    const totalRevenue = analytics.reduce((sum, day) => sum + day.revenue, 0);
    const avgDailyRevenue = totalRevenue / analytics.length;

    // Calculate growth rate
    const firstHalfRevenue = analytics
      .slice(0, Math.floor(analytics.length / 2))
      .reduce((sum, day) => sum + day.revenue, 0);
    const secondHalfRevenue = analytics
      .slice(Math.floor(analytics.length / 2))
      .reduce((sum, day) => sum + day.revenue, 0);

    const growthRate =
      firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;

    // Generate projections for next 30 days
    const projections = [];
    for (let i = 1; i <= 30; i++) {
      const projectionDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const projectedRevenue = avgDailyRevenue * (1 + (growthRate / 100) * (i / 30));

      await prisma.revenueProjection.upsert({
        where: { projectionDate },
        update: {
          projectedRevenue,
          growthRate,
          basedOnDays: analytics.length,
          confidence: analytics.length >= 20 ? 'HIGH' : analytics.length >= 10 ? 'MEDIUM' : 'LOW',
          assumptions: JSON.stringify({
            avgDailyRevenue,
            growthRate,
            dataPoints: analytics.length,
          }),
        },
        create: {
          projectionDate,
          projectedRevenue,
          growthRate,
          basedOnDays: analytics.length,
          confidence: analytics.length >= 20 ? 'HIGH' : analytics.length >= 10 ? 'MEDIUM' : 'LOW',
          assumptions: JSON.stringify({
            avgDailyRevenue,
            growthRate,
            dataPoints: analytics.length,
          }),
        },
      });

      projections.push({
        projectionDate,
        projectedRevenue,
        growthRate,
        confidence: analytics.length >= 20 ? 'HIGH' : analytics.length >= 10 ? 'MEDIUM' : 'LOW',
      });
    }

    return res.json({ ok: true, projections, message: 'Projections generated successfully' });
  } catch (error) {
    console.error('Generate revenue projections error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
