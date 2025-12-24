import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Save, 
  Send, 
  Eye, 
  History, 
  Globe, 
  Settings, 
  ChevronDown, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileJson,
  Layout,
  HelpCircle,
  ShieldCheck,
  FileText
} from 'lucide-react';

interface CmsVersion {
  id: string;
  versionNumber: number;
  locale: 'ar' | 'en';
  title: string;
  description: string | null;
  bodyRichJson: string | null;
  examplesJson: string | null;
  faqJson: string | null;
  legalNotes: string | null;
  seoOverridesJson: string | null;
  createdAt: string;
}

interface CmsPage {
  id: string;
  slug: string;
  pageType: string;
  status: string;
  currentVersionId: string | null;
  versions: CmsVersion[];
}

interface EditorProps {
  pageId: string;
  onBack: () => void;
}

export const CmsEditorPanel: React.FC<EditorProps> = ({ pageId, onBack }) => {
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLocale, setActiveLocale] = useState<'ar' | 'en'>('ar');
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'faq' | 'history'>('content');
  const [formData, setFormData] = useState<Partial<CmsVersion>>({
    title: '',
    description: '',
    bodyRichJson: '',
    examplesJson: '',
    faqJson: '',
    legalNotes: '',
    seoOverridesJson: ''
  });
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchPage();
  }, [pageId]);

  const fetchPage = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cms/pages/${pageId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPage(data);
        // Load latest version for active locale into form
        const latest = data.versions.find((v: CmsVersion) => v.locale === activeLocale);
        if (latest) {
          setFormData(latest);
        } else {
          setFormData({ title: '', description: '', bodyRichJson: '', examplesJson: '', faqJson: '', legalNotes: '', seoOverridesJson: '' });
        }
      }
    } catch (e) {
      console.error('Failed to fetch page', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (page) {
      const latest = page.versions.find(v => v.locale === activeLocale);
      if (latest) setFormData(latest);
      else setFormData({ title: '', description: '', bodyRichJson: '', examplesJson: '', faqJson: '', legalNotes: '', seoOverridesJson: '' });
    }
  }, [activeLocale]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/cms/pages/${pageId}/versions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify({ ...formData, locale: activeLocale })
      });
      if (res.ok) {
        alert('تم حفظ النسخة الجديدة بنجاح');
        fetchPage();
      }
    } catch (e) {
      alert('خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (versionId: string) => {
    if (!confirm('هل أنت متأكد من نشر هذه النسخة؟ سيتم تحديث المحتوى المباشر فوراً.')) return;
    try {
      const res = await fetch(`/api/cms/pages/${pageId}/publish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify({ versionId })
      });
      if (res.ok) {
        alert('تم النشر بنجاح');
        fetchPage();
      }
    } catch (e) {
      alert('خطأ في النشر');
    }
  };

  const handlePreview = async () => {
    try {
      const res = await fetch(`/api/cms/pages/${pageId}/preview`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) {
        const { token } = await res.json();
        const url = `${window.location.origin}/preview/${token}`;
        setPreviewUrl(url);
        window.open(url, '_blank');
      }
    } catch (e) {
      alert('خطأ في توليد رابط المعاينة');
    }
  };

  if (loading || !page) return <div className="p-8 text-center">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            title="Back to list"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {page.slug}
              <span className={`text-xs px-2 py-0.5 rounded-full ${page.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                {page.status === 'published' ? 'منشور' : 'مسودة'}
              </span>
            </h2>
            <p className="text-sm text-slate-500">إدارة المحتوى و SEO لصفحة {page.pageType}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handlePreview}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <Eye className="w-4 h-4" />
            معاينة
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ كنسخة جديدة'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                اللغة
              </h3>
            </div>
            <div className="p-2 space-y-1">
              <button 
                onClick={() => setActiveLocale('ar')}
                className={`w-full text-right px-4 py-2 rounded-lg transition ${activeLocale === 'ar' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
              >
                العربية (AR)
              </button>
              <button 
                onClick={() => setActiveLocale('en')}
                className={`w-full text-right px-4 py-2 rounded-lg transition ${activeLocale === 'en' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
              >
                English (EN)
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-semibold flex items-center gap-2">
                <Layout className="w-4 h-4 text-blue-500" />
                الأقسام
              </h3>
            </div>
            <div className="p-2 space-y-1">
              {[
                { id: 'content', label: 'المحتوى الأساسي', icon: FileText },
                { id: 'seo', label: 'إعدادات SEO', icon: Settings },
                { id: 'faq', label: 'الأسئلة الشائعة', icon: HelpCircle },
                { id: 'history', label: 'سجل النسخ', icon: History },
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-right px-4 py-2 rounded-lg transition flex items-center gap-2 ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'content' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">عنوان الصفحة</label>
                <input 
                  type="text" 
                  value={formData.title || ''}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="أدخل عنوان الصفحة..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">وصف مختصر</label>
                <textarea 
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20 h-24"
                  placeholder="وصف يظهر في نتائج البحث..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">المحتوى الغني (JSON)</label>
                <textarea 
                  value={formData.bodyRichJson || ''}
                  onChange={(e) => setFormData({...formData, bodyRichJson: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20 h-64 font-mono text-sm"
                  placeholder='{"blocks": [...]}'
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="legal-notes">ملاحظات قانونية</label>
                <textarea 
                  id="legal-notes"
                  value={formData.legalNotes || ''}
                  onChange={(e) => setFormData({...formData, legalNotes: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20 h-24"
                  placeholder="ملاحظات قانونية تظهر في أسفل الصفحة..."
                />
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                تجاوز إعدادات SEO التلقائية
              </h3>
              <div>
                <label className="block text-sm font-medium mb-2">SEO Overrides (JSON)</label>
                <textarea 
                  value={formData.seoOverridesJson || ''}
                  onChange={(e) => setFormData({...formData, seoOverridesJson: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20 h-64 font-mono text-sm"
                  placeholder='{"canonical": "...", "ogTitle": "..."}'
                />
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                الأسئلة الشائعة (Schema.org FAQ)
              </h3>
              <div>
                <label className="block text-sm font-medium mb-2">FAQ Data (JSON)</label>
                <textarea 
                  value={formData.faqJson || ''}
                  onChange={(e) => setFormData({...formData, faqJson: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20 h-64 font-mono text-sm"
                  placeholder='[{"q": "...", "a": "..."}]'
                />
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-right">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold">النسخة</th>
                    <th className="px-6 py-4 text-sm font-semibold">اللغة</th>
                    <th className="px-6 py-4 text-sm font-semibold">التاريخ</th>
                    <th className="px-6 py-4 text-sm font-semibold">الحالة</th>
                    <th className="px-6 py-4 text-sm font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {page.versions.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium">v{v.versionNumber}</td>
                      <td className="px-6 py-4 text-sm uppercase">{v.locale}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(v.createdAt).toLocaleString('ar-SA')}
                      </td>
                      <td className="px-6 py-4">
                        {page.currentVersionId === v.id ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            منشورة حالياً
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">أرشيف</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => setFormData(v)}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            استعادة للمحرر
                          </button>
                          {page.currentVersionId !== v.id && (
                            <button 
                              onClick={() => handlePublish(v.id)}
                              className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition"
                            >
                              نشر هذه النسخة
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CmsEditorPanel;
