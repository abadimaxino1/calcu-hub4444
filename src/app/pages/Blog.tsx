import React from 'react';
import SeoHead from '../../lib/seoHead';

export default function BlogPage({ lang }: { lang: 'ar'|'en' }) {
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

  const articles = [
    { 
      id: 'saudi-salary-eos-guide', 
      title: lang === 'ar' ? 'دليل مبسط لحساب الراتب ومكافأة نهاية الخدمة في السعودية' : 'Practical Guide to Salary and End-of-Service Calculations in Saudi Arabia',
      excerpt: lang === 'ar' 
        ? 'تعرف على طريقة احتساب الراتب بعد خصم التأمينات ومكافأة نهاية الخدمة في السعودية مع أمثلة وروابط للحاسبات المجانية.'
        : 'Learn how salary after GOSI and end-of-service benefits are calculated in Saudi Arabia, with examples and links to our free calculators.'
    }
  ];

  const c = content[lang];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <SeoHead title={c.title} description={c.meta} />

      <section className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{c.h1}</h1>
          <p className="text-sm sm:text-base text-slate-700 mt-2">{c.intro}</p>
        </div>

        <div className="grid gap-4 sm:gap-6">
          {articles.map(a => (
            <article key={a.id} className="rounded-2xl border p-4 sm:p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
              <h2 className="font-semibold text-base sm:text-lg mb-2">
                <a 
                  className="text-blue-600 hover:text-blue-800 hover:underline" 
                  href={`/blog/${a.id}`} 
                  onClick={(e) => {
                    e.preventDefault(); 
                    window.history.pushState({}, '', `/article?slug=${a.id}`); 
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >
                  {a.title}
                </a>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{a.excerpt}</p>
              <div className="mt-4 flex justify-end">
                <a 
                  className="inline-flex items-center text-xs sm:text-sm text-blue-600 hover:underline"
                  href={`/blog/${a.id}`}
                  onClick={(e) => {
                    e.preventDefault(); 
                    window.history.pushState({}, '', `/article?slug=${a.id}`); 
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
          ))}
        </div>
      </section>
    </div>
  );
}
