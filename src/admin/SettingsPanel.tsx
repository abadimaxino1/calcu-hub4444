import React, { useEffect, useState } from 'react';

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description: string;
}

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
  enabledForRoles: string[];
  metadata: string;
}

export default function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<'settings' | 'features' | 'maintenance'>('settings');
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'settings') {
        const response = await fetch('/api/system/settings', { credentials: 'include' });
        const data = await response.json();
        if (response.ok) {
          setSettings(data.settings || []);
        }
      } else if (activeTab === 'features') {
        const response = await fetch('/api/system/features', { credentials: 'include' });
        const data = await response.json();
        if (response.ok) {
          setFeatures(data.features || []);
        }
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: any) => {
    try {
      const response = await fetch(`/api/system/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ value }),
      });

      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update');
      }
    } catch (err) {
      alert('Failed to update');
    }
  };

  const handleToggleFeature = async (feature: FeatureFlag) => {
    try {
      const response = await fetch(`/api/system/features/${feature.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isEnabled: !feature.isEnabled }),
      });

      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update');
      }
    } catch (err) {
      alert('Failed to update');
    }
  };

  const tabs = [
    { key: 'settings' as const, label: 'الإعدادات', icon: '⚙️' },
    { key: 'features' as const, label: 'الميزات', icon: '🚀' },
    { key: 'maintenance' as const, label: 'الصيانة', icon: '🔧' },
  ];

  // Group settings by category
  const groupedSettings = settings.reduce((acc, setting) => {
    const cat = setting.category || 'عام';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(setting);
    return acc;
  }, {} as Record<string, SystemSetting[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error}</p>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {Object.entries(groupedSettings).map(([category, categorySettings]) => (
            <div key={category} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 font-semibold text-slate-700 border-b">
                {category}
              </div>
              <div className="divide-y divide-slate-100">
                {categorySettings.map((setting) => (
                  <div key={setting.id} className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{setting.key}</p>
                      <p className="text-sm text-slate-600">{setting.description}</p>
                    </div>
                    <div className="mr-4">
                      {setting.type === 'boolean' ? (
                        <button
                          onClick={() => handleUpdateSetting(setting.key, setting.value !== 'true')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            setting.value === 'true' ? 'bg-blue-600' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              setting.value === 'true' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      ) : setting.type === 'number' ? (
                        <input
                          type="number"
                          value={setting.value}
                          onChange={(e) => handleUpdateSetting(setting.key, e.target.value)}
                          className="w-24 px-2 py-1 border rounded text-center"
                        />
                      ) : (
                        <input
                          type="text"
                          value={setting.value}
                          onChange={(e) => handleUpdateSetting(setting.key, e.target.value)}
                          className="w-48 px-2 py-1 border rounded"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {settings.length === 0 && (
            <div className="bg-slate-50 rounded-lg p-8 text-center text-slate-600">
              لا توجد إعدادات.
            </div>
          )}
        </div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Feature Flags</h3>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
              <span>+</span>
              <span>إضافة ميزة</span>
            </button>
          </div>

          {features.length === 0 ? (
            <div className="bg-slate-50 rounded-lg p-8 text-center text-slate-600">
              لا توجد ميزات.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature) => (
                <div
                  key={feature.id}
                  className={`bg-white rounded-xl shadow p-4 border-2 ${
                    feature.isEnabled ? 'border-green-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-slate-800">{feature.name}</h4>
                      <p className="text-sm text-slate-600 font-mono" dir="ltr">
                        {feature.key}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleFeature(feature)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        feature.isEnabled ? 'bg-green-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          feature.isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{feature.description}</p>
                  {feature.enabledForRoles && feature.enabledForRoles.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {feature.enabledForRoles.map((role) => (
                        <span
                          key={role}
                          className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          {/* Cache Management */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-4">إدارة الكاش</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  if (confirm('هل تريد مسح كاش الصفحات؟')) {
                    fetch('/api/system/cache/pages', { method: 'DELETE', credentials: 'include' })
                      .then(() => alert('تم مسح الكاش'))
                      .catch(() => alert('فشل'));
                  }
                }}
                className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition text-center"
              >
                <span className="text-2xl block mb-2">📄</span>
                <span className="font-medium text-blue-800">مسح كاش الصفحات</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('هل تريد مسح كاش API؟')) {
                    fetch('/api/system/cache/api', { method: 'DELETE', credentials: 'include' })
                      .then(() => alert('تم مسح الكاش'))
                      .catch(() => alert('فشل'));
                  }
                }}
                className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition text-center"
              >
                <span className="text-2xl block mb-2">🔄</span>
                <span className="font-medium text-green-800">مسح كاش API</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('هل تريد مسح كل الكاش؟')) {
                    fetch('/api/system/cache/all', { method: 'DELETE', credentials: 'include' })
                      .then(() => alert('تم مسح الكاش'))
                      .catch(() => alert('فشل'));
                  }
                }}
                className="p-4 bg-red-50 rounded-lg hover:bg-red-100 transition text-center"
              >
                <span className="text-2xl block mb-2">🗑️</span>
                <span className="font-medium text-red-800">مسح كل الكاش</span>
              </button>
            </div>
          </div>

          {/* Database Actions */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-4">قاعدة البيانات</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  fetch('/api/system/db/backup', { method: 'POST', credentials: 'include' })
                    .then((r) => r.blob())
                    .then((blob) => {
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `backup-${new Date().toISOString().slice(0, 10)}.db`;
                      a.click();
                    })
                    .catch(() => alert('فشل النسخ'));
                }}
                className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition flex items-center gap-3"
              >
                <span className="text-2xl">💾</span>
                <div className="text-right">
                  <p className="font-medium text-slate-800">نسخ احتياطي</p>
                  <p className="text-sm text-slate-600">تحميل نسخة من قاعدة البيانات</p>
                </div>
              </button>
              <button
                onClick={() => {
                  if (confirm('هل تريد تنظيف البيانات القديمة (أقدم من 90 يوم)؟')) {
                    fetch('/api/system/db/cleanup', { method: 'POST', credentials: 'include' })
                      .then(() => alert('تم التنظيف'))
                      .catch(() => alert('فشل'));
                  }
                }}
                className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition flex items-center gap-3"
              >
                <span className="text-2xl">🧹</span>
                <div className="text-right">
                  <p className="font-medium text-slate-800">تنظيف البيانات</p>
                  <p className="text-sm text-slate-600">حذف السجلات القديمة</p>
                </div>
              </button>
            </div>
          </div>

          {/* Logs */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-4">سجل النظام</h3>
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400 h-64 overflow-auto" dir="ltr">
              <p>[2024-01-15 10:00:00] Server started</p>
              <p>[2024-01-15 10:00:01] Database connected</p>
              <p>[2024-01-15 10:00:02] Cache initialized</p>
              <p>[2024-01-15 10:05:32] User login: admin@calcuhub.com</p>
              <p>[2024-01-15 10:10:15] Page cache cleared</p>
              <p>[2024-01-15 10:15:00] Sitemap regenerated (45 URLs)</p>
              <p className="text-slate-500">...</p>
            </div>
            <div className="mt-3 flex justify-end">
              <button className="text-sm text-blue-600 hover:underline">
                تحميل السجل الكامل
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-4">معلومات النظام</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">Node.js</p>
                <p className="font-mono font-medium">v20.10.0</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">Environment</p>
                <p className="font-mono font-medium">development</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">Memory</p>
                <p className="font-mono font-medium">128 MB</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">Uptime</p>
                <p className="font-mono font-medium">2h 15m</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
