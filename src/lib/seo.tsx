import React from 'react';

type FAQItem = { question: string; answer: string };

export function SeoFAQJsonLD({ faqs }: { faqs: FAQItem[] }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(f => ({
      '@type': 'Question',
      'name': f.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': f.answer
      }
    }))
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
  );
}

export default SeoFAQJsonLD;
