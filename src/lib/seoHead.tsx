import React, { useEffect } from 'react';

interface SeoHeadProps {
  title: string;
  description?: string;
  canonicalUrl?: string;
  locale?: string;
  alternateLocales?: Array<{ locale: string; url: string }>;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  jsonLd?: object;
  noIndex?: boolean;
}

export default function SeoHead({ 
  title, 
  description,
  canonicalUrl,
  locale = 'ar',
  alternateLocales,
  ogTitle,
  ogDescription,
  ogImage,
  jsonLd,
  noIndex = false,
}: SeoHeadProps) {
  useEffect(() => {
    // Set title
    if (title) document.title = title;
    
    // Set description
    if (description) {
      setMeta('description', description);
    }

    // Set canonical URL
    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonicalUrl);
    }

    // Set robots
    if (noIndex) {
      setMeta('robots', 'noindex, nofollow');
    }

    // Set Open Graph tags
    setMeta('og:title', ogTitle || title, 'property');
    setMeta('og:description', ogDescription || description || '', 'property');
    if (ogImage) setMeta('og:image', ogImage, 'property');
    setMeta('og:locale', locale === 'ar' ? 'ar_SA' : 'en_US', 'property');

    // Set Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', ogTitle || title);
    setMeta('twitter:description', ogDescription || description || '');
    if (ogImage) setMeta('twitter:image', ogImage);

    // Set hreflang tags
    removeHreflangLinks();
    if (alternateLocales && alternateLocales.length > 0) {
      alternateLocales.forEach(alt => {
        const link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', alt.locale);
        link.setAttribute('href', alt.url);
        link.setAttribute('data-seo-head', 'true');
        document.head.appendChild(link);
      });

      // Add x-default (usually points to the primary language)
      const defaultLink = document.createElement('link');
      defaultLink.setAttribute('rel', 'alternate');
      defaultLink.setAttribute('hreflang', 'x-default');
      defaultLink.setAttribute('href', alternateLocales[0]?.url || canonicalUrl || window.location.href);
      defaultLink.setAttribute('data-seo-head', 'true');
      document.head.appendChild(defaultLink);
    }

    // Set JSON-LD structured data
    removeJsonLd();
    
    const schemas = [];
    
    // Site-wide Organization schema
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'Calcu-Hub',
      'url': window.location.origin,
      'logo': `${window.location.origin}/logo.png`,
    });

    // Site-wide WebSite schema
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'Calcu-Hub',
      'url': window.location.origin,
    });

    if (jsonLd) {
      schemas.push(jsonLd);
    }

    schemas.forEach(schema => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-head', 'true');
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    // Cleanup on unmount
    return () => {
      removeHreflangLinks();
      removeJsonLd();
    };
  }, [title, description, canonicalUrl, locale, alternateLocales, ogTitle, ogDescription, ogImage, jsonLd, noIndex]);

  return null;
}

// Helper to set meta tags
function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  if (!content) return;
  
  let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

// Remove hreflang links added by this component
function removeHreflangLinks() {
  document.querySelectorAll('link[data-seo-head="true"]').forEach(el => el.remove());
}

// Remove JSON-LD scripts added by this component
function removeJsonLd() {
  document.querySelectorAll('script[data-seo-head="true"]').forEach(el => el.remove());
}

// Generate JSON-LD for a calculator page
export function generateCalculatorJsonLd(options: {
  name: string;
  description: string;
  url: string;
  locale: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: options.name,
    description: options.description,
    url: options.url,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    inLanguage: options.locale,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'SAR',
    },
    provider: {
      '@type': 'Organization',
      name: 'Calcu-Hub',
      url: 'https://calcuhub.com',
    },
  };
}

// Generate JSON-LD for a blog article
export function generateArticleJsonLd(options: {
  headline: string;
  description: string;
  url: string;
  imageUrl?: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  locale: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: options.headline,
    description: options.description,
    url: options.url,
    image: options.imageUrl,
    datePublished: options.datePublished,
    dateModified: options.dateModified || options.datePublished,
    inLanguage: options.locale,
    author: {
      '@type': 'Person',
      name: options.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Calcu-Hub',
      url: 'https://calcuhub.com',
    },
  };
}

// Generate JSON-LD for FAQ page
export function generateFAQJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// Generate hreflang alternates for a page
export function generateHreflangAlternates(
  basePath: string,
  baseUrl: string = 'https://calcuhub.com'
): Array<{ locale: string; url: string }> {
  return [
    { locale: 'ar', url: `${baseUrl}/ar${basePath}` },
    { locale: 'en', url: `${baseUrl}/en${basePath}` },
  ];
}
