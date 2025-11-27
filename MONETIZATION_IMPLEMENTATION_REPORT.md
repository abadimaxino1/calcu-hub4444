# Calcu-Hub Monetization & Analytics Implementation Report

**Date:** November 26, 2025  
**Auditor:** GitHub Copilot (Claude Opus 4.5)  
**Scope:** Revenue Model, Analytics, Anomaly Detection, Traffic Attribution

---

## Executive Summary

This report documents the implementation of a comprehensive **monetization and analytics system** for Calcu-Hub, transforming it from an "AdSense-ready" prototype into a serious revenue analytics platform.

### Key Deliverables

| Component | Status | Files |
|-----------|--------|-------|
| Revenue Model Database | ✅ Complete | `prisma/schema.prisma` |
| Monetization API Routes | ✅ Complete | `server/routes/monetization.cjs` |
| Admin Dashboard | ✅ Complete | `src/admin/MonetizationPanel.tsx` |
| Anomaly Detection | ✅ Complete | Integrated in monetization routes |
| Traffic Attribution | ✅ Complete | UTM tracking in analytics |
| CSV Export | ✅ Complete | 3 export endpoints |
| SEO/hreflang | ✅ Enhanced | `src/lib/seoHead.tsx` |

---

## Part 1: Revenue Model Configuration

### 1A) Database Entities

**New Prisma Models:**

```prisma
model RevenueModel {
  id            String    @id @default(uuid())
  name          String    @unique
  description   String?
  effectiveFrom DateTime
  effectiveTo   DateTime?
  isActive      Boolean   @default(true)
  assumptions   String    // JSON with eCPM/CPC/CTR by slot/device/country
  createdById   String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model MonetizationAlert {
  id          String    @id @default(uuid())
  alertType   String    // HIGH_CTR, SUSPICIOUS_CLICKS, ABNORMAL_RPM
  severity    String    // LOW, MEDIUM, HIGH, CRITICAL
  adSlotId    String?
  pagePath    String?
  country     String?
  device      String?
  periodStart DateTime
  periodEnd   DateTime
  metrics     String    // JSON with actual values
  message     String
  isResolved  Boolean   @default(false)
  resolvedById String?
  resolvedAt  DateTime?
}

model TrafficSession {
  id            String   @id @default(uuid())
  sessionId     String   @unique
  firstPagePath String
  referrer      String?
  utmSource     String?
  utmMedium     String?
  utmCampaign   String?
  pageViews     Int      @default(1)
  calculations  Int      @default(0)
  adImpressions Int      @default(0)
  adClicks      Int      @default(0)
  country       String?
  device        String?
  locale        String?
}
```

**Extended Existing Models:**

- `PageView`: Added `locale`, `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent`
- `CalculationEvent`: Added `locale`, `country`, `device`, UTM fields
- `AdEvent`: Added `country`, `device`, `locale`, `ipAddress`

### 1B) Revenue Model Assumptions

Default assumptions are built-in for the Saudi market:

```javascript
const DEFAULT_ASSUMPTIONS = {
  eCPM: {
    bySlot: {
      CALC_TOP: { desktop: 2.5, mobile: 1.8, tablet: 2.0 },
      CALC_SIDEBAR: { desktop: 1.5, mobile: 1.0, tablet: 1.2 },
      BLOG_INLINE: { desktop: 3.0, mobile: 2.2, tablet: 2.5 },
      BLOG_SIDEBAR: { desktop: 1.8, mobile: 1.2, tablet: 1.5 },
      FOOTER_BANNER: { desktop: 0.8, mobile: 0.5, tablet: 0.6 },
    },
    byCountry: {
      SA: 1.0,    // Saudi Arabia baseline
      AE: 1.2,    // UAE premium
      KW: 1.1,    // Kuwait
      QA: 1.15,   // Qatar
      OTHER: 0.6, // Non-GCC
    },
  },
  CTR: {
    thresholds: {
      warning: 5.0,   // 5% CTR triggers warning
      critical: 10.0, // 10% CTR is suspicious
      danger: 15.0,   // 15% CTR likely invalid traffic
    },
  },
  clickVelocity: {
    maxClicksPerSessionPerMinute: 3,
    maxClicksPerIPPerHour: 10,
  },
};
```

### 1C) API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/monetization/models` | GET | List all revenue models |
| `/api/admin/monetization/models/active` | GET | Get active model + assumptions |
| `/api/admin/monetization/models` | POST | Create new revenue model |
| `/api/admin/monetization/models/:id` | PUT | Update revenue model |
| `/api/admin/monetization/models/:id` | DELETE | Delete revenue model |

**Access Control:** Only `SUPER_ADMIN` and `ADS_MANAGER` roles can create/update revenue models.

---

## Part 2: Computed Revenue Metrics

### Revenue Computation Logic

The system calculates estimated revenue using:

```
Estimated Revenue = Σ (Impressions × eCPM / 1000) + Σ (Clicks × CPC)
```

Where eCPM and CPC are adjusted by:
- Ad slot position
- Device type (desktop/mobile/tablet)
- Country (with GCC premium multipliers)

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/monetization/summary` | GET | Overall KPIs + variance |
| `/api/admin/monetization/by-slot` | GET | Revenue breakdown by ad slot |
| `/api/admin/monetization/by-page` | GET | Revenue by page/calculator |
| `/api/admin/monetization/by-country` | GET | Revenue by country |
| `/api/admin/monetization/by-device` | GET | Revenue by device type |
| `/api/admin/monetization/over-time` | GET | Time series data for charts |

All endpoints support `?from=...&to=...` date range filtering.

### Sample Response: `/api/admin/monetization/summary`

```json
{
  "period": { "from": "2025-10-27", "to": "2025-11-26", "days": 30 },
  "totals": {
    "impressions": 45230,
    "clicks": 892,
    "ctr": "1.97",
    "rpm": "2.45",
    "estimatedRevenue": "110.81",
    "actualRevenue": "105.50",
    "variance": "5.31",
    "variancePercent": "5.0"
  },
  "today": {
    "impressions": 1520,
    "clicks": 28,
    "ctr": "1.84",
    "estimatedRevenue": "3.72"
  },
  "averages": {
    "dailyImpressions": 1508,
    "dailyClicks": 30,
    "dailyRevenue": "3.69"
  }
}
```

---

## Part 3: Anomaly Detection (AdSense Safety)

### Detection Types

| Alert Type | Trigger | Severity |
|------------|---------|----------|
| `HIGH_CTR` | CTR > 15% | CRITICAL |
| `HIGH_CTR` | CTR > 10% | HIGH |
| `HIGH_CTR` | CTR > 5% | MEDIUM |
| `SUSPICIOUS_CLICKS` | Same session clicks > threshold | HIGH |
| `SUSPICIOUS_CLICKS` | Same IP clicks > 10/hour | HIGH |
| `ABNORMAL_RPM` | RPM > 3× expected max | HIGH |
| `ABNORMAL_RPM` | RPM < 0.5× expected min | MEDIUM |

### How It Works

1. **Manual Trigger:** Call `POST /api/admin/monetization/detect-anomalies`
2. **Automated:** Can be scheduled via cron job
3. **Alerts Stored:** In `MonetizationAlert` table with full context
4. **Admin Visibility:** Alerts panel shows unresolved issues
5. **Resolution:** SUPER_ADMIN/ADS_MANAGER can mark as resolved

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/monetization/detect-anomalies` | POST | Run detection |
| `/api/admin/monetization/alerts` | GET | List alerts |
| `/api/admin/monetization/alerts/:id/resolve` | PUT | Resolve alert |

---

## Part 4: Admin Dashboards

### MonetizationPanel Component

**File:** `src/admin/MonetizationPanel.tsx`

**Tabs:**
1. **Overview** - KPI cards, revenue/CTR/impressions charts
2. **By Slot** - Table + doughnut chart per ad slot
3. **By Page** - Revenue by calculator/page with type badges
4. **By Country** - Horizontal bar chart + table
5. **By Device** - Desktop/mobile/tablet breakdown
6. **Traffic Sources** - UTM-based attribution
7. **Alerts** - Active/resolved alerts with resolution UI
8. **Forecast** - 30-day forecast + 12-month projection
9. **Settings** - Revenue model configuration

### Features

- **Date Range Presets:** Today, 7d, 30d, MTD, YTD, Custom
- **Responsive Charts:** Chart.js with proper sizing
- **RTL Support:** Works in Arabic mode
- **Loading States:** Spinner during data fetch
- **Empty States:** Helpful messages when no data
- **CSV Export:** Download buttons for main tables

---

## Part 5: Traffic Source Attribution

### UTM Parameter Tracking

The frontend now captures and persists UTM parameters:

```typescript
// src/lib/analytics.ts
export function getUTMParams(): UTMParams {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    utmTerm: params.get('utm_term'),
    utmContent: params.get('utm_content'),
  };
}
```

### Traffic Session Aggregation

Each session is tracked in `TrafficSession` with:
- First page path
- Referrer domain
- UTM parameters
- Cumulative: page views, calculations, ad impressions, clicks

### Traffic Sources Dashboard

Shows for each source:
- Sessions
- Page Views
- Calculations (calculator usage)
- Ad Impressions
- Ad Clicks
- CTR
- Estimated Revenue
- Revenue per Session

**Goal:** Answer "Which traffic source brings real revenue, not just visitors?"

---

## Part 6: Data Export

### CSV Export Endpoints

| Endpoint | Content |
|----------|---------|
| `/api/admin/monetization/export/summary` | Daily revenue CSV |
| `/api/admin/monetization/export/by-slot` | Per-slot breakdown CSV |
| `/api/admin/monetization/export/traffic-sources` | Traffic sources CSV |

All exports:
- Support date range filtering
- Include proper headers
- Download with timestamped filename

---

## Part 7: SEO Enhancements

### Enhanced SeoHead Component

**File:** `src/lib/seoHead.tsx`

**New Features:**
- Automatic hreflang tag generation
- x-default for search engines
- JSON-LD structured data injection
- OpenGraph and Twitter Card meta tags
- Canonical URL support

### Helper Functions

```typescript
// Generate calculator page schema
generateCalculatorJsonLd({ name, description, url, locale })

// Generate article schema
generateArticleJsonLd({ headline, description, url, datePublished, authorName })

// Generate FAQ schema
generateFAQJsonLd([{ question, answer }])

// Generate hreflang alternates
generateHreflangAlternates('/calculator/salary')
// Returns: [{ locale: 'ar', url: '.../ar/calculator/salary' }, { locale: 'en', url: '.../en/calculator/salary' }]
```

---

## How to Use (For the Owner)

### Setting Up Revenue Assumptions

1. Go to Admin → Monetization → Settings
2. Create a new Revenue Model with name "Production 2025 KSA"
3. Set effectiveFrom to today
4. Customize assumptions JSON if needed
5. Save and mark as Active

### Monitoring Daily Revenue

1. Go to Admin → Monetization → Overview
2. Review today's KPIs in the top cards
3. Check the Revenue Over Time chart for trends
4. Use date presets (7d, 30d, MTD) to analyze periods
5. Export CSV for spreadsheet analysis

### Spotting Risky Metrics

1. Go to Admin → Monetization → Alerts
2. Review any CRITICAL or HIGH severity alerts
3. Click "Run Anomaly Detection" for fresh scan
4. Investigate high CTR alerts (could be invalid clicks)
5. Resolve alerts with notes once addressed

### Deciding Which Channels to Invest In

1. Go to Admin → Monetization → Traffic Sources
2. Sort by "Revenue" column
3. Compare "Revenue per Session" across sources
4. High revenue + high RPS = invest more
5. High sessions + low revenue = optimize or drop
6. Use UTM parameters in campaigns for tracking

---

## Technical Summary

### Files Created

| File | Purpose |
|------|---------|
| `server/routes/monetization.cjs` | All monetization API endpoints |
| `src/admin/MonetizationPanel.tsx` | Admin dashboard component |

### Files Modified

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Added RevenueModel, MonetizationAlert, TrafficSession |
| `server/index.cjs` | Added monetization routes |
| `server/routes/analytics.cjs` | Added UTM tracking, traffic sessions |
| `server/routes/ads.cjs` | Added device/country/IP tracking |
| `src/admin/AdminShell.tsx` | Added Monetization tab |
| `src/lib/analytics.ts` | Added UTM extraction, tracking functions |
| `src/lib/seoHead.tsx` | Enhanced with hreflang, JSON-LD |
| `SEO_CONTENT_TODO.md` | Added technical SEO checklist |

### Database Migrations

Run `npx prisma db push` to apply schema changes.

---

## Known Limitations

1. **Country Detection:** Relies on CDN headers (CF-IPCountry). Falls back to null if not available.
2. **Forecast Accuracy:** Simple linear regression + moving average. Not ML-based.
3. **Real-time Updates:** Dashboard requires refresh; no WebSocket push.
4. **Revenue Model Validation:** No validation of assumptions JSON structure.
5. **Export Auth:** CSV exports need Bearer token in query string for download.

---

## Next Steps

1. **Set up scheduled anomaly detection** (cron job every hour)
2. **Configure CDN** to pass country headers
3. **Add real AdSense revenue import** from API or manual entry
4. **Create custom revenue model** for your specific slot/country performance
5. **Train content team** on using traffic source insights

---

## Build & Test Results

```
✅ Build: 101 modules, 414KB admin bundle, 3.83s
✅ Tests: 70 tests passing across 4 files
✅ Database: Schema pushed successfully
```

---

*Report generated by GitHub Copilot (Claude Opus 4.5)*
*November 26, 2025*
