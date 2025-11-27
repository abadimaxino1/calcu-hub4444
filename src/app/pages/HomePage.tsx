import React from 'react';
import { useTranslation } from 'react-i18next';
import SeoHead from '../../lib/seoHead';
import { SeoFAQJsonLD } from '../../lib/seo';

interface HomePageProps {
  lang: 'ar' | 'en';
  onNavigate: (tab: string) => void;
}

const TOOLS = [
  {
    id: 'pay',
    icon: '💰',
    titleAr: 'حاسبة الراتب',
    titleEn: 'Salary Calculator',
    descAr: 'احسب صافي راتبك بعد التأمينات والاستقطاعات',
    descEn: 'Calculate net salary after GOSI and deductions',
    color: 'from-green-500 to-emerald-600',
    features: ['gosi', 'allowances', 'overtime'],
  },
  {
    id: 'eos',
    icon: '🏆',
    titleAr: 'حاسبة نهاية الخدمة',
    titleEn: 'End of Service Calculator',
    descAr: 'احسب مكافأة نهاية الخدمة حسب المادة 84 و 85',
    descEn: 'Calculate EOS benefits per Articles 84 & 85',
    color: 'from-blue-500 to-indigo-600',
    features: ['article84', 'article85', 'leave'],
  },
  {
    id: 'work',
    icon: '⏰',
    titleAr: 'حاسبة ساعات العمل',
    titleEn: 'Work Hours Calculator',
    descAr: 'احسب ساعات العمل ووقت الخروج المتوقع',
    descEn: 'Calculate work hours and expected exit time',
    color: 'from-orange-500 to-amber-600',
    features: ['clockin', 'breaks', 'overtime'],
  },
  {
    id: 'dates',
    icon: '📅',
    titleAr: 'حاسبة التواريخ',
    titleEn: 'Date Calculator',
    descAr: 'احسب الفرق بين تاريخين وأيام العمل الفعلية',
    descEn: 'Calculate date differences and working days',
    color: 'from-purple-500 to-violet-600',
    features: ['hijri', 'working-days', 'holidays'],
  },
];

const FEATURES = [
  {
    icon: '✓',
    titleAr: 'دقة عالية',
    titleEn: 'High Accuracy',
    descAr: 'حسابات مبنية على نظام العمل السعودي',
    descEn: 'Based on Saudi Labor Law',
  },
  {
    icon: '⚡',
    titleAr: 'سريع وسهل',
    titleEn: 'Fast & Easy',
    descAr: 'نتائج فورية بدون تعقيد',
    descEn: 'Instant results without complexity',
  },
  {
    icon: '🔒',
    titleAr: 'خصوصية تامة',
    titleEn: 'Privacy First',
    descAr: 'حساباتك تبقى على جهازك',
    descEn: 'Your data stays on your device',
  },
  {
    icon: '📱',
    titleAr: 'يعمل على كل الأجهزة',
    titleEn: 'Works Everywhere',
    descAr: 'متوافق مع الجوال والكمبيوتر',
    descEn: 'Mobile and desktop compatible',
  },
];

const FAQS = {
  ar: [
    { question: 'ما هي منصة Calcu-Hub؟', answer: 'Calcu-Hub مجموعة من الحاسبات المجانية صُممت لمساعدة الموظفين وأخصائي الموارد البشرية والعاملين لحسابهم الخاص في السعودية على فهم الرواتب وساعات العمل ومكافآت نهاية الخدمة بشكل أوضح.' },
    { question: 'هل النتائج ملزمة قانونيًا؟', answer: 'لا، النتائج تقريبية لغرض التثقيف والتوضيح فقط. القرارات النهائية يجب أن تُبنى على عقد العمل واللوائح الرسمية ومرجعية وزارة الموارد البشرية.' },
    { question: 'ما الحاسبات المتوفرة حاليًا؟', answer: 'تتوفر حاليًا أربع حاسبات رئيسية: حاسبة الراتب بعد التأمينات والخصومات، حاسبة مكافأة نهاية الخدمة حسب المادتين 84 و85، حاسبة ساعات العمل ووقت الانصراف، وحاسبة الفروقات بين التواريخ وأيام العمل.' },
    { question: 'هل استخدام Calcu-Hub مجاني؟', answer: 'نعم، جميع الحاسبات مجانية. هدفنا مساعدة الموظفين وطالبي العمل على رؤية الأرقام بوضوح وشفافية.' },
    { question: 'هل يدعم الموقع اللغتين العربية والإنجليزية؟', answer: 'نعم، يمكنك التبديل بين العربية والإنجليزية من أعلى الصفحة، وسيتم ضبط واجهة الحاسبات تلقائيًا حسب اللغة المختارة.' },
  ],
  en: [
    { question: 'What is Calcu-Hub?', answer: 'Calcu-Hub is a collection of free calculators designed for employees, HR specialists, and freelancers in Saudi Arabia to better understand salaries, work hours, and end-of-service benefits.' },
    { question: 'Are the results legally binding?', answer: 'No. The results are estimates for guidance only. For any final decisions, you should always refer to your official contract, HR department, and the Ministry of Human Resources regulations.' },
    { question: 'Which calculators are available?', answer: 'We currently provide four calculators: salary calculator after GOSI and deductions, end-of-service calculator by Articles 84 and 85, work hours and exit time calculator, and date difference / working days calculator.' },
    { question: 'Is Calcu-Hub free to use?', answer: 'Yes, all calculators are free to use. We aim to support employees and job seekers with clear and transparent numbers.' },
    { question: 'Does Calcu-Hub support both Arabic and English?', answer: 'Yes. You can switch between Arabic and English from the top of the page, and the calculators will adapt to your language preference.' },
  ],
};

export default function HomePage({ lang, onNavigate }: HomePageProps) {
  const { t } = useTranslation();
  const isRTL = lang === 'ar';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
      <SeoHead 
        title={lang === 'ar' ? 'حاسبات العمل والراتب في السعودية | Calcu-Hub' : 'Saudi Work & Salary Calculators | Calcu-Hub'}
        description={lang === 'ar' 
          ? 'مجموعة حاسبات مجانية ودقيقة للراتب، نهاية الخدمة، ساعات العمل، وحساب الفروقات بين التواريخ في السعودية. تساعدك منصة Calcu-Hub على فهم التأمينات الاجتماعية، مستحقات نهاية الخدمة، وأيام العمل بسهولة.'
          : 'Free and accurate Saudi salary, end-of-service, work hours, and date calculators in one place. Calcu-Hub helps employees and HR professionals quickly understand GOSI, EOS benefits, working days, and more.'
        }
      />
      <SeoFAQJsonLD faqs={FAQS[lang]} />

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-50 text-slate-900 shadow-xl border border-slate-200">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aC0ydi00aDJ2NHptMC02aC0ydi00aDJ2NHptMC02aC0yVjE4aDJ2NHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="relative px-4 sm:px-6 lg:px-10 py-8 sm:py-10 lg:py-12 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Text Content */}
          <div className="flex-1 text-center md:text-start z-10">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 text-slate-900 tracking-tight leading-tight">
              {lang === 'ar' ? 'حاسبات العمل والراتب في مكان واحد' : 'Saudi Work & Salary Calculators'}
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-800 max-w-2xl mx-auto md:mx-0 mb-8 leading-relaxed font-medium">
              {lang === 'ar' 
                ? 'منصتك الموثوقة لحسابات الراتب، نهاية الخدمة، وساعات العمل في السعودية. نتائج دقيقة ومحدثة حسب نظام العمل.'
                : 'Your trusted toolkit for salary, EOS, and work hour calculations in Saudi Arabia. Accurate results based on Labor Law.'
              }
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center md:justify-start gap-4">
              <button
                onClick={() => onNavigate('pay')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg min-h-[44px] shadow-md transition-colors"
              >
                {lang === 'ar' ? 'حاسبة الراتب' : 'Salary Calculator'}
              </button>
              <button
                onClick={() => onNavigate('eos')}
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg px-4 py-2 min-h-[44px] font-medium transition-colors"
              >
                {lang === 'ar' ? 'نهاية الخدمة' : 'End of Service'}
              </button>
            </div>
          </div>

          {/* Hero Illustration */}
          <div className="flex-1 w-full max-w-md md:max-w-lg lg:max-w-xl relative hidden md:block">
            <svg viewBox="0 0 400 320" className="w-full h-auto drop-shadow-2xl transform hover:scale-105 transition-transform duration-500" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="cardGrad" x1="0" y1="0" x2="400" y2="320" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white" stopOpacity="0.95"/>
                  <stop offset="1" stopColor="white" stopOpacity="0.8"/>
                </linearGradient>
              </defs>
              {/* Abstract Background Blobs */}
              <circle cx="200" cy="160" r="140" fill="white" fillOpacity="0.05" />
              <circle cx="100" cy="80" r="60" fill="white" fillOpacity="0.03" />
              
              {/* Main Dashboard Card */}
              <rect x="60" y="60" width="280" height="200" rx="16" fill="url(#cardGrad)" />
              <rect x="60" y="60" width="280" height="200" rx="16" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
              
              {/* UI Elements */}
              <rect x="85" y="90" width="140" height="16" rx="4" fill="#E2E8F0" />
              <rect x="85" y="120" width="230" height="2" rx="1" fill="#F1F5F9" />
              <rect x="85" y="150" width="230" height="2" rx="1" fill="#F1F5F9" />
              <rect x="85" y="180" width="230" height="2" rx="1" fill="#F1F5F9" />
              
              {/* Charts */}
              <rect x="85" y="190" width="30" height="40" rx="4" fill="#3B82F6" />
              <rect x="125" y="170" width="30" height="60" rx="4" fill="#6366F1" />
              <rect x="165" y="140" width="30" height="90" rx="4" fill="#8B5CF6" />
              <rect x="205" y="160" width="30" height="70" rx="4" fill="#EC4899" />
              
              {/* Floating Coin */}
              <g transform="translate(310, 230)">
                <circle cx="0" cy="0" r="28" fill="#F59E0B" className="animate-bounce" />
                <circle cx="0" cy="0" r="24" stroke="#FCD34D" strokeWidth="2" />
                <text x="0" y="9" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" fontFamily="sans-serif">$</text>
              </g>
              
              {/* Floating Check */}
              <g transform="translate(50, 240)">
                <rect x="0" y="0" width="56" height="56" rx="12" fill="#10B981" transform="rotate(-10)" className="animate-pulse" />
                <path d="M18 28 L26 36 L40 20" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-10, 28, 28) translate(4,4)" />
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section>
        <h2 className="text-center text-lg sm:text-xl font-semibold text-slate-900 mb-4 sm:mb-6">
          {lang === 'ar' ? 'الحاسبات المتاحة' : 'Available Calculators'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onNavigate(tool.id)}
              className="group flex flex-col justify-between h-full p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-start"
            >
              <div className="space-y-2">
                <div className="text-3xl sm:text-4xl mb-1 filter drop-shadow-sm">{tool.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold leading-snug text-slate-900 group-hover:text-indigo-700 transition-colors">
                  {lang === 'ar' ? tool.titleAr : tool.titleEn}
                </h3>
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">
                  {lang === 'ar' ? tool.descAr : tool.descEn}
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <span className="inline-flex items-center text-sm font-medium text-blue-700 group-hover:text-blue-800">
                  {lang === 'ar' ? 'ابدأ الآن' : 'Start now'}
                  <span className={`text-base ${isRTL ? 'mr-1' : 'ml-1'}`} aria-hidden>
                    {isRTL ? '←' : '→'}
                  </span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="pt-8 sm:pt-10 border-t border-slate-100">
        <h2 className="text-center text-lg sm:text-xl font-semibold text-slate-900 mb-4 sm:mb-6">
          {lang === 'ar' ? 'لماذا تستخدم حاسباتنا؟' : 'Why Use Our Calculators?'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
          {FEATURES.map((feature, i) => (
            <div key={i} className="text-center flex flex-col items-center gap-3 px-4 py-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-slate-50 text-indigo-600 flex items-center justify-center text-2xl sm:text-3xl shadow-inner">
                {feature.icon}
              </div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900">
                {lang === 'ar' ? feature.titleAr : feature.titleEn}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
                {lang === 'ar' ? feature.descAr : feature.descEn}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Preview */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center tracking-tight text-slate-900">
          {lang === 'ar' ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
        </h2>
        <div className="space-y-3 max-w-2xl mx-auto">
          {FAQS[lang].map((faq, i) => (
            <details key={i} className="group bg-white rounded-xl border p-4">
              <summary className="font-medium cursor-pointer list-none flex justify-between items-center">
                <span className="flex-1 text-base text-slate-900">{faq.question}</span>
                <span className="text-sm text-slate-600 group-open:rotate-180 transition-transform inline-block" aria-hidden>
                  ˅
                </span>
              </summary>
              <p className="mt-3 text-sm text-slate-700 pt-3 border-t">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-8 border-t border-slate-100">
        <p className="text-slate-700 mb-4">
          {lang === 'ar' 
            ? 'جاهز للبدء؟ اختر الحاسبة المناسبة لك'
            : 'Ready to start? Choose the right calculator for you'
          }
        </p>
        <button
          onClick={() => onNavigate('pay')}
          className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors"
        >
          {lang === 'ar' ? 'ابدأ الآن' : 'Get Started'}
        </button>
      </section>
    </div>
  );
}
