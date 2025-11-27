# SEO Content Requirements

This document lists all pages that need human-written SEO content in both Arabic and English.

## Technical SEO Implementation (Completed ✅)

The following technical SEO features have been implemented:

### hreflang Tags
- ✅ `SeoHead` component automatically generates hreflang tags
- ✅ Supports `ar` and `en` locales
- ✅ Includes `x-default` for search engines
- ✅ Use `generateHreflangAlternates(basePath)` helper

### JSON-LD Structured Data
- ✅ `generateCalculatorJsonLd()` - For calculator pages (WebApplication schema)
- ✅ `generateArticleJsonLd()` - For blog posts (Article schema)
- ✅ `generateFAQJsonLd()` - For FAQ pages (FAQPage schema)

### Sitemap Generation
- ✅ Script at `scripts/generate-sitemap.cjs`
- ✅ Generates both `/ar/` and `/en/` versions of each page
- ⚠️ Run after adding new pages: `node scripts/generate-sitemap.cjs`

### OpenGraph & Twitter Cards
- ✅ Automatically set via `SeoHead` component
- ✅ og:locale set to `ar_SA` or `en_US` based on page language

---

## How to Use This Checklist

For each entry below, you need to provide:

1. **Page Title** (50-60 characters)
2. **Meta Description** (150-160 characters)
3. **H1 Heading** (main visible title)
4. **Body Content** (2-4 paragraphs of descriptive text)
5. **FAQ Items** (3-6 Q&A pairs)
6. **CTA Text** (optional call-to-action)

### Adding Content via Admin Panel

1. Login to `/admin` with your credentials
2. Go to **SEO** tab to configure meta tags per page/locale
3. Go to **Content** tab to add body content and FAQs
4. Ensure both Arabic and English versions are filled

### Database Requirements

For each page, ensure these exist in the database:
- `SeoConfig` with `pageKey` + `locale` = unique (e.g., `calculator-salary` + `ar`)
- `StaticPageContent` with `slug` + `locale` = unique
- `FAQ` entries with `category` + `locale`

---

## Calculator Pages

### 1. Salary Calculator (حاسبة الراتب)

#### Arabic Version
- **Route**: `/ar/calculator/salary`
- **Locale**: `ar`
- **Page Key**: `calculator-salary`
- **Needs**:
  - [ ] Page Title (ar)
  - [ ] Meta Description (ar)
  - [ ] H1 Heading (ar)
  - [ ] Body Content (ar) - 2-4 paragraphs about Saudi salary calculations, GOSI, allowances
  - [ ] FAQ (ar) - 4-6 questions about salary calculations
  - [ ] CTA (ar) - e.g., "احسب راتبك الآن"

#### English Version
- **Route**: `/en/calculator/salary`
- **Locale**: `en`
- **Page Key**: `calculator-salary`
- **Needs**:
  - [ ] Page Title (en)
  - [ ] Meta Description (en)
  - [ ] H1 Heading (en)
  - [ ] Body Content (en) - 2-4 paragraphs about Saudi salary calculations, GOSI, allowances
  - [ ] FAQ (en) - 4-6 questions about salary calculations
  - [ ] CTA (en) - e.g., "Calculate Your Salary Now"

---

### 2. End of Service Calculator (حاسبة نهاية الخدمة)

#### Arabic Version
- **Route**: `/ar/calculator/eos`
- **Locale**: `ar`
- **Page Key**: `calculator-eos`
- **Needs**:
  - [ ] Page Title (ar)
  - [ ] Meta Description (ar)
  - [ ] H1 Heading (ar)
  - [ ] Body Content (ar) - Explain Saudi Labor Law EOS benefits, calculation method
  - [ ] FAQ (ar) - Questions about resignation, termination, service years
  - [ ] CTA (ar)

#### English Version
- **Route**: `/en/calculator/eos`
- **Locale**: `en`
- **Page Key**: `calculator-eos`
- **Needs**:
  - [ ] Page Title (en)
  - [ ] Meta Description (en)
  - [ ] H1 Heading (en)
  - [ ] Body Content (en) - Explain Saudi Labor Law EOS benefits, calculation method
  - [ ] FAQ (en) - Questions about resignation, termination, service years
  - [ ] CTA (en)

---

### 3. Work Hours Calculator (حاسبة ساعات العمل)

#### Arabic Version
- **Route**: `/ar/calculator/workhours`
- **Locale**: `ar`
- **Page Key**: `calculator-workhours`
- **Needs**:
  - [ ] Page Title (ar)
  - [ ] Meta Description (ar)
  - [ ] H1 Heading (ar)
  - [ ] Body Content (ar) - Explain work hour calculations, exit time, breaks
  - [ ] FAQ (ar) - Questions about Saudi work hours, Ramadan hours, overtime
  - [ ] CTA (ar)

#### English Version
- **Route**: `/en/calculator/workhours`
- **Locale**: `en`
- **Page Key**: `calculator-workhours`
- **Needs**:
  - [ ] Page Title (en)
  - [ ] Meta Description (en)
  - [ ] H1 Heading (en)
  - [ ] Body Content (en) - Explain work hour calculations, exit time, breaks
  - [ ] FAQ (en) - Questions about Saudi work hours, Ramadan hours, overtime
  - [ ] CTA (en)

---

### 4. Date Calculator (حاسبة التواريخ)

#### Arabic Version
- **Route**: `/ar/calculator/dates`
- **Locale**: `ar`
- **Page Key**: `calculator-dates`
- **Needs**:
  - [ ] Page Title (ar)
  - [ ] Meta Description (ar)
  - [ ] H1 Heading (ar)
  - [ ] Body Content (ar) - Explain date difference, working days, Hijri conversion
  - [ ] FAQ (ar) - Questions about date calculations, Saudi weekends
  - [ ] CTA (ar)

#### English Version
- **Route**: `/en/calculator/dates`
- **Locale**: `en`
- **Page Key**: `calculator-dates`
- **Needs**:
  - [ ] Page Title (en)
  - [ ] Meta Description (en)
  - [ ] H1 Heading (en)
  - [ ] Body Content (en) - Explain date difference, working days, Hijri conversion
  - [ ] FAQ (en) - Questions about date calculations, Saudi weekends
  - [ ] CTA (en)

---

## Static Pages

### 5. Home Page (الصفحة الرئيسية)

#### Arabic Version
- **Route**: `/ar` or `/`
- **Locale**: `ar`
- **Page Key**: `home`
- **Needs**:
  - [ ] Page Title (ar) - e.g., "حاسبات العمل والرواتب للموظفين في السعودية | Calcu-Hub"
  - [ ] Meta Description (ar)
  - [ ] Hero Title (ar)
  - [ ] Hero Subtitle (ar)
  - [ ] Feature descriptions (ar) - 4 features
  - [ ] CTA (ar)

#### English Version
- **Route**: `/en`
- **Locale**: `en`
- **Page Key**: `home`
- **Needs**:
  - [ ] Page Title (en)
  - [ ] Meta Description (en)
  - [ ] Hero Title (en)
  - [ ] Hero Subtitle (en)
  - [ ] Feature descriptions (en) - 4 features
  - [ ] CTA (en)

---

### 6. Privacy Policy (سياسة الخصوصية)

#### Arabic Version
- **Route**: `/ar/privacy`
- **Locale**: `ar`
- **Page Key**: `privacy`
- **Needs**:
  - [ ] Page Title (ar)
  - [ ] Meta Description (ar)
  - [ ] Full Legal Content (ar) - Privacy policy text

#### English Version
- **Route**: `/en/privacy`
- **Locale**: `en`
- **Page Key**: `privacy`
- **Needs**:
  - [ ] Page Title (en)
  - [ ] Meta Description (en)
  - [ ] Full Legal Content (en) - Privacy policy text

---

### 7. Terms & Conditions (الشروط والأحكام)

#### Arabic Version
- **Route**: `/ar/terms`
- **Locale**: `ar`
- **Page Key**: `terms`
- **Needs**:
  - [ ] Page Title (ar)
  - [ ] Meta Description (ar)
  - [ ] Full Legal Content (ar) - Terms text

#### English Version
- **Route**: `/en/terms`
- **Locale**: `en`
- **Page Key**: `terms`
- **Needs**:
  - [ ] Page Title (en)
  - [ ] Meta Description (en)
  - [ ] Full Legal Content (en) - Terms text

---

### 8. About Page (عن الموقع)

#### Arabic Version
- **Route**: `/ar/about`
- **Locale**: `ar`
- **Page Key**: `about`
- **Needs**:
  - [ ] Page Title (ar)
  - [ ] Meta Description (ar)
  - [ ] About Content (ar) - Company/project description, mission

#### English Version
- **Route**: `/en/about`
- **Locale**: `en`
- **Page Key**: `about`
- **Needs**:
  - [ ] Page Title (en)
  - [ ] Meta Description (en)
  - [ ] About Content (en) - Company/project description, mission

---

### 9. FAQ Page (الأسئلة الشائعة)

#### Arabic Version
- **Route**: `/ar/faq`
- **Locale**: `ar`
- **Page Key**: `faq`
- **Needs**:
  - [ ] Page Title (ar)
  - [ ] Meta Description (ar)
  - [ ] 10-15 General FAQs (ar) - About the site, calculators, Saudi labor law

#### English Version
- **Route**: `/en/faq`
- **Locale**: `en`
- **Page Key**: `faq`
- **Needs**:
  - [ ] Page Title (en)
  - [ ] Meta Description (en)
  - [ ] 10-15 General FAQs (en) - About the site, calculators, Saudi labor law

---

### 10. Tools Page (الأدوات)

#### Arabic Version
- **Route**: `/ar/tools`
- **Locale**: `ar`
- **Page Key**: `tools`
- **Needs**:
  - [ ] Page Title (ar)
  - [ ] Meta Description (ar)
  - [ ] Tools listing/description (ar)

#### English Version
- **Route**: `/en/tools`
- **Locale**: `en`
- **Page Key**: `tools`
- **Needs**:
  - [ ] Page Title (en)
  - [ ] Meta Description (en)
  - [ ] Tools listing/description (en)

---

## Blog Pages

### 11. Blog Index (المدونة)

#### Arabic Version
- **Route**: `/ar/blog`
- **Locale**: `ar`
- **Page Key**: `blog`
- **Needs**:
  - [ ] Page Title (ar)
  - [ ] Meta Description (ar)
  - [ ] Intro paragraph (ar)

#### English Version
- **Route**: `/en/blog`
- **Locale**: `en`
- **Page Key**: `blog`
- **Needs**:
  - [ ] Page Title (en)
  - [ ] Meta Description (en)
  - [ ] Intro paragraph (en)

---

### 12. Blog Posts (Already Seeded)

The following blog posts exist in the database and need content review:

#### 12.1 Understanding GOSI (فهم التأمينات الاجتماعية)
- **Slug**: `understanding-gosi`
- **Locale**: `ar` / `en`
- **Needs**:
  - [ ] Full article content (ar)
  - [ ] Full article content (en)
  - [ ] Meta description (ar/en)

#### 12.2 End of Service Rights (حقوق نهاية الخدمة)
- **Slug**: `end-of-service-rights`
- **Locale**: `ar` / `en`
- **Needs**:
  - [ ] Full article content (ar)
  - [ ] Full article content (en)
  - [ ] Meta description (ar/en)

#### 12.3 Work Hours in Saudi Arabia (ساعات العمل في السعودية)
- **Slug**: `work-hours-saudi`
- **Locale**: `ar` / `en`
- **Needs**:
  - [ ] Full article content (ar)
  - [ ] Full article content (en)
  - [ ] Meta description (ar/en)

---

## SEO Technical Requirements

### For All Pages

- [ ] Open Graph Image (1200x630px) - General site OG image
- [ ] Calculator-specific OG images (optional but recommended)
- [ ] JSON-LD structured data for:
  - [ ] Organization
  - [ ] WebSite with SearchAction
  - [ ] FAQPage for FAQ sections
  - [ ] SoftwareApplication for calculators
  - [ ] Article for blog posts

### Hreflang Setup

For each page, ensure these are set:
```html
<link rel="alternate" hreflang="ar" href="https://calcuhub.com/ar/page" />
<link rel="alternate" hreflang="en" href="https://calcuhub.com/en/page" />
<link rel="alternate" hreflang="x-default" href="https://calcuhub.com/ar/page" />
```

---

## Content Guidelines

### Arabic Content
- Use Modern Standard Arabic (فصحى) with simple vocabulary
- Include relevant Saudi-specific terms
- Use appropriate formal tone for legal pages

### English Content
- Write for international audience
- Explain Saudi-specific terms (GOSI, EOS)
- Use clear, professional language

### SEO Best Practices
- Include target keywords naturally
- Use structured headings (H1, H2, H3)
- Keep paragraphs short (3-4 sentences)
- Include internal links to related calculators
- Add schema markup for rich results

---

## Priority Order

1. **High Priority** (Do First):
   - Home page (ar/en)
   - Salary Calculator (ar/en)
   - EOS Calculator (ar/en)
   - Privacy Policy (ar/en)
   - Terms (ar/en)

2. **Medium Priority**:
   - Work Hours Calculator (ar/en)
   - Date Calculator (ar/en)
   - FAQ page (ar/en)
   - About page (ar/en)

3. **Lower Priority**:
   - Tools page (ar/en)
   - Blog index (ar/en)
   - Individual blog posts

---

## Adding Content

### Via Admin Panel

1. Login to `/admin`
2. Go to **Content** → **Static Pages**
3. Select page and locale
4. Edit content
5. Go to **SEO** → Edit corresponding SEO config

### Via Seed Script

Edit `scripts/seed-db-direct.cjs` and re-run:
```bash
node scripts/seed-db-direct.cjs
```

---

## Example Content Format

When providing content, use this format:

```markdown
## Page: calculator-salary
## Locale: ar

### Title
حاسبة الراتب في السعودية - احسب صافي راتبك بعد التأمينات | Calcu-Hub

### Meta Description
احسب صافي راتبك الشهري بعد خصم التأمينات الاجتماعية. حاسبة دقيقة تدعم السعوديين وغير السعوديين مع حساب البدلات والساعات الإضافية.

### H1
حاسبة الراتب الشهري

### Body
[2-4 paragraphs here...]

### FAQ
**س: كيف يتم حساب التأمينات الاجتماعية؟**
ج: يتم خصم 9.75% من الراتب الأساسي وبدل السكن للموظف السعودي...

**س: هل يتم خصم التأمينات من غير السعوديين؟**
ج: لا، الموظف غير السعودي لا يُخصم منه نسبة التأمينات...

[More FAQs...]

### CTA
احسب راتبك الآن
```

---

## Tracking Progress

Update this file by marking completed items:

```markdown
- [x] Page Title (ar) ✓ Added 2024-01-15
```

---

*Last Updated: November 2025*
