import React, { useEffect, useState } from 'react';
import SeoHead from '../../lib/seoHead';
import AdSlotShim from '../../components/AdSlotShim';

function readSlug() {
  try {
    const s = typeof window !== 'undefined' ? window.location.search : '';
    const params = new URLSearchParams(s);
    return params.get('slug') || params.get('article') || 'article-1';
  } catch (e) {
    return 'article-1';
  }
}

interface BlogPost {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  bodyMarkdownAr: string;
  bodyMarkdownEn: string;
  // Legacy fields
  title?: string;
  excerpt?: string;
  bodyMarkdown?: string;
}

// Default fallback article
const DEFAULT_ARTICLE: Record<string, any> = {
  'saudi-salary-eos-guide': {
    titleAr: 'دليل مبسط لحساب الراتب ومكافأة نهاية الخدمة في السعودية',
    titleEn: 'Practical Guide to Salary and End-of-Service Calculations in Saudi Arabia',
    excerptAr: 'تعرف على طريقة احتساب الراتب بعد خصم التأمينات ومكافأة نهاية الخدمة في السعودية مع أمثلة وروابط للحاسبات المجانية.',
    excerptEn: 'Learn how salary after GOSI and end-of-service benefits are calculated in Saudi Arabia, with examples and links to our free calculators.',
    bodyMarkdownAr: `فهم طريقة احتساب الراتب ومكافأة نهاية الخدمة يعتبر أمرًا أساسيًا لكل موظف في المملكة.

## في هذا الدليل نستعرض باختصار:

* كيف تؤثر التأمينات الاجتماعية على صافي الراتب
* الفرق بين إنهاء العقد من صاحب العمل والاستقالة
* تأثير المادتين 84 و85 على استحقاق مكافأة نهاية الخدمة

## بدلًا من الحسابات اليدوية يمكنك استخدام حاسباتنا المجانية:

* [حاسبة الراتب بعد خصم التأمينات والخصومات](/calc?tab=pay)
* [حاسبة مكافأة نهاية الخدمة حسب المادتين 84 و85](/calc?tab=eos)

تساعدك هذه الأدوات على الحصول على أرقام تقريبية سريعة، وتمنحك وضوحًا أكبر عند مناقشة حقوقك مع الموارد البشرية أو صاحب العمل.`,
    bodyMarkdownEn: `Understanding how your salary and end-of-service benefits are calculated is essential for every employee in Saudi Arabia.

## In this guide, we explain the basics of:

* How GOSI affects your net salary
* The difference between employer termination and resignation
* How Articles 84 and 85 impact your EOS entitlement

## Instead of manual calculations, you can use our free tools:

* [Salary Calculator after GOSI and deductions](/calc?tab=pay)
* [End of Service Calculator for Articles 84 & 85](/calc?tab=eos)

These tools give you quick estimates and help you discuss your rights more confidently with HR and your employer.`,
  }
};

export default function ArticlePage({ lang }: { lang: 'ar'|'en' }) {
  const slug = readSlug();
  const [article, setArticle] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Try to fetch from CMS
    fetch(`/api/content/blog/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.post) {
          setArticle(data.post);
        } else if (DEFAULT_ARTICLE[slug]) {
          // Use default fallback
          setArticle({
            id: slug,
            slug,
            ...DEFAULT_ARTICLE[slug]
          } as BlogPost);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch(() => {
        // Fallback to default article
        if (DEFAULT_ARTICLE[slug]) {
          setArticle({
            id: slug,
            slug,
            ...DEFAULT_ARTICLE[slug]
          } as BlogPost);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      });
  }, [slug]);

  // Helper to render markdown-like content
  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-semibold mt-6 mb-2">{line.substring(3)}</h2>;
      } else if (line.startsWith('* ')) {
        return <li key={i} className="ml-4">{line.substring(2)}</li>;
      } else if (line.trim() === '') {
        return <br key={i} />;
      } else {
        // Handle links in markdown format [text](url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        if (linkRegex.test(line)) {
          const parts = line.split(linkRegex);
          return (
            <p key={i} className="my-2">
              {parts.map((part, j) => {
                if (j % 3 === 1) {
                  // Link text
                  const url = parts[j + 1];
                  return (
                    <a key={j} href={url} className="text-blue-600 hover:underline">
                      {part}
                    </a>
                  );
                } else if (j % 3 === 2) {
                  // URL - skip
                  return null;
                } else {
                  return <span key={j}>{part}</span>;
                }
              })}
            </p>
          );
        }
        return <p key={i} className="my-2">{line}</p>;
      }
    });
  };
  
  const title = article 
    ? (lang === 'ar' ? (article.titleAr || article.title) : (article.titleEn || article.title)) || ''
    : (lang === 'ar' ? 'مقال غير موجود' : 'Article Not Found');
    
  const meta = article
    ? (lang === 'ar' ? (article.excerptAr || article.excerpt) : (article.excerptEn || article.excerpt)) || ''
    : (lang === 'ar' ? 'المقال المطلوب غير متاح' : 'The requested article is not available');
    
  const content = article
    ? (lang === 'ar' ? (article.bodyMarkdownAr || article.bodyMarkdown) : (article.bodyMarkdownEn || article.bodyMarkdown)) || ''
    : '';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <SeoHead title={title} description={meta} />
      <AdSlotShim slotId="article-top" position="inline" lang={lang} />

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : notFound ? (
        <div className="rounded-2xl border p-8 bg-slate-50 text-center">
          <p className="text-slate-600 mb-4">
            {lang === 'ar' ? 'المقال المطلوب غير موجود. يرجى العودة للمدونة.' : 'The requested article was not found. Please return to the blog.'}
          </p>
          <a 
            href="/blog" 
            className="inline-flex items-center text-sm text-blue-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/blog');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          >
            {lang === 'ar' ? 'العودة للمدونة' : 'Back to Blog'}
          </a>
        </div>
      ) : (
        <article className="rounded-2xl border p-4 sm:p-6 bg-white shadow-sm space-y-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h1>
          <div className="prose prose-slate max-w-none text-sm sm:text-base text-slate-700 leading-relaxed">
            {renderContent(content)}
          </div>
        </article>
      )}

      <div className="flex justify-end">
        <a 
          href="/blog" 
          className="inline-flex items-center text-sm text-blue-600 hover:underline"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/blog');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
        >
          {lang === 'ar' ? 'العودة للمدونة' : 'Back to Blog'}
          <span className={`text-base ${lang === 'ar' ? 'mr-1' : 'ml-1'}`} aria-hidden>
            {lang === 'ar' ? '←' : '→'}
          </span>
        </a>
      </div>

      <AdSlotShim slotId="article-bottom" position="inline" lang={lang} />
    </div>
  );
}
