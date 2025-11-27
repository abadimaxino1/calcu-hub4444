import React, { useEffect, useState } from 'react';

interface ToolCard {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon: string;
  color: string;
  sortOrder: number;
  isFeaturedOnHome: boolean;
  isVisibleOnTools: boolean;
  isPublished: boolean;
}

interface BenefitFeature {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon: string;
  sortOrder: number;
  isPublished: boolean;
}

type ActiveTab = 'tools' | 'features';

export default function ToolsFeaturesPanel() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tools');
  const [tools, setTools] = useState<ToolCard[]>([]);
  const [features, setFeatures] = useState<BenefitFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState<ToolCard | BenefitFeature | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'tools') {
        const response = await fetch('/api/cms/tools/all', { credentials: 'include' });
        const data = await response.json();
        if (response.ok) {
          setTools(data.tools || []);
        } else {
          setError(data.error || 'Failed to fetch tools');
        }
      } else {
        const response = await fetch('/api/cms/features/all', { credentials: 'include' });
        const data = await response.json();
        if (response.ok) {
          setFeatures(data.features || []);
        } else {
          setError(data.error || 'Failed to fetch features');
        }
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (item: Partial<ToolCard | BenefitFeature>) => {
    try {
      const endpoint = activeTab === 'tools' 
        ? (item.id ? `/api/cms/tools/${item.id}` : '/api/cms/tools')
        : (item.id ? `/api/cms/features/${item.id}` : '/api/cms/features');
      const method = item.id ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(item),
      });

      if (response.ok) {
        setIsEditorOpen(false);
        setEditingItem(null);
        fetchData();
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
      const endpoint = activeTab === 'tools' ? `/api/cms/tools/${id}` : `/api/cms/features/${id}`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm('سيتم إضافة البيانات الافتراضية. هل أنت متأكد؟')) return;
    
    setSeeding(true);
    try {
      const response = await fetch('/api/cms/seed', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        alert('تم إضافة البيانات الافتراضية بنجاح');
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to seed defaults');
      }
    } catch (err) {
      alert('Failed to seed defaults');
    } finally {
      setSeeding(false);
    }
  };

  const tabs = [
    { key: 'tools' as const, label: 'الحاسبات (Tools)', icon: '🧮' },
    { key: 'features' as const, label: 'مميزات الموقع (Features)', icon: '✨' },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          {activeTab === 'tools' ? 'إدارة الحاسبات' : 'إدارة المميزات'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition flex items-center gap-2"
          >
            {seeding ? '⏳' : '🌱'}
            <span>تعبئة افتراضية</span>
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setIsEditorOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <span>+</span>
            <span>إضافة جديد</span>
          </button>
        </div>
      </div>

      {/* Loading / Error States */}
      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error}</p>
        </div>
      )}

      {/* Content Lists */}
      {!loading && !error && (
        <>
          {activeTab === 'tools' && (
            <ToolsGrid
              tools={tools}
              onEdit={(tool) => {
                setEditingItem(tool);
                setIsEditorOpen(true);
              }}
              onDelete={handleDelete}
            />
          )}

          {activeTab === 'features' && (
            <FeaturesGrid
              features={features}
              onEdit={(feature) => {
                setEditingItem(feature);
                setIsEditorOpen(true);
              }}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        activeTab === 'tools' ? (
          <ToolEditorModal
            tool={editingItem as ToolCard | null}
            onSave={handleSave}
            onClose={() => {
              setIsEditorOpen(false);
              setEditingItem(null);
            }}
          />
        ) : (
          <FeatureEditorModal
            feature={editingItem as BenefitFeature | null}
            onSave={handleSave}
            onClose={() => {
              setIsEditorOpen(false);
              setEditingItem(null);
            }}
          />
        )
      )}
    </div>
  );
}

// Tools Grid
function ToolsGrid({
  tools,
  onEdit,
  onDelete,
}: {
  tools: ToolCard[];
  onEdit: (tool: ToolCard) => void;
  onDelete: (id: string) => void;
}) {
  if (tools.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-8 text-center text-slate-600">
        لا توجد حاسبات. قم بإضافة حاسبة جديدة أو استخدم التعبئة الافتراضية.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tools.map((tool) => (
        <div
          key={tool.id}
          className={`bg-white rounded-xl shadow p-4 border-2 ${
            tool.isPublished ? 'border-green-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{tool.icon}</span>
              <div>
                <h4 className="font-medium text-slate-800">{tool.titleAr}</h4>
                <p className="text-sm text-slate-500 font-mono" dir="ltr">{tool.slug}</p>
              </div>
            </div>
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                tool.isPublished
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tool.isPublished ? 'منشور' : 'مسودة'}
            </span>
          </div>

          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{tool.descAr}</p>

          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            {tool.isFeaturedOnHome && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">🏠 الرئيسية</span>
            )}
            {tool.isVisibleOnTools && (
              <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded">🔧 الأدوات</span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <button
              onClick={() => onEdit(tool)}
              className="text-blue-600 hover:text-blue-800"
              title="تعديل"
            >
              ✏️
            </button>
            <button
              onClick={() => onDelete(tool.id)}
              className="text-red-600 hover:text-red-800"
              title="حذف"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Features Grid
function FeaturesGrid({
  features,
  onEdit,
  onDelete,
}: {
  features: BenefitFeature[];
  onEdit: (feature: BenefitFeature) => void;
  onDelete: (id: string) => void;
}) {
  if (features.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-8 text-center text-slate-600">
        لا توجد مميزات. قم بإضافة ميزة جديدة أو استخدم التعبئة الافتراضية.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {features.map((feature) => (
        <div
          key={feature.id}
          className={`bg-white rounded-xl shadow p-4 border-2 ${
            feature.isPublished ? 'border-green-200' : 'border-slate-200'
          }`}
        >
          <div className="text-center mb-3">
            <span className="text-3xl">{feature.icon}</span>
            <h4 className="font-medium text-slate-800 mt-2">{feature.titleAr}</h4>
          </div>

          <p className="text-sm text-slate-600 text-center mb-3 line-clamp-2">{feature.descAr}</p>

          <div className="flex items-center justify-center gap-2 pt-2 border-t">
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                feature.isPublished
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {feature.isPublished ? 'منشور' : 'مسودة'}
            </span>
            <button
              onClick={() => onEdit(feature)}
              className="text-blue-600 hover:text-blue-800"
              title="تعديل"
            >
              ✏️
            </button>
            <button
              onClick={() => onDelete(feature.id)}
              className="text-red-600 hover:text-red-800"
              title="حذف"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Tool Editor Modal
function ToolEditorModal({
  tool,
  onSave,
  onClose,
}: {
  tool: ToolCard | null;
  onSave: (tool: Partial<ToolCard>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<ToolCard>>(
    tool || {
      slug: '',
      titleAr: '',
      titleEn: '',
      descAr: '',
      descEn: '',
      icon: '🧮',
      color: 'from-blue-500 to-indigo-600',
      sortOrder: 0,
      isFeaturedOnHome: true,
      isVisibleOnTools: true,
      isPublished: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const colorOptions = [
    { value: 'from-green-500 to-emerald-600', label: 'أخضر' },
    { value: 'from-blue-500 to-indigo-600', label: 'أزرق' },
    { value: 'from-orange-500 to-amber-600', label: 'برتقالي' },
    { value: 'from-purple-500 to-violet-600', label: 'بنفسجي' },
    { value: 'from-red-500 to-rose-600', label: 'أحمر' },
    { value: 'from-cyan-500 to-teal-600', label: 'سماوي' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {tool ? 'تعديل حاسبة' : 'إضافة حاسبة'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">المعرف (Slug)</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg font-mono"
                placeholder="pay, eos, work, dates"
                dir="ltr"
                required
                disabled={!!tool}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الأيقونة</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-center text-2xl"
                placeholder="💰"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">العنوان (عربي)</label>
              <input
                type="text"
                value={formData.titleAr}
                onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">العنوان (إنجليزي)</label>
              <input
                type="text"
                value={formData.titleEn}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                dir="ltr"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الوصف (عربي)</label>
              <textarea
                value={formData.descAr}
                onChange={(e) => setFormData({ ...formData, descAr: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg h-20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الوصف (إنجليزي)</label>
              <textarea
                value={formData.descEn}
                onChange={(e) => setFormData({ ...formData, descEn: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg h-20"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اللون</label>
              <select
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                title="اختر لون الحاسبة"
              >
                {colorOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الترتيب</label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
                min={0}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isFeaturedOnHome}
                onChange={(e) => setFormData({ ...formData, isFeaturedOnHome: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-700">إظهار في الرئيسية</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isVisibleOnTools}
                onChange={(e) => setFormData({ ...formData, isVisibleOnTools: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-700">إظهار في الأدوات</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-700">منشور</span>
            </label>
          </div>

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

// Feature Editor Modal
function FeatureEditorModal({
  feature,
  onSave,
  onClose,
}: {
  feature: BenefitFeature | null;
  onSave: (feature: Partial<BenefitFeature>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<BenefitFeature>>(
    feature || {
      titleAr: '',
      titleEn: '',
      descAr: '',
      descEn: '',
      icon: '✓',
      sortOrder: 0,
      isPublished: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {feature ? 'تعديل ميزة' : 'إضافة ميزة'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الأيقونة</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-center text-2xl"
                placeholder="✓"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الترتيب</label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
                min={0}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">العنوان (عربي)</label>
              <input
                type="text"
                value={formData.titleAr}
                onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">العنوان (إنجليزي)</label>
              <input
                type="text"
                value={formData.titleEn}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                dir="ltr"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الوصف (عربي)</label>
              <textarea
                value={formData.descAr}
                onChange={(e) => setFormData({ ...formData, descAr: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg h-20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الوصف (إنجليزي)</label>
              <textarea
                value={formData.descEn}
                onChange={(e) => setFormData({ ...formData, descEn: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg h-20"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={formData.isPublished}
              onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="isPublished" className="text-sm text-slate-700">
              منشور
            </label>
          </div>

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
