import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SeoFAQJsonLD } from '../lib/seo';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}

interface CalculatorFAQProps {
  category: string;
  locale: 'ar' | 'en';
  title?: string;
  className?: string;
  expandFirst?: boolean;
}

/**
 * FAQ component for calculator pages
 * Fetches FAQs by category from API and renders with JSON-LD for SEO
 */
export default function CalculatorFAQ({ 
  category, 
  locale, 
  title,
  className = '',
  expandFirst = true,
}: CalculatorFAQProps) {
  const { t } = useTranslation();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchFAQs() {
      try {
        const res = await fetch(`/api/content/faqs?category=${category}&locale=${locale}`);
        if (res.ok) {
          const data = await res.json();
          setFaqs(data.faqs || []);
          // Expand first FAQ if enabled
          if (expandFirst && data.faqs?.length > 0) {
            setExpanded(new Set([data.faqs[0].id]));
          }
        }
      } catch (error) {
        console.error('Failed to fetch FAQs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFAQs();
  }, [category, locale, expandFirst]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (faqs.length === 0) {
    return null; // Don't render anything if no FAQs
  }

  return (
    <section className={`mt-8 ${className}`}>
      {/* JSON-LD for SEO */}
      <SeoFAQJsonLD faqs={faqs.map(f => ({ question: f.question, answer: f.answer }))} />
      
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <span className="text-2xl">❓</span>
        {title || t('faq.title', 'الأسئلة الشائعة')}
      </h2>

      <div className="space-y-3">
        {faqs.map((faq) => (
          <div 
            key={faq.id}
            className="border rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm"
          >
            <button
              type="button"
              className="w-full px-4 py-3 text-start font-medium flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              onClick={() => toggleExpand(faq.id)}
              aria-expanded={expanded.has(faq.id)}
            >
              <span className="flex-1">{faq.question}</span>
              <span 
                className={`text-sm flex-shrink-0 text-slate-400 transition-transform inline-block ${expanded.has(faq.id) ? 'rotate-180' : ''}`} 
                aria-hidden
              >
                ˅
              </span>
            </button>
            
            {expanded.has(faq.id) && (
              <div className="px-4 py-3 border-t bg-slate-50 dark:bg-slate-900">
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Static FAQ component for when FAQs are passed directly (not fetched)
 */
export function StaticFAQ({
  faqs,
  title,
  className = '',
  expandFirst = true,
}: {
  faqs: Array<{ question: string; answer: string }>;
  title?: string;
  className?: string;
  expandFirst?: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Set<number>>(
    expandFirst && faqs.length > 0 ? new Set([0]) : new Set()
  );

  const toggleExpand = (index: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (faqs.length === 0) {
    return null;
  }

  return (
    <section className={`mt-8 ${className}`}>
      {/* JSON-LD for SEO */}
      <SeoFAQJsonLD faqs={faqs} />
      
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <span className="text-2xl">❓</span>
        {title || t('faq.title', 'الأسئلة الشائعة')}
      </h2>

      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div 
            key={index}
            className="border rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm"
          >
            <button
              type="button"
              className="w-full px-4 py-3 text-start font-medium flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              onClick={() => toggleExpand(index)}
              aria-expanded={expanded.has(index)}
            >
              <span className="flex-1">{faq.question}</span>
              <span 
                className={`text-sm flex-shrink-0 text-slate-400 transition-transform inline-block ${expanded.has(index) ? 'rotate-180' : ''}`} 
                aria-hidden
              >
                ˅
              </span>
            </button>
            
            {expanded.has(index) && (
              <div className="px-4 py-3 border-t bg-slate-50 dark:bg-slate-900">
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
