const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const blogPosts = [
  {
    slug: "calculate-salary-after-gosi-deductions-saudi-arabia",
    titleAr: "كيفية حساب الراتب بعد خصم التأمينات الاجتماعية في السعودية",
    titleEn: "How to Calculate Salary After GOSI Deductions in Saudi Arabia",
    excerptAr: "دليل شامل لحساب راتبك الصافي بعد خصم التأمينات الاجتماعية (GOSI) في المملكة العربية السعودية",
    excerptEn: "Complete guide to calculating your net salary after GOSI (General Organization for Social Insurance) deductions in Saudi Arabia",
    bodyMarkdownAr: "## مقدمة\n\nتعتبر التأمينات الاجتماعية جزءاً أساسياً من نظام العمل في المملكة العربية السعودية...",
    bodyMarkdownEn: "## Introduction\n\nSocial insurance (GOSI) is a fundamental part of Saudi Arabia's employment system...",
    status: "PUBLISHED",
    tags: "salary,gosi,calculator,saudi arabia,payroll"
  },
  {
    slug: "end-of-service-benefits-saudi-labor-law",
    titleAr: "حساب مكافأة نهاية الخدمة وفق نظام العمل السعودي",
    titleEn: "End of Service Benefits Under Saudi Labor Law",
    excerptAr: "شرح تفصيلي لكيفية حساب مكافأة نهاية الخدمة حسب المادة 84 والمادة 85",
    excerptEn: "Detailed explanation of EOS benefits calculation under Articles 84 and 85",
    bodyMarkdownAr: "## مكافأة نهاية الخدمة\n\nمكافأة نهاية الخدمة حق مكتسب لكل عامل...",
    bodyMarkdownEn: "## End of Service Benefits\n\nEOS benefits are an acquired right for every worker...",
    status: "PUBLISHED",
    tags: "eos,gratuity,labor law,calculator"
  },
  {
    slug: "working-hours-saudi-labor-law",
    titleAr: "ساعات العمل القانونية في السعودية 2024",
    titleEn: "Legal Working Hours in Saudi Arabia 2024",
    excerptAr: "دليل شامل لساعات العمل القانونية والعمل الإضافي في نظام العمل السعودي",
    excerptEn: "Complete guide to legal working hours and overtime in Saudi Labor Law",
    bodyMarkdownAr: "## ساعات العمل\n\nالحد الأقصى 8 ساعات يومياً...",
    bodyMarkdownEn: "## Working Hours\n\nMaximum 8 hours daily...",
    status: "PUBLISHED",
    tags: "working hours,overtime,labor law"
  },
  {
    slug: "hijri-gregorian-date-converter",
    titleAr: "تحويل التاريخ من الهجري إلى الميلادي والعكس",
    titleEn: "Convert Hijri to Gregorian Dates and Vice Versa",
    excerptAr: "أداة مجانية لتحويل التواريخ بين التقويم الهجري والميلادي",
    excerptEn: "Free tool to convert dates between Hijri and Gregorian calendars",
    bodyMarkdownAr: "## تحويل التاريخ\n\nاستخدم حاسبتنا لتحويل التواريخ بسهولة...",
    bodyMarkdownEn: "## Date Conversion\n\nUse our calculator to easily convert dates...",
    status: "PUBLISHED",
    tags: "dates,hijri,gregorian,converter"
  },
  {
    slug: "calculate-annual-leave-saudi-arabia",
    titleAr: "حساب الإجازة السنوية في السعودية",
    titleEn: "Calculate Annual Leave in Saudi Arabia",
    excerptAr: "كيفية حساب مستحقات الإجازة السنوية وفق نظام العمل السعودي",
    excerptEn: "How to calculate annual leave entitlements according to Saudi Labor Law",
    bodyMarkdownAr: "## الإجازة السنوية\n\nيستحق الموظف 21 يوم إجازة سنوية...",
    bodyMarkdownEn: "## Annual Leave\n\nEmployees are entitled to 21 days annual leave...",
    status: "PUBLISHED",
    tags: "annual leave,vacation,labor law"
  },
  {
    slug: "probation-period-saudi-labor-law",
    titleAr: "فترة التجربة في نظام العمل السعودي",
    titleEn: "Probation Period in Saudi Labor Law",
    excerptAr: "كل ما تحتاج معرفته عن فترة التجربة ومدتها وحقوقك خلالها",
    excerptEn: "Everything you need to know about probation period duration and your rights",
    bodyMarkdownAr: "## فترة التجربة\n\nالحد الأقصى 90 يوماً قابلة للتمديد 90 يوماً إضافية...",
    bodyMarkdownEn: "## Probation Period\n\nMaximum 90 days extendable by another 90 days...",
    status: "PUBLISHED",
    tags: "probation,trial period,employment"
  },
  {
    slug: "notice-period-termination-saudi",
    titleAr: "مدة الإشعار عند إنهاء العقد في السعودية",
    titleEn: "Notice Period for Contract Termination in Saudi Arabia",
    excerptAr: "الأحكام القانونية لمدة الإشعار عند إنهاء عقد العمل",
    excerptEn: "Legal provisions for notice period when terminating employment contracts",
    bodyMarkdownAr: "## مدة الإشعار\n\nلا تقل عن 30 يوماً ولا تزيد عن 90 يوماً...",
    bodyMarkdownEn: "## Notice Period\n\nNot less than 30 days and not more than 90 days...",
    status: "PUBLISHED",
    tags: "notice period,termination,resignation"
  },
  {
    slug: "sick-leave-entitlement-saudi",
    titleAr: "الإجازة المرضية المستحقة في السعودية",
    titleEn: "Sick Leave Entitlement in Saudi Arabia",
    excerptAr: "قواعد الإجازة المرضية والرواتب المستحقة خلالها",
    excerptEn: "Sick leave rules and salary entitlements during sick leave",
    bodyMarkdownAr: "## الإجازة المرضية\n\n- أول 30 يوم: راتب كامل\n- ثاني 60 يوم: 75%\n- ثالث 30 يوم: بدون راتب",
    bodyMarkdownEn: "## Sick Leave\n\n- First 30 days: Full salary\n- Next 60 days: 75%\n- Final 30 days: No salary",
    status: "PUBLISHED",
    tags: "sick leave,medical leave,benefits"
  },
  {
    slug: "maternity-leave-saudi-arabia",
    titleAr: "إجازة الأمومة في السعودية 2024",
    titleEn: "Maternity Leave in Saudi Arabia 2024",
    excerptAr: "حقوق الموظفة الحامل وإجازة الأمومة المدفوعة في السعودية",
    excerptEn: "Pregnant employee rights and paid maternity leave in Saudi Arabia",
    bodyMarkdownAr: "## إجازة الأمومة\n\nتستحق المرأة العاملة 10 أسابيع إجازة براتب كامل...",
    bodyMarkdownEn: "## Maternity Leave\n\nWorking women are entitled to 10 weeks fully paid leave...",
    status: "PUBLISHED",
    tags: "maternity leave,women rights,pregnancy"
  },
  {
    slug: "calculate-overtime-pay-saudi",
    titleAr: "حساب أجر العمل الإضافي في السعودية",
    titleEn: "Calculate Overtime Pay in Saudi Arabia",
    excerptAr: "كيفية حساب أجر العمل الإضافي والعمل في أيام الراحة والأعياد",
    excerptEn: "How to calculate overtime pay and work on rest days and holidays",
    bodyMarkdownAr: "## العمل الإضافي\n\nالأجر العادي + 50% لكل ساعة إضافية...",
    bodyMarkdownEn: "## Overtime\n\nRegular wage + 50% for each overtime hour...",
    status: "PUBLISHED",
    tags: "overtime,extra hours,compensation"
  }
];

async function seedBlogPosts() {
  console.log('Seeding blog posts...');
  
  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: post,
      create: {
        ...post,
        publishedAt: new Date(),
        viewCount: Math.floor(Math.random() * 1000), // Random views for demo
        authorId: null, // Will be filled by admin user
      },
    });
  }
  
  console.log(`✓ Seeded ${blogPosts.length} blog posts`);
}

module.exports = { seedBlogPosts };

if (require.main === module) {
  seedBlogPosts()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
