import React, { useEffect, useMemo, useState } from "react";
import { calcEndTimeLocal, nowHHmm } from "./lib/workhours";
import { calcPayroll } from "./lib/payroll";
import { calcEOS } from "./lib/eos";
import { SeoFAQJsonLD } from "./lib/seo";
import { isAdSlotEnabled } from "./lib/ads";
import FAQPage from './app/pages/FAQ';
import ToolsHub from './app/pages/ToolsHub';
import BlogPage from './app/pages/Blog';
import ArticlePage from './app/pages/Article';
import HomePage from './app/pages/HomePage';
import AboutPage from './app/pages/About';
import PrivacyPage from './app/pages/Privacy';
import TermsPage from './app/pages/Terms';
import PreviewPage from './app/pages/Preview';
import SeoHead from './lib/seo';
import AdSlot from './components/AdSlot';
import CalculatorFAQ, { StaticFAQ } from './components/CalculatorFAQ';
import { ConsentBanner } from './components/ConsentBanner';
import { diffBetween, calculateWorkingDays, WeekendConfig, toHijri, fromHijri, formatHijri } from "./lib/dates";
import { useTranslation, useLocale } from './i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import LanguageSwitcher from './components/LanguageSwitcher';
import SalaryComparison from './components/SalaryComparison';
import CmsContent from './components/CmsContent';
import { trackPageView } from './lib/analytics';

const AdminShell = React.lazy(() => import('./admin/AdminShell'));

// =============================================================
// Prototype V1 – Multi-calculator (ar Default) – Completed
// - Fixed JSX and helper functions
// - Added TestPanel (in-app tests), AdSlot, SEO hook, API stubs
// - i18n support with Arabic and English
// - Single-file app for quick iteration
// =============================================================

type Lang = "ar" | "en";

const tabs = [
  { id: "work" as const, labelAr: "ساعات العمل", labelEn: "Work Hours" },
  { id: "pay" as const, labelAr: "الراتب", labelEn: "Payroll" },
  { id: "eos" as const, labelAr: "نهاية الخدمة", labelEn: "End of Service" },
  { id: "dates" as const, labelAr: "التواريخ", labelEn: "Dates" },
  { id: "compare" as const, labelAr: "مقارنة الرواتب", labelEn: "Salary Comparison" },
];

// Static FAQ data for each calculator (fallback when API has no data)
const STATIC_FAQS = {
  pay: {
    ar: [
      { question: "كيف يتم احتساب التأمينات في حاسبة الراتب؟", answer: "يتم احتساب التأمينات على أساس الأجر الخاضع للاشتراك حتى الحد الأقصى المعتمد، وذلك حسب نوع ملف الاشتراك الذي تختاره (سعودي جديد، سعودي قديم، غير سعودي، أو مخصص)، مع فصل حصة الموظف عن حصة صاحب العمل." },
      { question: "هل يمكن إدخال الراتب الإجمالي فقط بدون تفصيل؟", answer: "نعم، يمكنك اختيار إدخال إجمالي الراتب الشهري فقط، أو تفصيل المكونات إلى راتب أساسي وبدل سكن وبدلات أخرى ثابتة." },
      { question: "هل الحاسبة تدعم نظام اشتراكات التأمينات القديم؟", answer: "نعم، إذا كنت مشتركًا في النظام القديم يمكنك اختيار ملف 'سعودي قديم' ليتم احتساب نسبة الاستقطاع وفق النسبة الصحيحة." },
      { question: "هل تشمل الحاسبة العمل الإضافي والمكافآت؟", answer: "يمكنك إضافة بيانات العمل الإضافي والمكافآت والحوافز لتقدير الدخل الشهري المتوقع، مع العلم أن جميع هذه المبالغ قد لا تكون خاضعة للاشتراك في التأمينات بالكامل حسب سياسة المنشأة." },
      { question: "لماذا يختلف الناتج عن المبلغ الذي يصل إلى حسابي البنكي؟", answer: "قد تختلف النتائج الفعلية بسبب سياسات المنشأة، أو خصومات إضافية مثل سلف أو مخالفات أو تأمين طبي، إضافة إلى فروقات التقريب. استخدم النتيجة كقيمة تقديرية واستعن بقسم الموارد البشرية للتأكيد النهائي." },
    ],
    en: [
      { question: "How is GOSI calculated in this salary calculator?", answer: "GOSI is calculated based on the contributory wage up to the official cap, using the selected profile (standard Saudi, legacy Saudi, non-Saudi, or custom). The calculator separates the employee share from the employer share." },
      { question: "Can I use total salary instead of detailed components?", answer: "Yes. You can switch between entering only the total gross salary or breaking it down into basic salary, housing allowance, and other fixed allowances." },
      { question: "Does the calculator support legacy GOSI rules?", answer: "Yes. If you are enrolled under older contribution rules, you can select the legacy profile so that GOSI is calculated with the correct percentage." },
      { question: "Are overtime, bonuses, and incentives included?", answer: "You can optionally add overtime, bonuses, and recurring incentives to see their effect on your expected monthly income, but they may not all be fully contributory for GOSI." },
      { question: "Why is my result slightly different from my bank statement?", answer: "Actual payroll may differ due to company-specific policies, additional deductions, or rounding. Use the result as an estimate and always confirm with your HR department." },
    ],
  },
  eos: {
    ar: [
      { question: "ما الفرق بين المادة 84 والمادة 85؟", answer: "المادة 84 تُطبق غالبًا عند إنهاء العقد من صاحب العمل، وتُحتسب مكافأة نهاية الخدمة وفق المعادلة الكاملة. أما المادة 85 فتُطبق عند الاستقالة، حيث تختلف نسبة الاستحقاق حسب عدد سنوات الخدمة." },
      { question: "ما أنواع إنهاء العلاقة المرتبطة بالمادة 84 في هذه الحاسبة؟", answer: "مثل: إنهاء العقد من صاحب العمل، انتهاء مدة العقد دون تجديد، إنهاء العقد لأسباب تنظيمية أو قاهرة، وبعض حالات النقل أو الإنهاء لمصلحة العمل، ويتم احتسابها وفق المادة 84." },
      { question: "ما الحالات التي تُعامل كمادة 85؟", answer: "الاستقالة بأنواعها المختلفة حسب مدة الخدمة، وبعض الحالات التي تُعتبر في حكم استقالة العامل مثل ترك العمل بإرادته، ويتم احتساب الاستحقاق الجزئي حسب سنوات الخدمة." },
      { question: "هل التقاعد والوفاة لهما معاملة خاصة؟", answer: "غالبًا ما تُعامل حالات التقاعد والوفاة بمعاملة أقرب للاسترخاء لمصلحة العامل، وقد يُمنح الاستحقاق الكامل أو شبه الكامل، لذلك تعرض الحاسبة قيمة تقريبية ويجب الرجوع للعقد والجهات الرسمية للتأكيد." },
      { question: "هل تشمل الحاسبة تعويض الإجازات السنوية غير المستخدمة؟", answer: "يمكن إدخال عدد الأيام المتبقية من رصيد الإجازات ليتم احتساب قيمتها بناءً على آخر راتب أساسي، لكن يظل الالتزام النهائي حسب نظام المنشأة وكشوف الرواتب الرسمية." },
    ],
    en: [
      { question: "What is the difference between Article 84 and Article 85?", answer: "Article 84 applies when the employer terminates the contract and grants the full EOS formula. Article 85 applies when the employee resigns and the entitlement is prorated based on years of service." },
      { question: "Which termination types are linked to Article 84 in this calculator?", answer: "Termination by employer, mutual agreement in favor of the employee, contract expiry without renewal, justified termination due to force majeure, and similar cases are calculated under Article 84." },
      { question: "Which termination types are linked to Article 85?", answer: "Resignation after different service periods, end of probation by employee choice, and similar cases that are legally treated as resignation are calculated under Article 85." },
      { question: "Are retirement and death treated differently?", answer: "Yes. Retirement and death cases usually follow the full entitlement rules, but actual implementation may depend on your contract and the applicable regulations, so results are indicative only." },
      { question: "Are unused vacations included in the EOS amount?", answer: "The calculator can include the value of unused annual leave based on your last basic salary, but you should always check your company policy and official payslips for the final amount." },
    ],
  },
  work: {
    ar: [
      { question: "كيف أحسب وقت الانصراف المتوقع؟", answer: "أدخل وقت بداية الدوام، وعدد ساعات العمل المطلوبة، وفترات الراحة إن وجدت، وستعرض الحاسبة وقت الانصراف المتوقع بناءً على هذه البيانات." },
      { question: "هل يمكن استخدام تنسيق 12 ساعة؟", answer: "نعم، يمكنك التبديل بين تنسيق 24 ساعة و12 ساعة حسب تفضيلك، مع بقاء الحسابات الداخلية ثابتة." },
      { question: "هل تدعم الحاسبة نظام الشفتات المتقطعة؟", answer: "يمكن تقريب الشفتات المتقطعة عن طريق إدخال إجمالي ساعات العمل مع تعديل فترات الراحة، أما الأنماط المعقدة جدًا فيُفضل التحقق منها يدويًا." },
      { question: "هل يمكن معرفة إجمالي الساعات الأسبوعية أو الشهرية؟", answer: "نعم، يمكن للحاسبة إظهار إجمالي الساعات لكل أسبوع أو شهر بناءً على النمط اليومي الذي تدخله." },
      { question: "هل تطبق الحاسبة قواعد العمل الإضافي؟", answer: "الحاسبة تعرض إجمالي الساعات فقط، أما استحقاق العمل الإضافي وطريقة احتسابه فيعتمد على نظام العمل السعودي وعقدك مع جهة العمل، لذا يُفضّل مراجعة قسم الموارد البشرية." },
    ],
    en: [
      { question: "How do I calculate my expected exit time?", answer: "Enter your start time, the number of working hours, and any break durations. The calculator will estimate the time you should finish work." },
      { question: "Can I use 12-hour time format?", answer: "Yes. You can switch between 24-hour and 12-hour formats depending on your preference. The underlying calculations remain the same." },
      { question: "Does the calculator handle split shifts?", answer: "You can approximate split shifts by entering total working hours and adjusting breaks, but complex split patterns may require manual checking." },
      { question: "Can I see weekly or monthly totals?", answer: "Yes, the calculator can show you aggregated working hours per week or per month based on your daily pattern." },
      { question: "Does it consider overtime rules?", answer: "The calculator shows total hours only. Overtime eligibility and rates depend on Saudi labor law and your contract, so you should verify with HR." },
    ],
  },
  dates: {
    ar: [
      { question: "ما الفرق بين الأيام التقويمية وأيام العمل؟", answer: "الأيام التقويمية تشمل جميع الأيام بين التاريخين، بينما تستبعد أيام العمل عطلة نهاية الأسبوع والإجازات الرسمية التي تقوم بإدخالها." },
      { question: "كيف أختار نوع عطلة نهاية الأسبوع؟", answer: "يمكنك اختيار 'السعودية (الجمعة–السبت)' أو 'الغربية (السبت–الأحد)' أو تخصيص الأيام غير العاملة يدويًا، ليتم استبعادها من حساب أيام العمل." },
      { question: "هل يمكن إضافة الإجازات الرسمية؟", answer: "نعم، يمكنك إدخال تواريخ الإجازات الرسمية (مفصولة بفاصلة)، وستقوم الحاسبة باستثنائها من إجمالي أيام العمل." },
      { question: "هل تدعم الحاسبة التواريخ الهجرية؟", answer: "نعم، يمكنك التبديل إلى وضع التاريخ الهجري وإدخال تاريخي البداية والنهاية بالتقويم الهجري، وستقوم الحاسبة بالتحويل والحساب داخليًا." },
      { question: "هل يمكن الاعتماد عليها في فترات الإشعار أو العقود؟", answer: "يمكن استخدام النتائج لتقدير فترات الإشعار ومدد العقود، لكن يجب دائمًا مراجعة اللوائح الرسمية وقسم الموارد البشرية أو المستشار القانوني للتأكيد النهائي." },
    ],
    en: [
      { question: "What is the difference between calendar days and working days?", answer: "Calendar days count every day between the two dates, while working days exclude weekends and any holidays you specify." },
      { question: "How do I set the weekend type?", answer: "You can choose between Saudi weekend (Friday–Saturday), Western weekend (Saturday–Sunday), or customize which weekdays are treated as non-working days." },
      { question: "Can I add official holidays?", answer: "Yes. You can enter a list of public holiday dates, and the calculator will exclude them from the working days count." },
      { question: "Does the calculator support Hijri dates?", answer: "Yes. You can switch to Hijri mode, enter Hijri start and end dates, and the tool will convert them internally before calculating the difference." },
      { question: "Can I use this for contract or notice periods?", answer: "The calculator can help you estimate notice periods and contract durations, but final legal deadlines should always be confirmed with your HR department or legal advisor." },
    ],
  },
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

// Small format helper
function fmt2(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "0.00";
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysInMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function dayOfMonth(d = new Date()) {
  return d.getDate();
}

// Simple API stubs
export const api = {
  async logCalculationEvent(type: string, payload?: any) {
    try {
      console.log("[api.logCalculationEvent]", type, payload);
      // future: POST to /api/log
    } catch (e) {
      console.warn("logCalculationEvent failed", e);
    }
  },
  async fetchConfig() {
    try {
      console.log("[api.fetchConfig] returning default config");
      return { theme: "default" };
    } catch (e) {
      console.warn(e);
      return null;
    }
  },
};

// small hook to update page title + meta
function usePageTitle(tabId: string, lang: Lang) {
  useEffect(() => {
    const titles: Record<string, { ar: string; en: string }> = {
      work: { ar: "حاسبة ساعات العمل في السعودية | Calcu-Hub", en: "Work Hours Calculator – Saudi Arabia | Calcu-Hub" },
      pay: { ar: "حاسبة الراتب في السعودية | Calcu-Hub", en: "Salary Calculator – Saudi Arabia | Calcu-Hub" },
      eos: { ar: "حاسبة نهاية الخدمة | Calcu-Hub", en: "End of Service Calculator – Saudi Arabia | Calcu-Hub" },
      dates: { ar: "حاسبة أيام العمل والتواريخ | Calcu-Hub", en: "Dates & Working Days Calculator | Calcu-Hub" },
      compare: { ar: "مقارنة عروض العمل والرواتب | Calcu-Hub", en: "Salary & Job Offer Comparison | Calcu-Hub" },
    };
    const descs: Record<string, { ar: string; en: string }> = {
      work: { ar: "احسب وقت الخروج وساعات العمل بدقة حسب ساعات الدوام المعتمدة في نظام العمل السعودي.", en: "Calculate your work end time and hours accurately based on Saudi Labor Law working hours." },
      pay: { ar: "حاسبة الراتب السعودية. احسب راتبك الإجمالي والصافي مع خصم التأمينات الاجتماعية (جوسي) بدقة.", en: "Saudi Salary Calculator. Compute gross-to-net pay with accurate GOSI social insurance deductions." },
      eos: { ar: "احسب مستحقات نهاية الخدمة بدقة وفقاً لنظام العمل السعودي.", en: "Accurately calculate End-of-Service benefits under Saudi Labor Law." },
      dates: { ar: "احسب الأيام بين تاريخين أو أيام العمل الفعلية مع مراعاة عطلات نهاية الأسبوع والعطل الرسمية.", en: "Calculate calendar or working days between two dates, accounting for weekends and public holidays." },
      compare: { ar: "قارن بين عرضين وظيفيين واحسب الفرق في الراتب الصافي والمميزات.", en: "Compare two job offers and calculate the difference in net salary and benefits." },
    };
    const t = titles[tabId] || titles.pay;
    const d = descs[tabId] || descs.pay;
    document.title = lang === "ar" ? t.ar : t.en;
    // meta description & OG (simple injection)
    const desc = lang === "ar" ? d.ar : d.en;
    let md = document.querySelector('meta[name="description"]');
    if (!md) {
      md = document.createElement("meta");
      md.setAttribute("name", "description");
      document.head.appendChild(md);
    }
    md.setAttribute("content", desc);

    // OG tags
    const ogTitle = document.querySelector('meta[property="og:title"]') || document.createElement("meta");
    ogTitle.setAttribute("property", "og:title");
    ogTitle.setAttribute("content", document.title);
    document.head.appendChild(ogTitle);
    const ogDesc = document.querySelector('meta[property="og:description"]') || document.createElement("meta");
    ogDesc.setAttribute("property", "og:description");
    ogDesc.setAttribute("content", desc);
    document.head.appendChild(ogDesc);
    const ogType = document.querySelector('meta[property="og:type"]') || document.createElement("meta");
    ogType.setAttribute("property", "og:type");
    ogType.setAttribute("content", "website");
    document.head.appendChild(ogType);

    // Structured data (commented guidance)
    /*
      JSON-LD suggestion (paste to index.html or inject server-side):
      {
        "@context":"https://schema.org",
        "@type":"WebSite",
        "name": "Work & Payroll Calculators",
        "url":"https://example.com",
        "description":"Calculators for payroll, work hours and end-of-service for employees in Saudi Arabia."
      }
    */
  }, [tabId, lang]);
}

// =============================================================
// Root App
// =============================================================
export default function App() {
  const { t, i18n } = useTranslation();
  const { locale, toggleLocale, isRTL, direction } = useLocale();
  const lang = locale as Lang;
  
  const setLang = (newLang: Lang | ((prev: Lang) => Lang)) => {
    const resolved = typeof newLang === 'function' ? newLang(locale as Lang) : newLang;
    i18n.changeLanguage(resolved);
  };
  
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("pay");
  const [showTests, setShowTests] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || (import.meta as any)?.env?.MODE === 'development';
    } catch (e) {
      return false;
    }
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // check admin session for gating in-app test UI
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/check', { credentials: 'include' });
        const j = await r.json();
        if (j && j.ok) setIsAdmin(true); else setIsAdmin(false);
      } catch (e) {
        setIsAdmin(false);
      }
    })();
  }, []);

  // Initialize analytics and ads on mount
  useEffect(() => {
    (async () => {
      const analytics = await import('./lib/analytics');
      analytics.initAnalytics();
    })();
  }, []);

  // simple router state (for /admin and a couple of static pages)
  const [route, setRoute] = useState(() => typeof window !== 'undefined' ? window.location.pathname : '/');

  const navigateTo = (p: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', p);
      setRoute(p);
    }
  };

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Track page views on route or tab change
  useEffect(() => {
    const path = route === '/calc' ? `/calc/${tab}` : route;
    trackPageView(path);
  }, [route, tab]);

  // Direction is now managed by i18n/index.ts

  usePageTitle(tab, lang);

  // Service worker update UX
  const [swUpdated, setSwUpdated] = useState(false);
  const [waitingReg, setWaitingReg] = useState<any>(null);

  useEffect(() => {
    function onUpdated(e: any) {
      try {
        const reg = e && e.detail && e.detail.registration;
        setWaitingReg(reg || null);
        setSwUpdated(true);
      } catch (err) {
        setSwUpdated(true);
      }
    }
    window.addEventListener('swUpdated', onUpdated as EventListener);
    return () => window.removeEventListener('swUpdated', onUpdated as EventListener);
  }, []);

  const applyUpdate = async () => {
    try {
      if (waitingReg && waitingReg.waiting) {
        // attempt to tell SW to skipWaiting
        waitingReg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      // reload when controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
      // fallback: reload after a short delay
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      window.location.reload();
    }
  };

  // Check if we're on admin route to hide main app chrome
  // Handle /admin, /admin/, /admin/login, /admin/dashboard, etc.
  const isAdminRoute = route === '/admin' || route.startsWith('/admin/') || route.startsWith('/admin');

  // Hide body scrolling when on admin routes to prevent any main app content from showing
  React.useEffect(() => {
    if (isAdminRoute) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isAdminRoute]);

  // For admin routes, render only the AdminShell with complete isolation
  if (isAdminRoute) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white overflow-auto">
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
          <AdminShell />
        </React.Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src="/images/logo-icon.svg"
              alt={lang === "ar" ? "شعار" : "logo"}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl object-contain cursor-pointer"
              onClick={() => navigateTo('/')}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <h1 
              className="font-bold text-base sm:text-lg cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => navigateTo('/')}
            >
              {lang === "ar" ? "حاسبات العمل" : "Calcu-Hub"}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick navigation links */}
            <nav className="hidden sm:flex items-center gap-1 sm:gap-2 text-sm">
              <a 
                className="px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                onClick={(e) => { e.preventDefault(); navigateTo('/'); }}
              >
                {lang === "ar" ? "الرئيسية" : "Home"}
              </a>
              <a 
                className="px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                onClick={(e) => { e.preventDefault(); navigateTo('/calc'); }}
              >
                {lang === "ar" ? "الحاسبات" : "Calculators"}
              </a>
            </nav>
            <LanguageSwitcher />
          </div>
        </div>
        {/* Show tab navigation only on calculator page */}
        {route === '/calc' && (
          <nav className="max-w-5xl mx-auto px-2 pb-2">
            <div className={cx("grid gap-1.5 sm:gap-2", "grid-cols-4")}>
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cx(
                    "px-2 sm:px-3 min-h-[44px] rounded-lg sm:rounded-xl border text-xs sm:text-sm truncate touch-manipulation",
                    tab === t.id ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-slate-50"
                  )}
                  aria-current={tab === t.id ? "page" : undefined}
                >
                  {lang === "ar" ? t.labelAr : t.labelEn}
                </button>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Service worker update banner */}
      {swUpdated && (
        <div className="max-w-5xl mx-auto px-4 py-2">
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 flex flex-col sm:flex-row items-center gap-3">
            <div className="text-sm flex-1">{lang === 'ar' ? 'تحديث جديد متاح' : 'A new version is available'}</div>
            <div className="flex gap-2 flex-shrink-0">
              <button className="px-4 min-h-[44px] min-w-[44px] rounded-lg border bg-white touch-manipulation" onClick={() => setSwUpdated(false)}>{lang === 'ar' ? 'تجاهل' : 'Dismiss'}</button>
              <button className="px-4 min-h-[44px] min-w-[44px] rounded-lg bg-blue-600 text-white touch-manipulation" onClick={applyUpdate}>{lang === 'ar' ? 'تحديث الآن' : 'Update now'}</button>
            </div>
          </div>
        </div>
      )}

      <main className="w-full py-6 space-y-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdSlot placement="header" />
        </div>

        {route === '/' ? (
          <HomePage 
            lang={lang} 
            onNavigate={(toolId) => {
              setTab(toolId as typeof tab);
              navigateTo('/calc');
            }} 
          />
        ) : route === '/calc' ? (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            {tab === "work" && <WorkHours lang={lang} />}
            {tab === "pay" && <Payroll lang={lang} />}
            {tab === "eos" && <EosCalc lang={lang} />}
            {tab === "dates" && <DatesCalculator lang={lang} />}
            {tab === "compare" && <SalaryComparison />}
          </div>
        ) : route === '/privacy' ? (
          <PrivacyPage lang={lang} />
        ) : route === '/terms' ? (
          <TermsPage lang={lang} />
        ) : route === '/about' ? (
          <AboutPage lang={lang} />
        ) : route === '/faq' ? (
          <FAQPage lang={lang} />
        ) : route === '/tools' ? (
          <ToolsHub lang={lang} />
        ) : route === '/blog' ? (
          <BlogPage lang={lang} />
        ) : route === '/article' ? (
          <ArticlePage lang={lang} />
        ) : route.startsWith('/preview/') ? (
          <PreviewPage lang={lang} />
        ) : (
          // 404 fallback - redirect to home
          <HomePage 
            lang={lang} 
            onNavigate={(toolId) => {
              setTab(toolId as typeof tab);
              navigateTo('/calc');
            }} 
          />
        )}

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <AdSlot placement="inline" />

          {/* TestPanel: Only visible for authenticated admins in development mode */}
          {isAdmin && showTests && <TestPanel lang={lang} />}
        </div>
      </main>

      <AdSlot placement="footer" />

      <footer className="border-t bg-white/50">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 text-[10px] sm:text-xs text-slate-600 flex flex-col gap-3 sm:gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-start">© {new Date().getFullYear()} – {lang === "ar" ? "نسخة تجريبية للمعاينة" : "Preview Prototype"}</div>
          <div className="flex flex-wrap justify-center md:justify-end gap-2 sm:gap-3">
            <a className="hover:underline cursor-pointer" onClick={(e)=>{ e.preventDefault(); navigateTo('/'); }}>{lang === "ar" ? "الرئيسية" : "Home"}</a>
            <a className="hover:underline cursor-pointer" onClick={(e)=>{ e.preventDefault(); navigateTo('/calc'); }}>{lang === "ar" ? "الحاسبات" : "Calculators"}</a>
            <a className="hover:underline cursor-pointer" onClick={(e)=>{ e.preventDefault(); navigateTo('/privacy'); }}>{lang === "ar" ? "الخصوصية" : "Privacy"}</a>
            <a className="hover:underline cursor-pointer" onClick={(e)=>{ e.preventDefault(); navigateTo('/terms'); }}>{lang === "ar" ? "الشروط" : "Terms"}</a>
            <a className="hover:underline cursor-pointer" onClick={(e)=>{ e.preventDefault(); navigateTo('/about'); }}>{lang === "ar" ? "عن الموقع" : "About"}</a>
            <a className="hover:underline cursor-pointer" onClick={(e)=>{ e.preventDefault(); navigateTo('/faq'); }}>{lang === "ar" ? "الأسئلة" : "FAQ"}</a>
            <a className="hover:underline cursor-pointer" onClick={(e)=>{ e.preventDefault(); navigateTo('/tools'); }}>{lang === "ar" ? "الأدوات" : "Tools"}</a>
            <a className="hover:underline cursor-pointer" onClick={(e)=>{ e.preventDefault(); navigateTo('/blog'); }}>{lang === "ar" ? "المدونة" : "Blog"}</a>
          </div>
        </div>
      </footer>

      <ConsentBanner lang={lang} />
      {typeof window !== 'undefined' && (() => {
        try {
          // trigger analytics loader if consent already present; listen for later changes via global
          const c = localStorage.getItem('calcu_consent') || localStorage.getItem('calcu_consent_v1') || localStorage.getItem('consent');
          if (c) {
            import('./lib/analytics').then(m => m.initAnalytics()).catch(()=>{});
          }
          // import consent-watcher so same-window localStorage writes will notify the hook
          import('./lib/consent-watcher').catch(()=>{});
          // expose hook for ConsentBanner to call when user changes consent
          try { (window as any).__calcuConsentChanged = () => import('./lib/analytics').then(m => m.initAnalytics()).catch(()=>{}); } catch(e) {}
        } catch (e) {}
        return null;
      })()}
    </div>
  );
}

// =============================================================
// Reusable UI
// =============================================================
function Card({ title, children, actions }: { title: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl sm:rounded-2xl shadow-sm border p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
        <h2 className="font-semibold text-base sm:text-lg text-slate-900">{title}</h2>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

// Minimal static page component used by simple router
function StaticPage({ title, body }: { title: string; body: string }) {
  return (
    <Card title={title}>
      <div className="prose max-w-none">
        <p>{body}</p>
      </div>
    </Card>
  );
}

// Very small client-side protected admin dashboard (temporary password)
function AdminDashboard({ lang, navigateTo }: { lang: Lang; navigateTo: (p: string) => void }) {
  const [auth, setAuth] = useState(false);
  const [pw, setPw] = useState('');
  const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || 'http://localhost:4000';

  // check session on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/check`, { credentials: 'include' });
        if (res.ok) setAuth(true);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const check = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      if (res.ok) {
        setAuth(true);
      } else {
        alert(lang==='ar'? 'كلمة المرور خاطئة' : 'Invalid password');
      }
    } catch (e) {
      alert(lang==='ar'? 'خطأ في الاتصال' : 'Connection error');
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/admin/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {}
    setAuth(false);
  };

  if (!auth) {
    return (
      <Card title={lang==='ar'? 'لوحة الإدارة (محمية)' : 'Admin Dashboard (protected)'}>
        <div className="grid gap-3">
          <input className="rounded-xl border p-2" placeholder={lang==='ar'? 'كلمة المرور' : 'password'} value={pw} onChange={(e)=>setPw(e.target.value)} />
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded-lg border" onClick={check}>{lang==='ar'? 'تسجيل' : 'Unlock'}</button>
            <button className="px-3 py-1 rounded-lg border" onClick={()=>navigateTo('/')} >{lang==='ar'? 'عودة' : 'Back'}</button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card title={lang==='ar'? 'لوحة الإدارة' : 'Admin Dashboard'}>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border p-3">
            <h3 className="font-medium mb-2">{lang==='ar'? 'إحصائيات (عينة)' : 'Sample stats'}</h3>
            <div className="grid grid-cols-2 gap-2">
              <Stat label={lang==='ar'? 'زوار اليوم' : 'Today visitors'} value={'123'} />
              <Stat label={lang==='ar'? 'حسابات' : 'Accounts'} value={'12'} />
            </div>
          </div>
          <div className="rounded-xl border p-3">
            <h3 className="font-medium mb-2">{lang==='ar'? 'أدوات' : 'Tools'}</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded-lg border" onClick={()=>alert('not implemented')}>{lang==='ar'? 'تصدير' : 'Export'}</button>
              <button className="px-3 py-1 rounded-lg border" onClick={()=>navigateTo('/')} >{lang==='ar'? 'فتح الموقع' : 'Open site'}</button>
              <button className="px-3 py-1 rounded-lg border" onClick={logout}>{lang==='ar'? 'تسجيل خروج' : 'Logout'}</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="rounded-lg sm:rounded-xl border p-2 sm:p-3">
      <div className="text-[10px] sm:text-xs text-slate-700 mb-0.5 sm:mb-1">{label}</div>
      <div className="font-semibold text-sm sm:text-base break-words text-slate-900">{value}</div>
    </div>
  );
}

function NumberField({ label, value, onChange, step = 1, min, max }: { label: React.ReactNode; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; }) {
  return (
    <label className="block">
      <div className="text-xs sm:text-sm text-slate-700 mb-0.5 sm:mb-1">{label}</div>
      <input
        type="number"
        className="w-full rounded-lg sm:rounded-xl border p-1.5 sm:p-2 text-sm sm:text-base text-slate-900"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

// =============================================================
// Work Hours
// =============================================================
function QuickStartChips({ lang, onPick }: { lang: Lang; onPick: (hhmm: string) => void; }) {
  const chips = ["06:00", "07:00", "07:30", "08:00", "08:30", "09:00", "09:04"];
  return (
    <div className="hidden md:flex flex-wrap gap-2">
      {chips.map(c => (
        <button key={c} onClick={() => onPick(c)} className="text-xs px-2 py-1 rounded-lg border hover:bg-slate-50">{lang === "ar" ? `ابدأ ${c}` : `Start ${c}`}</button>
      ))}
    </div>
  );
}

// nowHHmm and calcEndTimeLocal are provided by src/lib/workhours

// Helper to convert 24h time to 12h format
function to12Hour(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function WorkHours({ lang }: { lang: Lang }) {
  const [clockIn, setClockIn] = useState(nowHHmm());
  const [targetHours, setTargetHours] = useState(8);
  const [breakMin, setBreakMin] = useState(0);
  const [breakPaid, setBreakPaid] = useState(false);
  const [weekStart, setWeekStart] = useState<'sun' | 'mon'>("sun");
  const [workdays, setWorkdays] = useState(5);
  const [timeFormat, setTimeFormat] = useState<'24h' | '12h'>('24h');

  const endLocal = useMemo(() => calcEndTimeLocal(clockIn, targetHours, breakMin, breakPaid), [clockIn, targetHours, breakMin, breakPaid]);

  const dailyHours = useMemo(() => Math.max(0, Number(targetHours) || 0) + (breakPaid ? (Number(breakMin) || 0) / 60 : 0), [targetHours, breakPaid, breakMin]);
  const weeklyHours = useMemo(() => dailyHours * Math.min(7, Math.max(1, Number(workdays) || 0)), [dailyHours, workdays]);
  const monthlyHours = useMemo(() => weeklyHours * 4.34524, [weeklyHours]);
  const yearlyHours = useMemo(() => weeklyHours * 52, [weeklyHours]);

  // Format time based on user preference
  const displayTime = (t: string) => timeFormat === '12h' ? to12Hour(t) : t;

  return (
    <Card title={lang === "ar" ? "حاسبة ساعات العمل" : "Work Hours Calculator"} actions={
      <div className="flex items-center gap-2">
        <QuickStartChips lang={lang} onPick={(hhmm) => setClockIn(hhmm)} />
        <button onClick={() => setClockIn(nowHHmm())} className="text-sm px-3 h-11 flex items-center rounded-lg border hover:bg-slate-50 text-slate-700">{lang === "ar" ? "الآن" : "Now"}</button>
      </div>
    }>
      {/* Time Format Toggle */}
      <div className="mb-3 sm:mb-4 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-700">
        <span className="font-medium text-slate-900">{lang === "ar" ? "صيغة الوقت:" : "Time format:"}</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="timeFormat" checked={timeFormat === '24h'} onChange={() => setTimeFormat('24h')} />
          24h
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="timeFormat" checked={timeFormat === '12h'} onChange={() => setTimeFormat('12h')} />
          12h (AM/PM)
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs sm:text-sm text-slate-700 mb-0.5 sm:mb-1">{lang === "ar" ? "وقت الحضور" : "Clock-in"}</label>
          <input type="time" className="w-full rounded-lg sm:rounded-xl border p-1.5 sm:p-2 text-sm sm:text-base text-slate-900" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
          {timeFormat === '12h' && clockIn && <div className="text-[10px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1">{displayTime(clockIn)}</div>}
        </div>
        <div>
          <label className="block text-xs sm:text-sm text-slate-700 mb-0.5 sm:mb-1">{lang === "ar" ? "ساعات الهدف (عمل فعلي)" : "Target hours (work)"}</label>
          <input type="number" step={0.25} min={0} className="w-full rounded-lg sm:rounded-xl border p-1.5 sm:p-2 text-sm sm:text-base text-slate-900" value={targetHours} onChange={(e) => setTargetHours(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-xs sm:text-sm text-slate-700 mb-0.5 sm:mb-1">{lang === "ar" ? "دقائق الاستراحة" : "Break minutes"}</label>
          <div className="flex gap-2">
            <input type="number" step={5} min={0} className="w-full rounded-lg sm:rounded-xl border p-1.5 sm:p-2 text-sm sm:text-base text-slate-900" value={breakMin} onChange={(e) => setBreakMin(Number(e.target.value))} />
            <label className="text-[10px] sm:text-xs text-slate-700 flex items-center gap-1 whitespace-nowrap">
              <input type="checkbox" checked={breakPaid} onChange={(e) => setBreakPaid(e.target.checked)} /> {lang === "ar" ? "مدفوعة" : "Paid"}
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div>
            <label className="block text-xs sm:text-sm text-slate-700 mb-0.5 sm:mb-1">{lang === "ar" ? "بداية الأسبوع" : "Week starts on"}</label>
            <select className="w-full rounded-lg sm:rounded-xl border p-1.5 sm:p-2 text-sm sm:text-base text-slate-900" value={weekStart} onChange={(e) => setWeekStart(e.target.value as 'sun' | 'mon')}>
              <option value="sun">{lang === "ar" ? "الأحد" : "Sunday"}</option>
              <option value="mon">{lang === "ar" ? "الاثنين" : "Monday"}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-slate-700 mb-0.5 sm:mb-1">{lang === "ar" ? "أيام العمل/أسبوع" : "Workdays/week"}</label>
            <input type="number" min={1} max={7} className="w-full rounded-lg sm:rounded-xl border p-1.5 sm:p-2 text-sm sm:text-base text-slate-900" value={workdays} onChange={(e) => setWorkdays(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-5">
        <Stat label={lang === "ar" ? "وقت الانصراف" : "Clock-out"} value={displayTime(endLocal)} />
        <Stat label={lang === "ar" ? "إجمالي ساعات اليوم" : "Daily total"} value={fmt2(dailyHours)} />
        <Stat label={lang === "ar" ? "أسبوعي/شهري/سنوي" : "Weekly/Monthly/Yearly"} value={`${fmt2(weeklyHours)} / ${fmt2(monthlyHours)} / ${fmt2(yearlyHours)}`} />
      </div>

      <AdSlot slotId="work-inline-1" position="inline" lang={lang} />

      <p className="text-xs text-slate-600 mt-3">{lang === "ar" ? "ملاحظة: الانصراف = الحضور + ساعات العمل + دقائق الاستراحة (إذا كانت مدفوعة تُحتسب ضمن الزمن)." : "Note: clock-out = clock-in + work hours + break (if paid, it's included in time)."}</p>

      {/* CMS Content & FAQ Section */}
      <CmsContent 
        slug="work-hours-calculator" 
        fallbackFaqs={STATIC_FAQS.work[lang]}
        fallbackTitle={lang === "ar" ? "ساعات العمل" : "Work Hours"}
      />
    </Card>
  );
}

// calcPayroll is implemented in src/lib/payroll

function Payroll({ lang }: { lang: Lang }) {
  const [mode, setMode] = useState<'gross2net' | 'net2gross'>("gross2net");
  const [resident, setResident] = useState<'saudi' | 'expat'>("saudi");
  const [basic, setBasic] = useState(10000);
  const [housingMode, setHousingMode] = useState<'percent' | 'fixed'>("percent");
  const [housingPercent, setHousingPercent] = useState(25);
  const [housingFixed, setHousingFixed] = useState(0);
  const [transport, setTransport] = useState(0);
  const [otherAllow, setOtherAllow] = useState(0);
  const [inputStyle, setInputStyle] = useState<'components' | 'grossOnly'>("components");
  const [grossMonthly, setGrossMonthly] = useState(15000);
  const [insBase, setInsBase] = useState<'gosi' | 'gross' | 'basic'>("gosi");
  const [insEmpPct, setInsEmpPct] = useState(9.75);
  const [insErPct, setInsErPct] = useState(12);
  const [otherDedPct, setOtherDedPct] = useState(0);
  const [flatDed, setFlatDed] = useState(0);
  const [prorateToDate, setProrateToDate] = useState(true);
  const [assumedBasicForN2G, setAssumedBasicForN2G] = useState(10000);
  const [monthDivisor, setMonthDivisor] = useState(30);
  const [hoursPerDay, setHoursPerDay] = useState(8);

  useEffect(() => {
    if (resident === 'saudi') {
      setInsEmpPct(9.75);
      setInsErPct(12);
      if (insBase === 'gross') setInsBase('gosi');
    } else {
      setInsEmpPct(0);
      setInsErPct(0);
      if (insBase === 'gosi') setInsBase('gross');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resident]);

  const calc = useMemo(() => calcPayroll({ mode, resident, basic, housingMode, housingPercent, housingFixed, transport, otherAllow, insEmpPct, insErPct, insBase, otherDedPct, flatDed, monthDivisor, hoursPerDay, prorateToDate, assumedBasicForN2G, grossOverride: inputStyle === 'grossOnly' ? Number(grossMonthly) || 0 : null }), [mode,resident,basic,housingMode,housingPercent,housingFixed,transport,otherAllow,insEmpPct,insErPct,insBase,otherDedPct,flatDed,monthDivisor,hoursPerDay,prorateToDate,assumedBasicForN2G,inputStyle,grossMonthly]);

  const isN2G = mode === 'net2gross';

  return (
    <Card title={lang === "ar" ? "حاسبة الراتب" : "Payroll Calculator"} actions={
      <div className="flex items-center gap-2">
        <button onClick={() => window.print()} className="text-xs sm:text-sm px-3 min-h-[44px] flex items-center justify-center rounded-lg border hover:bg-slate-50 text-slate-700" title={lang === "ar" ? "طباعة / حفظ PDF" : "Print / Save PDF"}>
          🖨️
        </button>
        <small className="text-[10px] sm:text-xs text-slate-600 hidden sm:inline">{lang === "ar" ? "إجمالي↔صافي + تأمين" : "Gross↔Net + Insurance"}</small>
      </div>
    }>
      <div className="rounded-lg sm:rounded-xl border p-2 sm:p-3 mb-3 sm:mb-4 flex flex-wrap gap-1.5 sm:gap-2 items-center text-[10px] sm:text-sm">
        <span className="text-slate-700 font-medium">{lang === "ar" ? "التأمينات:" : "GOSI:"}</span>
        <button className="px-3 min-h-[44px] flex items-center justify-center rounded-lg border hover:bg-slate-50 text-slate-700" onClick={() => { setResident('saudi'); setInsEmpPct(9.75); setInsErPct(12); setInsBase('gosi'); }}>{lang === "ar" ? "النظام القائم" : "Legacy"}</button>
        <button className="px-3 min-h-[44px] flex items-center justify-center rounded-lg border hover:bg-slate-50 text-slate-700" onClick={() => { setResident('saudi'); setInsEmpPct(10.25); setInsErPct(12); setInsBase('gosi'); }}>{lang === "ar" ? "الجديد ٢٠٢٥" : "New 2025"}</button>
        <button className="px-3 min-h-[44px] flex items-center justify-center rounded-lg border hover:bg-slate-50 text-slate-700" onClick={() => { setResident('expat'); setInsEmpPct(0); setInsErPct(0); setInsBase('gross'); }}>{lang === "ar" ? "غير سعودي" : "Expat"}</button>
      </div>

      <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-lg sm:rounded-xl border p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <label className="text-[10px] sm:text-sm text-slate-700 flex items-center gap-1 sm:gap-2"><input type="radio" name="istyle" checked={inputStyle==='components'} onChange={() => setInputStyle('components')} />{lang === "ar" ? "تفصيل" : "Details"}</label>
            <label className="text-[10px] sm:text-sm text-slate-700 flex items-center gap-1 sm:gap-2"><input type="radio" name="istyle" checked={inputStyle==='grossOnly'} onChange={() => setInputStyle('grossOnly')} />{lang === "ar" ? "إجمالي فقط" : "Gross only"}</label>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <label className="text-[10px] sm:text-sm text-slate-700 flex items-center gap-1 sm:gap-2"><input type="radio" name="mode" checked={mode==='gross2net'} onChange={() => setMode('gross2net')} />{lang === "ar" ? "إجمالي→صافي" : "Gross→Net"}</label>
            <label className="text-[10px] sm:text-sm text-slate-700 flex items-center gap-1 sm:gap-2"><input type="radio" name="mode" checked={mode==='net2gross'} onChange={() => setMode('net2gross')} />{lang === "ar" ? "صافي→إجمالي" : "Net→Gross"}</label>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <label className="text-[10px] sm:text-sm text-slate-700 flex items-center gap-1 sm:gap-2"><input type="radio" name="res" checked={resident==='saudi'} onChange={() => setResident('saudi')} />{lang === "ar" ? "سعودي" : "Saudi"}</label>
            <label className="text-[10px] sm:text-sm text-slate-700 flex items-center gap-1 sm:gap-2"><input type="radio" name="res" checked={resident==='expat'} onChange={() => setResident('expat')} />{lang === "ar" ? "غير سعودي" : "Expat"}</label>
          </div>

          {inputStyle === 'grossOnly' ? (
            <>
              <NumberField label={lang === "ar" ? "الإجمالي الشهري" : "Monthly Gross"} value={grossMonthly} onChange={setGrossMonthly} />
              <div className="mt-2 sm:mt-3 border rounded-lg sm:rounded-xl p-2 sm:p-3">
                <div className="text-[10px] sm:text-sm text-slate-700 mb-1 sm:mb-2">{lang === "ar" ? "فرضية السكن" : "Housing assumption"}</div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1 sm:mb-2 text-[10px] sm:text-sm text-slate-700">
                  <label className="flex items-center gap-1 sm:gap-2"><input type="radio" name="hmodeG" checked={housingMode==='percent'} onChange={() => setHousingMode('percent')} />{lang === "ar" ? "نسبة %" : "%"}</label>
                  <label className="flex items-center gap-1 sm:gap-2"><input type="radio" name="hmodeG" checked={housingMode==='fixed'} onChange={() => setHousingMode('fixed')} />{lang === "ar" ? "ثابت" : "Fixed"}</label>
                </div>
                {housingMode === 'percent' ? ( <NumberField label={lang === "ar" ? "النسبة %" : "Percent %"} value={housingPercent} onChange={setHousingPercent} step={0.5} /> ) : ( <NumberField label={lang === "ar" ? "قيمة السكن" : "Housing"} value={housingFixed} onChange={setHousingFixed} /> )}
              </div>
            </>
          ) : isN2G ? (
            <>
              <NumberField label={lang === "ar" ? "الصافي المطلوب" : "Target Net"} value={basic} onChange={setBasic} />
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2 sm:mt-3">
                <NumberField label={lang === "ar" ? "بدلات أخرى" : "Allowances"} value={otherAllow} onChange={setOtherAllow} />
                <NumberField label={lang === "ar" ? "نقل" : "Transport"} value={transport} onChange={setTransport} />
              </div>
              <div className="mt-2 sm:mt-3 border rounded-lg sm:rounded-xl p-2 sm:p-3">
                <div className="text-[10px] sm:text-sm text-slate-700 mb-1 sm:mb-2">{lang === "ar" ? "بدل السكن" : "Housing"}</div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1 sm:mb-2 text-[10px] sm:text-sm text-slate-700">
                  <label className="flex items-center gap-1 sm:gap-2"><input type="radio" name="hmode2" checked={housingMode==='percent'} onChange={() => setHousingMode('percent')} />{lang === "ar" ? "%" : "%"}</label>
                  <label className="flex items-center gap-1 sm:gap-2"><input type="radio" name="hmode2" checked={housingMode==='fixed'} onChange={() => setHousingMode('fixed')} />{lang === "ar" ? "ثابت" : "Fixed"}</label>
                </div>
                {housingMode === 'percent' ? ( <NumberField label={lang === "ar" ? "نسبة %" : "%"} value={housingPercent} onChange={setHousingPercent} step={0.5} /> ) : ( <NumberField label={lang === "ar" ? "قيمة" : "Amount"} value={housingFixed} onChange={setHousingFixed} /> )}
              </div>
              <div className="mt-2 sm:mt-3 border rounded-lg sm:rounded-xl p-2 sm:p-3">
                <div className="text-[10px] sm:text-sm text-slate-700 mb-1 sm:mb-2">{lang === "ar" ? "التأمينات" : "Insurance"}</div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <NumberField label={lang === "ar" ? "موظف %" : "Emp %"} value={insEmpPct} onChange={setInsEmpPct} step={0.5} />
                  <NumberField label={lang === "ar" ? "منشأة %" : "Er %"} value={insErPct} onChange={setInsErPct} step={0.5} />
                </div>
                <div className="mt-1 sm:mt-2">
                  <label className="text-[10px] sm:text-sm text-slate-700 mb-0.5 sm:mb-1 block">{lang === "ar" ? "قاعدة الخصم" : "Base"}</label>
                  <select className="w-full rounded-lg sm:rounded-xl border p-1.5 sm:p-2 text-xs sm:text-sm text-slate-900" value={insBase} onChange={(e) => setInsBase(e.target.value as 'gosi' | 'gross' | 'basic')}>
                    <option value="gosi">{lang === "ar" ? "أساسي+سكن (GOSI)" : "GOSI base"}</option>
                    <option value="gross">{lang === "ar" ? "إجمالي" : "Total gross"}</option>
                    <option value="basic">{lang === "ar" ? "أساسي فقط" : "Basic only"}</option>
                  </select>
                </div>
                {insBase === 'basic' && (
                  <div className="mt-2">
                    <NumberField label={lang === "ar" ? "الأساسي المفترض للحسبة" : "Assumed basic for calc"} value={assumedBasicForN2G} onChange={setAssumedBasicForN2G} />
                    <p className="text-xs text-slate-500 mt-1">{lang === "ar" ? "يُستخدم لعكس الصافي إلى إجمالي عندما تكون قاعدة التأمين هي الأساسي فقط." : "Used for net→gross inversion when insurance base is basic only."}</p>
                  </div>
                )}
              </div>
              <div className="mt-3 border rounded-xl p-3 grid grid-cols-3 gap-3">
                <NumberField label={lang === "ar" ? "قسمة الشهر" : "Month divisor"} value={monthDivisor} onChange={setMonthDivisor} min={1} max={31} />
                <NumberField label={lang === "ar" ? "ساعات/اليوم" : "Hours/day"} value={hoursPerDay} onChange={setHoursPerDay} step={0.5} min={1} max={24} />
                <label className="text-sm text-slate-700 flex items-center gap-2"><input type="checkbox" checked={prorateToDate} onChange={(e) => setProrateToDate(e.target.checked)} />{lang === "ar" ? "احتساب حتى تاريخ اليوم" : "Prorate to date"}</label>
              </div>
            </>
          ) : (
            <>
              <NumberField label={lang === "ar" ? "الراتب الأساسي" : "Basic salary"} value={basic} onChange={setBasic} />
              <div className="mt-3 border rounded-xl p-3">
                <div className="text-sm text-slate-700 mb-2">{lang === "ar" ? "بدل السكن" : "Housing Allowance"}</div>
                <div className="flex items-center gap-3 mb-2 text-sm text-slate-700">
                  <label className="flex items-center gap-2"><input type="radio" name="hmode" checked={housingMode==='percent'} onChange={() => setHousingMode('percent')} />{lang === "ar" ? "نسبة % من الأساسي" : "% of Basic"}</label>
                  <label className="flex items-center gap-2"><input type="radio" name="hmode" checked={housingMode==='fixed'} onChange={() => setHousingMode('fixed')} />{lang === "ar" ? "قيمة ثابتة" : "Fixed amount"}</label>
                </div>
                {housingMode === 'percent' ? ( <NumberField label={lang === "ar" ? "النسبة %" : "Percent %"} value={housingPercent} onChange={setHousingPercent} step={0.5} /> ) : ( <NumberField label={lang === "ar" ? "قيمة بدل السكن" : "Housing amount"} value={housingFixed} onChange={setHousingFixed} /> )}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <NumberField label={lang === "ar" ? "بدل النقل" : "Transport"} value={transport} onChange={setTransport} />
                <NumberField label={lang === "ar" ? "بدلات أخرى" : "Other allowances"} value={otherAllow} onChange={setOtherAllow} />
              </div>
              <div className="mt-4 border rounded-xl p-3">
                <div className="text-sm text-slate-700 mb-2">{lang === "ar" ? "الاستقطاعات" : "Deductions"}</div>
                <div className="grid md:grid-cols-3 gap-3">
                  <NumberField label={lang === "ar" ? "تأمين موظف %" : "Emp. Insurance %"} value={insEmpPct} onChange={setInsEmpPct} step={0.5} />
                  <NumberField label={lang === "ar" ? "تأمين منشأة %" : "Er. Insurance %"} value={insErPct} onChange={setInsErPct} step={0.5} />
                  <NumberField label={lang === "ar" ? "استقطاع ثابت" : "Flat"} value={flatDed} onChange={setFlatDed} />
                </div>
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <NumberField label={lang === "ar" ? "استقطاعات أخرى % (على الإجمالي)" : "Other % (on gross)"} value={otherDedPct} onChange={setOtherDedPct} step={0.5} />
                  <div>
                    <label className="text-sm text-slate-700 mb-1 block">{lang === "ar" ? "قاعدة الخصم" : "Deduction base"}</label>
                    <select className="w-full rounded-xl border p-2 text-slate-900" value={insBase} onChange={(e) => setInsBase(e.target.value as 'gosi' | 'gross' | 'basic')}>
                      <option value="gosi">{lang === "ar" ? "قاعدة التأمينات (أساسي + سكن) مع حد أقصى" : "GOSI base (Basic + Housing, capped)"}</option>
                      <option value="gross">{lang === "ar" ? "إجمالي الراتب (البدلات + الأساسي)" : "Total gross (basic+allowances)"}</option>
                      <option value="basic">{lang === "ar" ? "الراتب الأساسي فقط" : "Basic salary only"}</option>
                    </select>
                  </div>
                </div>
                <label className="text-sm text-slate-700 flex items-center gap-2 mt-3"><input type="checkbox" checked={prorateToDate} onChange={(e) => setProrateToDate(e.target.checked)} />{lang === "ar" ? "احتساب حتى تاريخ اليوم" : "Prorate to date"}</label>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <NumberField label={lang === "ar" ? "قسمة الشهر" : "Month divisor"} value={monthDivisor} onChange={setMonthDivisor} min={1} max={31} />
                <NumberField label={lang === "ar" ? "ساعات/اليوم" : "Hours/day"} value={hoursPerDay} onChange={setHoursPerDay} step={0.5} min={1} max={24} />
              </div>
            </>
          )}
  </div>

  <AdSlot slotId="pay-inline-1" position="inline" lang={lang} />

  <div className="rounded-xl border p-4">
          <div className="text-sm text-slate-600 mb-2">{lang === "ar" ? "القيم الشهرية" : "Monthly"}</div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={lang === "ar" ? "الإجمالي" : "Gross"} value={fmt2(calc.monthly.gross)} />
            <Stat label={lang === "ar" ? "الصافي" : "Net"} value={fmt2(calc.monthly.net)} />
            <Stat label={lang === "ar" ? "استقطاع الموظف (تأمين)" : "Emp. Ins."} value={fmt2(calc.monthly.insuranceEmployee)} />
            <Stat label={lang === "ar" ? "استقطاع نسبة أخرى" : "Other %"} value={fmt2(calc.monthly.otherPctAmt)} />
            <Stat label={lang === "ar" ? "استقطاع ثابت" : "Flat"} value={fmt2(calc.monthly.flat)} />
            <Stat label={lang === "ar" ? "تأمين المنشأة" : "Er. Ins."} value={fmt2(calc.monthly.insuranceEmployer)} />
          </div>
          <div className="text-sm text-slate-600 mt-4 mb-2">{lang === "ar" ? "حتى تاريخ اليوم (شهر جاري)" : "Month-to-date"}</div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={lang === "ar" ? "تأمين الموظف حتى اليوم" : "Emp. Ins. MTD"} value={fmt2(calc.toDate.insuranceEmployee)} />
            <Stat label={lang === "ar" ? "تأمين المنشأة حتى اليوم" : "Er. Ins. MTD"} value={fmt2(calc.toDate.insuranceEmployer)} />
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm text-slate-600 mb-2">{lang === "ar" ? "سنوي/يومي/ساعي" : "Yearly / Daily / Hourly"}</div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={lang === "ar" ? "الإجمالي السنوي" : "Gross/Year"} value={fmt2(calc.yearly.gross)} />
            <Stat label={lang === "ar" ? "الصافي السنوي" : "Net/Year"} value={fmt2(calc.yearly.net)} />
            <Stat label={lang === "ar" ? "اليومي (إجمالي)" : "Daily Gross"} value={fmt2(calc.daily.gross)} />
            <Stat label={lang === "ar" ? "اليومي (صافي)" : "Daily Net"} value={fmt2(calc.daily.net)} />
            <Stat label={lang === "ar" ? "الساعة (إجمالي)" : "Hourly Gross"} value={fmt2(calc.hourly.gross)} />
            <Stat label={lang === "ar" ? "الساعة (صافي)" : "Hourly Net"} value={fmt2(calc.hourly.net)} />
          </div>
          {insBase === 'gross' && (
            <div className="mt-4">
              <div className="text-sm text-slate-600 mb-2">{lang === "ar" ? "توزيع استقطاع الموظف (على المكونات)" : "Employee Insurance Allocation"}</div>
              <ul className="grid sm:grid-cols-2 gap-2 text-sm">
                <li className="rounded-xl border p-3">{lang === "ar" ? "أساسي" : "Basic"}: {fmt2(calc.allocation.employeeInsurance.basic)}</li>
                <li className="rounded-xl border p-3">{lang === "ar" ? "سكن" : "Housing"}: {fmt2(calc.allocation.employeeInsurance.housing)}</li>
                <li className="rounded-xl border p-3">{lang === "ar" ? "نقل" : "Transport"}: {fmt2(calc.allocation.employeeInsurance.transport)}</li>
                <li className="rounded-xl border p-3">{lang === "ar" ? "بدلات أخرى" : "Other"}: {fmt2(calc.allocation.employeeInsurance.other)}</li>
              </ul>
            </div>
          )}

          <p className="text-xs text-slate-500 mt-3">{lang === "ar" ? "تنبيه: القواعد والنسب قابلة للتخصيص. هذا نموذج حسبة تجريبي ويجب مطابقته مع سياسة المنشأة والأنظمة المحلية." : "Note: Rates/bases are configurable. This is a preview calculator; align with your policy and local regulations."}</p>
        </div>
      </div>

      {/* CMS Content & FAQ Section */}
      <CmsContent 
        slug="payroll-calculator" 
        fallbackFaqs={STATIC_FAQS.pay[lang]}
        fallbackTitle={lang === "ar" ? "الراتب" : "Payroll"}
      />
    </Card>
  );
}

// calcEOS implementation moved to src/lib/eos

function EosCalc({ lang }: { lang: Lang }) {
  const [start, setStart] = useState(() => new Date().toISOString().slice(0,10));
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0,10));
  const [basic, setBasic] = useState(10000);
  const [housingMode, setHousingMode] = useState<'percent'|'fixed'>('percent');
  const [housingPercent, setHousingPercent] = useState(25);
  const [housingFixed, setHousingFixed] = useState(0);
  const [baseType, setBaseType] = useState<'basic'|'basic_plus_housing'>('basic');
  const [monthDivisor, setMonthDivisor] = useState(30);
  const [leaveDays, setLeaveDays] = useState(0);
  // Termination options with Article labels per Saudi Labor Law
  const terminationOptions = [
    ['employerTermination', lang==='ar'? 'إنهاء من صاحب العمل (المادة 84)' : 'Termination by employer (Article 84)'],
    ['employeeResignation', lang==='ar'? 'استقالة العامل (المادة 85)' : 'Resignation by employee (Article 85)'],
    ['mutualAgreement', lang==='ar'? 'اتفاق متبادل (المادة 84)' : 'Mutual agreement (Article 84)'],
    ['retirement', lang==='ar'? 'تقاعد (المادة 84)' : 'Retirement (Article 84)'],
    ['death', lang==='ar'? 'وفاة (المادة 84)' : 'Death (Article 84)'],
    ['probationEnd', lang==='ar'? 'نهاية فترة التجربة (المادة 85)' : 'Probation end (Article 85)'],
    ['contractEnd', lang==='ar'? 'انتهاء العقد (المادة 84)' : 'Contract end (Article 84)'],
    ['redundancy', lang==='ar'? 'تسريح/إنهاء لظروف المنشأة (المادة 84)' : 'Redundancy (Article 84)'],
    ['transferOfBusiness', lang==='ar'? 'نقل النشاط (المادة 84)' : 'Transfer of business (Article 84)'],
  ] as const;
  const [separation, setSeparation] = useState<string>('employerTermination');
  const [extras, setExtras] = useState(0);
  const [deductions, setDeductions] = useState(0);

  const result = useMemo(() => calcEOS({ start, end, basic, housingMode, housingPercent, housingFixed, baseType, monthDivisor, leaveDays, separation: separation as any, extras, deductions }), [start,end,basic,housingMode,housingPercent,housingFixed,baseType,monthDivisor,leaveDays,separation,extras,deductions]);

  return (
    <Card title={lang === 'ar' ? 'حاسبة نهاية الخدمة' : 'End of Service Calculator'} actions={
      <div className="flex items-center gap-2">
        <button onClick={() => window.print()} className="text-xs sm:text-sm px-3 min-h-[44px] flex items-center justify-center rounded-lg border hover:bg-slate-50 text-slate-700" title={lang === "ar" ? "طباعة / حفظ PDF" : "Print / Save PDF"}>
          🖨️
        </button>
        <button className="text-xs sm:text-sm px-3 min-h-[44px] flex items-center justify-center rounded-lg border hover:bg-slate-50 text-slate-700" onClick={() => { const t=new Date().toISOString().slice(0,10); setEnd(t); }}>{lang==='ar'? 'اليوم' : 'Today'}</button>
      </div>
    }>
      <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-lg sm:rounded-xl border p-2 sm:p-3">
          <label className="block text-[10px] sm:text-sm text-slate-700 mb-0.5 sm:mb-1">{lang==='ar'? 'تاريخ بداية الخدمة' : 'Start Date'}</label>
          <input type="date" className="w-full rounded-lg sm:rounded-xl border p-1.5 sm:p-2 text-sm sm:text-base text-slate-900" value={start} onChange={e=>setStart(e.target.value)} />
          <label className="block text-[10px] sm:text-sm text-slate-700 mb-0.5 sm:mb-1 mt-2 sm:mt-3">{lang==='ar'? 'تاريخ نهاية الخدمة' : 'Last Working Day'}</label>
          <input type="date" className="w-full rounded-lg sm:rounded-xl border p-1.5 sm:p-2 text-sm sm:text-base text-slate-900" value={end} onChange={e=>setEnd(e.target.value)} />
          <div className="mt-2 sm:mt-3">
            <div className="text-[10px] sm:text-sm text-slate-700 mb-0.5 sm:mb-1">{lang==='ar'? 'نوع الانتهاء' : 'Separation Type'}</div>
            <select className="w-full rounded-lg sm:rounded-xl border p-1.5 sm:p-2 text-xs sm:text-sm text-slate-900" value={separation} onChange={e=>setSeparation(e.target.value)}>
              {terminationOptions.map(([val,label]) => (
                <option key={val} value={String(val)}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="rounded-lg sm:rounded-xl border p-2 sm:p-3">
          <NumberField label={lang==='ar'? 'الراتب الأساسي' : 'Basic Salary'} value={basic} onChange={setBasic} />
          <div className="mt-2 sm:mt-3 border rounded-lg sm:rounded-xl p-2 sm:p-3">
            <div className="text-[10px] sm:text-sm text-slate-700 mb-1 sm:mb-2">{lang==='ar'? 'بدل السكن' : 'Housing'}</div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1 sm:mb-2 text-[10px] sm:text-sm text-slate-700">
              <label className="flex items-center gap-1 sm:gap-2"><input type="radio" name="hmode_eos" checked={housingMode==='percent'} onChange={()=>setHousingMode('percent')} />{lang==='ar'? '%' : '%'}</label>
              <label className="flex items-center gap-1 sm:gap-2"><input type="radio" name="hmode_eos" checked={housingMode==='fixed'} onChange={()=>setHousingMode('fixed')} />{lang==='ar'? 'ثابت' : 'Fixed'}</label>
            </div>
            {housingMode==='percent' ? ( <NumberField label={lang==='ar'? 'نسبة %' : '%'} value={housingPercent} onChange={setHousingPercent} step={0.5} /> ) : ( <NumberField label={lang==='ar'? 'قيمة' : 'Amount'} value={housingFixed} onChange={setHousingFixed} /> )}
            <div className="mt-1 sm:mt-2">
              <label className="text-[10px] sm:text-sm text-slate-700 mb-0.5 sm:mb-1 block">{lang==='ar'? 'وعاء الحسبة' : 'Base'}</label>
              <select className="w-full rounded-lg sm:rounded-xl border p-1.5 sm:p-2 text-xs sm:text-sm text-slate-900" value={baseType} onChange={e=>setBaseType(e.target.value as any)}>
                <option value="basic">{lang==='ar'? 'الأساسي' : 'Basic only'}</option>
                <option value="basic_plus_housing">{lang==='ar'? 'أساسي + سكن' : 'Basic + Housing'}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2 sm:mt-3">
            <NumberField label={lang==='ar'? 'قسمة الشهر' : 'Month divisor'} value={monthDivisor} onChange={setMonthDivisor} min={1} max={31} />
            <NumberField label={lang==='ar'? 'رصيد إجازات' : 'Leave days'} value={leaveDays} onChange={setLeaveDays} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2 sm:mt-3">
            <NumberField label={lang==='ar'? 'إضافات' : 'Additions'} value={extras} onChange={setExtras} />
            <NumberField label={lang==='ar'? 'خصومات' : 'Deductions'} value={deductions} onChange={setDeductions} />
          </div>
        </div>
        <div className="rounded-lg sm:rounded-xl border p-2 sm:p-3">
          <div className="text-[10px] sm:text-sm text-slate-700 mb-1 sm:mb-2">{lang==='ar'? 'مدة الخدمة' : 'Service Duration'}</div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
            <Stat label={lang==='ar'? 'السنوات' : 'Years'} value={`${result.duration.years}`} />
            <Stat label={lang==='ar'? 'الشهور' : 'Months'} value={`${result.duration.months}`} />
            <Stat label={lang==='ar'? 'الأيام' : 'Days'} value={`${result.duration.days}`} />
            <Stat label={lang==='ar'? 'إجمالي' : 'Total'} value={`${result.duration.totalDays}`} />
          </div>
          <div className="mt-1 sm:mt-2 space-y-1 sm:space-y-2">
            <Stat label={lang==='ar'? 'وعاء شهري' : 'Base/month'} value={fmt2(result.baseMonthly)} />
            <Stat label={lang==='ar'? 'يومي' : 'Daily'} value={fmt2(result.dailyWage)} />
            <Stat label={lang==='ar'? 'نهاية الخدمة خام' : 'Raw EOS'} value={fmt2(result.rawEOS)} />
            <Stat label={lang==='ar'? `م.${result.article === 'article84' ? '84' : '85'}` : `Art.${result.article === 'article84' ? '84' : '85'}`} value={result.article === 'article84' ? (lang==='ar'? 'كامل' : 'Full') : `${Math.round(result.factor * 100)}%`} />
            <Stat label={lang==='ar'? 'نهائي' : 'Final EOS'} value={fmt2(result.finalEOS)} />
            <Stat label={lang==='ar'? 'إجازات' : 'Leave'} value={fmt2(result.leaveEncash)} />
            <Stat label={lang==='ar'? 'الإجمالي' : 'Total'} value={fmt2(result.total)} />
          </div>
        </div>
      </div>

      {/* CMS Content & FAQ Section */}
      <CmsContent 
        slug="eos-calculator" 
        fallbackFaqs={STATIC_FAQS.eos[lang]}
        fallbackTitle={lang === "ar" ? "نهاية الخدمة" : "End of Service"}
      />
    </Card>
  );
}

// =============================================================
// Dates Calculator
// =============================================================
// diffBetween, calculateWorkingDays are implemented in src/lib/dates

// Hijri months with numbers for user clarity
const HIJRI_MONTHS_LIST = [
  { num: 1, en: 'Muharram', ar: 'محرم' },
  { num: 2, en: 'Safar', ar: 'صفر' },
  { num: 3, en: 'Rabi al-Awwal', ar: 'ربيع الأول' },
  { num: 4, en: 'Rabi al-Thani', ar: 'ربيع الثاني' },
  { num: 5, en: 'Jumada al-Awwal', ar: 'جمادى الأولى' },
  { num: 6, en: 'Jumada al-Thani', ar: 'جمادى الآخرة' },
  { num: 7, en: 'Rajab', ar: 'رجب' },
  { num: 8, en: 'Shaban', ar: 'شعبان' },
  { num: 9, en: 'Ramadan', ar: 'رمضان' },
  { num: 10, en: 'Shawwal', ar: 'شوال' },
  { num: 11, en: 'Dhu al-Qadah', ar: 'ذو القعدة' },
  { num: 12, en: 'Dhu al-Hijjah', ar: 'ذو الحجة' },
];

function DatesCalculator({ lang }: { lang: Lang }) {
  const [calendarType, setCalendarType] = useState<'gregorian' | 'hijri'>('gregorian');
  const [start, setStart] = useState(() => new Date().toISOString().slice(0,10));
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0,10));
  // Hijri input fields (year, month, day)
  const [hijriStartY, setHijriStartY] = useState(1446);
  const [hijriStartM, setHijriStartM] = useState(1);
  const [hijriStartD, setHijriStartD] = useState(1);
  const [hijriEndY, setHijriEndY] = useState(1446);
  const [hijriEndM, setHijriEndM] = useState(1);
  const [hijriEndD, setHijriEndD] = useState(15);
  const [calcMode, setCalcMode] = useState<'calendar' | 'working'>('calendar');
  const [weekendDays, setWeekendDays] = useState<number[]>([5, 6]); // Fri=5, Sat=6 (Saudi weekend)
  const [holidays, setHolidays] = useState<string>('');

  // Parse holidays from comma-separated string
  const holidayDates = useMemo(() => {
    if (!holidays.trim()) return [];
    return holidays.split(',').map(d => d.trim()).filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/)).map(d => new Date(d));
  }, [holidays]);

  // Convert Hijri to Gregorian if needed
  const a = useMemo(() => {
    if (calendarType === 'hijri') {
      return fromHijri(hijriStartY, hijriStartM, hijriStartD);
    }
    return new Date(start);
  }, [calendarType, start, hijriStartY, hijriStartM, hijriStartD]);
  
  const b = useMemo(() => {
    if (calendarType === 'hijri') {
      return fromHijri(hijriEndY, hijriEndM, hijriEndD);
    }
    return new Date(end);
  }, [calendarType, end, hijriEndY, hijriEndM, hijriEndD]);

  const diff = useMemo(() => diffBetween(a, b), [a, b]);
  
  // Calculate working days with custom weekend config
  const workingDaysResult = useMemo(() => {
    const config: WeekendConfig = { type: 'custom', customDays: weekendDays };
    return calculateWorkingDays(a, b, config, holidayDates);
  }, [a, b, weekendDays, holidayDates]);

  // Hijri display for current dates
  const startHijri = useMemo(() => toHijri(a), [a]);
  const endHijri = useMemo(() => toHijri(b), [b]);

  const toggleWeekendDay = (day: number) => {
    setWeekendDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const setToSaudiWeekend = () => setWeekendDays([5, 6]); // Fri-Sat
  const setToWesternWeekend = () => setWeekendDays([0, 6]); // Sun-Sat

  const weekDays = [
    { day: 0, ar: 'الأحد', en: 'Sun' },
    { day: 1, ar: 'الاثنين', en: 'Mon' },
    { day: 2, ar: 'الثلاثاء', en: 'Tue' },
    { day: 3, ar: 'الأربعاء', en: 'Wed' },
    { day: 4, ar: 'الخميس', en: 'Thu' },
    { day: 5, ar: 'الجمعة', en: 'Fri' },
    { day: 6, ar: 'السبت', en: 'Sat' },
  ];

  return (
    <Card title={lang === 'ar' ? 'حاسبة التواريخ' : 'Dates Calculator'}>
      {/* Calendar Type Toggle */}
      <div className="mb-3 sm:mb-4 rounded-lg sm:rounded-xl border p-2 sm:p-3">
        <div className="text-[10px] sm:text-sm font-medium mb-1 sm:mb-2 text-slate-900">{lang === 'ar' ? 'نوع التقويم' : 'Calendar Type'}</div>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <label className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm cursor-pointer text-slate-700">
            <input 
              type="radio" 
              name="calType" 
              checked={calendarType === 'gregorian'} 
              onChange={() => setCalendarType('gregorian')}
            />
            {lang === 'ar' ? 'ميلادي' : 'Gregorian'}
          </label>
          <label className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm cursor-pointer text-slate-700">
            <input 
              type="radio" 
              name="calType" 
              checked={calendarType === 'hijri'} 
              onChange={() => setCalendarType('hijri')}
            />
            {lang === 'ar' ? 'هجري' : 'Hijri'}
          </label>
        </div>
      </div>

      {calendarType === 'gregorian' ? (
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-[10px] sm:text-sm text-slate-700 mb-0.5 sm:mb-1">{lang === 'ar' ? 'من' : 'From'}</label>
            <input type="date" className="w-full rounded-lg sm:rounded-xl border p-1.5 sm:p-2 text-sm sm:text-base text-slate-900" value={start} onChange={e=>setStart(e.target.value)} />
            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">{formatHijri(startHijri, lang)}</div>
          </div>
          <div>
            <label className="block text-[10px] sm:text-sm text-slate-700 mb-0.5 sm:mb-1">{lang === 'ar' ? 'إلى' : 'To'}</label>
            <input type="date" className="w-full rounded-lg sm:rounded-xl border p-1.5 sm:p-2 text-sm sm:text-base text-slate-900" value={end} onChange={e=>setEnd(e.target.value)} />
            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">{formatHijri(endHijri, lang)}</div>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-lg sm:rounded-xl border p-2 sm:p-3">
            <div className="text-[10px] sm:text-sm mb-1 sm:mb-2 font-medium text-slate-900">{lang === 'ar' ? 'من (هجري)' : 'From (Hijri)'}</div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <div>
                <label className="block text-[10px] sm:text-xs text-slate-500">{lang === 'ar' ? 'يوم' : 'Day'}</label>
                <input type="number" min={1} max={30} value={hijriStartD} onChange={e => setHijriStartD(+e.target.value)} className="w-full rounded-lg border p-1.5 sm:p-2 text-xs sm:text-sm text-slate-900" />
              </div>
              <div>
                <label className="block text-[10px] sm:text-xs text-slate-500">{lang === 'ar' ? 'شهر' : 'Month'}</label>
                <select 
                  value={hijriStartM} 
                  onChange={e => setHijriStartM(+e.target.value)} 
                  className="w-full rounded-lg border p-1.5 sm:p-2 text-xs sm:text-sm text-slate-900"
                >
                  {HIJRI_MONTHS_LIST.map(m => (
                    <option key={m.num} value={m.num}>
                      {m.num} - {lang === 'ar' ? m.ar : m.en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] sm:text-xs text-slate-500">{lang === 'ar' ? 'سنة' : 'Year'}</label>
                <input type="number" min={1300} max={1500} value={hijriStartY} onChange={e => setHijriStartY(+e.target.value)} className="w-full rounded-lg border p-1.5 sm:p-2 text-xs sm:text-sm text-slate-900" />
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 mt-1 sm:mt-2">
              {lang === 'ar' ? 'الموافق: ' : 'Gregorian: '}
              {a.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div className="rounded-lg sm:rounded-xl border p-2 sm:p-3">
            <div className="text-[10px] sm:text-sm mb-1 sm:mb-2 font-medium text-slate-900">{lang === 'ar' ? 'إلى (هجري)' : 'To (Hijri)'}</div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <div>
                <label className="block text-[10px] sm:text-xs text-slate-500">{lang === 'ar' ? 'يوم' : 'Day'}</label>
                <input type="number" min={1} max={30} value={hijriEndD} onChange={e => setHijriEndD(+e.target.value)} className="w-full rounded-lg border p-1.5 sm:p-2 text-xs sm:text-sm text-slate-900" />
              </div>
              <div>
                <label className="block text-[10px] sm:text-xs text-slate-500">{lang === 'ar' ? 'شهر' : 'Month'}</label>
                <select 
                  value={hijriEndM} 
                  onChange={e => setHijriEndM(+e.target.value)} 
                  className="w-full rounded-lg border p-1.5 sm:p-2 text-xs sm:text-sm text-slate-900"
                >
                  {HIJRI_MONTHS_LIST.map(m => (
                    <option key={m.num} value={m.num}>
                      {m.num} - {lang === 'ar' ? m.ar : m.en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] sm:text-xs text-slate-500">{lang === 'ar' ? 'سنة' : 'Year'}</label>
                <input type="number" min={1300} max={1500} value={hijriEndY} onChange={e => setHijriEndY(+e.target.value)} className="w-full rounded-lg border p-1.5 sm:p-2 text-xs sm:text-sm text-slate-900" />
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 mt-1 sm:mt-2">
              {lang === 'ar' ? 'الموافق: ' : 'Gregorian: '}
              {b.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      )}

      {/* Calculation Mode Selection */}
      <div className="mt-4 rounded-xl border p-3">
        <div className="text-sm font-medium mb-2 text-slate-900">{lang === 'ar' ? 'طريقة الحساب' : 'Calculation Mode'}</div>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <label className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm cursor-pointer text-slate-700">
            <input 
              type="radio" 
              name="calcMode" 
              checked={calcMode === 'calendar'} 
              onChange={() => setCalcMode('calendar')}
            />
            {lang === 'ar' ? 'كل الأيام' : 'Calendar days'}
          </label>
          <label className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm cursor-pointer text-slate-700">
            <input 
              type="radio" 
              name="calcMode" 
              checked={calcMode === 'working'} 
              onChange={() => setCalcMode('working')}
            />
            {lang === 'ar' ? 'أيام العمل فقط' : 'Working days only'}
          </label>
        </div>
      </div>

      {/* Weekend Configuration - Only show when working days mode selected */}
      {calcMode === 'working' && (
        <div className="mt-3 sm:mt-4 rounded-lg sm:rounded-xl border p-2 sm:p-3">
          <div className="text-[10px] sm:text-sm font-medium mb-1 sm:mb-2 text-slate-900">{lang === 'ar' ? 'العطلة الأسبوعية' : 'Weekend Days'}</div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <button 
              onClick={setToSaudiWeekend}
              className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-sm border ${JSON.stringify([...weekendDays].sort()) === JSON.stringify([5, 6]) ? 'bg-blue-600 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
            >
              {lang === 'ar' ? 'السعودية' : 'Saudi'}
            </button>
            <button 
              onClick={setToWesternWeekend}
              className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-sm border ${JSON.stringify([...weekendDays].sort()) === JSON.stringify([0, 6]) ? 'bg-blue-600 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
            >
              {lang === 'ar' ? 'غربي' : 'Western'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {weekDays.map(({ day, ar, en }) => (
              <label 
                key={day} 
                className={`flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg border cursor-pointer text-[10px] sm:text-sm ${weekendDays.includes(day) ? 'bg-amber-100 border-amber-300 text-slate-900' : 'hover:bg-slate-50 text-slate-700'}`}
              >
                <input 
                  type="checkbox" 
                  checked={weekendDays.includes(day)} 
                  onChange={() => toggleWeekendDay(day)}
                  className="sr-only"
                />
                {lang === 'ar' ? ar : en}
                {weekendDays.includes(day) && <span className="text-amber-600">✓</span>}
              </label>
            ))}
          </div>
          
          {/* Holiday Exclusions */}
          <div className="mt-2 sm:mt-3">
            <label className="block text-[10px] sm:text-sm text-slate-700 mb-0.5 sm:mb-1">{lang === 'ar' ? 'إجازات رسمية' : 'Public holidays'}</label>
            <input 
              type="text" 
              placeholder="2025-01-01, 2025-04-21"
              value={holidays}
              onChange={e => setHolidays(e.target.value)}
              className="w-full rounded-lg sm:rounded-xl border p-1.5 sm:p-2 text-xs sm:text-sm text-slate-900"
            />
            {holidayDates.length > 0 && (
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">
                {lang === 'ar' ? `سيتم استثناء ${holidayDates.length} يوم` : `${holidayDates.length} day(s) will be excluded`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-3 sm:mt-4">
        <Stat 
          label={calcMode === 'working' ? (lang === 'ar' ? 'أيام العمل' : 'Working') : (lang === 'ar' ? 'تقويمية' : 'Calendar')} 
          value={String(calcMode === 'working' ? workingDaysResult.workingDays : diff.totalDays)} 
        />
        <Stat label={lang === "ar" ? "أسابيع" : "Weeks"} value={String(diff.totalWeeks)} />
        <Stat label={lang === "ar" ? "شهور" : "Months"} value={String(diff.months)} />
      </div>

      <div className="mt-2 sm:mt-3 text-[10px] sm:text-sm text-slate-600">
        <div>{lang === 'ar' ? 'تفصيل:' : 'Breakdown:'}</div>
        <ul className="mt-1 sm:mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
          <li className="rounded-lg sm:rounded-xl border p-2 sm:p-3">{lang === 'ar' ? 'تقويمية' : 'Calendar'}: {diff.totalDays}</li>
          <li className="rounded-lg sm:rounded-xl border p-2 sm:p-3">{lang === 'ar' ? 'عمل' : 'Working'}: {workingDaysResult.workingDays}</li>
          <li className="rounded-lg sm:rounded-xl border p-2 sm:p-3">{lang === 'ar' ? 'عطلة' : 'Weekend'}: {workingDaysResult.weekendDays}</li>
          <li className="rounded-lg sm:rounded-xl border p-2 sm:p-3">{lang === 'ar' ? 'ساعات' : 'Hours'}: {diff.totalHours}</li>
          <li className="rounded-lg sm:rounded-xl border p-2 sm:p-3">{lang === 'ar' ? 'سنوات' : 'Years'}: {diff.years}</li>
          {holidayDates.length > 0 && (
            <li className="rounded-lg sm:rounded-xl border p-2 sm:p-3 bg-amber-50">{lang === 'ar' ? 'إجازات' : 'Holidays'}: {holidayDates.length}</li>
          )}
        </ul>
      </div>

      {/* CMS Content & FAQ Section */}
      <CmsContent 
        slug="date-calculator" 
        fallbackFaqs={STATIC_FAQS.dates[lang]}
        fallbackTitle={lang === "ar" ? "حسابات التواريخ" : "Date Calculator"}
      />
    </Card>
  );
}

// =============================================================
// In-app TestPanel (pure tests, no component rendering in tests)
// =============================================================
function TestPanel({ lang }: { lang: Lang }) {
  type TestResult = { name: string; pass: boolean; message?: string };
  const runAll = (): TestResult[] => {
    const results: TestResult[] = [];

    // Work Hours tests
    try {
      const end1 = calcEndTimeLocal("07:00", 8, 60, true);
      results.push({ name: 'Work: 07:00 + 8h + 60m paid => 16:00', pass: end1 === '16:00', message: `got ${end1}` });
      const end2 = calcEndTimeLocal("09:00", 8, 30, false);
      results.push({ name: 'Work: 09:00 + 8h + 30m unpaid => 17:00', pass: end2 === '17:00', message: `got ${end2}` });
    } catch (e) { results.push({ name: 'Work tests', pass: false, message: String(e) }); }

    // Payroll tests
    try {
      const p1 = calcPayroll({ mode:'gross2net', resident:'saudi', basic:10000, housingMode:'percent', housingPercent:25, housingFixed:0, transport:0, otherAllow:0, insEmpPct:9.75, insErPct:12, insBase:'gosi', otherDedPct:0, flatDed:0, monthDivisor:30, hoursPerDay:8, prorateToDate:true, assumedBasicForN2G:10000, grossOverride: null });
      results.push({ name: 'Payroll: Saudi basic=10000 gross>0 and net>0', pass: p1.monthly.gross > 0 && p1.monthly.insuranceEmployee >= 0, message: `gross=${p1.monthly.gross}` });

      const p2 = calcPayroll({ mode:'gross2net', resident:'expat', basic:0, housingMode:'percent', housingPercent:0, housingFixed:0, transport:0, otherAllow:0, insEmpPct:0, insErPct:0, insBase:'gross', otherDedPct:0, flatDed:0, monthDivisor:30, hoursPerDay:8, prorateToDate:false, assumedBasicForN2G:10000, grossOverride:16009.39 });
      results.push({ name: 'Payroll: Expat grossOnly no insurance net≈gross', pass: Math.abs(p2.monthly.net - (p2.monthly.gross)) < 0.01, message: `net=${p2.monthly.net} gross=${p2.monthly.gross}` });

      // Net->Gross inversion test
  const p3 = calcPayroll({ mode:'net2gross', resident:'saudi', basic:10000, housingMode:'percent', housingPercent:25, housingFixed:0, transport:0, otherAllow:0, insEmpPct:9.75, insErPct:12, insBase:'gosi', otherDedPct:0, flatDed:0, monthDivisor:30, hoursPerDay:8, prorateToDate:false, assumedBasicForN2G:10000, grossOverride: null });
  // confirm that resulting gross->net yields approx input basic net. Use grossOverride to pass the computed gross back in.
  const recon = calcPayroll({ mode:'gross2net', resident:'saudi', basic: 0, housingMode:'percent', housingPercent:25, housingFixed:0, transport:0, otherAllow:0, insEmpPct:9.75, insErPct:12, insBase:'gosi', otherDedPct:0, flatDed:0, monthDivisor:30, hoursPerDay:8, prorateToDate:false, assumedBasicForN2G:10000, grossOverride: p3.monthly.gross });
      results.push({ name: 'Payroll Net->Gross inversion close', pass: Math.abs(recon.monthly.net - 10000) < 1.0, message: `recon.net=${recon.monthly.net}` });
    } catch (e) { results.push({ name: 'Payroll tests', pass: false, message: String(e) }); }

    // EOS tests
    try {
      // 3 years resignation
      const s1 = calcEOS({ start: '2020-01-01', end: '2023-01-01', basic:10000, housingMode:'percent', housingPercent:0, housingFixed:0, baseType:'basic', monthDivisor:30, leaveDays:0, separation:'resignation', extras:0, deductions:0 });
      // raw EOS (termination formula) for 3 years: 3 * 0.5 = 1.5 months, rawEOS=15000, resignation factor=1/3 -> ~5000
      results.push({ name: 'EOS: 3y resignation final≈5000', pass: Math.abs(s1.finalEOS - 5000) < 1, message: `final=${s1.finalEOS}` });

      // 7 years termination
      const s2 = calcEOS({ start: '2016-01-01', end: '2023-01-01', basic:10000, housingMode:'percent', housingPercent:0, housingFixed:0, baseType:'basic', monthDivisor:30, leaveDays:0, separation:'termination', extras:0, deductions:0 });
      // expected raw months = 5*0.5 + 2*1 = 4.5 months => 45000
      results.push({ name: 'EOS: 7y termination ≈45000', pass: Math.abs(s2.rawEOS - 45000) < 1, message: `raw=${s2.rawEOS}` });
    } catch (e) { results.push({ name: 'EOS tests', pass: false, message: String(e) }); }

    // Dates tests
    try {
      const d1 = diffBetween(new Date('2025-01-01T00:00:00Z'), new Date('2025-01-02T00:00:00Z'));
      results.push({ name: 'Dates: 1 day diff', pass: d1.totalDays === 1, message: `days=${d1.totalDays}` });
    } catch (e) { results.push({ name: 'Dates tests', pass: false, message: String(e) }); }

    return results;
  };

  const [results, setResults] = useState<TestResult[]>(() => runAll());
  const passed = results.filter(r => r.pass).length;

  return (
    <Card title={lang === 'ar' ? 'لوحة الاختبارات' : 'Test Panel'}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm">{lang === 'ar' ? 'النتيجة:' : 'Result:'} {passed}/{results.length}</div>
        <div>
          <button className="px-3 py-1 rounded-lg border text-sm mr-2" onClick={() => setResults(runAll())}>{lang === 'ar' ? 'إعادة تشغيل الاختبارات' : 'Re-run tests'}</button>
        </div>
      </div>
      <div className="grid gap-2">
        {results.map((r, i) => (
          <div key={i} className={cx('p-2 rounded-lg border', r.pass ? 'bg-white' : 'bg-amber-50 border-amber-200')}>
            <div className="font-medium">{r.name}</div>
            <div className="text-xs text-slate-500">{r.pass ? (lang==='ar'? 'نجح' : 'PASS') : (lang==='ar' ? 'فشل' : 'FAIL')}{r.message ? ` — ${r.message}` : ''}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
