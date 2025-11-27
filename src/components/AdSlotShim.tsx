import React, { useEffect, useState } from 'react';
import { isAdSlotEnabled } from '../lib/ads';

interface AdSlotProps {
  slotId: string;
  position: 'header' | 'inline' | 'sidebar' | 'footer';
  lang: 'ar' | 'en';
  showPlaceholder?: boolean; // Set to false in production
  minHeight?: number;
}

/**
 * AdSlot component for displaying advertisements
 * In development: shows a styled placeholder
 * In production: renders the actual ad container for ad networks
 */
export default function AdSlotShim({ 
  slotId, 
  position, 
  lang,
  showPlaceholder = process.env.NODE_ENV === 'development',
  minHeight,
}: AdSlotProps) {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEnabled(isAdSlotEnabled(slotId));
    // Simulate ad load delay in dev
    const timer = setTimeout(() => setLoaded(true), 500);
    return () => clearTimeout(timer);
  }, [slotId]);

  // Height based on position
  const heightClass = {
    header: 'min-h-[90px]',
    inline: 'min-h-[250px]',
    sidebar: 'min-h-[600px]',
    footer: 'min-h-[90px]',
  }[position];

  // If ads are disabled for this slot, render nothing
  if (!enabled) {
    return null;
  }

  // Production mode: render ad container only (no placeholder content)
  if (!showPlaceholder) {
    return (
      <div 
        id={`ad-${slotId}`}
        className={`ad-slot ad-slot-${position} ${heightClass}`}
        style={{ minHeight: minHeight ? `${minHeight}px` : undefined }}
        data-ad-slot={slotId}
        data-ad-position={position}
        data-ad-enabled="true"
      />
    );
  }

  // Development mode: show styled placeholder
  return (
    <div 
      id={`ad-${slotId}`}
      className={`${heightClass} rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 my-4 flex flex-col items-center justify-center transition-all duration-300`}
      style={{ minHeight: minHeight ? `${minHeight}px` : undefined }}
      data-ad-slot={slotId}
      data-ad-position={position}
      data-ad-enabled="true"
      aria-hidden="true"
    >
      {!loaded ? (
        // Loading state
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded mb-2"></div>
          <div className="w-24 h-3 bg-slate-300 dark:bg-slate-600 rounded"></div>
        </div>
      ) : (
        // Placeholder content
        <div className="text-center p-4">
          <div className="text-2xl mb-1 opacity-30">📢</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {lang === 'ar' ? 'مساحة إعلانية' : 'Advertisement'}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline ad slot for between content sections
 */
export function InlineAdSlot({ slotId, lang }: { slotId: string; lang: 'ar' | 'en' }) {
  return <AdSlotShim slotId={slotId} position="inline" lang={lang} minHeight={250} />;
}

/**
 * Header ad slot (leaderboard style)
 */
export function HeaderAdSlot({ slotId, lang }: { slotId: string; lang: 'ar' | 'en' }) {
  return <AdSlotShim slotId={slotId} position="header" lang={lang} minHeight={90} />;
}

/**
 * Sidebar ad slot (skyscraper style)
 */
export function SidebarAdSlot({ slotId, lang }: { slotId: string; lang: 'ar' | 'en' }) {
  return <AdSlotShim slotId={slotId} position="sidebar" lang={lang} minHeight={600} />;
}

/**
 * Footer ad slot
 */
export function FooterAdSlot({ slotId, lang }: { slotId: string; lang: 'ar' | 'en' }) {
  return <AdSlotShim slotId={slotId} position="footer" lang={lang} minHeight={90} />;
}
