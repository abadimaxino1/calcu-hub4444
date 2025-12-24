import React, { useState, useEffect } from 'react';
import { useLocale } from '../../i18n';
import { Eye, AlertTriangle, ArrowLeft } from 'lucide-react';

interface PreviewData {
  title: string;
  description: string;
  bodyRichJson: string;
  examplesJson: string;
  faqJson: string;
  legalNotes: string;
  seoOverridesJson: string;
  locale: string;
  slug: string;
  pageType: string;
}

export const PreviewPage: React.FC<{ lang: 'ar' | 'en' }> = ({ lang }) => {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreview = async () => {
      const token = window.location.pathname.split('/').pop();
      if (!token) {
        setError('Invalid token');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/content/preview/${token}`, {
          headers: { 'Accept-Language': lang }
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setError('Preview expired or invalid');
        }
      } catch (e) {
        setError('Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-slate-600">{lang === 'ar' ? 'جاري تحميل المعاينة...' : 'Loading preview...'}</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'خطأ في المعاينة' : 'Preview Error'}</h1>
        <p className="text-slate-600">{error}</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Preview Banner */}
      <div className="bg-amber-50 border-b border-amber-200 py-2 px-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
            <Eye className="w-4 h-4" />
            {lang === 'ar' ? 'وضع المعاينة: هذه النسخة غير منشورة' : 'Preview Mode: This version is not published'}
          </div>
          <div className="text-xs text-amber-600 uppercase font-bold">
            {data.locale} | {data.pageType}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900">{data.title}</h1>
          <p className="text-xl text-slate-600 leading-relaxed">{data.description}</p>
        </div>

        {data.bodyRichJson && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 prose prose-slate dark:prose-invert max-w-none">
            {/* Simple renderer */}
            {(() => {
              try {
                const rich = JSON.parse(data.bodyRichJson);
                if (rich.blocks) {
                  return rich.blocks.map((block: any, i: number) => {
                    if (block.type === 'paragraph') return <p key={i} dangerouslySetInnerHTML={{ __html: block.data.text }} />;
                    if (block.type === 'header') {
                      const Tag = `h${block.data.level || 2}` as any;
                      return <Tag key={i} dangerouslySetInnerHTML={{ __html: block.data.text }} />;
                    }
                    return null;
                  });
                }
              } catch (e) {
                return <div dangerouslySetInnerHTML={{ __html: data.bodyRichJson }} />;
              }
            })()}
          </div>
        )}

        {data.faqJson && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}</h2>
            <div className="grid gap-4">
              {(() => {
                try {
                  const faqs = JSON.parse(data.faqJson);
                  return faqs.map((faq: any, i: number) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6">
                      <h3 className="font-bold text-slate-900 mb-2">{faq.q}</h3>
                      <p className="text-slate-600">{faq.a}</p>
                    </div>
                  ));
                } catch (e) { return null; }
              })()}
            </div>
          </div>
        )}

        {data.legalNotes && (
          <div className="text-sm text-slate-500 italic border-t pt-8">
            {data.legalNotes}
          </div>
        )}
      </main>
    </div>
  );
};

export default PreviewPage;
