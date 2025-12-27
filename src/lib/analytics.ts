// analytics loader: load analytics and ads only after user consent
const CONSENT_KEYS = ['calcu_consent', 'calcu_consent_v1', 'consent'];

function readConsent() {
  try {
    for (const k of CONSENT_KEYS) {
      const v = localStorage.getItem(k);
      if (!v) continue;
      // expect JSON like { analytics: true, ads: true }
      try {
        const obj = JSON.parse(v);
        if (typeof obj === 'object') return obj;
      } catch (e) {
        // fallback: simple flags like 'analytics' or 'ads'
        if (v === 'analytics' || v === 'all' || v === 'true') return { analytics: true, ads: true };
      }
    }
  } catch (e) {}
  return { analytics: false, ads: false };
}

function injectScript(src: string, attrs: Record<string, string> = {}) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    Object.keys(attrs).forEach(k => s.setAttribute(k, attrs[k]));
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}

export async function initAnalytics() {
  if (typeof window === 'undefined' || !window.document) return;
  const consent = readConsent();
  const GA_ID = (import.meta && import.meta.env && import.meta.env.VITE_GA_ID) || process.env.VITE_GA_ID || process.env.GA_MEASUREMENT_ID || '';
  const ADSENSE_ID = (import.meta && import.meta.env && import.meta.env.VITE_ADSENSE) || process.env.VITE_ADSENSE || process.env.ADSENSE_CLIENT_ID || '';

  // Analytics (GA4) - load only when consent.analytics && GA_ID provided
  if (consent.analytics && GA_ID) {
    try {
      // gtag snippet
      if (!(window as any).dataLayer) (window as any).dataLayer = [];
      function gtag(){(window as any).dataLayer.push(arguments);} // eslint-disable-line no-inner-declarations
      (window as any).gtag = (window as any).gtag || gtag;
      await injectScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
      (window as any).gtag('js', new Date());
      (window as any).gtag('config', GA_ID, { anonymize_ip: true });
    } catch (e: any) {
      console.warn('Failed to load GA', e && e.message);
    }
  }

  // AdSense - load only when consent.ads && ADSENSE_ID provided
  if (consent.ads && ADSENSE_ID) {
    try {
      await injectScript('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', { 'data-ad-client': ADSENSE_ID });
      // push adsbygoogle enable
      try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}); } catch (e) {}
    } catch (e: any) {
      console.warn('Failed to load AdSense', e && e.message);
    }
  }
}

// Listen for consent changes to re-initialize
if (typeof window !== 'undefined') {
  window.addEventListener('calcu_consent_changed', () => {
    initAnalytics();
  });
}

export function hasAnalyticsConsent() {
  const c = readConsent();
  return !!c.analytics;
}

export function hasAdsConsent() {
  const c = readConsent();
  return !!c.ads;
}

// ============================================
// UTM Parameter Extraction
// ============================================

export interface UTMParams {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
}

export function getUTMParams(): UTMParams {
  if (typeof window === 'undefined') {
    return { utmSource: null, utmMedium: null, utmCampaign: null, utmTerm: null, utmContent: null };
  }
  
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    utmTerm: params.get('utm_term'),
    utmContent: params.get('utm_content'),
  };
}

// Store UTM params in session for attribution
export function persistUTMParams(): void {
  const utm = getUTMParams();
  if (utm.utmSource || utm.utmMedium || utm.utmCampaign) {
    try {
      sessionStorage.setItem('calcu_utm', JSON.stringify(utm));
    } catch (e) {}
  }
}

export function getPersistedUTMParams(): UTMParams {
  try {
    const stored = sessionStorage.getItem('calcu_utm');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return getUTMParams();
}

// ============================================
// Session & Device Detection
// ============================================

export function getSessionId(): string {
  try {
    if (typeof sessionStorage === 'undefined') return 'sess_server';
    let sid = sessionStorage.getItem('calcu_session');
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('calcu_session', sid);
    }
    return sid;
  } catch (e) {
    return 'sess_' + Math.random().toString(36).substring(2);
  }
}

export function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function getLocale(): string {
  if (typeof document === 'undefined') return 'ar';
  return document.documentElement.lang || 'ar';
}

// ============================================
// Event Tracking to Backend
// ============================================

const API_BASE = '/api/analytics';

export async function trackPageView(pagePath?: string): Promise<void> {
  const consent = readConsent();
  if (!consent.analytics) return;

  const path = pagePath || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const utm = getPersistedUTMParams();
  
  try {
    await fetch(`${API_BASE}/pageview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getSessionId(),
        pagePath: path,
        referrer: typeof document !== 'undefined' ? document.referrer : null,
        device: getDeviceType(),
        locale: getLocale(),
        ...utm,
      }),
    });
  } catch (e) {
    console.warn('Failed to track page view', e);
  }
}

export async function trackEvent(eventKey: string, properties: any = {}) {
  const consent = readConsent();
  if (!consent.analytics) return;

  try {
    await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getSessionId(),
        eventKey,
        properties,
        pagePath: typeof window !== 'undefined' ? window.location.pathname : '/',
      }),
    });
  } catch (e) {
    console.error('Failed to track event', e);
  }
}

export async function trackCalculation(
  calculatorType: string,
  inputSummary: string,
  resultSummary: string,
  durationMs: number = 0
): Promise<void> {
  const consent = readConsent();
  if (!consent.analytics) return;

  const utm = getPersistedUTMParams();
  
  try {
    await fetch(`${API_BASE}/calculation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getSessionId(),
        calculatorType,
        inputSummary,
        resultSummary,
        durationMs,
        device: getDeviceType(),
        locale: getLocale(),
        ...utm,
      }),
    });
  } catch (e) {
    console.warn('Failed to track calculation', e);
  }
}

export async function trackAdEvent(
  adSlotId: string,
  eventType: 'IMPRESSION' | 'CLICK',
  pagePath?: string
): Promise<void> {
  const consent = readConsent();
  if (!consent.ads) return;

  const path = pagePath || (typeof window !== 'undefined' ? window.location.pathname : '/');
  
  try {
    await fetch('/api/ads/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adSlotId,
        eventType,
        sessionId: getSessionId(),
        pagePath: path,
        device: getDeviceType(),
        locale: getLocale(),
      }),
    });
  } catch (e) {
    console.warn('Failed to track ad event', e);
  }
}

// Initialize: persist UTM on page load
if (typeof window !== 'undefined') {
  persistUTMParams();
}

export default { 
  initAnalytics, 
  hasAnalyticsConsent, 
  hasAdsConsent,
  getUTMParams,
  getPersistedUTMParams,
  getSessionId,
  getDeviceType,
  getLocale,
  trackPageView,
  trackEvent,
  trackCalculation,
  trackAdEvent,
};

