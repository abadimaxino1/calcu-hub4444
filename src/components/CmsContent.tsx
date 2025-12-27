import React from 'react';
import { useCms } from '../lib/useCms';
import CalculatorFAQ from './CalculatorFAQ';
import { useTranslation } from '../i18n';

interface CmsContentProps {
  slug: string;
  fallbackFaqs?: { question: string; answer: string }[];
  fallbackTitle?: string;
}

export const CmsContent: React.FC<CmsContentProps> = ({ slug, fallbackFaqs, fallbackTitle }) => {
  const { content, loading } = useCms(slug);
  const { t } = useTranslation();

  if (loading) return <div className="animate-pulse h-20 bg-slate-100 rounded-xl" />;

  const faqs = content?.faqJson || fallbackFaqs || [];
  const title = content?.title || fallbackTitle;

  return (
    <div className="space-y-8">
      {content?.bodyRichJson && (
        <div className="prose prose-slate dark:prose-invert max-w-none">
          {/* Simple renderer for rich JSON - can be expanded */}
          {Array.isArray(content.bodyRichJson.blocks) ? content.bodyRichJson.blocks.map((block: any, i: number) => {
            if (block.type === 'paragraph') return <p key={i}>{block.data.text}</p>;
            if (block.type === 'header') {
              const Tag = `h${block.data.level || 2}` as any;
              return <Tag key={i}>{block.data.text}</Tag>;
            }
            return null;
          }) : (
            <div dangerouslySetInnerHTML={{ __html: content.bodyRichJson }} />
          )}
        </div>
      )}

      {faqs.length > 0 && (
        <CalculatorFAQ 
          faqs={faqs} 
          title={title ? `${t('faq_about')} ${title}` : t('faq')} 
        />
      )}

      {content?.legalNotes && (
        <p className="text-xs text-slate-500 mt-4 italic border-t pt-4">
          {content.legalNotes}
        </p>
      )}
    </div>
  );
};

export default CmsContent;
