import React from 'react';
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

// Article content database
const articles: Record<string, { 
  title: { ar: string; en: string }; 
  meta: { ar: string; en: string };
  content: { ar: React.ReactNode; en: React.ReactNode };
}> = {
  'saudi-salary-eos-guide': {
    title: {
      ar: 'دليل مبسط لحساب الراتب ومكافأة نهاية الخدمة في السعودية',
      en: 'Practical Guide to Salary and End-of-Service Calculations in Saudi Arabia'
    },
    meta: {
      ar: 'تعرف على طريقة احتساب الراتب بعد خصم التأمينات ومكافأة نهاية الخدمة في السعودية مع أمثلة وروابط للحاسبات المجانية.',
      en: 'Learn how salary after GOSI and end-of-service benefits are calculated in Saudi Arabia, with examples and links to our free calculators.'
    },
    content: {
      ar: (
        <div className="space-y-4">
          <p>فهم طريقة احتساب الراتب ومكافأة نهاية الخدمة يعتبر أمرًا أساسيًا لكل موظف في المملكة.</p>
          
          <h2 className="text-lg font-semibold mt-6 mb-2">في هذا الدليل نستعرض باختصار:</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>كيف تؤثر التأمينات الاجتماعية على صافي الراتب</li>
            <li>الفرق بين إنهاء العقد من صاحب العمل والاستقالة</li>
            <li>تأثير المادتين 84 و85 على استحقاق مكافأة نهاية الخدمة</li>
          </ul>
          
          <h2 className="text-lg font-semibold mt-6 mb-2">بدلًا من الحسابات اليدوية يمكنك استخدام حاسباتنا المجانية:</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li><a href="/calc" className="text-blue-600 hover:underline">حاسبة الراتب بعد خصم التأمينات والخصومات</a></li>
            <li><a href="/calc" className="text-blue-600 hover:underline">حاسبة مكافأة نهاية الخدمة حسب المادتين 84 و85</a></li>
          </ul>
          
          <p className="mt-4">تساعدك هذه الأدوات على الحصول على أرقام تقريبية سريعة، وتمنحك وضوحًا أكبر عند مناقشة حقوقك مع الموارد البشرية أو صاحب العمل.</p>
        </div>
      ),
      en: (
        <div className="space-y-4">
          <p>Understanding how your salary and end-of-service benefits are calculated is essential for every employee in Saudi Arabia.</p>
          
          <h2 className="text-lg font-semibold mt-6 mb-2">In this guide, we explain the basics of:</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>How GOSI affects your net salary</li>
            <li>The difference between employer termination and resignation</li>
            <li>How Articles 84 and 85 impact your EOS entitlement</li>
          </ul>
          
          <h2 className="text-lg font-semibold mt-6 mb-2">Instead of manual calculations, you can use our free tools:</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li><a href="/calc" className="text-blue-600 hover:underline">Salary Calculator after GOSI and deductions</a></li>
            <li><a href="/calc" className="text-blue-600 hover:underline">End of Service Calculator for Articles 84 & 85</a></li>
          </ul>
          
          <p className="mt-4">These tools give you quick estimates and help you discuss your rights more confidently with HR and your employer.</p>
        </div>
      )
    }
  }
};

export default function ArticlePage({ lang }: { lang: 'ar'|'en' }) {
  const slug = readSlug();
  const article = articles[slug];
  
  // Fallback for unknown articles
  const title = article ? article.title[lang] : (lang === 'ar' ? 'مقال غير موجود' : 'Article Not Found');
  const meta = article ? article.meta[lang] : (lang === 'ar' ? 'المقال المطلوب غير متاح' : 'The requested article is not available');
  const content = article ? article.content[lang] : (
    <p className="text-slate-600">{lang === 'ar' ? 'المقال المطلوب غير موجود. يرجى العودة للمدونة.' : 'The requested article was not found. Please return to the blog.'}</p>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <SeoHead title={title} description={meta} />
      <AdSlotShim slotId="article-top" position="inline" lang={lang} />

      <article className="rounded-2xl border p-4 sm:p-6 bg-white shadow-sm space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h1>
        <div className="prose prose-slate max-w-none text-sm sm:text-base text-slate-700 leading-relaxed">
          {content}
        </div>
      </article>

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
