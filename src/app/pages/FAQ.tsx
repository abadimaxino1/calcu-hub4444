import React, { useState } from 'react';
import SeoHead from '../../lib/seoHead';
import { SeoFAQJsonLD } from '../../lib/seo';

export default function FAQPage({ lang }: { lang: 'ar' | 'en' }) {
  const content = {
    en: {
      title: 'Frequently Asked Questions | Calcu-Hub',
      meta: 'Find answers to common questions about Calcu-Hub calculators, data accuracy, privacy, and how to use the tools.',
      h1: 'Frequently Asked Questions'
    },
    ar: {
      title: 'الأسئلة الشائعة | Calcu-Hub',
      meta: 'إجابات عن أكثر الأسئلة شيوعًا حول حاسبات Calcu-Hub، ودقة النتائج، والخصوصية، وطريقة استخدام الأدوات.',
      h1: 'الأسئلة الشائعة'
    }
  };

  const faqs = lang === 'ar' ? [
    { 
      question: 'هل استخدام الحاسبات مجاني؟', 
      answer: 'نعم، جميع الحاسبات في Calcu-Hub متاحة مجانًا للاستخدام الشخصي.' 
    },
    { 
      question: 'هل يمكن الاعتماد على النتائج في القرارات الرسمية؟', 
      answer: 'النتائج تقريبية لغرض التوضيح فقط. في القرارات الرسمية المتعلقة بالراتب أو العقد أو الحقوق القانونية يجب الرجوع لجهة العمل والأنظمة الرسمية.' 
    },
    { 
      question: 'هل تقومون بتخزين بيانات راتبي أو هويتي؟', 
      answer: 'لا نطلب في الحاسبات إدخال الاسم أو رقم الهوية أو البيانات البنكية، وتُستخدم البيانات المدخلة فقط لإجراء العمليات الحسابية.' 
    },
    { 
      question: 'لأي دولة تم تصميم الحاسبات؟', 
      answer: 'تم تصميم حاسبات Calcu-Hub أساسًا لسوق العمل السعودي، مع مراعاة أنظمة العمل المحلية وعطلة نهاية الأسبوع المعتمدة.' 
    },
    { 
      question: 'كيف يمكنني اقتراح حاسبة جديدة أو تحسينات؟', 
      answer: 'يمكنك التواصل معنا عبر نموذج الاتصال أو بيانات التواصل الموجودة في الموقع لاقتراح حاسبات أو ميزات جديدة.' 
    }
  ] : [
    { 
      question: 'Are the calculators free to use?', 
      answer: 'Yes, all calculators on Calcu-Hub are free for personal use.' 
    },
    { 
      question: 'Can I rely on the results for official decisions?', 
      answer: 'The results are estimates for guidance only. For official decisions about your salary, contract, or legal rights, always refer to your employer and the official regulations.' 
    },
    { 
      question: 'Do you store my salary or ID data?', 
      answer: 'We do not ask for your name, national ID, or bank details in the calculators. Input data is used only for performing the calculations.' 
    },
    { 
      question: 'Which countries does Calcu-Hub support?', 
      answer: 'Calcu-Hub is primarily designed for Saudi Arabia and uses Saudi labor rules and weekends.' 
    },
    { 
      question: 'How can I suggest a new calculator or feature?', 
      answer: 'You can contact us through the website to suggest new calculators or improvements.' 
    }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const c = content[lang];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <SeoHead title={c.title} description={c.meta} />
      <SeoFAQJsonLD faqs={faqs} />

      <section className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{c.h1}</h1>

        <div className="space-y-3 sm:space-y-4">
          {faqs.map((f, i) => (
            <div 
              key={i} 
              className="rounded-2xl border bg-white shadow-sm overflow-hidden"
            >
              <button
                className="w-full text-start p-3 sm:p-4 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <h3 className="font-semibold text-sm sm:text-base text-slate-900">{f.question}</h3>
                <span className="text-slate-600 text-lg flex-shrink-0">
                  {openIndex === i ? '−' : '+'}
                </span>
              </button>
              {openIndex === i && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{f.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

