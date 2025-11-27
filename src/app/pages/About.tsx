import React from 'react';
import SeoHead from '../../lib/seoHead';

export default function AboutPage({ lang }: { lang: 'ar' | 'en' }) {
  const content = {
    en: {
      title: 'About Calcu-Hub | Saudi Work & Salary Calculators',
      meta: 'Learn more about Calcu-Hub, a Saudi-focused platform that offers free and accurate calculators for salary, end-of-service, work hours, and date differences, built to help employees and HR professionals.',
      h1: 'About Calcu-Hub',
      intro: 'Calcu-Hub is a specialized platform for work and salary calculations tailored to the Saudi labor market.',
      goal: 'Our goal is to provide clear, accurate, and easy-to-use tools that help employees, HR professionals, and job seekers understand their financial rights and obligations.',
      calculatorsTitle: 'Calcu-Hub currently offers four core calculators:',
      calculators: [
        'Salary calculator after GOSI and deductions',
        'End-of-service calculator according to Saudi labor law',
        'Work hours and exit time calculator',
        'Date and working days difference calculator'
      ],
      disclaimer: 'We design our calculators based on official regulations and common HR practices, but we always remind users that the results are indicative only and should not replace legal advice or official payroll records.',
      future: 'As the platform grows, we plan to add more calculators, educational content, and tools to help you make better decisions about your work, salary, and career in Saudi Arabia.'
    },
    ar: {
      title: 'عن منصة Calcu-Hub | حاسبات العمل والراتب في السعودية',
      meta: 'تعرف على منصة Calcu-Hub المتخصصة في تقديم حاسبات مجانية ودقيقة للراتب، نهاية الخدمة، ساعات العمل، والفروقات بين التواريخ، والموجهة لسوق العمل السعودي.',
      h1: 'عن منصة Calcu-Hub',
      intro: 'Calcu-Hub هي منصة متخصصة في حاسبات العمل والراتب مصممة بما يتوافق مع سوق العمل السعودي.',
      goal: 'هدفنا هو توفير أدوات واضحة ودقيقة وسهلة الاستخدام تساعد الموظفين وأخصائي الموارد البشرية وطالبي العمل على فهم حقوقهم المالية والتزاماتهم بشكل أفضل.',
      calculatorsTitle: 'تشمل حاسباتنا الحالية:',
      calculators: [
        'حاسبة الراتب بعد خصم التأمينات والخصومات',
        'حاسبة مكافأة نهاية الخدمة وفق نظام العمل السعودي',
        'حاسبة ساعات العمل ووقت الانصراف المتوقع',
        'حاسبة الفروقات بين التواريخ وأيام العمل'
      ],
      disclaimer: 'نعتمد في تصميم الحاسبات على الأنظمة الرسمية وأشهر الممارسات في الموارد البشرية، مع التأكيد الدائم على أن النتائج تقريبية لغرض التثقيف ولا تغني عن الرجوع لعقد العمل أو المستشار القانوني أو كشوف الرواتب المعتمدة.',
      future: 'مع تطور المنصة نخطط لإضافة حاسبات وأدوات ومحتوى توعوي إضافي يساعدك على اتخاذ قرارات أفضل تتعلق بالعمل والراتب والمسار المهني داخل المملكة.'
    }
  };

  const c = content[lang];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <SeoHead title={c.title} description={c.meta} />

      <section className="space-y-4 sm:space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{c.h1}</h1>
        <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{c.intro}</p>
        <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{c.goal}</p>

        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2 sm:mb-3">{c.calculatorsTitle}</h2>
          <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-sm sm:text-base text-slate-700">
            {c.calculators.map((calc, i) => (
              <li key={i}>{calc}</li>
            ))}
          </ul>
        </div>

        <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{c.disclaimer}</p>
        <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{c.future}</p>
      </section>
    </div>
  );
}
