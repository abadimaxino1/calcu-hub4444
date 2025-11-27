import React from 'react';
import SeoHead from '../../lib/seoHead';
import AdSlot from '../../components/AdSlotShim';

export default function ToolsHub({ lang }: { lang: 'ar' | 'en' }) {
  const content = {
    en: {
      title: 'All Calculators & Tools | Calcu-Hub',
      meta: 'Browse all free work and salary calculators on Calcu-Hub: salary after GOSI, end-of-service, work hours, and date differences for Saudi Arabia.',
      h1: 'All Calculators & Tools',
      intro: 'Explore our complete collection of free calculators designed for the Saudi labor market. Each tool helps you understand your salary, benefits, and work schedules better.'
    },
    ar: {
      title: 'جميع الحاسبات والأدوات | Calcu-Hub',
      meta: 'تصفح جميع حاسبات العمل والراتب المجانية في Calcu-Hub: الراتب بعد التأمينات، نهاية الخدمة، ساعات العمل، وفروقات التواريخ للسوق السعودي.',
      h1: 'جميع الحاسبات والأدوات',
      intro: 'استكشف مجموعتنا الكاملة من الحاسبات المجانية المصممة لسوق العمل السعودي. كل أداة تساعدك على فهم راتبك ومستحقاتك وجدول عملك بشكل أفضل.'
    }
  };

  const tools = [
    {
      id: 'pay',
      icon: '💰',
      title: { ar: 'حاسبة الراتب', en: 'Salary Calculator' },
      description: { 
        ar: 'احسب راتبك الإجمالي والصافي مع خصم التأمينات الاجتماعية (GOSI) بدقة. تدعم النظام القديم والجديد 2025.',
        en: 'Calculate your gross and net salary with accurate GOSI social insurance deductions. Supports both legacy and new 2025 rates.'
      },
      path: '/calc?tab=pay'
    },
    {
      id: 'eos',
      icon: '📋',
      title: { ar: 'حاسبة نهاية الخدمة', en: 'End of Service Calculator' },
      description: { 
        ar: 'احسب مكافأة نهاية الخدمة وفقاً لنظام العمل السعودي مع مراعاة نوع إنهاء العقد ومدة الخدمة.',
        en: 'Calculate your end-of-service benefits under Saudi Labor Law, considering termination type and service duration.'
      },
      path: '/calc?tab=eos'
    },
    {
      id: 'work',
      icon: '⏰',
      title: { ar: 'حاسبة ساعات العمل', en: 'Work Hours Calculator' },
      description: { 
        ar: 'احسب وقت الخروج المتوقع وساعات العمل الأسبوعية والشهرية بناءً على وقت الحضور والاستراحة.',
        en: 'Calculate your expected exit time and weekly/monthly work hours based on clock-in time and break duration.'
      },
      path: '/calc?tab=work'
    },
    {
      id: 'dates',
      icon: '📅',
      title: { ar: 'حاسبة التواريخ وأيام العمل', en: 'Dates & Working Days Calculator' },
      description: { 
        ar: 'احسب الفرق بين تاريخين بالأيام التقويمية أو أيام العمل الفعلية مع مراعاة عطلات نهاية الأسبوع.',
        en: 'Calculate the difference between two dates in calendar or working days, accounting for weekends.'
      },
      path: '/calc?tab=dates'
    }
  ];

  const upcomingTools = [
    {
      icon: '🏦',
      title: { ar: 'حاسبة القروض', en: 'Loan Calculator' },
      description: { ar: 'قريباً - حساب الأقساط الشهرية والفوائد', en: 'Coming soon - Monthly installments and interest calculations' }
    },
    {
      icon: '📊',
      title: { ar: 'حاسبة الضرائب', en: 'Tax Calculator' },
      description: { ar: 'قريباً - حساب ضريبة القيمة المضافة', en: 'Coming soon - VAT calculations' }
    },
    {
      icon: '🏠',
      title: { ar: 'حاسبة بدل السكن', en: 'Housing Allowance Calculator' },
      description: { ar: 'قريباً - تفاصيل بدل السكن وخياراته', en: 'Coming soon - Housing allowance details and options' }
    }
  ];

  const c = content[lang];

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <SeoHead title={c.title} description={c.meta} />

      <section className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{c.h1}</h1>
          <p className="text-sm sm:text-base text-slate-700 mt-2">{c.intro}</p>
        </div>

        {/* Main Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {tools.map((tool) => (
            <a
              key={tool.id}
              href={tool.path}
              onClick={(e) => { e.preventDefault(); navigateTo(tool.path); }}
              className="group rounded-2xl border p-4 sm:p-5 bg-white shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <span className="text-2xl sm:text-3xl">{tool.icon}</span>
                <div className="flex-1 space-y-2">
                  <h2 className="font-semibold text-base sm:text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                    {tool.title[lang]}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {tool.description[lang]}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <span className="inline-flex items-center text-xs sm:text-sm text-blue-600 group-hover:underline">
                  {lang === 'ar' ? 'استخدم الحاسبة' : 'Use Calculator'}
                  <span className={`text-base ${lang === 'ar' ? 'mr-1' : 'ml-1'}`} aria-hidden>
                    {lang === 'ar' ? '←' : '→'}
                  </span>
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <AdSlot slotId="tools-middle" position="inline" lang={lang} />

      {/* Upcoming Tools */}
      <section className="space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
          {lang === 'ar' ? 'أدوات قادمة' : 'Coming Soon'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {upcomingTools.map((tool, i) => (
            <div key={i} className="rounded-2xl border border-dashed p-3 sm:p-4 bg-slate-50 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl opacity-60">{tool.icon}</span>
                  <h3 className="font-medium text-sm sm:text-base text-slate-600">{tool.title[lang]}</h3>
                </div>
                <p className="text-xs text-slate-700">{tool.description[lang]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="space-y-3 rounded-2xl border p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-indigo-50">
        <h2 className="font-semibold text-base sm:text-lg text-slate-900">
          {lang === 'ar' ? 'روابط سريعة' : 'Quick Links'}
        </h2>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <a 
            href="/blog" 
            onClick={(e) => { e.preventDefault(); navigateTo('/blog'); }}
            className="px-3 py-1.5 rounded-lg bg-white border text-xs sm:text-sm text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            {lang === 'ar' ? '📝 المدونة' : '📝 Blog'}
          </a>
          <a 
            href="/faq" 
            onClick={(e) => { e.preventDefault(); navigateTo('/faq'); }}
            className="px-3 py-1.5 rounded-lg bg-white border text-xs sm:text-sm text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            {lang === 'ar' ? '❓ الأسئلة الشائعة' : '❓ FAQ'}
          </a>
          <a 
            href="/about" 
            onClick={(e) => { e.preventDefault(); navigateTo('/about'); }}
            className="px-3 py-1.5 rounded-lg bg-white border text-xs sm:text-sm text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            {lang === 'ar' ? 'ℹ️ عن الموقع' : 'ℹ️ About'}
          </a>
        </div>
      </section>

      <AdSlot slotId="tools-bottom" position="inline" lang={lang} />
    </div>
  );
}
