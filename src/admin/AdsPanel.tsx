import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AdSlot {
  id: string;
  slotId: string;
  name: string;
  position: string;
  size: string;
  isActive: boolean;
  impressions: number;
  clicks: number;
  revenue: number;
  createdAt: string;
}

interface RevenueData {
  daily: { date: string; impressions: number; clicks: number; revenue: number }[];
  monthly: { month: string; revenue: number }[];
  total: number;
  thisMonth: number;
  lastMonth: number;
  growth: number;
}

export default function AdsPanel() {
  const [adSlots, setAdSlots] = useState<AdSlot[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingSlot, setEditingSlot] = useState<AdSlot | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'slots' | 'revenue' | 'forecast'>('slots');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [slotsRes, revenueRes] = await Promise.all([
        fetch('/api/ads/slots', { credentials: 'include' }),
        fetch('/api/ads/revenue', { credentials: 'include' }),
      ]);

      const slotsData = await slotsRes.json();
      const revenueData = await revenueRes.json();

      if (slotsRes.ok) {
        setAdSlots(slotsData.slots || []);
      }
      if (revenueRes.ok) {
        setRevenue(revenueData);
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (slot: Partial<AdSlot>) => {
    try {
      const method = slot.id ? 'PUT' : 'POST';
      const endpoint = slot.id ? `/api/ads/slots/${slot.id}` : '/api/ads/slots';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(slot),
      });

      if (response.ok) {
        setIsEditorOpen(false);
        setEditingSlot(null);
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save');
      }
    } catch (err) {
      alert('Failed to save');
    }
  };

  const handleToggleActive = async (slot: AdSlot) => {
    try {
      const response = await fetch(`/api/ads/slots/${slot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...slot, isActive: !slot.isActive }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      alert('Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;

    try {
      const response = await fetch(`/api/ads/slots/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      alert('Failed to delete');
    }
  };

  // Sample data for charts
  const revenueChartData = {
    labels: revenue?.daily?.map((d) => d.date.slice(5)) || ['01', '02', '03', '04', '05', '06', '07'],
    datasets: [
      {
        label: 'الإيرادات (ريال)',
        data: revenue?.daily?.map((d) => d.revenue) || [12, 19, 15, 25, 22, 30, 28],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const impressionsChartData = {
    labels: revenue?.daily?.map((d) => d.date.slice(5)) || ['01', '02', '03', '04', '05', '06', '07'],
    datasets: [
      {
        label: 'الانطباعات',
        data: revenue?.daily?.map((d) => d.impressions) || [1200, 1900, 1500, 2500, 2200, 3000, 2800],
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
      },
      {
        label: 'النقرات',
        data: revenue?.daily?.map((d) => d.clicks) || [24, 38, 30, 50, 44, 60, 56],
        backgroundColor: 'rgba(245, 158, 11, 0.7)',
      },
    ],
  };

  const tabs = [
    { key: 'slots' as const, label: 'مواقع الإعلانات', icon: '📍' },
    { key: 'revenue' as const, label: 'الإيرادات', icon: '💰' },
    { key: 'forecast' as const, label: 'التوقعات', icon: '🔮' },
  ];

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

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <p className="text-green-100 text-sm">إجمالي الإيرادات</p>
          <p className="text-2xl font-bold">{(revenue?.total || 0).toFixed(2)} ر.س</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-slate-600 text-sm">هذا الشهر</p>
          <p className="text-xl font-bold text-slate-800">{(revenue?.thisMonth || 0).toFixed(2)} ر.س</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-slate-600 text-sm">الشهر الماضي</p>
          <p className="text-xl font-bold text-slate-800">{(revenue?.lastMonth || 0).toFixed(2)} ر.س</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-slate-600 text-sm">النمو</p>
          <p className={`text-xl font-bold ${(revenue?.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(revenue?.growth || 0) >= 0 ? '+' : ''}{(revenue?.growth || 0).toFixed(1)}%
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error}</p>
        </div>
      )}

      {/* Slots Tab */}
      {activeTab === 'slots' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">مواقع الإعلانات</h3>
            <button
              onClick={() => {
                setEditingSlot(null);
                setIsEditorOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <span>+</span>
              <span>إضافة موقع</span>
            </button>
          </div>

          {adSlots.length === 0 ? (
            <div className="bg-slate-50 rounded-lg p-8 text-center text-slate-600">
              لا توجد مواقع إعلانات. قم بإضافة موقع جديد.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`bg-white rounded-xl shadow p-4 border-2 ${
                    slot.isActive ? 'border-green-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-slate-800">{slot.name}</h4>
                      <p className="text-sm text-slate-600 font-mono" dir="ltr">
                        {slot.slotId}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleActive(slot)}
                      className={`px-2 py-1 text-xs rounded-full ${
                        slot.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {slot.isActive ? 'نشط' : 'معطل'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-slate-600">الموقع:</span>
                      <span className="mr-1">{slot.position}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">الحجم:</span>
                      <span className="mr-1 font-mono" dir="ltr">{slot.size}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center py-2 bg-slate-50 rounded-lg mb-3">
                    <div>
                      <p className="text-xs text-slate-600">انطباعات</p>
                      <p className="font-bold text-slate-800">{slot.impressions || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">نقرات</p>
                      <p className="font-bold text-slate-800">{slot.clicks || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">إيراد</p>
                      <p className="font-bold text-green-600">{(slot.revenue || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingSlot(slot);
                        setIsEditorOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="تعديل"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(slot.id)}
                      className="text-red-600 hover:text-red-800"
                      title="حذف"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4">الإيرادات اليومية</h3>
              <div className="h-64">
                <Line
                  data={revenueChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', rtl: true } },
                  }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4">الانطباعات والنقرات</h3>
              <div className="h-64">
                <Bar
                  data={impressionsChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', rtl: true } },
                  }}
                />
              </div>
            </div>
          </div>

          {/* CTR Analysis */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-4">تحليل الأداء</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600 mb-1">معدل النقر (CTR)</p>
                <p className="text-2xl font-bold text-blue-800">
                  {adSlots.length > 0 
                    ? ((adSlots.reduce((a, s) => a + (s.clicks || 0), 0) / 
                        Math.max(adSlots.reduce((a, s) => a + (s.impressions || 0), 0), 1)) * 100).toFixed(2)
                    : '0.00'}%
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600 mb-1">RPM</p>
                <p className="text-2xl font-bold text-green-800">
                  {adSlots.length > 0
                    ? ((adSlots.reduce((a, s) => a + (s.revenue || 0), 0) /
                        Math.max(adSlots.reduce((a, s) => a + (s.impressions || 0), 0) / 1000, 1))).toFixed(2)
                    : '0.00'} ر.س
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-sm text-purple-600 mb-1">CPC</p>
                <p className="text-2xl font-bold text-purple-800">
                  {adSlots.length > 0
                    ? (adSlots.reduce((a, s) => a + (s.revenue || 0), 0) /
                        Math.max(adSlots.reduce((a, s) => a + (s.clicks || 0), 0), 1)).toFixed(2)
                    : '0.00'} ر.س
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Tab */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-4">توقعات الإيرادات</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-purple-100 text-sm">نهاية الشهر الحالي</p>
                <p className="text-2xl font-bold">
                  {((revenue?.thisMonth || 0) * 1.5).toFixed(2)} ر.س
                </p>
                <p className="text-xs text-purple-200">+50% مقارنة بالحالي</p>
              </div>
              <div>
                <p className="text-purple-100 text-sm">الشهر القادم</p>
                <p className="text-2xl font-bold">
                  {((revenue?.thisMonth || 0) * 1.2).toFixed(2)} ر.س
                </p>
                <p className="text-xs text-purple-200">+20% نمو متوقع</p>
              </div>
              <div>
                <p className="text-purple-100 text-sm">نهاية السنة</p>
                <p className="text-2xl font-bold">
                  {((revenue?.total || 0) * 2).toFixed(2)} ر.س
                </p>
                <p className="text-xs text-purple-200">إجمالي متوقع</p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-4">توصيات لزيادة الإيرادات</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-medium text-green-800">زيادة مواقع الإعلانات</p>
                  <p className="text-sm text-green-600">
                    أضف إعلان sidebar في صفحات الحاسبات لزيادة الانطباعات
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-xl">📈</span>
                <div>
                  <p className="font-medium text-blue-800">تحسين SEO</p>
                  <p className="text-sm text-blue-600">
                    صفحة حاسبة الراتب تحتاج تحسين للحصول على المزيد من الزيارات
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <span className="text-xl">⚡</span>
                <div>
                  <p className="font-medium text-yellow-800">تسريع الموقع</p>
                  <p className="text-sm text-yellow-600">
                    تحسين سرعة التحميل يزيد من CTR بنسبة 10-15%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <AdSlotEditorModal
          slot={editingSlot}
          onSave={handleSave}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingSlot(null);
          }}
        />
      )}
    </div>
  );
}

// Ad Slot Editor Modal
function AdSlotEditorModal({
  slot,
  onSave,
  onClose,
}: {
  slot: AdSlot | null;
  onSave: (slot: Partial<AdSlot>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<AdSlot>>(
    slot || {
      slotId: '',
      name: '',
      position: 'header',
      size: '728x90',
      isActive: true,
    }
  );

  const positions = [
    { value: 'header', label: 'أعلى الصفحة' },
    { value: 'sidebar', label: 'الشريط الجانبي' },
    { value: 'inline', label: 'داخل المحتوى' },
    { value: 'footer', label: 'أسفل الصفحة' },
    { value: 'sticky', label: 'ثابت' },
  ];

  const sizes = [
    '728x90',
    '300x250',
    '336x280',
    '160x600',
    '320x100',
    '970x250',
    'responsive',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {slot ? 'تعديل موقع إعلان' : 'إضافة موقع إعلان'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">معرف الإعلان (Slot ID)</label>
            <input
              type="text"
              value={formData.slotId}
              onChange={(e) => setFormData({ ...formData, slotId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg font-mono"
              placeholder="1234567890"
              dir="ltr"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الاسم</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="إعلان الهيدر"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الموقع</label>
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                title="اختر موقع الإعلان"
              >
                {positions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الحجم</label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg font-mono"
                title="اختر حجم الإعلان"
              >
                {sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">
              تفعيل الإعلان
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
