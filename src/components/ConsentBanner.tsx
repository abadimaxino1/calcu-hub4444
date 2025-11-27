import React, { useEffect, useState } from 'react';

export function useConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('analytics-consent');
    if (stored) {
      setHasConsent(stored === 'true');
    } else {
      setShowBanner(true);
    }
  }, []);

  const accept = () => {
    const obj = JSON.stringify({ analytics: true, ads: false });
    try { localStorage.setItem('analytics-consent', 'true'); } catch(e) {}
    try { localStorage.setItem('calcu_consent', obj); } catch(e) {}
    setHasConsent(true);
    setShowBanner(false);
    try { if ((window as any).__calcuConsentChanged) (window as any).__calcuConsentChanged(); } catch(e) {}
  };

  const reject = () => {
    const obj = JSON.stringify({ analytics: false, ads: false });
    try { localStorage.setItem('analytics-consent', 'false'); } catch(e) {}
    try { localStorage.setItem('calcu_consent', obj); } catch(e) {}
    setHasConsent(false);
    setShowBanner(false);
    try { if ((window as any).__calcuConsentChanged) (window as any).__calcuConsentChanged(); } catch(e) {}
  };

  return { showBanner, hasConsent, accept, reject };
}

export function ConsentBanner({ lang }: { lang: 'ar' | 'en' }) {
  const { showBanner, accept, reject } = useConsentBanner();

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white p-4 shadow-xl">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm">
          {lang === 'ar'
            ? 'نحن نستخدم تحليلات صديقة للخصوصية لتحسين الموقع. يمكنك الموافقة أو رفض جمع البيانات.'
            : 'We use privacy-friendly analytics to improve the site. You can accept or decline.'}
        </div>
        <div className="flex gap-2">
          <button
            onClick={reject}
            className="px-4 py-2 rounded-lg border border-slate-500 hover:bg-slate-800"
          >
            {lang === 'ar' ? 'رفض' : 'Decline'}
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700"
          >
            {lang === 'ar' ? 'قبول' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}
