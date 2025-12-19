import React, { useState, useEffect } from 'react';

interface MaintenanceSettings {
  id: string;
  isEnabled: boolean;
  title: string;
  messageAr: string;
  messageEn: string;
  startTime: string | null;
  endTime: string | null;
  allowedIPs: string;
}

export default function MaintenancePanel() {
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/maintenance', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch maintenance settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        alert('تم حفظ الإعدادات بنجاح');
        fetchSettings();
      } else {
        alert('فشل حفظ الإعدادات');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!settings) return;

    const newSettings = { ...settings, isEnabled: !settings.isEnabled };
    setSettings(newSettings);

    try {
      await fetch('/api/admin/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newSettings),
      });
      fetchSettings();
    } catch (err) {
      console.error('Failed to toggle maintenance mode:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        <p>فشل تحميل إعدادات وضع الصيانة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              وضع الصيانة / Maintenance Mode
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              تفعيل وضع الصيانة لمنع الزوار من الوصول مؤقتاً
            </p>
          </div>
          <button
            onClick={handleToggle}
            className={`px-6 py-3 rounded-lg font-semibold text-white transition ${
              settings.isEnabled
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {settings.isEnabled ? '⚠️ إيقاف الصيانة' : '✓ تفعيل الصيانة'}
          </button>
        </div>

        {settings.isEnabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-yellow-900">وضع الصيانة مفعّل حالياً</p>
                <p className="text-sm text-yellow-800 mt-1">
                  الموقع غير متاح للزوار. فقط عناوين IP المسموحة يمكنها الوصول.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">إعدادات الصيانة</h3>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              العنوان / Title
            </label>
            <input
              type="text"
              value={settings.title}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="الموقع قيد الصيانة"
            />
          </div>

          {/* Message Arabic */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              الرسالة (عربي)
            </label>
            <textarea
              value={settings.messageAr}
              onChange={(e) => setSettings({ ...settings, messageAr: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg h-24"
              placeholder="نعتذر عن الإزعاج. الموقع قيد الصيانة حالياً..."
            />
          </div>

          {/* Message English */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              الرسالة (إنجليزي)
            </label>
            <textarea
              value={settings.messageEn}
              onChange={(e) => setSettings({ ...settings, messageEn: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg h-24"
              placeholder="Sorry for the inconvenience. The site is under maintenance..."
              dir="ltr"
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                وقت البداية / Start Time
              </label>
              <input
                type="datetime-local"
                value={
                  settings.startTime
                    ? new Date(settings.startTime).toISOString().slice(0, 16)
                    : ''
                }
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    startTime: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                وقت النهاية / End Time
              </label>
              <input
                type="datetime-local"
                value={
                  settings.endTime ? new Date(settings.endTime).toISOString().slice(0, 16) : ''
                }
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    endTime: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Allowed IPs */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              عناوين IP المسموحة / Allowed IP Addresses
            </label>
            <input
              type="text"
              value={settings.allowedIPs || ''}
              onChange={(e) => setSettings({ ...settings, allowedIPs: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="192.168.1.1, 10.0.0.1"
              dir="ltr"
            />
            <p className="text-xs text-slate-500 mt-1">
              افصل بين العناوين بفاصلة. اتركها فارغة للسماح لجميع عناوين Admin فقط.
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">معاينة صفحة الصيانة / Preview</h3>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 bg-slate-50">
          <div className="max-w-md mx-auto text-center">
            <div className="text-6xl mb-4">🔧</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">{settings.title}</h2>
            <div className="space-y-4 text-slate-600">
              <p className="text-right">{settings.messageAr}</p>
              <p className="text-left" dir="ltr">
                {settings.messageEn}
              </p>
            </div>
            {(settings.startTime || settings.endTime) && (
              <div className="mt-6 text-sm text-slate-500 space-y-1">
                {settings.startTime && (
                  <p>
                    البداية: {new Date(settings.startTime).toLocaleString('ar-SA')}
                  </p>
                )}
                {settings.endTime && (
                  <p>
                    النهاية: {new Date(settings.endTime).toLocaleString('ar-SA')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
