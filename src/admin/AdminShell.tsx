import React, { useEffect, useState } from 'react';
import Login from './Login';
import AnalyticsPanel from './AnalyticsPanel';
import UsersPanel from './UsersPanel';
import TestsPanel from './TestsPanel';
import ContentPanel from './ContentPanel';
import SeoPanel from './SeoPanel';
import AdsPanel from './AdsPanel';
import SettingsPanel from './SettingsPanel';
import MonetizationPanel from './MonetizationPanel';
import ToolsFeaturesPanel from './ToolsFeaturesPanel';

// Admin user type from API
interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Tab configuration with role requirements
const TABS = [
  { key: 'dashboard', label: 'لوحة التحكم', labelEn: 'Dashboard', icon: '📊', roles: [] },
  { key: 'analytics', label: 'التحليلات', labelEn: 'Analytics', icon: '📈', roles: ['SUPER_ADMIN', 'ADMIN', 'ANALYST'] },
  { key: 'monetization', label: 'الإيرادات', labelEn: 'Monetization', icon: '💵', roles: ['SUPER_ADMIN', 'ADMIN', 'ADS_MANAGER', 'ANALYST'] },
  { key: 'users', label: 'المستخدمين', labelEn: 'Users', icon: '👥', roles: ['SUPER_ADMIN', 'ADMIN', 'IT'] },
  { key: 'content', label: 'المحتوى', labelEn: 'Content', icon: '📝', roles: ['SUPER_ADMIN', 'ADMIN', 'CONTENT_WRITER'] },
  { key: 'tools-features', label: 'الحاسبات والمميزات', labelEn: 'Tools & Features', icon: '🧮', roles: ['SUPER_ADMIN', 'ADMIN', 'CONTENT_WRITER'] },
  { key: 'seo', label: 'SEO', labelEn: 'SEO', icon: '🔍', roles: ['SUPER_ADMIN', 'ADMIN', 'CONTENT_WRITER'] },
  { key: 'ads', label: 'الإعلانات', labelEn: 'Ads', icon: '💰', roles: ['SUPER_ADMIN', 'ADMIN', 'ADS_MANAGER'] },
  { key: 'settings', label: 'الإعدادات', labelEn: 'Settings', icon: '⚙️', roles: ['SUPER_ADMIN', 'IT'] },
  { key: 'tests', label: 'الاختبارات', labelEn: 'Tests', icon: '🧪', roles: ['SUPER_ADMIN', 'IT'] },
] as const;

type TabKey = typeof TABS[number]['key'];

// Role display names
const ROLE_NAMES: Record<string, { ar: string; en: string }> = {
  SUPER_ADMIN: { ar: 'مدير النظام', en: 'Super Admin' },
  ADMIN: { ar: 'مدير', en: 'Admin' },
  IT: { ar: 'تقنية المعلومات', en: 'IT' },
  DESIGNER: { ar: 'مصمم', en: 'Designer' },
  CONTENT_WRITER: { ar: 'كاتب محتوى', en: 'Content Writer' },
  ADS_MANAGER: { ar: 'مدير إعلانات', en: 'Ads Manager' },
  ANALYST: { ar: 'محلل', en: 'Analyst' },
  VIEW_ONLY: { ar: 'مشاهد فقط', en: 'View Only' },
};

function hasAccess(userRole: string, allowedRoles: readonly string[]): boolean {
  if (allowedRoles.length === 0) return true;
  if (userRole === 'SUPER_ADMIN') return true;
  return allowedRoles.includes(userRole);
}

// Admin panel language type
type AdminLang = 'ar' | 'en';

export default function AdminShell() {
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [lang, setLang] = useState<AdminLang>(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('adminLang');
    return (saved === 'en' ? 'en' : 'ar') as AdminLang;
  });
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    fetch('/api/auth/check', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j && j.ok && j.user) {
          setUser(j.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  };

  const handleLogin = (loggedInUser: AdminUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  const toggleLang = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    setLang(newLang);
    localStorage.setItem('adminLang', newLang);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const roleName = ROLE_NAMES[user.role] || { ar: user.role, en: user.role };
  const accessibleTabs = TABS.filter(t => hasAccess(user.role, t.roles));

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <aside className={`flex-shrink-0 bg-white dark:bg-slate-800 shadow-lg transition-all duration-300 h-screen sticky top-0 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Calcu-Hub</h1>
            )}
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {sidebarCollapsed ? (lang === 'ar' ? '→' : '←') : (lang === 'ar' ? '←' : '→')}
            </button>
          </div>
        </div>
        
        <nav className="p-2 pb-24">
          {accessibleTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition ${
                tab === t.key 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              {!sidebarCollapsed && <span>{lang === 'ar' ? t.label : t.labelEn}</span>}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          {!sidebarCollapsed && (
            <div className="mb-3">
              <p className="font-medium text-slate-900 dark:text-white text-sm">{user.name}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{lang === 'ar' ? roleName.ar : roleName.en}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition"
          >
            {sidebarCollapsed ? '🚪' : (lang === 'ar' ? 'تسجيل الخروج' : 'Logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 shadow-sm p-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {lang === 'ar' 
              ? TABS.find(t => t.key === tab)?.label 
              : TABS.find(t => t.key === tab)?.labelEn}
          </h2>
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition text-sm font-medium"
              title={lang === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
            >
              {lang === 'ar' ? 'EN' : 'ع'}
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Content - Full width */}
        <div className="p-6 lg:p-8 w-full max-w-6xl mx-auto space-y-6">
          {tab === 'dashboard' && <DashboardPanel lang={lang} />}
          {tab === 'analytics' && <AnalyticsPanel />}
          {tab === 'monetization' && <MonetizationPanel />}
          {tab === 'users' && <UsersPanel />}
          {tab === 'content' && <ContentPanel />}
          {tab === 'tools-features' && <ToolsFeaturesPanel />}
          {tab === 'seo' && <SeoPanel />}
          {tab === 'ads' && <AdsPanel />}
          {tab === 'settings' && <SettingsPanel />}
          {tab === 'tests' && <TestsPanel />}
        </div>
      </main>
    </div>
  );
}

// Dashboard Panel - Quick Stats
function DashboardPanel({ lang }: { lang: 'ar' | 'en' }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/dashboard', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'جاري تحميل الإحصائيات...' : 'Loading stats...'}</div>;
  }

  // Handle case when stats failed to load or returned an error
  if (!stats || stats.error) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <p className="text-yellow-800 dark:text-yellow-200">
          {lang === 'ar' ? 'تعذر تحميل الإحصائيات. تأكد من تشغيل الخادم.' : 'Could not load stats. Make sure the server is running.'}
        </p>
      </div>
    );
  }

  const labels = {
    todayViews: lang === 'ar' ? 'زيارات اليوم' : "Today's Views",
    calculations: lang === 'ar' ? 'الحسابات' : 'Calculations',
    adImpressions: lang === 'ar' ? 'انطباعات الإعلانات' : 'Ad Impressions',
    revenue: lang === 'ar' ? 'الإيرادات (ريال)' : 'Revenue (SAR)',
    topPages: lang === 'ar' ? 'أفضل الصفحات' : 'Top Pages',
    topCalculators: lang === 'ar' ? 'أفضل الحاسبات' : 'Top Calculators',
    visits: lang === 'ar' ? 'زيارة' : 'visits',
    uses: lang === 'ar' ? 'استخدام' : 'uses',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={labels.todayViews} value={stats?.today?.pageViews || 0} icon="👁️" />
        <StatCard title={labels.calculations} value={stats?.today?.calculations || 0} icon="🧮" />
        <StatCard title={labels.adImpressions} value={stats?.today?.adImpressions || 0} icon="📢" />
        <StatCard title={labels.revenue} value={stats?.revenue?.total?.toFixed(2) || '0.00'} icon="💰" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">{labels.topPages}</h3>
          <div className="space-y-2">
            {stats?.topPages?.slice(0, 5).map((page: any, i: number) => (
              <div key={i} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-sm">{page.pagePath}</span>
                <span className="text-sm font-medium">{page._count} {labels.visits}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">{labels.topCalculators}</h3>
          <div className="space-y-2">
            {stats?.topCalculators?.slice(0, 5).map((calc: any, i: number) => (
              <div key={i} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-sm">{calc.calculatorType}</span>
                <span className="text-sm font-medium">{calc._count} {labels.uses}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
      <div className="flex items-center gap-4">
        <span className="text-3xl">{icon}</span>
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
