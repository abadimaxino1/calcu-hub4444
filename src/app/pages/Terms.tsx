import React from 'react';
import SeoHead from '../../lib/seoHead';

export default function TermsPage({ lang }: { lang: 'ar' | 'en' }) {
  const content = {
    en: {
      title: 'Terms of Use | Calcu-Hub',
      meta: 'Read the terms of use for Calcu-Hub, including disclaimers, limitations of liability, and acceptable use of the calculators and content.',
      h1: 'Terms of Use',
      intro: 'By using Calcu-Hub, you agree to the following terms:',
      sections: [
        {
          title: '1. Informational purpose only',
          body: 'The calculators on Calcu-Hub are provided for informational and educational purposes. They are not a substitute for official payroll systems, legal advice, or professional consulting.'
        },
        {
          title: '2. No legal guarantee',
          body: 'While we strive to keep our formulas and logic up to date, we do not guarantee that all calculations are error-free or fully aligned with all employer policies. You are responsible for verifying any critical result with your HR department or legal advisor.'
        },
        {
          title: '3. Acceptable use',
          body: 'You agree not to misuse the website, attempt to disrupt its operation, or use automated scripts to send abusive traffic.'
        },
        {
          title: '4. Limitation of liability',
          body: 'Calcu-Hub and its owners are not liable for any direct or indirect damages resulting from the use of the calculators or reliance on the results.'
        },
        {
          title: '5. Changes to the service',
          body: 'We may add, modify, or remove calculators and features at any time without prior notice.'
        },
        {
          title: '6. Changes to these terms',
          body: 'We may update these terms periodically. Your continued use of the website after any update constitutes acceptance of the new terms.'
        }
      ]
    },
    ar: {
      title: 'الشروط والأحكام | Calcu-Hub',
      meta: 'اقرأ الشروط والأحكام الخاصة باستخدام منصة Calcu-Hub بما في ذلك حدود المسؤولية والغرض من الحاسبات وطريقة الاستخدام المقبولة.',
      h1: 'الشروط والأحكام',
      intro: 'باستخدامك لموقع Calcu-Hub فإنك توافق على الشروط التالية:',
      sections: [
        {
          title: '1. الغرض من الحاسبات',
          body: 'تُقدم الحاسبات الموجودة في Calcu-Hub لأغراض التوعية والتثقيف فقط، ولا تُعد بديلاً عن أنظمة الرواتب المعتمدة أو الاستشارات القانونية أو المهنية.'
        },
        {
          title: '2. عدم وجود ضمان قانوني',
          body: 'نسعى قدر الإمكان لتحديث المعادلات والمنطق المستخدم في الحاسبات، إلا أننا لا نضمن خلوها من الخطأ أو توافقها التام مع سياسات جميع المنشآت. تقع على عاتقك مسؤولية التحقق من أي نتيجة مهمة مع قسم الموارد البشرية أو المستشار القانوني.'
        },
        {
          title: '3. الاستخدام المقبول',
          body: 'يلتزم المستخدم بعدم إساءة استخدام الموقع أو محاولة تعطيل عمله أو إرسال طلبات آلية بشكل مفرط يؤثر على أداء الخدمة.'
        },
        {
          title: '4. حدود المسؤولية',
          body: 'لا تتحمل منصة Calcu-Hub أو مالكوها أي مسؤولية عن الأضرار المباشرة أو غير المباشرة الناتجة عن استخدام الحاسبات أو الاعتماد على نتائجها.'
        },
        {
          title: '5. تعديل الخدمة',
          body: 'نحتفظ بالحق في إضافة أو تعديل أو إزالة أي حاسبة أو ميزة في أي وقت دون إشعار مسبق.'
        },
        {
          title: '6. تعديل الشروط',
          body: 'قد نقوم بتحديث هذه الشروط بين فترة وأخرى، ويُعد استمرارك في استخدام الموقع بعد التحديث موافقة ضمنية على الشروط المعدلة.'
        }
      ]
    }
  };

  const c = content[lang];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <SeoHead title={c.title} description={c.meta} />

      <section className="space-y-4 sm:space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{c.h1}</h1>
        <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">{c.intro}</p>

        {c.sections.map((section, i) => (
          <div key={i} className="space-y-2">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">{section.title}</h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{section.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
