import React, { useEffect, useState } from 'react';

interface SeoConfig {
  id: string;
  pagePath: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  keywords: string;
  ogImage: string;
  canonicalUrl: string;
  noIndex: boolean;
  noFollow: boolean;
  structuredData: string;
  updatedAt: string;
}

export default function SeoPanel() {
  const [configs, setConfigs] = useState<SeoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingConfig, setEditingConfig] = useState<SeoConfig | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [sitemapStatus, setSitemapStatus] = useState<any>(null);

  useEffect(() => {
    fetchConfigs();
    fetchSitemapStatus();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/seo/configs', { credentials: 'include' });
      const data = await response.json();
      if (response.ok) {
        setConfigs(data.configs || []);
      } else {
        setError(data.error || 'Failed to fetch SEO configs');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const fetchSitemapStatus = async () => {
    try {
      const response = await fetch('/api/seo/sitemap/status', { credentials: 'include' });
      const data = await response.json();
      setSitemapStatus(data);
    } catch (err) {
      console.error('Failed to fetch sitemap status');
    }
  };

  const handleSave = async (config: SeoConfig) => {
    try {
      const method = config.id ? 'PUT' : 'POST';
      const endpoint = config.id ? `/api/seo/configs/${config.id}` : '/api/seo/configs';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setIsEditorOpen(false);
        setEditingConfig(null);
        fetchConfigs();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save');
      }
    } catch (err) {
      alert('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;

    try {
      const response = await fetch(`/api/seo/configs/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchConfigs();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleRegenerateSitemap = async () => {
    try {
      const response = await fetch('/api/seo/sitemap/regenerate', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        alert('تم إعادة إنشاء خريطة الموقع بنجاح');
        fetchSitemapStatus();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to regenerate sitemap');
      }
    } catch (err) {
      alert('Failed to regenerate sitemap');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">إعدادات SEO</h2>
        <button
          onClick={() => {
            setEditingConfig(null);
            setIsEditorOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <span>+</span>
          <span>إضافة إعداد</span>
        </button>
      </div>

      {/* Sitemap Status Card */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">خريطة الموقع (Sitemap)</h3>
            <p className="text-green-100 text-sm">
              آخر تحديث: {sitemapStatus?.lastGenerated || 'غير معروف'}
            </p>
            <p className="text-green-100 text-sm">
              عدد الروابط: {sitemapStatus?.urlCount || 0}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleRegenerateSitemap}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition"
            >
              إعادة الإنشاء
            </button>
            <a
              href="/sitemap.xml"
              target="_blank"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm text-center transition"
            >
              عرض الخريطة
            </a>
          </div>
        </div>
      </div>

      {/* Quick SEO Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              📄
            </div>
            <div>
              <p className="text-sm text-slate-600">صفحات مُعدّة</p>
              <p className="text-xl font-bold text-slate-900">{configs.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              ✅
            </div>
            <div>
              <p className="text-sm text-slate-600">مُفهرسة</p>
              <p className="text-xl font-bold text-slate-900">
                {configs.filter((c) => !c.noIndex).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center">
              🖼️
            </div>
            <div>
              <p className="text-sm text-slate-600">بها OG Image</p>
              <p className="text-xl font-bold text-slate-900">
                {configs.filter((c) => c.ogImage).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              📊
            </div>
            <div>
              <p className="text-sm text-slate-600">Structured Data</p>
              <p className="text-xl font-bold text-slate-900">
                {configs.filter((c) => c.structuredData).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error}</p>
        </div>
      )}

      {/* Configs Table */}
      {configs.length === 0 ? (
        <div className="bg-slate-50 rounded-lg p-8 text-center text-slate-600">
          لا توجد إعدادات SEO. قم بإضافة إعداد جديد.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المسار</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">العنوان</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">آخر تحديث</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {configs.map((config) => (
                <tr key={config.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono" dir="ltr">
                    {config.pagePath}
                  </td>
                  <td className="px-4 py-3 text-sm">{config.titleAr || config.titleEn}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {config.noIndex && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded">
                          noIndex
                        </span>
                      )}
                      {config.noFollow && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-600 rounded">
                          noFollow
                        </span>
                      )}
                      {!config.noIndex && !config.noFollow && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded">
                          مُفهرس
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {new Date(config.updatedAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setEditingConfig(config);
                        setIsEditorOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 mx-1"
                      title="تعديل"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="text-red-600 hover:text-red-800 mx-1"
                      title="حذف"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SEO Tips */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">نصائح SEO</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div className="flex items-start gap-2">
            <span>💡</span>
            <span>استخدم عناوين فريدة لكل صفحة (50-60 حرف)</span>
          </div>
          <div className="flex items-start gap-2">
            <span>💡</span>
            <span>اكتب أوصاف meta جذابة (150-160 حرف)</span>
          </div>
          <div className="flex items-start gap-2">
            <span>💡</span>
            <span>أضف صورة OG لكل صفحة للمشاركة على السوشيال</span>
          </div>
          <div className="flex items-start gap-2">
            <span>💡</span>
            <span>استخدم Structured Data للحاسبات والأسئلة الشائعة</span>
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <SeoEditorModal
          config={editingConfig}
          onSave={handleSave}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingConfig(null);
          }}
        />
      )}
    </div>
  );
}

// SEO Editor Modal
function SeoEditorModal({
  config,
  onSave,
  onClose,
}: {
  config: SeoConfig | null;
  onSave: (config: SeoConfig) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<SeoConfig>>(
    config || {
      pagePath: '',
      titleAr: '',
      titleEn: '',
      descriptionAr: '',
      descriptionEn: '',
      keywords: '',
      ogImage: '',
      canonicalUrl: '',
      noIndex: false,
      noFollow: false,
      structuredData: '',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as SeoConfig);
  };

  // Character counters
  const titleArLength = formData.titleAr?.length || 0;
  const titleEnLength = formData.titleEn?.length || 0;
  const descArLength = formData.descriptionAr?.length || 0;
  const descEnLength = formData.descriptionEn?.length || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {config ? 'تعديل إعداد SEO' : 'إضافة إعداد SEO'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Page Path */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">مسار الصفحة</label>
            <input
              type="text"
              value={formData.pagePath}
              onChange={(e) => setFormData({ ...formData, pagePath: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg font-mono"
              placeholder="/calculators/salary"
              dir="ltr"
              required
            />
          </div>

          {/* Titles */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                العنوان (عربي)
                <span className={`float-left ${titleArLength > 60 ? 'text-red-500' : 'text-slate-400'}`}>
                  {titleArLength}/60
                </span>
              </label>
              <input
                type="text"
                value={formData.titleAr}
                onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                العنوان (إنجليزي)
                <span className={`float-left ${titleEnLength > 60 ? 'text-red-500' : 'text-slate-400'}`}>
                  {titleEnLength}/60
                </span>
              </label>
              <input
                type="text"
                value={formData.titleEn}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                dir="ltr"
              />
            </div>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                الوصف (عربي)
                <span className={`float-left ${descArLength > 160 ? 'text-red-500' : 'text-slate-400'}`}>
                  {descArLength}/160
                </span>
              </label>
              <textarea
                value={formData.descriptionAr}
                onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg h-24"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                الوصف (إنجليزي)
                <span className={`float-left ${descEnLength > 160 ? 'text-red-500' : 'text-slate-400'}`}>
                  {descEnLength}/160
                </span>
              </label>
              <textarea
                value={formData.descriptionEn}
                onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg h-24"
                dir="ltr"
              />
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الكلمات المفتاحية</label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="حاسبة الراتب, راتب سعودي, GOSI"
            />
            <p className="text-xs text-slate-500 mt-1">فصل بفاصلة</p>
          </div>

          {/* OG Image & Canonical */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">صورة OG</label>
              <input
                type="text"
                value={formData.ogImage}
                onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="https://example.com/og-image.png"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Canonical URL</label>
              <input
                type="text"
                value={formData.canonicalUrl}
                onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="https://calcuhub.com/page"
                dir="ltr"
              />
            </div>
          </div>

          {/* Robots */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.noIndex}
                onChange={(e) => setFormData({ ...formData, noIndex: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-700">noIndex (عدم الفهرسة)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.noFollow}
                onChange={(e) => setFormData({ ...formData, noFollow: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-700">noFollow (عدم تتبع الروابط)</span>
            </label>
          </div>

          {/* Structured Data */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Structured Data (JSON-LD)
            </label>
            <textarea
              value={formData.structuredData}
              onChange={(e) => setFormData({ ...formData, structuredData: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg h-40 font-mono text-sm"
              placeholder='{"@context": "https://schema.org", "@type": "FAQPage", ...}'
              dir="ltr"
            />
          </div>

          {/* Preview */}
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-700 mb-2">معاينة Google</p>
            <div className="bg-white rounded border p-3">
              <p className="text-blue-700 text-lg hover:underline cursor-pointer line-clamp-1">
                {formData.titleAr || 'عنوان الصفحة'}
              </p>
              <p className="text-green-700 text-sm" dir="ltr">
                calcuhub.com{formData.pagePath || '/page'}
              </p>
              <p className="text-slate-600 text-sm line-clamp-2">
                {formData.descriptionAr || 'وصف الصفحة سيظهر هنا...'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
