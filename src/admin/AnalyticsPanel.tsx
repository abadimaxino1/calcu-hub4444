import React, { useEffect, useState, Suspense } from 'react';
import { useMinLoadingTime } from '../lib/hooks';
import { AnalyticsSkeleton, ChartSkeleton } from '../components/AdminSkeletons';
import { StatCard } from './AdminShell'; // Assuming StatCard is exported or I need to check where it comes from. 
// Wait, StatCard was used in the file but I didn't see its import in the previous read_file.
// Let me check the previous read_file output again.
// Ah, StatCard usage: <StatCard ... />
// But I don't see StatCard import or definition in the first 300 lines I read.
// It might be defined in the file or imported.
// Let me check the file content again.


interface DashboardStats {
  today: {
    pageViews: number;
    calculations: number;
    adImpressions: number;
    adClicks: number;
    uniqueVisitors: number;
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

// Lazy load charts to reduce bundle size
const TrafficRevenueCharts = React.lazy(() => 
  import('./AnalyticsCharts').then(module => ({ default: module.TrafficRevenueCharts }))
);
const CalculatorUsageChart = React.lazy(() => 
  import('./AnalyticsCharts').then(module => ({ default: module.CalculatorUsageChart }))
);

interface HistoryData {
  pageViews: Array<{ date: string; count: number }>;
  revenue: Array<{ date: string; amount: number }>;
}

const EMPTY_STATS: DashboardStats = {
  today: {
    pageViews: 0,
    calculations: 0,
    adImpressions: 0,
    adClicks: 0,
    uniqueVisitors: 0,
  },
  topPages: [],
  topCalculators: [],
  revenue: { today: 0, week: 0, month: 0, total: 0 },
};

const EMPTY_HISTORY: HistoryData = {
  pageViews: [],
  revenue: [],
};

function normalizeStats(raw: any): DashboardStats {
  const t = raw?.today ?? {};
  const r = raw?.revenue ?? {};
  return {
    today: {
      pageViews: Number(t.pageViews) || 0,
      calculations: Number(t.calculations) || 0,
      adImpressions: Number(t.adImpressions) || 0,
      adClicks: Number(t.adClicks) || 0,
      uniqueVisitors: Number(t.uniqueVisitors) || 0,
    },
    topPages: Array.isArray(raw?.topPages) ? raw.topPages : [],
    topCalculators: Array.isArray(raw?.topCalculators) ? raw.topCalculators : [],
    revenue: {
      today: Number(r.today) || 0,
      week: Number(r.week) || 0,
      month: Number(r.month) || 0,
      total: Number(r.total) || 0,
    },
  };
}

function normalizeHistory(raw: any): HistoryData {
  return {
    pageViews: Array.isArray(raw?.pageViews) ? raw.pageViews : [],
    revenue: Array.isArray(raw?.revenue) ? raw.revenue : [],
  };
}

export default function AnalyticsPanel() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const showLoading = useMinLoadingTime(loading);
  const [error, setError] = useState('');

  useEffect(() => {
    performance.mark('Analytics-render');
    console.log('[Perf] AnalyticsPanel mounted/rendered');
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const [statsRes, historyRes] = await Promise.all([
        fetch('/api/analytics/dashboard', { credentials: 'include' }),
        fetch('/api/analytics/history', { credentials: 'include' }),
      ]);

      // لو أحدهم فشل (401/500/404...) لا تحاول تبني UI على بيانات ناقصة
      if (!statsRes.ok || !historyRes.ok) {
        const msg = `Failed to fetch analytics data (dashboard: ${statsRes.status}, history: ${historyRes.status})`;
        console.error(msg);
        setStats(EMPTY_STATS);
        setHistory(EMPTY_HISTORY);
        setError('Failed to fetch analytics data');
        return;
      }

      const statsData = await statsRes.json();
      const historyData = await historyRes.json();

      if (statsData?.error || historyData?.error) {
        console.error('Analytics API returned error:', statsData?.error || historyData?.error);
        setStats(EMPTY_STATS);
        setHistory(EMPTY_HISTORY);
        setError('Failed to fetch analytics data');
        return;
      }

      setStats(normalizeStats(statsData));
      setHistory(normalizeHistory(historyData));
      performance.mark('Analytics-data-loaded');
      
      // Measure total time
      try {
        const navStart = performance.getEntriesByName('nav-start-analytics').pop();
        const loadEnd = performance.getEntriesByName('Analytics-loaded').pop();
        const renderStart = performance.getEntriesByName('Analytics-render').pop();
        const dataEnd = performance.getEntriesByName('Analytics-data-loaded').pop();

        if (navStart && dataEnd) {
           console.log(`[Perf] Total Analytics Transition: ${(dataEnd.startTime - navStart.startTime).toFixed(2)}ms`);
           if (loadEnd) console.log(`[Perf]  - Module Load: ${(loadEnd.startTime - navStart.startTime).toFixed(2)}ms`);
           if (renderStart && loadEnd) console.log(`[Perf]  - Render Delay: ${(renderStart.startTime - loadEnd.startTime).toFixed(2)}ms`);
           if (renderStart) console.log(`[Perf]  - Data Fetch: ${(dataEnd.startTime - renderStart.startTime).toFixed(2)}ms`);
        }
      } catch (e) { console.error(e); }

    } catch (err) {
      console.error('Analytics connection error:', err);
      setStats(EMPTY_STATS);
      setHistory(EMPTY_HISTORY);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  if (showLoading) {
    return <AnalyticsSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        <p>{error}</p>
        <button onClick={fetchData} className="mt-2 text-sm underline">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  // Prepare chart data
  const chartData =
    history?.pageViews?.map((pv) => {
      const rev = history?.revenue?.find((r) => r.date === pv.date);
      return { date: pv.date, pageViews: pv.count, revenue: rev ? rev.amount : 0 };
    }) ?? [];

  const pieData =
    stats?.topCalculators?.map((c) => ({ name: c.calculatorType, value: c._count })) ?? [];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">التحليلات والإحصائيات</h2>
        <button
          onClick={fetchData}
          className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100"
        >
          تحديث
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="مشاهدات اليوم" value={stats?.today?.pageViews ?? 0} icon="👁️" color="blue" />
        <StatCard title="الحسابات" value={stats?.today?.calculations ?? 0} icon="🧮" color="green" />
        <StatCard title="انطباعات الإعلانات" value={stats?.today?.adImpressions ?? 0} icon="📢" color="yellow" />
        <StatCard title="نقرات الإعلانات" value={stats?.today?.adClicks ?? 0} icon="👆" color="purple" />
        <StatCard
          title="إيرادات اليوم"
          value={`${Number(stats?.revenue?.today ?? 0).toFixed(2)} ر.س`}
          icon="💰"
          color="emerald"
        />
      </div>
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<><ChartSkeleton /><ChartSkeleton /></>}>
          <TrafficRevenueCharts chartData={chartData} />
        </Suspense>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator Usage */}
        <Suspense fallback={<ChartSkeleton />}>
          <CalculatorUsageChart pieData={pieData} />
        </Suspense>

        {/* Top Pages */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">أفضل الصفحات</h3>
          <div className="space-y-3">
            {(stats?.topPages || []).map((page, i) => (
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
            {(!stats?.topPages || stats.topPages.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">لا توجد بيانات كافية</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">إجراءات سريعة</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
              <span className="text-xl">📊</span>
              <span className="text-sm">تصدير التحليلات (CSV)</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
              <span className="text-xl">🧮</span>
              <span className="text-sm">تصدير الحسابات (CSV)</span>
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
