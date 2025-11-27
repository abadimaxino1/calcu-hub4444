// Database seed script using better-sqlite3
// Run with: node scripts/seed-db-direct.cjs

require('dotenv').config();
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Database is at project root because DATABASE_URL is "file:./dev.db"
const dbPath = path.join(__dirname, '..', 'dev.db');
const db = new Database(dbPath);

console.log('🌱 Seeding database...');

// ============================================
// Create Super Admin User
// ============================================
const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@calcuhub.com';
const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'ChangeThisPassword123!';

const existingAdmin = db.prepare('SELECT * FROM users WHERE role = ?').get('SUPER_ADMIN');

if (!existingAdmin) {
  const hashedPassword = bcrypt.hashSync(adminPassword, 12);
  const adminId = uuidv4();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO users (id, email, name, hashedPassword, role, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(adminId, adminEmail, 'مدير النظام', hashedPassword, 'SUPER_ADMIN', 1, now, now);
  
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

const insertAdSlot = db.prepare(`
  INSERT OR IGNORE INTO ad_slots (id, name, pagePathPattern, positionKey, isActive, eCPM, cpc, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const now = new Date().toISOString();
for (const slot of adSlots) {
  insertAdSlot.run(uuidv4(), slot.name, slot.pagePathPattern, slot.positionKey, 1, slot.eCPM, slot.cpc, now, now);
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
    description: 'أدوات حساب الراتب، ساعات العمل، نهاية الخدمة، والتواريخ للموظفين في السعودية.',
    ogTitle: 'حاسبات العمل والرواتب | Calcu-Hub',
    ogDescription: 'احسب راتبك ومستحقاتك بسهولة',
  },
  {
    pageKey: 'calculator_salary',
    locale: 'ar',
    title: 'حاسبة الراتب الصافي في السعودية | احسب راتبك بعد التأمينات',
    description: 'حاسبة الراتب الصافي والإجمالي مع خصم التأمينات الاجتماعية GOSI.',
    ogTitle: 'حاسبة الراتب في السعودية',
  },
  {
    pageKey: 'calculator_eos',
    locale: 'ar',
    title: 'حاسبة مكافأة نهاية الخدمة في السعودية | احسب مستحقاتك',
    description: 'احسب مكافأة نهاية الخدمة وفق نظام العمل السعودي.',
    ogTitle: 'حاسبة نهاية الخدمة',
  },
  {
    pageKey: 'calculator_workhours',
    locale: 'ar',
    title: 'حاسبة ساعات العمل | احسب وقت الانصراف وساعات العمل',
    description: 'احسب وقت انصرافك من العمل وإجمالي ساعات العمل.',
    ogTitle: 'حاسبة ساعات العمل',
  },
  {
    pageKey: 'calculator_dates',
    locale: 'ar',
    title: 'حاسبة الفرق بين التواريخ | حساب الأيام والأسابيع',
    description: 'احسب الفرق بين تاريخين بالأيام والأسابيع والشهور.',
    ogTitle: 'حاسبة التواريخ',
  },
];

const insertSeoConfig = db.prepare(`
  INSERT OR IGNORE INTO seo_configs (id, pageKey, locale, title, description, ogTitle, ogDescription, twitterCardType, isIndexable, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const config of seoConfigs) {
  insertSeoConfig.run(
    uuidv4(), 
    config.pageKey, 
    config.locale, 
    config.title, 
    config.description, 
    config.ogTitle || null, 
    config.ogDescription || null,
    'summary_large_image',
    1,
    now, 
    now
  );
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
- بيانات الاستخدام المجهولة
- ملفات تعريف الارتباط التقنية

## حقوقك
- يمكنك طلب حذف بياناتك في أي وقت
- يمكنك إلغاء الموافقة على التحليلات

## التواصل
privacy@calcuhub.com`,
  },
  {
    slug: 'terms',
    locale: 'ar',
    title: 'شروط الاستخدام',
    bodyMarkdown: `# شروط الاستخدام

## القبول
باستخدامك لهذا الموقع، توافق على هذه الشروط.

## الغرض من الخدمة
هذا الموقع يقدم أدوات حسابية لأغراض تعليمية ومعلوماتية فقط.

## إخلاء المسؤولية
لا نتحمل مسؤولية أي قرارات تتخذها بناءً على نتائج الحاسبات.`,
  },
  {
    slug: 'about',
    locale: 'ar',
    title: 'عن الموقع',
    bodyMarkdown: `# عن Calcu-Hub

## ما هو Calcu-Hub؟
Calcu-Hub هو موقع متخصص في تقديم أدوات حسابية للموظفين والشركات في المملكة العربية السعودية.

## أدواتنا
- حاسبة الراتب
- حاسبة نهاية الخدمة
- حاسبة ساعات العمل
- حاسبة التواريخ

## تواصل معنا
contact@calcuhub.com`,
  },
];

const insertStaticPage = db.prepare(`
  INSERT OR IGNORE INTO static_page_contents (id, slug, locale, title, bodyMarkdown, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const page of staticPages) {
  insertStaticPage.run(uuidv4(), page.slug, page.locale, page.title, page.bodyMarkdown, now, now);
}
console.log('✅ Static pages created');

// ============================================
// Create Default FAQs
// ============================================
// Clear existing FAQs
db.prepare('DELETE FROM faqs').run();

const faqs = [
  { category: 'global', locale: 'ar', question: 'ما هي حاسبات Calcu-Hub؟', answer: 'أدوات حسابية للراتب ونهاية الخدمة وساعات العمل والتواريخ.', sortOrder: 1 },
  { category: 'global', locale: 'ar', question: 'هل النتائج دقيقة؟', answer: 'النتائج تقريبية ومبنية على المعلومات المدخلة.', sortOrder: 2 },
  { category: 'global', locale: 'ar', question: 'هل الموقع مجاني؟', answer: 'نعم، جميع الأدوات متاحة مجاناً.', sortOrder: 3 },
  { category: 'calculator_salary', locale: 'ar', question: 'كيف يتم حساب التأمينات؟', answer: 'يتم خصم 9.75% من الراتب الأساسي + بدل السكن.', sortOrder: 1 },
  { category: 'calculator_salary', locale: 'ar', question: 'ما الفرق بين الإجمالي والصافي؟', answer: 'الإجمالي قبل الخصومات، والصافي بعد الخصومات.', sortOrder: 2 },
  { category: 'calculator_eos', locale: 'ar', question: 'كيف تُحسب نهاية الخدمة؟', answer: 'أول 5 سنوات: نصف راتب. بعدها: راتب كامل لكل سنة.', sortOrder: 1 },
  { category: 'calculator_eos', locale: 'ar', question: 'متى أستحق المكافأة كاملة؟', answer: 'بعد 10 سنوات خدمة عند الاستقالة.', sortOrder: 2 },
  { category: 'calculator_workhours', locale: 'ar', question: 'كم ساعة العمل الرسمية؟', answer: '8 ساعات يومياً، 6 ساعات في رمضان.', sortOrder: 1 },
];

const insertFaq = db.prepare(`
  INSERT INTO faqs (id, category, locale, question, answer, sortOrder, isPublished, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const faq of faqs) {
  insertFaq.run(uuidv4(), faq.category, faq.locale, faq.question, faq.answer, faq.sortOrder, 1, now, now);
}
console.log('✅ FAQs created');

// ============================================
// Create Sample Blog Posts
// ============================================
const admin = db.prepare('SELECT * FROM users WHERE role = ?').get('SUPER_ADMIN');

if (admin) {
  const blogPosts = [
    {
      slug: 'calculate-end-of-service-saudi',
      title: 'طريقة حساب مكافأة نهاية الخدمة في السعودية 2025',
      excerpt: 'دليل شامل لحساب مستحقات نهاية الخدمة.',
      bodyMarkdown: `# طريقة حساب مكافأة نهاية الخدمة

## طريقة الحساب
- أول 5 سنوات: نصف راتب شهري لكل سنة
- بعد 5 سنوات: راتب شهري كامل لكل سنة`,
      tags: 'نهاية الخدمة,مكافأة,السعودية',
    },
    {
      slug: 'salary-calculation-gosi-deductions',
      title: 'حساب الراتب الصافي بعد خصم التأمينات',
      excerpt: 'تعرف على كيفية حساب راتبك الصافي.',
      bodyMarkdown: `# حساب الراتب الصافي

## نسب الخصم
- خصم الموظف: 9.75%
- مساهمة صاحب العمل: 12%`,
      tags: 'راتب,تأمينات,GOSI',
    },
    {
      slug: 'working-hours-saudi-labor-law',
      title: 'ساعات العمل الرسمية في السعودية',
      excerpt: 'كل ما تحتاج معرفته عن ساعات العمل.',
      bodyMarkdown: `# ساعات العمل في السعودية

## ساعات العمل الرسمية
- الأيام العادية: 8 ساعات يومياً
- رمضان: 6 ساعات يومياً`,
      tags: 'ساعات العمل,نظام العمل',
    },
  ];

  const insertBlogPost = db.prepare(`
    INSERT OR IGNORE INTO blog_posts (id, slug, title, excerpt, bodyMarkdown, tags, authorId, isPublished, publishedAt, viewCount, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const post of blogPosts) {
    insertBlogPost.run(
      uuidv4(), 
      post.slug, 
      post.title, 
      post.excerpt, 
      post.bodyMarkdown, 
      post.tags, 
      admin.id, 
      1, 
      now, 
      0, 
      now, 
      now
    );
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
  { key: 'gosi_employee_rate', value: '9.75', type: 'number', category: 'calculator' },
  { key: 'gosi_employer_rate', value: '12', type: 'number', category: 'calculator' },
  { key: 'gosi_cap', value: '45000', type: 'number', category: 'calculator' },
  { key: 'overtime_multiplier', value: '1.5', type: 'number', category: 'calculator' },
];

const insertSetting = db.prepare(`
  INSERT OR IGNORE INTO system_settings (id, key, value, type, category, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const setting of settings) {
  insertSetting.run(uuidv4(), setting.key, setting.value, setting.type, setting.category, now, now);
}
console.log('✅ System settings created');

// ============================================
// Create Feature Flags
// ============================================
const features = [
  { key: 'hijri_calendar', isEnabled: true, description: 'Enable Hijri calendar support' },
  { key: 'dark_mode', isEnabled: true, description: 'Enable dark mode toggle' },
  { key: 'overtime_calculator', isEnabled: true, description: 'Enable overtime calculation' },
  { key: 'blog', isEnabled: true, description: 'Enable blog section' },
  { key: 'admin_tests', isEnabled: false, description: 'Enable test runner in admin' },
];

const insertFeature = db.prepare(`
  INSERT OR IGNORE INTO feature_flags (id, key, isEnabled, description, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const feature of features) {
  insertFeature.run(uuidv4(), feature.key, feature.isEnabled ? 1 : 0, feature.description, now, now);
}
console.log('✅ Feature flags created');

db.close();

console.log('\n🎉 Database seeded successfully!');
console.log(`\n📧 Admin login: ${adminEmail}`);
console.log(`🔑 Admin password: ${adminPassword}`);
console.log('\n⚠️  Please change the admin password after first login!');
