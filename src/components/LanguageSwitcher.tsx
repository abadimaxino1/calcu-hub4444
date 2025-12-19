import React from 'react';
import { useTranslation, useLocale, type Locale, SUPPORTED_LOCALES } from '../i18n';

interface LanguageSwitcherProps {
  variant?: 'toggle' | 'dropdown' | 'minimal';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'toggle', className = '' }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const { locale, changeLocale, toggleLocale } = useLocale();

  if (variant === 'minimal') {
    return (
      <button
        onClick={toggleLocale}
        className={`min-w-[44px] min-h-[44px] px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded touch-manipulation ${className}`}
        aria-label={t('common.switchLanguage')}
      >
        {locale === 'ar' ? 'EN' : 'ع'}
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <select
        value={locale}
        onChange={(e) => changeLocale(e.target.value as Locale)}
        className={`min-h-[44px] px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-sm touch-manipulation ${className}`}
        aria-label={t('common.language')}
        title={t('common.language')}
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {loc === 'ar' ? 'العربية' : 'English'}
          </option>
        ))}
      </select>
    );
  }

  // Default: toggle button
  return (
    <button
      onClick={toggleLocale}
      className={`min-h-[44px] px-3 py-1 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-700 text-sm transition-colors touch-manipulation ${className}`}
      aria-label={t('common.switchLanguage')}
    >
      {locale === 'ar' ? 'English' : 'العربية'}
    </button>
  );
}

// Compact version for headers
export function LanguageToggle({ className = '' }: { className?: string }) {
  return <LanguageSwitcher variant="toggle" className={className} />;
}
