import React, { useState, useEffect } from 'react';
import SeoHead from '../../lib/seoHead';
import { SeoFAQJsonLD } from '../../lib/seo';

interface FAQItem {
  id?: string;
  category?: string;
  questionAr?: string;
  questionEn?: string;
  answerAr?: string;
  answerEn?: string;
  question?: string;
  answer?: string;
}

// Default fallback FAQs
const DEFAULT_FAQS = {
  ar: [
    { question: 'هل استخدام الحاسبات مجاني؟', answer: 'نعم، جميع الحاسبات في Calcu-Hub متاحة مجانًا للاستخدام الشخصي.' },
    { question: 'هل يمكن الاعتماد على النتائج في القرارات الرسمية؟', answer: 'النتائج تقريبية لغرض التوضيح فقط. في القرارات الرسمية المتعلقة بالراتب أو العقد أو الحقوق القانونية يجب الرجوع لجهة العمل والأنظمة الرسمية.' },
    { question: 'هل تقومون بتخزين بيانات راتبي أو هويتي؟', answer: 'لا نطلب في الحاسبات إدخال الاسم أو رقم الهوية أو البيانات البنكية، وتُستخدم البيانات المدخلة فقط لإجراء العمليات الحسابية.' },
    { question: 'لأي دولة تم تصميم الحاسبات؟', answer: 'تم تصميم حاسبات Calcu-Hub أساسًا لسوق العمل السعودي، مع مراعاة أنظمة العمل المحلية وعطلة نهاية الأسبوع المعتمدة.' },
    { question: 'كيف يمكنني اقتراح حاسبة جديدة أو تحسينات؟', answer: 'يمكنك التواصل معنا عبر نموذج الاتصال أو بيانات التواصل الموجودة في الموقع لاقتراح حاسبات أو ميزات جديدة.' },
  ],
  en: [
    { question: 'Are the calculators free to use?', answer: 'Yes, all calculators on Calcu-Hub are free for personal use.' },
    { question: 'Can I rely on the results for official decisions?', answer: 'The results are estimates for guidance only. For official decisions about your salary, contract, or legal rights, always refer to your employer and the official regulations.' },
    { question: 'Do you store my salary or ID data?', answer: 'We do not ask for your name, national ID, or bank details in the calculators. Input data is used only for performing the calculations.' },
    { question: 'Which countries does Calcu-Hub support?', answer: 'Calcu-Hub is primarily designed for Saudi Arabia and uses Saudi labor rules and weekends.' },
    { question: 'How can I suggest a new calculator or feature?', answer: 'You can contact us through the website to suggest new calculators or improvements.' },
  ],
};

// Category labels for grouping FAQs
const CATEGORY_LABELS = {
  global: { ar: 'عام', en: 'General' },
  pay: { ar: 'حاسبة الراتب', en: 'Salary Calculator' },
  eos: { ar: 'نهاية الخدمة', en: 'End of Service' },
  work: { ar: 'ساعات العمل', en: 'Work Hours' },
  dates: { ar: 'التواريخ', en: 'Dates' },
};

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

  const [faqs, setFaqs] = useState<{ question: string; answer: string; category?: string }[]>([]);
  const [groupedFaqs, setGroupedFaqs] = useState<Record<string, { question: string; answer: string }[]>>({});
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const c = content[lang];

  // Fetch FAQs from CMS API
  useEffect(() => {
    setLoading(true);
    // Fetch all categories
    const categories = ['global', 'pay', 'eos', 'work', 'dates'];
    
    Promise.all(
      categories.map(cat =>
        fetch(`/api/content/faqs?category=${cat}`, {
          headers: { 'Accept-Language': lang }
        })
          .then(r => r.json())
          .then(data => ({
            category: cat,
            faqs: data.faqs || []
          }))
          .catch(() => ({ category: cat, faqs: [] }))
      )
    ).then(results => {
      const allFaqs: { question: string; answer: string; category?: string }[] = [];
      const grouped: Record<string, { question: string; answer: string }[]> = {};

      results.forEach(({ category, faqs: catFaqs }) => {
        if (catFaqs.length > 0) {
          const formattedFaqs = catFaqs.map((f: FAQItem) => {
            // Strict fallback chain
            const question = (lang === 'ar' 
              ? (f.questionAr || f.question || f.questionEn) 
              : (f.questionEn || f.question || f.questionAr)) || (lang === 'ar' ? 'بدون سؤال' : 'Untitled Question');
            
            const answer = (lang === 'ar' 
              ? (f.answerAr || f.answer || f.answerEn) 
              : (f.answerEn || f.answer || f.answerAr)) || '';

            return { question, answer, category };
          });
          allFaqs.push(...formattedFaqs);
          grouped[category] = formattedFaqs;
        }
      });

      if (allFaqs.length > 0) {
        setFaqs(allFaqs);
        setGroupedFaqs(grouped);
      } else {
        // Use default fallback ONLY if CMS is empty
        setFaqs(DEFAULT_FAQS[lang]);
        setGroupedFaqs({});
        setOpenId(null);
      }
      setLoading(false);
    });
  }, [lang]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <SeoHead title={c.title} description={c.meta} />
      <SeoFAQJsonLD faqs={faqs} />

      <section className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{c.h1}</h1>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : Object.keys(groupedFaqs).length > 0 ? (
          Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
            <div key={category} className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-700 border-b pb-2">
                {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]?.[lang] || category}
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {categoryFaqs.map((f, i) => {
                  const faqId = `${category}-${i}`;
                  return (
                    <div 
                      key={faqId} 
                      className="rounded-2xl border bg-white shadow-sm overflow-hidden"
                    >
                      <button
                        className="w-full text-start p-3 sm:p-4 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                        onClick={() => setOpenId(openId === faqId ? null : faqId)}
                      >
                        <h3 className="font-semibold text-sm sm:text-base text-slate-900">{f.question}</h3>
                        <span className="text-slate-600 text-lg flex-shrink-0">
                          {openId === faqId ? '−' : '+'}
                        </span>
                      </button>
                      {openId === faqId && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{f.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          /* Fallback: Display flat list */
          <div className="space-y-3 sm:space-y-4">
            {faqs.map((f, i) => {
              const faqId = `flat-${i}`;
              return (
                <div 
                  key={i} 
                  className="rounded-2xl border bg-white shadow-sm overflow-hidden"
                >
                  <button
                    className="w-full text-start p-3 sm:p-4 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                    onClick={() => setOpenId(openId === faqId ? null : faqId)}
                  >
                    <h3 className="font-semibold text-sm sm:text-base text-slate-900">{f.question}</h3>
                    <span className="text-slate-600 text-lg flex-shrink-0">
                      {openId === faqId ? '−' : '+'}
                    </span>
                  </button>
                  {openId === faqId && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{f.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

