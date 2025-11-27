// CMS routes for tools, features, and dynamic content
const express = require('express');
const { prisma } = require('../db.cjs');
const { PERMISSIONS, requirePermission } = require('../rbac.cjs');

const router = express.Router();

// ============================================
// Tool Cards (Calculator listings)
// ============================================

// Get all tool cards (public)
router.get('/tools', async (req, res) => {
  try {
    const { featured, tools: onTools } = req.query;

    const where = { isPublished: true };
    if (featured === 'true') where.isFeaturedOnHome = true;
    if (onTools === 'true') where.isVisibleOnTools = true;

    const cards = await prisma.toolCard.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return res.json({ tools: cards });
  } catch (error) {
    console.error('Get tool cards error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all tool cards (admin)
router.get('/tools/all', requirePermission(PERMISSIONS.CONTENT_READ), async (req, res) => {
  try {
    const cards = await prisma.toolCard.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return res.json({ tools: cards });
  } catch (error) {
    console.error('Get all tool cards error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create tool card
router.post('/tools', requirePermission(PERMISSIONS.CONTENT_CREATE), async (req, res) => {
  try {
    const { slug, titleAr, titleEn, descAr, descEn, icon, color, sortOrder, isFeaturedOnHome, isVisibleOnTools, isPublished } = req.body;

    if (!slug || !titleAr || !titleEn) {
      return res.status(400).json({ error: 'slug, titleAr, and titleEn required' });
    }

    const card = await prisma.toolCard.create({
      data: {
        slug,
        titleAr,
        titleEn,
        descAr: descAr || '',
        descEn: descEn || '',
        icon: icon || '🔧',
        color: color || 'from-blue-500 to-indigo-600',
        sortOrder: sortOrder || 0,
        isFeaturedOnHome: isFeaturedOnHome !== false,
        isVisibleOnTools: isVisibleOnTools !== false,
        isPublished: isPublished !== false,
      },
    });

    return res.json({ ok: true, tool: card });
  } catch (error) {
    console.error('Create tool card error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update tool card
router.put('/tools/:id', requirePermission(PERMISSIONS.CONTENT_UPDATE), async (req, res) => {
  try {
    const { titleAr, titleEn, descAr, descEn, icon, color, sortOrder, isFeaturedOnHome, isVisibleOnTools, isPublished } = req.body;

    const card = await prisma.toolCard.update({
      where: { id: req.params.id },
      data: {
        ...(titleAr !== undefined && { titleAr }),
        ...(titleEn !== undefined && { titleEn }),
        ...(descAr !== undefined && { descAr }),
        ...(descEn !== undefined && { descEn }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isFeaturedOnHome !== undefined && { isFeaturedOnHome }),
        ...(isVisibleOnTools !== undefined && { isVisibleOnTools }),
        ...(isPublished !== undefined && { isPublished }),
      },
    });

    return res.json({ ok: true, tool: card });
  } catch (error) {
    console.error('Update tool card error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete tool card
router.delete('/tools/:id', requirePermission(PERMISSIONS.CONTENT_DELETE), async (req, res) => {
  try {
    await prisma.toolCard.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete tool card error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Benefit Features ("Why use our calculators?")
// ============================================

// Get all benefit features (public)
router.get('/features', async (req, res) => {
  try {
    const features = await prisma.benefitFeature.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: 'asc' },
    });

    return res.json({ features });
  } catch (error) {
    console.error('Get benefit features error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all benefit features (admin)
router.get('/features/all', requirePermission(PERMISSIONS.CONTENT_READ), async (req, res) => {
  try {
    const features = await prisma.benefitFeature.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return res.json({ features });
  } catch (error) {
    console.error('Get all benefit features error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create benefit feature
router.post('/features', requirePermission(PERMISSIONS.CONTENT_CREATE), async (req, res) => {
  try {
    const { titleAr, titleEn, descAr, descEn, icon, sortOrder, isPublished } = req.body;

    if (!titleAr || !titleEn) {
      return res.status(400).json({ error: 'titleAr and titleEn required' });
    }

    const feature = await prisma.benefitFeature.create({
      data: {
        titleAr,
        titleEn,
        descAr: descAr || '',
        descEn: descEn || '',
        icon: icon || '✓',
        sortOrder: sortOrder || 0,
        isPublished: isPublished !== false,
      },
    });

    return res.json({ ok: true, feature });
  } catch (error) {
    console.error('Create benefit feature error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update benefit feature
router.put('/features/:id', requirePermission(PERMISSIONS.CONTENT_UPDATE), async (req, res) => {
  try {
    const { titleAr, titleEn, descAr, descEn, icon, sortOrder, isPublished } = req.body;

    const feature = await prisma.benefitFeature.update({
      where: { id: req.params.id },
      data: {
        ...(titleAr !== undefined && { titleAr }),
        ...(titleEn !== undefined && { titleEn }),
        ...(descAr !== undefined && { descAr }),
        ...(descEn !== undefined && { descEn }),
        ...(icon !== undefined && { icon }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isPublished !== undefined && { isPublished }),
      },
    });

    return res.json({ ok: true, feature });
  } catch (error) {
    console.error('Update benefit feature error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete benefit feature
router.delete('/features/:id', requirePermission(PERMISSIONS.CONTENT_DELETE), async (req, res) => {
  try {
    await prisma.benefitFeature.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete benefit feature error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// FAQs by scope (global or per calculator)
// ============================================

// Get FAQs by category/scope (public)
router.get('/faqs', async (req, res) => {
  try {
    const { category, scope } = req.query;
    const categoryFilter = category || scope || 'global';

    const faqs = await prisma.fAQ.findMany({
      where: {
        category: categoryFilter,
        isPublished: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return res.json({ faqs });
  } catch (error) {
    console.error('Get FAQs error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all FAQs (admin)
router.get('/faqs/all', requirePermission(PERMISSIONS.CONTENT_READ), async (req, res) => {
  try {
    const faqs = await prisma.fAQ.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
    return res.json({ faqs });
  } catch (error) {
    console.error('Get all FAQs error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create FAQ with bilingual support
router.post('/faqs', requirePermission(PERMISSIONS.CONTENT_CREATE), async (req, res) => {
  try {
    const { category, questionAr, questionEn, answerAr, answerEn, sortOrder, isPublished } = req.body;

    if (!category || (!questionAr && !questionEn)) {
      return res.status(400).json({ error: 'category and at least one question required' });
    }

    const faq = await prisma.fAQ.create({
      data: {
        category,
        questionAr: questionAr || '',
        questionEn: questionEn || '',
        answerAr: answerAr || '',
        answerEn: answerEn || '',
        sortOrder: sortOrder || 0,
        isPublished: isPublished !== false,
        // Legacy fields
        question: questionAr || questionEn || '',
        answer: answerAr || answerEn || '',
      },
    });

    return res.json({ ok: true, faq });
  } catch (error) {
    console.error('Create FAQ error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update FAQ
router.put('/faqs/:id', requirePermission(PERMISSIONS.CONTENT_UPDATE), async (req, res) => {
  try {
    const { category, questionAr, questionEn, answerAr, answerEn, sortOrder, isPublished } = req.body;

    const faq = await prisma.fAQ.update({
      where: { id: req.params.id },
      data: {
        ...(category !== undefined && { category }),
        ...(questionAr !== undefined && { questionAr, question: questionAr }),
        ...(questionEn !== undefined && { questionEn }),
        ...(answerAr !== undefined && { answerAr, answer: answerAr }),
        ...(answerEn !== undefined && { answerEn }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isPublished !== undefined && { isPublished }),
      },
    });

    return res.json({ ok: true, faq });
  } catch (error) {
    console.error('Update FAQ error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete FAQ
router.delete('/faqs/:id', requirePermission(PERMISSIONS.CONTENT_DELETE), async (req, res) => {
  try {
    await prisma.fAQ.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// Seed default content
// ============================================

router.post('/seed', requirePermission(PERMISSIONS.SYSTEM_UPDATE), async (req, res) => {
  try {
    // Seed default tool cards
    const defaultTools = [
      {
        slug: 'pay',
        titleAr: 'حاسبة الراتب',
        titleEn: 'Salary Calculator',
        descAr: 'احسب صافي راتبك بعد التأمينات والاستقطاعات',
        descEn: 'Calculate net salary after GOSI and deductions',
        icon: '💰',
        color: 'from-green-500 to-emerald-600',
        sortOrder: 1,
      },
      {
        slug: 'eos',
        titleAr: 'حاسبة نهاية الخدمة',
        titleEn: 'End of Service Calculator',
        descAr: 'احسب مكافأة نهاية الخدمة حسب المادة 84 و 85',
        descEn: 'Calculate EOS benefits per Articles 84 & 85',
        icon: '🏆',
        color: 'from-blue-500 to-indigo-600',
        sortOrder: 2,
      },
      {
        slug: 'work',
        titleAr: 'حاسبة ساعات العمل',
        titleEn: 'Work Hours Calculator',
        descAr: 'احسب ساعات العمل ووقت الخروج المتوقع',
        descEn: 'Calculate work hours and expected exit time',
        icon: '⏰',
        color: 'from-orange-500 to-amber-600',
        sortOrder: 3,
      },
      {
        slug: 'dates',
        titleAr: 'حاسبة التواريخ',
        titleEn: 'Date Calculator',
        descAr: 'احسب الفرق بين تاريخين وأيام العمل الفعلية',
        descEn: 'Calculate date differences and working days',
        icon: '📅',
        color: 'from-purple-500 to-violet-600',
        sortOrder: 4,
      },
    ];

    for (const tool of defaultTools) {
      await prisma.toolCard.upsert({
        where: { slug: tool.slug },
        update: tool,
        create: tool,
      });
    }

    // Seed default benefit features
    const defaultFeatures = [
      {
        titleAr: 'دقة عالية',
        titleEn: 'High Accuracy',
        descAr: 'حسابات مبنية على نظام العمل السعودي',
        descEn: 'Based on Saudi Labor Law',
        icon: '✓',
        sortOrder: 1,
      },
      {
        titleAr: 'سريع وسهل',
        titleEn: 'Fast & Easy',
        descAr: 'نتائج فورية بدون تعقيد',
        descEn: 'Instant results without complexity',
        icon: '⚡',
        sortOrder: 2,
      },
      {
        titleAr: 'خصوصية تامة',
        titleEn: 'Privacy First',
        descAr: 'حساباتك تبقى على جهازك',
        descEn: 'Your data stays on your device',
        icon: '🔒',
        sortOrder: 3,
      },
      {
        titleAr: 'يعمل على كل الأجهزة',
        titleEn: 'Works Everywhere',
        descAr: 'متوافق مع الجوال والكمبيوتر',
        descEn: 'Mobile and desktop compatible',
        icon: '📱',
        sortOrder: 4,
      },
    ];

    // Clear existing features and insert new ones
    await prisma.benefitFeature.deleteMany({});
    for (const feature of defaultFeatures) {
      await prisma.benefitFeature.create({ data: feature });
    }

    // Seed default FAQs
    const defaultFaqs = [
      {
        category: 'global',
        questionAr: 'ما هي منصة Calcu-Hub؟',
        questionEn: 'What is Calcu-Hub?',
        answerAr: 'Calcu-Hub مجموعة من الحاسبات المجانية صُممت لمساعدة الموظفين وأخصائي الموارد البشرية والعاملين لحسابهم الخاص في السعودية على فهم الرواتب وساعات العمل ومكافآت نهاية الخدمة بشكل أوضح.',
        answerEn: 'Calcu-Hub is a collection of free calculators designed for employees, HR specialists, and freelancers in Saudi Arabia to better understand salaries, work hours, and end-of-service benefits.',
        sortOrder: 1,
      },
      {
        category: 'global',
        questionAr: 'هل النتائج ملزمة قانونيًا؟',
        questionEn: 'Are the results legally binding?',
        answerAr: 'لا، النتائج تقريبية لغرض التثقيف والتوضيح فقط. القرارات النهائية يجب أن تُبنى على عقد العمل واللوائح الرسمية ومرجعية وزارة الموارد البشرية.',
        answerEn: 'No. The results are estimates for guidance only. For any final decisions, you should always refer to your official contract, HR department, and the Ministry of Human Resources regulations.',
        sortOrder: 2,
      },
      {
        category: 'global',
        questionAr: 'ما الحاسبات المتوفرة حاليًا؟',
        questionEn: 'Which calculators are available?',
        answerAr: 'تتوفر حاليًا أربع حاسبات رئيسية: حاسبة الراتب بعد التأمينات والخصومات، حاسبة مكافأة نهاية الخدمة حسب المادتين 84 و85، حاسبة ساعات العمل ووقت الانصراف، وحاسبة الفروقات بين التواريخ وأيام العمل.',
        answerEn: 'We currently provide four calculators: salary calculator after GOSI and deductions, end-of-service calculator by Articles 84 and 85, work hours and exit time calculator, and date difference / working days calculator.',
        sortOrder: 3,
      },
      {
        category: 'global',
        questionAr: 'هل استخدام Calcu-Hub مجاني؟',
        questionEn: 'Is Calcu-Hub free to use?',
        answerAr: 'نعم، جميع الحاسبات مجانية. هدفنا مساعدة الموظفين وطالبي العمل على رؤية الأرقام بوضوح وشفافية.',
        answerEn: 'Yes, all calculators are free to use. We aim to support employees and job seekers with clear and transparent numbers.',
        sortOrder: 4,
      },
      {
        category: 'global',
        questionAr: 'هل يدعم الموقع اللغتين العربية والإنجليزية؟',
        questionEn: 'Does Calcu-Hub support both Arabic and English?',
        answerAr: 'نعم، يمكنك التبديل بين العربية والإنجليزية من أعلى الصفحة، وسيتم ضبط واجهة الحاسبات تلقائيًا حسب اللغة المختارة.',
        answerEn: 'Yes. You can switch between Arabic and English from the top of the page, and the calculators will adapt to your language preference.',
        sortOrder: 5,
      },
    ];

    for (const faq of defaultFaqs) {
      await prisma.fAQ.create({
        data: {
          ...faq,
          question: faq.questionAr,
          answer: faq.answerAr,
        },
      });
    }

    // Seed default SEO configs
    const defaultSeoConfigs = [
      {
        pageKey: '/',
        locale: 'ar',
        title: 'حاسبات العمل والراتب في السعودية | Calcu-Hub',
        description: 'مجموعة حاسبات مجانية ودقيقة للراتب، نهاية الخدمة، ساعات العمل، وحساب الفروقات بين التواريخ في السعودية.',
      },
      {
        pageKey: '/',
        locale: 'en',
        title: 'Saudi Work & Salary Calculators | Calcu-Hub',
        description: 'Free and accurate Saudi salary, end-of-service, work hours, and date calculators in one place.',
      },
      {
        pageKey: '/calc',
        locale: 'ar',
        title: 'الحاسبات | Calcu-Hub',
        description: 'استخدم حاسباتنا للراتب ونهاية الخدمة وساعات العمل والتواريخ.',
      },
      {
        pageKey: '/calc?tab=pay',
        locale: 'ar',
        title: 'حاسبة الراتب السعودية | Calcu-Hub',
        description: 'احسب راتبك الإجمالي والصافي مع خصم التأمينات الاجتماعية (جوسي) بدقة.',
      },
      {
        pageKey: '/calc?tab=eos',
        locale: 'ar',
        title: 'حاسبة نهاية الخدمة | Calcu-Hub',
        description: 'احسب مستحقات نهاية الخدمة بدقة وفقاً لنظام العمل السعودي.',
      },
      {
        pageKey: '/calc?tab=work',
        locale: 'ar',
        title: 'حاسبة ساعات العمل | Calcu-Hub',
        description: 'احسب وقت الخروج وساعات العمل بدقة حسب ساعات الدوام المعتمدة.',
      },
      {
        pageKey: '/calc?tab=dates',
        locale: 'ar',
        title: 'حاسبة أيام العمل والتواريخ | Calcu-Hub',
        description: 'احسب الأيام بين تاريخين أو أيام العمل الفعلية مع مراعاة عطلات نهاية الأسبوع.',
      },
      {
        pageKey: '/about',
        locale: 'ar',
        title: 'عن الموقع | Calcu-Hub',
        description: 'تعرف على منصة Calcu-Hub وأهدافها في تقديم حاسبات العمل المجانية.',
      },
      {
        pageKey: '/faq',
        locale: 'ar',
        title: 'الأسئلة الشائعة | Calcu-Hub',
        description: 'إجابات عن أكثر الأسئلة شيوعًا حول حاسبات Calcu-Hub.',
      },
      {
        pageKey: '/blog',
        locale: 'ar',
        title: 'المدونة | Calcu-Hub',
        description: 'مقالات ونصائح حول الراتب ونظام العمل السعودي.',
      },
      {
        pageKey: '/privacy',
        locale: 'ar',
        title: 'سياسة الخصوصية | Calcu-Hub',
        description: 'سياسة الخصوصية وحماية البيانات في Calcu-Hub.',
      },
      {
        pageKey: '/terms',
        locale: 'ar',
        title: 'الشروط والأحكام | Calcu-Hub',
        description: 'شروط وأحكام استخدام منصة Calcu-Hub.',
      },
    ];

    for (const seo of defaultSeoConfigs) {
      await prisma.seoConfig.upsert({
        where: { pageKey_locale: { pageKey: seo.pageKey, locale: seo.locale } },
        update: seo,
        create: seo,
      });
    }

    return res.json({ ok: true, message: 'Default content seeded successfully' });
  } catch (error) {
    console.error('Seed content error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
