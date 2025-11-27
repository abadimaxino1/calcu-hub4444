// Monkey-patch localStorage.setItem to notify consent changes to same-window listeners
const KEYS = ['calcu_consent', 'calcu_consent_v1', 'consent'];
try {
  if (typeof window !== 'undefined' && window && window.localStorage) {
    const proto = Object.getPrototypeOf(window.localStorage);
    const origSet = proto.setItem;
    proto.setItem = function(key, value) {
      try { origSet.call(this, key, value); } catch(e) {}
      try {
        if (KEYS.includes(key)) {
          try { if ((window as any).__calcuConsentChanged) (window as any).__calcuConsentChanged(); } catch(e) {}
        }
      } catch(e) {}
    };
  }
} catch (e) {
  // ignore
}

export default {};
