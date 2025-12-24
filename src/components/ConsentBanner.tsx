import React, { useEffect, useState } from 'react';

export function useConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [consent, setConsent] = useState({ analytics: false, ads: false });

  useEffect(() => {
    const stored = localStorage.getItem('calcu_consent');
    if (stored) {
      try {
        setConsent(JSON.parse(stored));
      } catch (e) {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }
  }, []);

  const saveConsent = (newConsent: { analytics: boolean; ads: boolean }) => {
    localStorage.setItem('calcu_consent', JSON.stringify(newConsent));
    setConsent(newConsent);
    setShowBanner(false);
    // Trigger global event for analytics/ads to react
    window.dispatchEvent(new CustomEvent('calcu_consent_changed', { detail: newConsent }));
  };

  const acceptAll = () => saveConsent({ analytics: true, ads: true });
  const rejectAll = () => saveConsent({ analytics: false, ads: false });

  return { showBanner, consent, acceptAll, rejectAll, setShowBanner };
}

export function ConsentBanner({ lang }: { lang: 'ar' | 'en' }) {
  const { showBanner, acceptAll, rejectAll } = useConsentBanner();

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white p-4 shadow-xl border-t border-slate-700">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm">
          {lang === 'ar'
            ? 'نحن نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتحليل حركة المرور وعرض إعلانات ذات صلة.'
            : 'We use cookies to enhance your experience, analyze traffic, and show relevant ads.'}
        </div>
        <div className="flex gap-2">
          <button
            onClick={rejectAll}
            className="min-h-[44px] min-w-[88px] px-4 py-2 rounded-lg border border-slate-500 hover:bg-slate-800 touch-manipulation text-sm"
          >
            {lang === 'ar' ? 'رفض الكل' : 'Reject All'}
          </button>
          <button
            onClick={acceptAll}
            className="min-h-[44px] min-w-[88px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 touch-manipulation text-sm font-bold"
          >
            {lang === 'ar' ? 'قبول الكل' : 'Accept All'}
          </button>
        </div>
      </div>
    </div>
  );
}
