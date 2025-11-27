// Database seed script - Initialize with default data
// Run with: npx tsx scripts/seed-database.ts

import 'dotenv/config';
import bcrypt from 'bcryptjs';

// Dynamic import for Prisma client
async function getPrismaClient() {
  const mod = await import('../src/generated/prisma/client.js');
  return new mod.PrismaClient();
}

async function main() {
  const prisma = await getPrismaClient();
  
  console.log('🌱 Seeding database...');

  // ============================================
  // Create Super Admin User
  // ============================================
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@calcuhub.com';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'ChangeThisPassword123!';

  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'مدير النظام',
        hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    console.log(`✅ Super Admin created: ${adminEmail}`);
  } else {
    console.log('ℹ️  Super Admin already exists');
  }

  // ============================================
  // Create Default Ad Slots
  // ============================================
  const adSlots = [
    { name: 'HEADER_BANNER', pagePathPattern: '*', positionKey: 'HEADER', eCPM: 2.5, cpc: 0.15 },
    { name: 'CALCULATOR_TOP', pagePathPattern: '/calculator/*', positionKey: 'INLINE_TOP', eCPM: 3.0, cpc: 0.20 },
    { name: 'CALCULATOR_BOTTOM', pagePathPattern: '/calculator/*', positionKey: 'INLINE_BOTTOM', eCPM: 2.0, cpc: 0.12 },
    { name: 'SIDEBAR', pagePathPattern: '*', positionKey: 'SIDEBAR', eCPM: 1.5, cpc: 0.10 },
    { name: 'BLOG_INLINE', pagePathPattern: '/blog/*', positionKey: 'INLINE', eCPM: 2.5, cpc: 0.18 },
    { name: 'FOOTER_BANNER', pagePathPattern: '*', positionKey: 'FOOTER', eCPM: 1.0, cpc: 0.08 },
  ];

  for (const slot of adSlots) {
    await prisma.adSlot.upsert({
      where: { name: slot.name },
      update: {},
      create: slot,
    });
  }
  console.log('✅ Ad slots created');

  // ============================================
  // Create Default SEO Configs
  // ============================================
  const seoConfigs = [
    {
      pageKey: 'home',
      locale: 'ar',
      title: 'حاسبات العمل والرواتب في السعودية | Calcu-Hub',
      description: 'أدوات حساب الراتب، ساعات العمل، نهاية الخدمة، والتواريخ للموظفين في السعودية. حاسبة الراتب الصافي، حساب مكافأة نهاية الخدمة، وحساب ساعات العمل.',
      ogTitle: 'حاسبات العمل والرواتب | Calcu-Hub',
      ogDescription: 'احسب راتبك ومستحقاتك بسهولة',
      jsonLd: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Calcu-Hub",
        "url": "https://calcuhub.com",
        "description": "أدوات حساب الراتب وساعات العمل ونهاية الخدمة للموظفين في السعودية"
      }),
    },
    {
      pageKey: 'calculator_salary',
      locale: 'ar',
      title: 'حاسبة الراتب الصافي في السعودية | احسب راتبك بعد التأمينات',
      description: 'حاسبة الراتب الصافي والإجمالي مع خصم التأمينات الاجتماعية GOSI. احسب راتبك الشهري والسنوي، مع دعم حساب البدلات والعمل الإضافي.',
      ogTitle: 'حاسبة الراتب في السعودية',
      jsonLd: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "حاسبة الراتب",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Web"
      }),
    },
    {
      pageKey: 'calculator_eos',
      locale: 'ar',
      title: 'حاسبة مكافأة نهاية الخدمة في السعودية | احسب مستحقاتك',
      description: 'احسب مكافأة نهاية الخدمة وفق نظام العمل السعودي. حساب المستحقات عند الاستقالة أو إنهاء العقد مع شرح مفصل للقوانين.',
      ogTitle: 'حاسبة نهاية الخدمة',
      jsonLd: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "حاسبة نهاية الخدمة",
        "applicationCategory": "FinanceApplication"
      }),
    },
    {
      pageKey: 'calculator_workhours',
      locale: 'ar',
      title: 'حاسبة ساعات العمل | احسب وقت الانصراف وساعات العمل',
      description: 'احسب وقت انصرافك من العمل وإجمالي ساعات العمل اليومية والأسبوعية والشهرية. أداة سهلة لحساب ساعات العمل الفعلية.',
      ogTitle: 'حاسبة ساعات العمل',
    },
    {
      pageKey: 'calculator_dates',
      locale: 'ar',
      title: 'حاسبة الفرق بين التواريخ | حساب الأيام والأسابيع',
      description: 'احسب الفرق بين تاريخين بالأيام والأسابيع والشهور. دعم التقويم الميلادي والهجري مع حساب أيام العمل.',
      ogTitle: 'حاسبة التواريخ',
    },
  ];

  for (const config of seoConfigs) {
    await prisma.seoConfig.upsert({
      where: { pageKey_locale: { pageKey: config.pageKey, locale: config.locale } },
      update: {},
      create: config,
    });
  }
  console.log('✅ SEO configs created');

  // ============================================
  // Create Default Static Pages
  // ============================================
  const staticPages = [
    {
      slug: 'privacy',
      locale: 'ar',
      title: 'سياسة الخصوصية',
      bodyMarkdown: `# سياسة الخصوصية

## مقدمة
نحن في Calcu-Hub نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.

## البيانات التي نجمعها
- **بيانات الاستخدام**: نجمع بيانات مجهولة عن كيفية استخدامك للموقع لتحسين خدماتنا.
- **ملفات تعريف الارتباط (Cookies)**: نستخدم ملفات تعريف الارتباط التقنية لتشغيل الموقع.

## Google Analytics و AdSense
- نستخدم Google Analytics لفهم سلوك المستخدمين (بعد موافقتك).
- نستخدم Google AdSense لعرض الإعلانات (بعد موافقتك).
- يمكنك رفض هذه الخدمات عبر لافتة الموافقة.

## حقوقك
- يمكنك طلب حذف بياناتك في أي وقت.
- يمكنك إلغاء الموافقة على التحليلات والإعلانات.

## التواصل
للاستفسارات: privacy@calcuhub.com`,
    },
    {
      slug: 'terms',
      locale: 'ar',
      title: 'شروط الاستخدام',
      bodyMarkdown: `# شروط الاستخدام

## القبول
باستخدامك لهذا الموقع، توافق على هذه الشروط.

## الغرض من الخدمة
- هذا الموقع يقدم أدوات حسابية لأغراض تعليمية ومعلوماتية فقط.
- النتائج تقريبية ولا تشكل نصيحة قانونية أو مالية.

## إخلاء المسؤولية
- لا نتحمل مسؤولية أي قرارات تتخذها بناءً على نتائج الحاسبات.
- يجب التحقق من النتائج مع جهة العمل أو الجهات الرسمية.

## الاستخدام المقبول
- يُحظر استخدام الموقع لأغراض غير قانونية.
- يُحظر محاولة اختراق الموقع أو إساءة استخدامه.

## التعديلات
نحتفظ بحق تعديل هذه الشروط في أي وقت.`,
    },
    {
      slug: 'about',
      locale: 'ar',
      title: 'عن الموقع',
      bodyMarkdown: `# عن Calcu-Hub

## ما هو Calcu-Hub؟
Calcu-Hub هو موقع متخصص في تقديم أدوات حسابية للموظفين والشركات في المملكة العربية السعودية.

## أدواتنا
- **حاسبة الراتب**: احسب راتبك الصافي والإجمالي مع التأمينات.
- **حاسبة نهاية الخدمة**: احسب مستحقاتك وفق نظام العمل السعودي.
- **حاسبة ساعات العمل**: تتبع ساعات عملك ووقت الانصراف.
- **حاسبة التواريخ**: احسب الفرق بين التواريخ.

## لمن هذا الموقع؟
- الموظفين في القطاع الخاص والعام
- أقسام الموارد البشرية
- الشركات الصغيرة والمتوسطة
- المحاسبين والمستشارين

## تواصل معنا
contact@calcuhub.com`,
    },
  ];

  for (const page of staticPages) {
    await prisma.staticPageContent.upsert({
      where: { slug_locale: { slug: page.slug, locale: page.locale } },
      update: {},
      create: page,
    });
  }
  console.log('✅ Static pages created');

  // ============================================
  // Create Default FAQs
  // ============================================
  // Delete existing FAQs to avoid duplicates on re-run
  await prisma.fAQ.deleteMany({});
  
  const faqs = [
    // Global FAQs
    { category: 'global', locale: 'ar', question: 'ما هي حاسبات Calcu-Hub؟', answer: 'Calcu-Hub يوفر أدوات حسابية للراتب، نهاية الخدمة، ساعات العمل، والتواريخ مصممة خصيصاً للموظفين في السعودية.', sortOrder: 1 },
    { category: 'global', locale: 'ar', question: 'هل النتائج دقيقة ونهائية؟', answer: 'النتائج تقريبية ومبنية على المعلومات المدخلة. يجب التحقق من جهة العمل أو الجهات الرسمية للحصول على نتائج نهائية.', sortOrder: 2 },
    { category: 'global', locale: 'ar', question: 'هل الموقع مجاني؟', answer: 'نعم، جميع الأدوات متاحة مجاناً.', sortOrder: 3 },
    
    // Salary Calculator FAQs
    { category: 'calculator_salary', locale: 'ar', question: 'كيف يتم حساب التأمينات الاجتماعية؟', answer: 'يتم خصم 9.75% من الراتب الأساسي + بدل السكن (بحد أقصى 45,000 ريال) للموظف السعودي. صاحب العمل يدفع 12% إضافية.', sortOrder: 1 },
    { category: 'calculator_salary', locale: 'ar', question: 'ما الفرق بين الراتب الإجمالي والصافي؟', answer: 'الراتب الإجمالي هو المبلغ قبل الخصومات. الصافي هو ما تستلمه بعد خصم التأمينات والاستقطاعات الأخرى.', sortOrder: 2 },
    { category: 'calculator_salary', locale: 'ar', question: 'كيف أحسب العمل الإضافي؟', answer: 'العمل الإضافي يُحسب بـ 150% من الأجر الساعي العادي (الأجر + 50% إضافية).', sortOrder: 3 },
    { category: 'calculator_salary', locale: 'ar', question: 'هل يختلف الحساب للموظف غير السعودي؟', answer: 'نعم، الموظف غير السعودي لا يُخصم منه تأمينات اجتماعية، لكن صاحب العمل يدفع رسوم أخرى.', sortOrder: 4 },
    
    // EOS Calculator FAQs
    { category: 'calculator_eos', locale: 'ar', question: 'كيف تُحسب مكافأة نهاية الخدمة؟', answer: 'أول 5 سنوات: نصف راتب شهري لكل سنة. بعد 5 سنوات: راتب شهري كامل لكل سنة.', sortOrder: 1 },
    { category: 'calculator_eos', locale: 'ar', question: 'ما الفرق بين الاستقالة وإنهاء العقد؟', answer: 'عند إنهاء العقد من صاحب العمل تحصل على كامل المكافأة. عند الاستقالة تحصل على نسبة حسب سنوات الخدمة.', sortOrder: 2 },
    { category: 'calculator_eos', locale: 'ar', question: 'متى أستحق مكافأة نهاية الخدمة كاملة عند الاستقالة؟', answer: 'تستحق المكافأة كاملة عند الاستقالة بعد 10 سنوات خدمة.', sortOrder: 3 },
    { category: 'calculator_eos', locale: 'ar', question: 'هل تشمل المكافأة البدلات؟', answer: 'يمكنك اختيار حسابها على أساس الراتب الأساسي فقط أو مع بدل السكن.', sortOrder: 4 },
    
    // Work Hours FAQs
    { category: 'calculator_workhours', locale: 'ar', question: 'كم ساعة العمل الرسمية في السعودية؟', answer: '8 ساعات يومياً أو 48 ساعة أسبوعياً، وتنخفض إلى 6 ساعات يومياً في رمضان.', sortOrder: 1 },
    { category: 'calculator_workhours', locale: 'ar', question: 'هل فترة الاستراحة تُحسب من ساعات العمل؟', answer: 'حسب سياسة الشركة. بعض الشركات تحتسبها مدفوعة وبعضها لا.', sortOrder: 2 },
  ];

  for (const faq of faqs) {
    await prisma.fAQ.create({
      data: faq,
    });
  }
  console.log('✅ FAQs created');

  // ============================================
  // Create Sample Blog Posts
  // ============================================
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  
  if (admin) {
    const blogPosts = [
      {
        slug: 'calculate-end-of-service-saudi',
        title: 'طريقة حساب مكافأة نهاية الخدمة في السعودية 2025',
        excerpt: 'دليل شامل لحساب مستحقات نهاية الخدمة وفق نظام العمل السعودي مع أمثلة عملية.',
        bodyMarkdown: `# طريقة حساب مكافأة نهاية الخدمة في السعودية

## مقدمة
مكافأة نهاية الخدمة هي حق مكفول لكل عامل في المملكة العربية السعودية وفق نظام العمل.

## طريقة الحساب

### الخمس سنوات الأولى
- يستحق العامل **نصف راتب شهري** عن كل سنة من السنوات الخمس الأولى.

### ما بعد الخمس سنوات
- يستحق العامل **راتب شهري كامل** عن كل سنة بعد الخمس سنوات الأولى.

## مثال عملي
موظف عمل 8 سنوات براتب 10,000 ريال:
- أول 5 سنوات: 5 × 0.5 × 10,000 = 25,000 ريال
- 3 سنوات التالية: 3 × 1 × 10,000 = 30,000 ريال
- **الإجمالي: 55,000 ريال**

[احسب مكافأتك الآن](/calculator/eos)`,
        heroImageUrl: '/images/eos-calculator-hero.jpg',
        tags: 'نهاية الخدمة,مكافأة,نظام العمل,السعودية',
        authorId: admin.id,
        isPublished: true,
        publishedAt: new Date(),
      },
      {
        slug: 'salary-calculation-gosi-deductions',
        title: 'حساب الراتب الصافي بعد خصم التأمينات في السعودية',
        excerpt: 'تعرف على كيفية حساب راتبك الصافي وما يُخصم منك للتأمينات الاجتماعية.',
        bodyMarkdown: `# حساب الراتب الصافي بعد التأمينات

## ما هي التأمينات الاجتماعية؟
التأمينات الاجتماعية (GOSI) هي نظام تأمين إلزامي يوفر حماية للموظفين.

## نسب الخصم

### للموظف السعودي
- **خصم الموظف**: 9.75% من (الراتب الأساسي + بدل السكن)
- **مساهمة صاحب العمل**: 12%
- **الحد الأقصى للوعاء**: 45,000 ريال

### للموظف غير السعودي
- **لا يُخصم** من راتب الموظف غير السعودي
- صاحب العمل يدفع تأمين مخاطر العمل فقط (2%)

## مثال عملي
موظف سعودي براتب أساسي 8,000 ريال + بدل سكن 2,000 ريال:
- وعاء التأمين: 10,000 ريال
- خصم الموظف: 10,000 × 9.75% = 975 ريال
- الراتب الصافي: 10,000 - 975 = 9,025 ريال

[احسب راتبك الآن](/calculator/salary)`,
        heroImageUrl: '/images/salary-calculator-hero.jpg',
        tags: 'راتب,تأمينات,GOSI,صافي,إجمالي',
        authorId: admin.id,
        isPublished: true,
        publishedAt: new Date(),
      },
      {
        slug: 'working-hours-saudi-labor-law',
        title: 'ساعات العمل الرسمية في السعودية حسب نظام العمل',
        excerpt: 'كل ما تحتاج معرفته عن ساعات العمل والعمل الإضافي في السعودية.',
        bodyMarkdown: `# ساعات العمل في السعودية

## ساعات العمل الرسمية
- **الأيام العادية**: 8 ساعات يومياً / 48 ساعة أسبوعياً
- **شهر رمضان**: 6 ساعات يومياً / 36 ساعة أسبوعياً

## فترات الراحة
- لا يجوز تشغيل العامل أكثر من 5 ساعات متواصلة
- فترة الراحة لا تقل عن نصف ساعة

## العمل الإضافي
- يُحسب بـ **150%** من الأجر الساعي العادي
- يجب ألا يزيد عن 720 ساعة سنوياً

## حساب الأجر الساعي
الأجر الساعي = الراتب الشهري ÷ 30 ÷ 8

## مثال
موظف براتب 6,000 ريال يعمل 10 ساعات إضافية:
- الأجر الساعي = 6,000 ÷ 30 ÷ 8 = 25 ريال
- أجر الساعة الإضافية = 25 × 1.5 = 37.5 ريال
- إجمالي العمل الإضافي = 10 × 37.5 = 375 ريال

[احسب ساعات عملك](/calculator/workhours)`,
        heroImageUrl: '/images/workhours-hero.jpg',
        tags: 'ساعات العمل,العمل الإضافي,نظام العمل',
        authorId: admin.id,
        isPublished: true,
        publishedAt: new Date(),
      },
    ];

    for (const post of blogPosts) {
      await prisma.blogPost.upsert({
        where: { slug: post.slug },
        update: {},
        create: post,
      });
    }
    console.log('✅ Blog posts created');
  }

  // ============================================
  // Create System Settings
  // ============================================
  const settings = [
    { key: 'site_name', value: 'Calcu-Hub', type: 'string', category: 'general' },
    { key: 'site_name_ar', value: 'حاسبات العمل', type: 'string', category: 'general' },
    { key: 'primary_color', value: '#2563eb', type: 'string', category: 'theme' },
    { key: 'secondary_color', value: '#1e40af', type: 'string', category: 'theme' },
    { key: 'gosi_employee_rate', value: '9.75', type: 'number', category: 'calculator' },
    { key: 'gosi_employer_rate', value: '12', type: 'number', category: 'calculator' },
    { key: 'gosi_cap', value: '45000', type: 'number', category: 'calculator' },
    { key: 'overtime_multiplier', value: '1.5', type: 'number', category: 'calculator' },
    { key: 'dark_mode_enabled', value: 'true', type: 'boolean', category: 'theme' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('✅ System settings created');

  // ============================================
  // Create Feature Flags
  // ============================================
  const features = [
    { key: 'hijri_calendar', isEnabled: true, description: 'Enable Hijri calendar support in calculators' },
    { key: 'dark_mode', isEnabled: true, description: 'Enable dark mode toggle' },
    { key: 'overtime_calculator', isEnabled: true, description: 'Enable overtime calculation in salary calculator' },
    { key: 'blog', isEnabled: true, description: 'Enable blog section' },
    { key: 'admin_tests', isEnabled: false, description: 'Enable test runner in admin panel' },
  ];

  for (const feature of features) {
    await prisma.featureFlag.upsert({
      where: { key: feature.key },
      update: {},
      create: feature,
    });
  }
  console.log('✅ Feature flags created');

  console.log('\n🎉 Database seeded successfully!');
  console.log(`\n📧 Admin login: ${adminEmail}`);
  console.log(`🔑 Admin password: ${adminPassword}`);
  console.log('\n⚠️  Please change the admin password after first login!');
  
  return prisma;
}

main()
  .then(async (prisma) => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  });
