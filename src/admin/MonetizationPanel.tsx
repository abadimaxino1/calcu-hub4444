import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useMinLoadingTime } from '../lib/hooks';
import { MonetizationSkeleton } from '../components/AdminSkeletons';

// Lazy load charts to reduce initial bundle size
const LazyLine = React.lazy(() => import('../components/AdminCharts').then(m => ({ default: m.Line })));
const LazyBar = React.lazy(() => import('../components/AdminCharts').then(m => ({ default: m.Bar })));
const LazyDoughnut = React.lazy(() => import('../components/AdminCharts').then(m => ({ default: m.Doughnut })));

const ChartLoader = () => (
  <div className="w-full h-full min-h-[200px] flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg text-gray-400 text-sm animate-pulse">
    Loading Chart...
  </div>
);

const Line = (props: any) => (
  <Suspense fallback={<ChartLoader />}>
    <LazyLine {...props} />
  </Suspense>
);

const Bar = (props: any) => (
  <Suspense fallback={<ChartLoader />}>
    <LazyBar {...props} />
  </Suspense>
);

const Doughnut = (props: any) => (
  <Suspense fallback={<ChartLoader />}>
    <LazyDoughnut {...props} />
  </Suspense>
);

// Helper to safely parse numbers
const toNum = (val: unknown): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/,/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

// Types
interface MonetizationSummary {
  period: { from: string; to: string; days: number };
  totals: {
    impressions: number;
    clicks: number;
    ctr: string;
    rpm: string;
    estimatedRevenue: string;
    actualRevenue: string;
    variance: string;
    variancePercent: string;
  };
  today: {
    impressions: number;
    clicks: number;
    ctr: string;
    estimatedRevenue: string;
  };
  averages: {
    dailyImpressions: number;
    dailyClicks: number;
    dailyRevenue: string;
  };
}

interface SlotData {
  id: string;
  name: string;
  positionKey: string;
  impressions: number;
  clicks: number;
  ctr: string;
  eCPM: string;
  estimatedRevenue: string;
  shareOfTotal: string;
}

interface PageData {
  pagePath: string;
  pageType: string;
  pageViews: number;
  calculations: number;
  adImpressions: number;
  adClicks: number;
  ctr: string;
  estimatedRevenue: number;
  revenuePerView: string;
}

interface CountryData {
  country: string;
  impressions: number;
  clicks: number;
  ctr: string;
  eCPM: string;
  estimatedRevenue: string;
}

interface DeviceData {
  device: string;
  impressions: number;
  clicks: number;
  ctr: string;
  eCPM: string;
  estimatedRevenue: string;
}

interface Alert {
  id: string;
  alertType: string;
  severity: string;
  adSlotId?: string;
  pagePath?: string;
  country?: string;
  device?: string;
  periodStart: string;
  periodEnd: string;
  metrics: string;
  message: string;
  isResolved: boolean;
  resolvedAt?: string;
  createdAt: string;
}

interface ForecastData {
  historical: {
    days: number;
    totalRevenue: string;
    avgDaily: string;
    trend: string;
    trendPercent: string;
  };
  forecast: {
    period: string;
    total: string;
    avgDaily: string;
    daily: Array<{ date: string; estimatedRevenue: string }>;
  };
  monthlyProjections: Array<{ month: number; estimatedRevenue: string }>;
}

interface TrafficSourceData {
  source: string;
  sessions: number;
  pageViews: number;
  calculations: number;
  adImpressions: number;
  adClicks: number;
  ctr: string;
  revenuePerSession: string;
  estimatedRevenue: string;
}

interface RevenueModel {
  id: string;
  name: string;
  description?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  assumptions: string;
}

// Date range presets
const DATE_PRESETS = [
  { key: 'today', label: 'Today', days: 0 },
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: 'mtd', label: 'Month to date', days: -1 },
  { key: 'ytd', label: 'Year to date', days: -2 },
  { key: 'custom', label: 'Custom', days: -3 },
];

// Tab definitions
const TABS = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'by-slot', label: 'By Slot', icon: '🎯' },
  { key: 'by-page', label: 'By Page', icon: '📄' },
  { key: 'by-country', label: 'By Country', icon: '🌍' },
  { key: 'by-device', label: 'By Device', icon: '📱' },
  { key: 'traffic', label: 'Traffic Sources', icon: '🔗' },
  { key: 'alerts', label: 'Alerts', icon: '⚠️' },
  { key: 'forecast', label: 'Forecast', icon: '📈' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function MonetizationPanel() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState('overview');
  const [datePreset, setDatePreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const showLoading = useMinLoadingTime(loading);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [summary, setSummary] = useState<MonetizationSummary | null>(null);
  const [slotsData, setSlotsData] = useState<SlotData[]>([]);
  const [pagesData, setPagesData] = useState<PageData[]>([]);
  const [countriesData, setCountriesData] = useState<CountryData[]>([]);
  const [devicesData, setDevicesData] = useState<DeviceData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [trafficSources, setTrafficSources] = useState<TrafficSourceData[]>([]);
  const [revenueModels, setRevenueModels] = useState<RevenueModel[]>([]);
  const [overTimeData, setOverTimeData] = useState<any[]>([]);

  // API helper - uses credentials: 'include' for cookie-based auth
  const fetchAPI = useCallback(async (endpoint: string) => {
    const res = await fetch(`/api/admin/monetization${endpoint}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('Session expired. Please log in again.');
      throw new Error(`API error: ${res.status}`);
    }
    return res.json();
  }, []);

  // Handle date preset change
  useEffect(() => {
    const now = new Date();
    let from = new Date();
    
    switch (datePreset) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        from.setDate(now.getDate() - 7);
        break;
      case '30d':
        from.setDate(now.getDate() - 30);
        break;
      case 'mtd':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'ytd':
        from = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        return; // Don't auto-set dates
    }
    
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(now.toISOString().slice(0, 10));
  }, [datePreset]);

  // Fetch data based on active tab
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = `?from=${dateFrom}&to=${dateTo}`;
        
        switch (activeTab) {
          case 'overview':
            const [summaryRes, overTimeRes] = await Promise.all([
              fetchAPI(`/summary${params}`),
              fetchAPI(`/over-time${params}&granularity=day`),
            ]);
            setSummary(summaryRes);
            setOverTimeData(overTimeRes.data || []);
            break;
          case 'by-slot':
            const slotsRes = await fetchAPI(`/by-slot${params}`);
            setSlotsData(slotsRes.slots || []);
            break;
          case 'by-page':
            const pagesRes = await fetchAPI(`/by-page${params}`);
            setPagesData(pagesRes.pages || []);
            break;
          case 'by-country':
            const countriesRes = await fetchAPI(`/by-country${params}`);
            setCountriesData(countriesRes.countries || []);
            break;
          case 'by-device':
            const devicesRes = await fetchAPI(`/by-device${params}`);
            setDevicesData(devicesRes.devices || []);
            break;
          case 'traffic':
            const trafficRes = await fetchAPI(`/traffic-sources${params}`);
            setTrafficSources(trafficRes.sources || []);
            break;
          case 'alerts':
            const alertsRes = await fetchAPI('/alerts?limit=100');
            setAlerts(alertsRes.alerts || []);
            break;
          case 'forecast':
            const forecastRes = await fetchAPI('/forecast?period=30d');
            setForecast(forecastRes);
            break;
          case 'settings':
            const modelsRes = await fetchAPI('/models');
            setRevenueModels(modelsRes.models || []);
            break;
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab, dateFrom, dateTo, fetchAPI]);

  // Resolve alert
  const handleResolveAlert = async (alertId: string, note: string) => {
    try {
      await fetch(`/api/admin/monetization/alerts/${alertId}/resolve`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
      });
      // Refresh alerts
      const alertsRes = await fetchAPI('/alerts?limit=100');
      setAlerts(alertsRes.alerts || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Run anomaly detection
  const handleDetectAnomalies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/monetization/detect-anomalies', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      alert(`Detected ${data.detected} anomalies, created ${data.created} new alerts`);
      // Refresh alerts
      const alertsRes = await fetchAPI('/alerts?limit=100');
      setAlerts(alertsRes.alerts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Export CSV using a normal download flow to avoid popups
  const handleExport = (type: string) => {
    const params = `?from=${dateFrom}&to=${dateTo}`;
    const url = `/api/admin/monetization/export/${type}${params}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-export.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Chart colors
  const chartColors = {
    primary: 'rgb(59, 130, 246)',
    secondary: 'rgb(16, 185, 129)',
    accent: 'rgb(249, 115, 22)',
    warning: 'rgb(234, 179, 8)',
    danger: 'rgb(239, 68, 68)',
  };

  // Render KPI card
  const KPICard = ({ title, value, subtitle, trend }: { title: string; value: string; subtitle?: string; trend?: 'up' | 'down' | 'neutral' }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        {value}
        {trend === 'up' && <span className="text-green-500 text-sm">↑</span>}
        {trend === 'down' && <span className="text-red-500 text-sm">↓</span>}
      </div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );

  // Render Overview tab
  const renderOverview = () => {
    if (!summary) return <div className="text-center py-8 text-gray-600">No data available</div>;

    const revenueChartData = {
      labels: overTimeData.map(d => d.period),
      datasets: [
        {
          label: 'Estimated Revenue (SAR)',
          data: overTimeData.map(d => toNum(d.estimatedRevenue)),
          borderColor: chartColors.primary,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    };

    const impressionsClicksData = {
      labels: overTimeData.map(d => d.period),
      datasets: [
        {
          label: 'Impressions',
          data: overTimeData.map(d => toNum(d.impressions)),
          backgroundColor: chartColors.primary,
          yAxisID: 'y',
        },
        {
          label: 'Clicks',
          data: overTimeData.map(d => toNum(d.clicks)),
          backgroundColor: chartColors.secondary,
          yAxisID: 'y1',
        },
      ],
    };

    const ctrChartData = {
      labels: overTimeData.map(d => d.period),
      datasets: [
        {
          label: 'CTR (%)',
          data: overTimeData.map(d => toNum(d.ctr)),
          borderColor: chartColors.accent,
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    };

    return (
      <div className="space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <KPICard 
            title="Today's Revenue" 
            value={`${toNum(summary?.today?.estimatedRevenue).toFixed(2)} SAR`}
          />
          <KPICard 
            title={`${summary?.period?.days || 0} Day Revenue`}
            value={`${toNum(summary?.totals?.estimatedRevenue).toFixed(2)} SAR`}
            subtitle={`Avg: ${toNum(summary?.averages?.dailyRevenue).toFixed(2)} SAR/day`}
          />
          <KPICard 
            title="Impressions"
            value={toNum(summary?.totals?.impressions).toLocaleString()}
            subtitle={`${toNum(summary?.averages?.dailyImpressions).toFixed(0)}/day`}
          />
          <KPICard 
            title="Clicks"
            value={toNum(summary?.totals?.clicks).toLocaleString()}
            subtitle={`${toNum(summary?.averages?.dailyClicks).toFixed(0)}/day`}
          />
          <KPICard 
            title="CTR"
            value={`${toNum(summary?.totals?.ctr).toFixed(2)}%`}
          />
          <KPICard 
            title="RPM"
            value={`${toNum(summary?.totals?.rpm).toFixed(2)} SAR`}
          />
        </div>

        {/* Variance Card */}
        {toNum(summary?.totals?.actualRevenue) > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚡</span>
              <span className="font-medium">Estimated vs Actual Variance:</span>
              <span className={toNum(summary?.totals?.variance) >= 0 ? 'text-green-600' : 'text-red-600'}>
                {toNum(summary?.totals?.variance).toFixed(2)} SAR ({toNum(summary?.totals?.variancePercent).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Revenue Over Time</h3>
            <div style={{ height: '300px' }}>
              <Line 
                data={revenueChartData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }} 
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Impressions & Clicks</h3>
            <div style={{ height: '300px' }}>
              <Bar 
                data={impressionsClicksData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  scales: {
                    y: { type: 'linear', position: 'left' },
                    y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } },
                  },
                }} 
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">CTR Trend</h3>
            <div style={{ height: '250px' }}>
              <Line 
                data={ctrChartData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }} 
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render By Slot tab
  const renderBySlot = () => {
    const chartData = {
      labels: slotsData.slice(0, 8).map(s => s.name),
      datasets: [{
        data: slotsData.slice(0, 8).map(s => toNum(s.estimatedRevenue)),
        backgroundColor: [
          chartColors.primary, chartColors.secondary, chartColors.accent,
          chartColors.warning, chartColors.danger, '#8b5cf6', '#ec4899', '#6366f1',
        ],
      }],
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Revenue by Ad Slot</h3>
          <button 
            onClick={() => handleExport('by-slot')}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium mb-4">Revenue Distribution</h4>
            <div style={{ height: '250px' }}>
              <Doughnut 
                data={chartData} 
                options={{ responsive: true, maintainAspectRatio: false }} 
              />
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Slot</th>
                  <th className="px-4 py-3 text-right">Impressions</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">CTR</th>
                  <th className="px-4 py-3 text-right">eCPM</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {slotsData.map((slot, i) => (
                  <tr key={slot.id} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                    <td className="px-4 py-3 font-medium">{slot.name}</td>
                    <td className="px-4 py-3 text-right">{slot.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{slot.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{slot.ctr}%</td>
                    <td className="px-4 py-3 text-right">{slot.eCPM} SAR</td>
                    <td className="px-4 py-3 text-right font-medium">{slot.estimatedRevenue} SAR</td>
                    <td className="px-4 py-3 text-right">{slot.shareOfTotal}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render By Page tab
  const renderByPage = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Revenue by Page / Calculator</h3>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Page Path</th>
              <th className="px-4 py-3 text-center">Type</th>
              <th className="px-4 py-3 text-right">Views</th>
              <th className="px-4 py-3 text-right">Impressions</th>
              <th className="px-4 py-3 text-right">Clicks</th>
              <th className="px-4 py-3 text-right">CTR</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 text-right">Rev/View</th>
            </tr>
          </thead>
          <tbody>
            {pagesData.map((page, i) => (
              <tr key={page.pagePath} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                <td className="px-4 py-3 font-mono text-xs max-w-xs truncate">{page.pagePath}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    page.pageType === 'calculator' ? 'bg-blue-100 text-blue-700' :
                    page.pageType === 'blog' ? 'bg-green-100 text-green-700' :
                    page.pageType === 'home' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {page.pageType}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">{page.pageViews.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{page.adImpressions.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{page.adClicks.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{page.ctr}%</td>
                <td className="px-4 py-3 text-right font-medium">{toNum(page.estimatedRevenue).toFixed(2)} SAR</td>
                <td className="px-4 py-3 text-right text-gray-600">{page.revenuePerView}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagesData.length === 0 && (
          <div className="text-center py-8 text-gray-600">No page data available</div>
        )}
      </div>
    </div>
  );

  // Render By Country tab
  const renderByCountry = () => {
    const chartData = {
      labels: countriesData.slice(0, 10).map(c => c.country),
      datasets: [{
        label: 'Revenue (SAR)',
        data: countriesData.slice(0, 10).map(c => toNum(c.estimatedRevenue)),
        backgroundColor: chartColors.primary,
      }],
    };

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Revenue by Country</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <div style={{ height: '300px' }}>
              <Bar 
                data={chartData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                }} 
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Country</th>
                  <th className="px-4 py-3 text-right">Impressions</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">CTR</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {countriesData.map((country, i) => (
                  <tr key={country.country} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                    <td className="px-4 py-3 font-medium">{country.country}</td>
                    <td className="px-4 py-3 text-right">{country.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{country.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{country.ctr}%</td>
                    <td className="px-4 py-3 text-right font-medium">{country.estimatedRevenue} SAR</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render By Device tab
  const renderByDevice = () => {
    const chartData = {
      labels: devicesData.map(d => d.device),
      datasets: [{
        data: devicesData.map(d => toNum(d.estimatedRevenue)),
        backgroundColor: [chartColors.primary, chartColors.secondary, chartColors.accent],
      }],
    };

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Revenue by Device Type</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <div style={{ height: '300px' }}>
              <Doughnut 
                data={chartData} 
                options={{ responsive: true, maintainAspectRatio: false }} 
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Device</th>
                  <th className="px-4 py-3 text-right">Impressions</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">CTR</th>
                  <th className="px-4 py-3 text-right">eCPM</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {devicesData.map((device, i) => (
                  <tr key={device.device} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                    <td className="px-4 py-3 font-medium capitalize">{device.device}</td>
                    <td className="px-4 py-3 text-right">{device.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{device.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{device.ctr}%</td>
                    <td className="px-4 py-3 text-right">{device.eCPM} SAR</td>
                    <td className="px-4 py-3 text-right font-medium">{device.estimatedRevenue} SAR</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render Traffic Sources tab
  const renderTrafficSources = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Traffic Sources & Revenue Attribution</h3>
        <button 
          onClick={() => handleExport('traffic-sources')}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Export CSV
        </button>
      </div>

      <p className="text-sm text-gray-600">
        See which traffic sources (SEO, social, campaigns) generate the most revenue, not just visits.
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-right">Sessions</th>
              <th className="px-4 py-3 text-right">Page Views</th>
              <th className="px-4 py-3 text-right">Calculations</th>
              <th className="px-4 py-3 text-right">Impressions</th>
              <th className="px-4 py-3 text-right">Clicks</th>
              <th className="px-4 py-3 text-right">CTR</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 text-right">Rev/Session</th>
            </tr>
          </thead>
          <tbody>
            {trafficSources.map((source, i) => (
              <tr key={source.source} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                <td className="px-4 py-3 font-medium">{source.source}</td>
                <td className="px-4 py-3 text-right">{source.sessions.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{source.pageViews.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{source.calculations.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{source.adImpressions.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{source.adClicks.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{source.ctr}%</td>
                <td className="px-4 py-3 text-right font-medium">{source.estimatedRevenue} SAR</td>
                <td className="px-4 py-3 text-right text-gray-600">{source.revenuePerSession}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {trafficSources.length === 0 && (
          <div className="text-center py-8 text-gray-600">No traffic source data available</div>
        )}
      </div>
    </div>
  );

  // Render Alerts tab
  const renderAlerts = () => {
    const severityColors: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-300',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      LOW: 'bg-blue-100 text-blue-800 border-blue-300',
    };

    const unresolvedAlerts = alerts.filter(a => !a.isResolved);
    const resolvedAlerts = alerts.filter(a => a.isResolved);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Monetization Alerts</h3>
          <button 
            onClick={handleDetectAnomalies}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            🔍 Run Anomaly Detection
          </button>
        </div>

        <p className="text-sm text-gray-600">
          Alerts help detect suspicious activity that could put your AdSense account at risk.
        </p>

        {/* Unresolved Alerts */}
        <div>
          <h4 className="font-medium mb-3">Active Alerts ({unresolvedAlerts.length})</h4>
          {unresolvedAlerts.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
              ✅ No active alerts. All metrics are within normal ranges.
            </div>
          ) : (
            <div className="space-y-3">
              {unresolvedAlerts.map(alert => (
                <div 
                  key={alert.id} 
                  className={`border rounded-lg p-4 ${severityColors[alert.severity] || severityColors.MEDIUM}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{alert.alertType}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-white/50">{alert.severity}</span>
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const note = prompt('Resolution note (optional):');
                        if (note !== null) handleResolveAlert(alert.id, note);
                      }}
                      className="px-3 py-1 bg-white/80 rounded text-sm hover:bg-white"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resolved Alerts */}
        {resolvedAlerts.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 text-gray-600">Resolved ({resolvedAlerts.length})</h4>
            <div className="space-y-2">
              {resolvedAlerts.slice(0, 10).map(alert => (
                <div key={alert.id} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 opacity-60">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-sm">{alert.alertType}</span>
                      <span className="text-xs text-gray-600 ml-2">{new Date(alert.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className="text-xs text-green-600">✓ Resolved</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Forecast tab
  const renderForecast = () => {
    if (!forecast || !forecast.forecast) {
      return (
        <div className="text-center py-8 text-gray-600">
          Not enough historical data for forecasting. Need at least 7 days of data.
        </div>
      );
    }

    const dailyChartData = {
      labels: forecast.forecast.daily.map(d => d.date),
      datasets: [{
        label: 'Forecasted Revenue (SAR)',
        data: forecast.forecast.daily.map(d => toNum(d.estimatedRevenue)),
        borderColor: chartColors.secondary,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
        borderDash: [5, 5],
      }],
    };

    const monthlyChartData = {
      labels: forecast.monthlyProjections.map(m => `Month ${m.month}`),
      datasets: [{
        label: 'Monthly Projection (SAR)',
        data: forecast.monthlyProjections.map(m => toNum(m.estimatedRevenue)),
        backgroundColor: chartColors.primary,
      }],
    };

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Revenue Forecast</h3>

        {/* Historical Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="font-medium mb-3">Historical Performance (Last {forecast.historical.days} days)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard title="Total Revenue" value={`${forecast.historical.totalRevenue} SAR`} />
            <KPICard title="Daily Average" value={`${forecast.historical.avgDaily} SAR`} />
            <KPICard 
              title="Trend" 
              value={forecast.historical.trend} 
              subtitle={`${forecast.historical.trendPercent}% change`}
              trend={forecast.historical.trend === 'growing' ? 'up' : forecast.historical.trend === 'declining' ? 'down' : 'neutral'}
            />
            <KPICard title="Forecast Period" value={forecast.forecast.period} />
          </div>
        </div>

        {/* Forecast Summary */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
            📈 {forecast.forecast.period} Forecast
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-green-600">Total Expected:</span>
              <span className="text-xl font-bold text-green-800 ml-2">{forecast.forecast.total} SAR</span>
            </div>
            <div>
              <span className="text-sm text-green-600">Daily Average:</span>
              <span className="text-xl font-bold text-green-800 ml-2">{forecast.forecast.avgDaily} SAR</span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium mb-4">Daily Forecast</h4>
            <div style={{ height: '300px' }}>
              <Line 
                data={dailyChartData} 
                options={{ responsive: true, maintainAspectRatio: false }} 
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium mb-4">12-Month Projection</h4>
            <div style={{ height: '300px' }}>
              <Bar 
                data={monthlyChartData} 
                options={{ responsive: true, maintainAspectRatio: false }} 
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-600">
          Methodology: {forecast.methodology || 'Blended linear regression and moving average'}
        </p>
      </div>
    );
  };

  // Render Settings tab
  const renderSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Revenue Model Settings</h3>

      <p className="text-sm text-gray-600">
        Revenue models define the assumptions (eCPM, CPC, CTR thresholds) used to calculate estimated revenue.
        Only SUPER_ADMIN and ADS_MANAGER can create or modify these.
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-center">Effective From</th>
              <th className="px-4 py-3 text-center">Effective To</th>
              <th className="px-4 py-3 text-center">Active</th>
            </tr>
          </thead>
          <tbody>
            {revenueModels.map((model, i) => (
              <tr key={model.id} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                <td className="px-4 py-3 font-medium">{model.name}</td>
                <td className="px-4 py-3 text-gray-600">{model.description || '-'}</td>
                <td className="px-4 py-3 text-center">{new Date(model.effectiveFrom).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-center">{model.effectiveTo ? new Date(model.effectiveTo).toLocaleDateString() : '∞'}</td>
                <td className="px-4 py-3 text-center">
                  {model.isActive ? <span className="text-green-600">✓</span> : <span className="text-gray-400">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {revenueModels.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            No revenue models configured. Using default assumptions.
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">ℹ️ Default Assumptions</h4>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          When no custom model is active, the system uses default Saudi Arabia market assumptions:
        </p>
        <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 list-disc list-inside">
          <li>eCPM: $1.0 - $3.0 depending on slot and device</li>
          <li>CPC: $0.05 - $0.20 depending on slot and device</li>
          <li>CTR Warning: 5%, Critical: 10%, Danger: 15%</li>
          <li>Country multipliers: SA (1.0), UAE (1.2), Kuwait (1.1), Other GCC (1.0), Non-GCC (0.6)</li>
        </ul>
      </div>
    </div>
  );

  // Main render
  return (
    <div className={`w-full space-y-4 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">???? Monetization Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Revenue analytics, forecasting, and anomaly detection</p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range:</span>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map(preset => (
            <button
              key={preset.key}
              onClick={() => setDatePreset(preset.key)}
              className={`px-3 py-1 rounded text-sm ${
                datePreset === preset.key 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)}
              className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
            />
            <span>to</span>
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)}
              className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4 text-red-700">
            ?????? {error}
          </div>
        )}

        {/* Loading State */}
        {showLoading && (
          <div className="p-6">
            <MonetizationSkeleton />
          </div>
        )}

        {/* Tab Content */}
        {!showLoading && (
          <div className="p-6">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'by-slot' && renderBySlot()}
            {activeTab === 'by-page' && renderByPage()}
            {activeTab === 'by-country' && renderByCountry()}
            {activeTab === 'by-device' && renderByDevice()}
            {activeTab === 'traffic' && renderTrafficSources()}
            {activeTab === 'alerts' && renderAlerts()}
            {activeTab === 'forecast' && renderForecast()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        )}
      </div>
    </div>
  );
}
