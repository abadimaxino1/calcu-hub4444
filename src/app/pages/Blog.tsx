import React, { useEffect, useState } from 'react';
import SeoHead from '../../lib/seoHead';

interface BlogPost {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  publishedAt: string | null;

  // legacy fields (existing DB)
  title?: string;
  excerpt?: string;
}

// Fallback articles for when CMS is empty
const DEFAULT_ARTICLES = [
  { 
    id: 'saudi-salary-eos-guide', 
    slug: 'saudi-salary-eos-guide',
    titleAr: 'دليل مبسط لحساب الراتب ومكافأة نهاية الخدمة في السعودية',
    titleEn: 'Practical Guide to Salary and End-of-Service Calculations in Saudi Arabia',
    excerptAr: 'تعرف على طريقة احتساب الراتب بعد خصم التأمينات ومكافأة نهاية الخدمة في السعودية مع أمثلة وروابط للحاسبات المجانية.',
    excerptEn: 'Learn how salary after GOSI and end-of-service benefits are calculated in Saudi Arabia, with examples and links to our free calculators.',
    publishedAt: new Date().toISOString(),
  }
];

export default function BlogPage({ lang }: { lang: 'ar'|'en' }) {
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const content = {
    en: {
      title: 'Blog | Calcu-Hub',
      meta: 'Articles and guides about salaries, end-of-service, work rights, and financial planning in Saudi Arabia.',
      h1: 'Calcu-Hub Blog',
      intro: 'Explore our articles and guides to help you better understand salary calculations, end-of-service benefits, and work rights in Saudi Arabia.'
    },
    ar: {
      title: 'المدونة | Calcu-Hub',
      meta: 'مقالات وأدلة حول الرواتب، ونهاية الخدمة، وحقوق العمل، والتخطيط المالي في السعودية.',
      h1: 'مدونة Calcu-Hub',
      intro: 'استكشف مقالاتنا وأدلتنا لمساعدتك على فهم أفضل لحسابات الراتب ومستحقات نهاية الخدمة وحقوق العمل في السعودية.'
    }
  };

  // Fetch blog posts from CMS
  useEffect(() => {
    fetch('/api/content/blog?includeUnpublished=false&limit=30&page=1', {
      headers: { 'Accept-Language': lang }
    })
      .then(r => r.json())
      .then(data => {
        const posts = Array.isArray(data?.posts) ? data.posts : [];
        setArticles(posts);
        setLoading(false);
      })
      .catch(() => {
        // optional offline fallback
        setArticles(DEFAULT_ARTICLES as any);
        setLoading(false);
      });
  }, [lang]);

  const c = content[lang];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <SeoHead title={c.title} description={c.meta} />

      <section className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{c.h1}</h1>
          <p className="text-sm sm:text-base text-slate-700 mt-2">{c.intro}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-2xl border p-8 bg-slate-50 text-center text-slate-600">
            {lang === 'ar' ? 'لا توجد مقالات منشورة حالياً' : 'No published articles at the moment'}
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {articles.map(a => {
              // Strict fallback: use bilingual field, then legacy field, then other language, then default
              const title = (lang === 'ar' 
                ? (a.titleAr || (a as any).title || a.titleEn) 
                : (a.titleEn || (a as any).title || a.titleAr)) || (lang === 'ar' ? 'بدون عنوان' : 'Untitled');
              
              const excerpt = (lang === 'ar' 
                ? (a.excerptAr || (a as any).excerpt || a.excerptEn) 
                : (a.excerptEn || (a as any).excerpt || a.excerptAr)) || '';
              
              const slug = a.slug || a.id;
              
              return (
                <article key={a.id} className="rounded-2xl border p-4 sm:p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <h2 className="font-semibold text-base sm:text-lg mb-2">
                    <a 
                      className="text-blue-600 hover:text-blue-800 hover:underline" 
                      href={`/article?slug=${slug}`} 
                      onClick={(e) => {
                        e.preventDefault(); 
                        window.history.pushState({}, '', `/article?slug=${slug}`); 
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                    >
                      {title}
                    </a>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{excerpt}</p>
                  {a.publishedAt && (
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(a.publishedAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                  <div className="mt-4 flex justify-end">
                    <a 
                      className="inline-flex items-center text-xs sm:text-sm text-blue-600 hover:underline"
                      href={`/article?slug=${slug}`}
                      onClick={(e) => {
                        e.preventDefault(); 
                        window.history.pushState({}, '', `/article?slug=${slug}`); 
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                    >
                      {lang === 'ar' ? 'اقرأ المزيد' : 'Read more'}
                      <span className={`text-base ${lang === 'ar' ? 'mr-1' : 'ml-1'}`} aria-hidden>
                        {lang === 'ar' ? '←' : '→'}
                      </span>
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
