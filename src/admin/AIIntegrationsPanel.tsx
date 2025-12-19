import React, { useState, useEffect } from 'react';

interface AIIntegration {
  id: string;
  provider: string;
  isEnabled: boolean;
  model: string;
  features: string[];
  quota: number;
  used: number;
}

export default function AIIntegrationsPanel() {
  const [integrations, setIntegrations] = useState<AIIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/admin/ai-integrations', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (err) {
      console.error('Failed to fetch AI integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, isEnabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/ai-integrations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isEnabled: !isEnabled }),
      });

      if (res.ok) {
        fetchIntegrations();
      }
    } catch (err) {
      console.error('Failed to toggle integration:', err);
    }
  };

  const handleSave = async () => {
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `/api/admin/ai-integrations/${editingId}`
        : '/api/admin/ai-integrations';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setEditingId(null);
        setFormData({});
        fetchIntegrations();
      }
    } catch (err) {
      console.error('Failed to save integration:', err);
    }
  };

  const aiProviders = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      icon: '🔮',
      free: true,
      features: ['Content Generation', 'Translation', 'SEO Optimization'],
      description: 'Free tier available with generous limits'
    },
    {
      id: 'openai',
      name: 'OpenAI',
      icon: '🤖',
      free: false,
      features: ['Content Generation', 'Translation', 'Code Generation'],
      description: 'Powerful AI with limited free trial'
    },
    {
      id: 'huggingface',
      name: 'Hugging Face',
      icon: '🤗',
      free: true,
      features: ['Text Generation', 'Translation', 'Summarization'],
      description: 'Free inference API for open models'
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">تكامل الذكاء الاصطناعي / AI Integrations</h2>
          <p className="text-sm text-slate-600 mt-1">
            إدارة تكاملات الذكاء الاصطناعي المجانية والمدفوعة
          </p>
        </div>
      </div>

      {/* Available Providers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {aiProviders.map((provider) => {
          const integration = integrations.find((i) => i.provider === provider.id);
          const isConfigured = !!integration;
          const isEnabled = integration?.isEnabled || false;

          return (
            <div
              key={provider.id}
              className={`bg-white rounded-lg border-2 p-5 transition ${
                isEnabled
                  ? 'border-green-500 shadow-lg'
                  : isConfigured
                  ? 'border-slate-200'
                  : 'border-dashed border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <h3 className="font-semibold text-slate-900">{provider.name}</h3>
                    {provider.free && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        مجاني / Free
                      </span>
                    )}
                  </div>
                </div>
                {isConfigured && (
                  <button
                    onClick={() => handleToggle(integration.id, isEnabled)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      isEnabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isEnabled ? '✓ مفعّل' : 'معطّل'}
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-600 mb-3">{provider.description}</p>

              <div className="space-y-2 mb-4">
                <p className="text-xs font-medium text-slate-700">الميزات المتاحة:</p>
                <div className="flex flex-wrap gap-1">
                  {provider.features.map((feature) => (
                    <span
                      key={feature}
                      className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {isConfigured && integration && (
                <div className="text-xs text-slate-600 space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span>الاستخدام:</span>
                    <span className="font-medium">
                      {integration.used} / {integration.quota}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min((integration.used / integration.quota) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setEditingId(integration?.id || null);
                  setFormData(
                    integration || {
                      provider: provider.id,
                      isEnabled: false,
                      model: '',
                      features: provider.features,
                      quota: 1000,
                    }
                  );
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                {isConfigured ? 'تعديل الإعدادات' : '+ إضافة تكامل'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Configuration Modal */}
      {editingId !== null && formData.provider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                إعدادات {aiProviders.find((p) => p.id === formData.provider)?.name}
              </h3>
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormData({});
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  API Key (اختياري للخدمات المجانية)
                </label>
                <input
                  type="password"
                  value={formData.apiKey || ''}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="sk-..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  سيتم تشفير المفتاح تلقائياً عند الحفظ
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">النموذج / Model</label>
                <input
                  type="text"
                  value={formData.model || ''}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="gemini-pro, gpt-3.5-turbo, ..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  الحد الشهري / Monthly Quota
                </label>
                <input
                  type="number"
                  value={formData.quota || 1000}
                  onChange={(e) =>
                    setFormData({ ...formData, quota: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isEnabled"
                  checked={formData.isEnabled || false}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isEnabled" className="text-sm text-slate-700">
                  تفعيل التكامل فوراً
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  حفظ الإعدادات
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setFormData({});
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Statistics */}
      {integrations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">إحصائيات الاستخدام / Usage Statistics</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">
                    المزود
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">
                    النموذج
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">
                    الاستخدام
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">
                    الباقي
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {integrations.map((integration) => {
                  const remaining = integration.quota - integration.used;
                  const percentage = (integration.used / integration.quota) * 100;

                  return (
                    <tr key={integration.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium">
                        {aiProviders.find((p) => p.id === integration.provider)?.name ||
                          integration.provider}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{integration.model}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            integration.isEnabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {integration.isEnabled ? 'مفعّل' : 'معطّل'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  percentage > 90
                                    ? 'bg-red-600'
                                    : percentage > 70
                                    ? 'bg-yellow-500'
                                    : 'bg-green-600'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-xs text-slate-600 w-16 text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600" dir="ltr">
                        {remaining.toLocaleString()} / {integration.quota.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
