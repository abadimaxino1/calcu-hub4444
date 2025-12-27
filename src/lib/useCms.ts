import { useState, useEffect } from 'react';
import { useLocale } from '../i18n';

interface CmsContent {
  title: string;
  description: string;
  bodyRichJson: any;
  examplesJson: any;
  faqJson: any;
  legalNotes: string;
  seoOverrides: any;
}

export function useCms(slug: string) {
  const { locale } = useLocale();
  const [content, setContent] = useState<CmsContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContent() {
      setLoading(true);
      try {
        // Check if we are in preview mode (token in URL)
        const urlParams = new URLSearchParams(window.location.search);
        const previewToken = urlParams.get('preview_token');
        
        let url = `/api/content/cms/${slug}?locale=${locale}`;
        if (previewToken) {
          url = `/api/content/preview/${previewToken}`;
        }

        const res = await fetch(url, {
          headers: { 'Accept-Language': locale }
        });
        if (res.ok) {
          const data = await res.json();
          setContent({
            title: data.title,
            description: data.description,
            bodyRichJson: data.bodyRichJson ? JSON.parse(data.bodyRichJson) : null,
            examplesJson: data.examplesJson ? JSON.parse(data.examplesJson) : null,
            faqJson: data.faqJson ? JSON.parse(data.faqJson) : null,
            legalNotes: data.legalNotes,
            seoOverrides: data.seoOverridesJson ? JSON.parse(data.seoOverridesJson) : null,
          });
        } else {
          setError('Content not found');
        }
      } catch (e) {
        setError('Failed to fetch content');
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [slug, locale]);

  return { content, loading, error };
}
