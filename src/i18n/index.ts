import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import arTranslations from './ar.json';
import enTranslations from './en.json';

// Supported locales
export const SUPPORTED_LOCALES = ['ar', 'en'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

// Default locale
export const DEFAULT_LOCALE: Locale = 'ar';

// RTL locales
export const RTL_LOCALES: Locale[] = ['ar'];

// Check if locale is RTL
export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

// Get direction for locale
export function getDirection(locale: Locale): 'rtl' | 'ltr' {
  return isRTL(locale) ? 'rtl' : 'ltr';
}

// Detect user's preferred locale
export function detectLocale(): Locale {
  // 1. Check localStorage
  try {
    const stored = localStorage.getItem('calcu_locale');
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
      return stored as Locale;
    }
  } catch (e) {
    // localStorage not available
  }

  // 2. Check navigator language
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language || (navigator as any).userLanguage || '';
    const langCode = browserLang.split('-')[0].toLowerCase();
    
    if (langCode === 'ar') return 'ar';
    if (langCode === 'en') return 'en';
    
    // Check navigator.languages array
    if (navigator.languages) {
      for (const lang of navigator.languages) {
        const code = lang.split('-')[0].toLowerCase();
        if (code === 'ar') return 'ar';
        if (code === 'en') return 'en';
      }
    }
  }

  // 3. Default to Arabic
  return DEFAULT_LOCALE;
}

// Save locale preference
export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem('calcu_locale', locale);
  } catch (e) {
    // localStorage not available
  }
}

// Resources with namespaces
const resources = {
  ar: { translation: arTranslations },
  en: { translation: enTranslations },
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectLocale(),
    fallbackLng: DEFAULT_LOCALE,
    
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    // Enable debug in development
    debug: import.meta.env?.DEV === true,
    
    // React specific options
    react: {
      useSuspense: false, // Disable suspense for SSR compatibility
    },
  });

// Update HTML attributes when language changes
i18n.on('languageChanged', (lng: string) => {
  const locale = lng as Locale;
  
  // Update document direction
  document.documentElement.dir = getDirection(locale);
  document.documentElement.lang = locale;
  
  // Save to localStorage
  saveLocale(locale);
});

// Initial setup
if (typeof document !== 'undefined') {
  const currentLocale = i18n.language as Locale;
  document.documentElement.dir = getDirection(currentLocale);
  document.documentElement.lang = currentLocale;
}

export default i18n;

// Re-export useTranslation for convenience
export { useTranslation } from 'react-i18next';

// Custom hook for locale management
export function useLocale() {
  const currentLocale = i18n.language as Locale;
  
  const changeLocale = (locale: Locale) => {
    i18n.changeLanguage(locale);
  };
  
  const toggleLocale = () => {
    const newLocale: Locale = currentLocale === 'ar' ? 'en' : 'ar';
    changeLocale(newLocale);
  };
  
  return {
    locale: currentLocale,
    isRTL: isRTL(currentLocale),
    direction: getDirection(currentLocale),
    changeLocale,
    toggleLocale,
    supportedLocales: SUPPORTED_LOCALES,
  };
}
