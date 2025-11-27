import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardStats {
  today: {
    pageViews: number;
    calculations: number;
    adImpressions: number;
    adClicks: number;
    uniqueVisitors: number;
  };
  weekly: {
    pageViews: number[];
    calculations: number[];
    revenue: number[];
    labels: string[];
  };
  topPages: Array<{ pagePath: string; _count: number }>;
  topCalculators: Array<{ calculatorType: string; _count: number }>;
  revenue: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
}

export default function AnalyticsPanel() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/dashboard?range=${dateRange}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok !== false) {
        setStats(data);
      } else {
        setError(data.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        <p>{error}</p>
        <button onClick={fetchStats} className="mt-2 text-sm underline">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  // Generate sample data if API returns empty
  const sampleData = {
    today: stats?.today || { pageViews: 0, calculations: 0, adImpressions: 0, adClicks: 0, uniqueVisitors: 0 },
    weekly: stats?.weekly || {
      labels: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
      pageViews: [120, 150, 180, 200, 175, 190, 220],
      calculations: [45, 60, 75, 90, 80, 85, 95],
      revenue: [12, 15, 18, 22, 17, 20, 25],
    },
    topPages: stats?.topPages || [],
    topCalculators: stats?.topCalculators || [],
    revenue: stats?.revenue || { today: 0, week: 0, month: 0, total: 0 },
  };

  // Chart configurations
  const lineChartData = {
    labels: sampleData.weekly.labels,
    datasets: [
      {
        label: 'مشاهدات الصفحات',
        data: sampleData.weekly.pageViews,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'الحسابات',
        data: sampleData.weekly.calculations,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const barChartData = {
    labels: sampleData.weekly.labels,
    datasets: [
      {
        label: 'الإيرادات (ريال)',
        data: sampleData.weekly.revenue,
        backgroundColor: 'rgba(139, 92, 246, 0.7)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 1,
      },
    ],
  };

  const calculatorChartData = {
    labels: sampleData.topCalculators.slice(0, 5).map((c) => c.calculatorType) || [
      'الراتب',
      'ساعات العمل',
      'نهاية الخدمة',
      'التواريخ',
    ],
    datasets: [
      {
        data: sampleData.topCalculators.slice(0, 5).map((c) => c._count) || [45, 30, 15, 10],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        rtl: true,
        labels: {
          font: { family: 'inherit' },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header with date range selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">التحليلات والإحصائيات</h2>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
            title="اختر الفترة الزمنية"
          >
            <option value="7d">آخر 7 أيام</option>
            <option value="30d">آخر 30 يوم</option>
            <option value="90d">آخر 3 أشهر</option>
          </select>
          <button
            onClick={fetchStats}
            className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100"
          >
            تحديث
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="مشاهدات اليوم" value={sampleData.today.pageViews} icon="👁️" color="blue" />
        <StatCard title="الحسابات" value={sampleData.today.calculations} icon="🧮" color="green" />
        <StatCard title="انطباعات الإعلانات" value={sampleData.today.adImpressions} icon="📢" color="yellow" />
        <StatCard title="نقرات الإعلانات" value={sampleData.today.adClicks} icon="👆" color="purple" />
        <StatCard
          title="إيرادات اليوم"
          value={`${sampleData.revenue.today.toFixed(2)} ر.س`}
          icon="💰"
          color="emerald"
        />
      </div>

      {/* Revenue Overview */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">ملخص الإيرادات</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-blue-100 text-sm">اليوم</p>
            <p className="text-2xl font-bold">{sampleData.revenue.today.toFixed(2)} ر.س</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">هذا الأسبوع</p>
            <p className="text-2xl font-bold">{sampleData.revenue.week.toFixed(2)} ر.س</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">هذا الشهر</p>
            <p className="text-2xl font-bold">{sampleData.revenue.month.toFixed(2)} ر.س</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">الإجمالي</p>
            <p className="text-2xl font-bold">{sampleData.revenue.total.toFixed(2)} ر.س</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Chart */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">حركة الزوار</h3>
          <div className="h-64">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">الإيرادات اليومية</h3>
          <div className="h-64">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator Usage */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">استخدام الحاسبات</h3>
          <div className="h-64">
            <Doughnut
              data={calculatorChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    rtl: true,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">أفضل الصفحات</h3>
          <div className="space-y-3">
            {(sampleData.topPages.length > 0
              ? sampleData.topPages.slice(0, 5)
              : [
                  { pagePath: '/calculators/salary', _count: 450 },
                  { pagePath: '/calculators/work-hours', _count: 320 },
                  { pagePath: '/calculators/eos', _count: 180 },
                  { pagePath: '/blog', _count: 120 },
                  { pagePath: '/', _count: 90 },
                ]
            ).map((page, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <span className="text-sm text-slate-700 truncate flex-1" dir="ltr">
                  {page.pagePath}
                </span>
                <span className="text-sm font-medium text-slate-900 mr-2">{page._count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">إجراءات سريعة</h3>
          <div className="space-y-3">
            <a
              href="/api/analytics/export?format=csv&type=pageviews&days=30"
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
            >
              <span className="text-xl">📊</span>
              <span className="text-sm">تصدير التحليلات (CSV)</span>
            </a>
            <a
              href="/api/analytics/export?format=csv&type=calculations&days=30"
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
            >
              <span className="text-xl">🧮</span>
              <span className="text-sm">تصدير الحسابات (CSV)</span>
            </a>
            <button
              onClick={() => {
                /* TODO: Show detailed report modal */
              }}
              className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
            >
              <span className="text-xl">📈</span>
              <span className="text-sm">تقرير مفصل</span>
            </button>
            <button
              onClick={() => {
                /* TODO: Show forecasting modal */
              }}
              className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
            >
              <span className="text-xl">🔮</span>
              <span className="text-sm">توقعات الإيرادات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'emerald' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-slate-600">{title}</p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
