# Google Analytics & AdSense Setup Guide

This document explains how to integrate Google Analytics 4 (GA4) and Google AdSense with Calcu-Hub.

## Overview

Both integrations are:
- **Controlled by environment variables** (no keys = no loading)
- **Consent-based** (scripts load only after user accepts)
- **GDPR/Privacy compliant** with consent banner

---

## Google Analytics 4 (GA4)

### Step 1: Create GA4 Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new property
3. Choose "Web" as platform
4. Enter your domain
5. Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)

### Step 2: Configure Environment Variable

Add to your `.env` file:

```env
VITE_GA_ID=G-XXXXXXXXXX
```

For production, set this in your hosting environment.

### Step 3: Verify Integration

The app will:
1. Show consent banner to new users
2. If user accepts, load GA4 script
3. Send page views and events

Check the GA4 Realtime report to verify data is flowing.

### Custom Events

The app tracks:
- **Page views**: Automatic
- **Calculator usage**: `calculation_event` with calculator type
- **Ad impressions/clicks**: `ad_event` with slot info

---

## Google AdSense

### Step 1: Apply for AdSense

1. Go to [Google AdSense](https://www.google.com/adsense/)
2. Sign up with your Google account
3. Add your website
4. Wait for approval (can take days/weeks)

**Important**: Your site must have:
- Original content
- Privacy policy
- Terms of service
- No prohibited content
- Sufficient traffic (recommended)

### Step 2: Get Publisher ID

After approval:
1. Go to AdSense → Account → Account Information
2. Copy your **Publisher ID** (format: `ca-pub-XXXXXXXXXX`)

### Step 3: Configure Environment Variable

Add to your `.env` file:

```env
VITE_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXX
```

Or use the shorter form:
```env
VITE_ADSENSE=ca-pub-XXXXXXXXXX
```

### Step 4: Configure Ad Units (Optional)

For specific ad unit targeting, create ad units in AdSense and configure in the admin panel under Ads → Ad Slots.

---

## Ad Placement Guidelines

The app has predefined ad slots:

| Slot ID | Position | Recommended |
|---------|----------|-------------|
| `hdr-1` | Header (below nav) | Yes |
| `inline-1` | In content | Yes |
| `work-inline-1` | Calculator results | Yes |
| `ft-1` | Footer | Yes |
| `calculator-top` | Above calculator | Optional |
| `calculator-bottom` | Below calculator | Optional |

### AdSense Policies - Do's

- ✅ Place ads in natural content breaks
- ✅ Clearly label ad areas if needed
- ✅ Maintain good content-to-ad ratio
- ✅ Ensure ads don't interfere with functionality

### AdSense Policies - Don'ts

- ❌ Never click your own ads
- ❌ Don't ask users to click ads
- ❌ Don't place ads near interactive elements (buttons)
- ❌ Don't use misleading labels ("Download" on ads)
- ❌ Don't exceed ad density limits

---

## Consent Flow

The app implements a consent banner that:

1. Shows on first visit
2. Asks for analytics/ads consent
3. Stores preference in `localStorage`
4. Only loads scripts if consent is given
5. Provides a way to change preference later

### Consent Keys

```javascript
// Stored in localStorage
localStorage.getItem('calcu_consent')
// Returns: { analytics: true, ads: true } or { analytics: false, ads: false }
```

---

## Behavior Without Keys

If environment variables are not set:

| Scenario | Behavior |
|----------|----------|
| No `VITE_GA_ID` | GA4 script never loads, no errors |
| No `VITE_ADSENSE` | AdSense script never loads, ad slots show placeholder |
| User declines consent | Scripts don't load even if keys exist |

This ensures:
- No external requests until consent
- No errors in development
- Easy testing without real accounts

---

## Testing Locally

### Test Analytics

1. Set `VITE_GA_ID` in `.env`
2. Run `npm run dev`
3. Accept consent
4. Check browser DevTools → Network for `gtag` requests
5. Check GA4 Realtime report

### Test Ads (Limited)

AdSense requires a live domain, but you can:
1. Set `VITE_ADSENSE` in `.env`
2. Run `npm run dev`
3. Accept consent
4. Check DevTools → Network for `adsbygoogle.js`
5. Ads will show "placeholder" locally (no real ads without approved domain)

---

## Production Checklist

Before going live:

- [ ] GA4 property created
- [ ] AdSense account approved (if using ads)
- [ ] Environment variables set on server
- [ ] Privacy policy updated with analytics/ads info
- [ ] Consent banner working correctly
- [ ] SSL enabled (required for both services)
- [ ] Test data flowing in GA4
- [ ] Test ads appearing (after AdSense approval)

---

## Troubleshooting

### GA4 not tracking

1. Check `VITE_GA_ID` is set correctly
2. Check user has accepted consent
3. Check browser DevTools for blocked requests
4. Disable ad blockers for testing

### Ads not showing

1. Check `VITE_ADSENSE` is set correctly
2. Verify AdSense account is approved
3. Verify domain is added to AdSense
4. Check consent was accepted
5. Wait 24-48 hours after setup for ads to appear

### Console errors

If you see AdSense errors in console:
- Ignore "adsbygoogle.push() called before..." (expected before first ad)
- For "Ads not loaded" errors, check domain approval

---

## Revenue Tracking

The app tracks ad events in the database:

```javascript
// AdEvent model
{
  eventType: 'impression' | 'click',
  slotId: 'inline-1',
  pageUrl: '/calculator/salary',
  userAgent: '...',
  timestamp: '...'
}
```

View this data in Admin → Analytics → Ads section.

---

## Further Reading

- [GA4 Documentation](https://developers.google.com/analytics)
- [AdSense Program Policies](https://support.google.com/adsense/answer/48182)
- [AdSense Best Practices](https://support.google.com/adsense/answer/1282097)
- [GDPR Compliance](https://support.google.com/adsense/answer/7670013)
