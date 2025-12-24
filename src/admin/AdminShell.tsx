import React, { useEffect, useState, Suspense } from 'react';
import * as Sentry from "@sentry/react";
import { ErrorBoundary } from '../components/ErrorBoundary';
import Login from './Login';

// Lazy load admin panels to reduce initial bundle size
const measureLoad = (name: string, importer: () => Promise<any>) => {
  return React.lazy(() => {
    const start = performance.now();
    return importer().then(module => {
      const duration = performance.now() - start;
      console.log(`[Perf] ${name} module loaded in ${duration.toFixed(2)}ms`);
      performance.mark(`${name}-loaded`);
      return module;
    });
  });
};

const PANEL_IMPORTERS = {
  analytics: () => import('./AnalyticsPanel'),
  users: () => import('./UsersPanel'),
  tests: () => import('./TestsPanel'),
  content: () => import('./ContentPanel'),
  seo: () => import('./SeoPanel'),
  ads: () => import('./AdsPanel'),
  settings: () => import('./SettingsPanel'),
  monetization: () => import('./MonetizationPanel'),
  'tools-features': () => import('./ToolsFeaturesPanel'),
  'ai-integrations': () => import('./AIIntegrationsPanel'),
  maintenance: () => import('./MaintenancePanel'),
  audit: () => import('./AuditPanel'),
  diagnostics: () => import('./DiagnosticsPanel'),
  errors: () => import('./ErrorsPanel'),
  jobs: () => import('./JobsPanel'),
  backups: () => import('./BackupsPanel'),
  calculators: () => import('./CalculatorsPanel'),
  flags: () => import('./FeatureFlagsPanel'),
  'analytics-definitions': () => import('./AnalyticsDefinitionsPanel'),
  'ad-inventory': () => import('./AdInventoryPanel'),
  experiments: () => import('./ExperimentsPanel'),
};

const AnalyticsPanel = measureLoad('Analytics', PANEL_IMPORTERS.analytics);
const UsersPanel = measureLoad('Users', PANEL_IMPORTERS.users);
const TestsPanel = measureLoad('Tests', PANEL_IMPORTERS.tests);
const ContentPanel = measureLoad('Content', PANEL_IMPORTERS.content);
const SeoPanel = measureLoad('Seo', PANEL_IMPORTERS.seo);
const AdsPanel = measureLoad('Ads', PANEL_IMPORTERS.ads);
const SettingsPanel = measureLoad('Settings', PANEL_IMPORTERS.settings);
const MonetizationPanel = measureLoad('Monetization', PANEL_IMPORTERS.monetization);
const ToolsFeaturesPanel = measureLoad('ToolsFeatures', PANEL_IMPORTERS['tools-features']);
const AIIntegrationsPanel = measureLoad('AIIntegrations', PANEL_IMPORTERS['ai-integrations']);
const MaintenancePanel = measureLoad('Maintenance', PANEL_IMPORTERS.maintenance);
const AuditPanel = measureLoad('Audit', PANEL_IMPORTERS.audit);
const DiagnosticsPanel = measureLoad('Diagnostics', PANEL_IMPORTERS.diagnostics);
const ErrorsPanel = measureLoad('Errors', PANEL_IMPORTERS.errors);
const JobsPanel = measureLoad('Jobs', PANEL_IMPORTERS.jobs);
const BackupsPanel = measureLoad('Backups', PANEL_IMPORTERS.backups);
const CalculatorsPanel = measureLoad('Calculators', PANEL_IMPORTERS.calculators);
const FeatureFlagsPanel = measureLoad('FeatureFlags', PANEL_IMPORTERS.flags);
const AnalyticsDefinitionsPanel = measureLoad('AnalyticsDefinitions', PANEL_IMPORTERS['analytics-definitions']);
const AdInventoryPanel = measureLoad('AdInventory', PANEL_IMPORTERS['ad-inventory']);
const ExperimentsPanel = measureLoad('Experiments', PANEL_IMPORTERS.experiments);

// Admin user type from API
interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Tab configuration with role requirements and logical grouping
const TABS = [
  { key: 'dashboard', label: 'لوحة التحكم', labelEn: 'Dashboard', icon: '📊', roles: [], groupId: 'general' },
  { key: 'analytics', label: 'التحليلات', labelEn: 'Analytics', icon: '📈', roles: ['SUPER_ADMIN', 'ADMIN', 'ANALYST'], groupId: 'growth' },
  { key: 'analytics-definitions', label: 'تعريفات التحليلات', labelEn: 'Analytics Definitions', icon: '📊', roles: ['SUPER_ADMIN', 'ADMIN'], groupId: 'growth' },
  { key: 'experiments', label: 'التجارب', labelEn: 'Experiments', icon: '🧪', roles: ['SUPER_ADMIN', 'ADMIN'], groupId: 'growth' },
  { key: 'monetization', label: 'الإيرادات', labelEn: 'Monetization', icon: '💵', roles: ['SUPER_ADMIN', 'ADMIN', 'ADS_MANAGER', 'ANALYST'], groupId: 'revenue' },
  { key: 'ad-inventory', label: 'مخزون الإعلانات', labelEn: 'Ad Inventory', icon: '📢', roles: ['SUPER_ADMIN', 'ADMIN', 'ADS_MANAGER'], groupId: 'revenue' },
  { key: 'users', label: 'المستخدمين والصلاحيات', labelEn: 'Users & Permissions', icon: '👥', roles: ['SUPER_ADMIN', 'ADMIN', 'IT'], groupId: 'security' },
  { key: 'content', label: 'المحتوى (CMS)', labelEn: 'Content (CMS)', icon: '📝', roles: ['SUPER_ADMIN', 'ADMIN', 'CONTENT_WRITER'], groupId: 'product' },
  { key: 'calculators', label: 'سجل الحاسبات', labelEn: 'Calculators', icon: '🧮', roles: ['SUPER_ADMIN', 'ADMIN'], groupId: 'product' },
  { key: 'flags', label: 'أعلام الميزات', labelEn: 'Feature Flags', icon: '🚩', roles: ['SUPER_ADMIN', 'ADMIN'], groupId: 'product' },
  { key: 'tools-features', label: 'الحاسبات والمميزات', labelEn: 'Tools & Features', icon: '🛠️', roles: ['SUPER_ADMIN', 'ADMIN', 'CONTENT_WRITER'], groupId: 'product' },
  { key: 'seo', label: 'SEO', labelEn: 'SEO', icon: '🔍', roles: ['SUPER_ADMIN', 'ADMIN', 'CONTENT_WRITER'], groupId: 'growth' },
  { key: 'ads', label: 'الإعلانات', labelEn: 'Ads', icon: '💰', roles: ['SUPER_ADMIN', 'ADMIN', 'ADS_MANAGER'], groupId: 'revenue' },
  { key: 'ai-integrations', label: 'الذكاء الاصطناعي', labelEn: 'AI Integrations', icon: '🤖', roles: ['SUPER_ADMIN', 'ADMIN', 'IT'], groupId: 'security' },
  { key: 'maintenance', label: 'الصيانة', labelEn: 'Maintenance', icon: '🔧', roles: ['SUPER_ADMIN', 'ADMIN', 'IT'], groupId: 'operations' },
  { key: 'audit', label: 'سجل النظام', labelEn: 'System Logs', icon: '📜', roles: ['SUPER_ADMIN', 'IT'], groupId: 'operations' },
  { key: 'diagnostics', label: 'الصحة والتشخيص', labelEn: 'Health & Diagnostics', icon: '🩺', roles: ['SUPER_ADMIN', 'IT'], groupId: 'operations' },
  { key: 'errors', label: 'الأخطاء', labelEn: 'Errors', icon: '⚠️', roles: ['SUPER_ADMIN', 'IT'], groupId: 'operations' },
  { key: 'jobs', label: 'المهام المجدولة', labelEn: 'Jobs', icon: '⚡', roles: ['SUPER_ADMIN', 'IT'], groupId: 'operations' },
  { key: 'backups', label: 'النسخ الاحتياطي', labelEn: 'Backups', icon: '💾', roles: ['SUPER_ADMIN', 'IT'], groupId: 'operations' },
  { key: 'settings', label: 'الإعدادات والمفاتيح', labelEn: 'Settings & API Keys', icon: '⚙️', roles: ['SUPER_ADMIN', 'IT'], groupId: 'security' },
  { key: 'tests', label: 'الاختبارات', labelEn: 'Tests', icon: '🧪', roles: ['SUPER_ADMIN', 'IT'], groupId: 'operations' },
] as const;

const GROUPS = [
  { id: 'product', label: 'المنتج', labelEn: 'Product', icon: '📦' },
  { id: 'growth', label: 'النمو', labelEn: 'Growth', icon: '📈' },
  { id: 'revenue', label: 'الإيرادات', labelEn: 'Revenue', icon: '💰' },
  { id: 'operations', label: 'العمليات', labelEn: 'Operations', icon: '⚙️' },
  { id: 'security', label: 'الأمان', labelEn: 'Security', icon: '🛡️' },
] as const;

type TabKey = typeof TABS[number]['key'];
type GroupId = typeof GROUPS[number]['id'] | 'general';

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

function AdminLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        ))}
      </div>
      <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
    </div>
  );
}

export default function AdminShell() {
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab') as TabKey;
      if (t && TABS.some(x => x.key === t)) return t;
    }
    return 'dashboard';
  });

  // Sync tab to URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  }, [tab]);

  const [user, setUser] = useState<AdminUser | null>(null);
  const [lang, setLang] = useState<AdminLang>(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('adminLang');
    return (saved === 'en' ? 'en' : 'ar') as AdminLang;
  });
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    // Expand the group of the current tab by default
    const currentTab = TABS.find(t => t.key === tab);
    if (currentTab && currentTab.groupId !== 'general') {
      return { [currentTab.groupId]: true };
    }
    return {};
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const prefetched = React.useRef(new Set<string>());

  const handlePrefetch = (key: string) => {
    if (prefetched.current.has(key)) return;
    
    const importer = PANEL_IMPORTERS[key as keyof typeof PANEL_IMPORTERS];
    if (importer) {
      console.log(`[Prefetch] Starting prefetch for ${key}`);
      importer();
      prefetched.current.add(key);
    }
  };

  const checkAuth = () => {
    fetch('/api/auth/check', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j && j.ok && j.user) {
          setUser(j.user);
          Sentry.setUser({ id: j.user.id, role: j.user.role });
        } else {
          setUser(null);
          Sentry.setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
        Sentry.setUser(null);
      })
      .finally(() => setLoading(false));
  };

  const handleLogin = (loggedInUser: AdminUser) => {
    setUser(loggedInUser);
    Sentry.setUser({ id: loggedInUser.id, role: loggedInUser.role });
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    Sentry.setUser(null);
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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <aside className={`flex-shrink-0 bg-white dark:bg-slate-800 shadow-lg transition-all duration-300 h-screen sticky top-0 flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
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
        
        <nav className="p-2 flex-1 overflow-y-auto custom-scrollbar">
          {/* General / Dashboard */}
          {accessibleTabs.filter(t => t.groupId === 'general').map(t => (
            <button
              key={t.key}
              data-testid={`nav-${t.key}`}
              onMouseEnter={() => handlePrefetch(t.key)}
              onFocus={() => handlePrefetch(t.key)}
              onClick={() => {
                const markName = `nav-start-${t.key}`;
                performance.mark(markName);
                console.log(`[Perf] Navigation started: ${t.key}`);
                setTab(t.key);
              }}
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

          {/* Logical Groups */}
          {GROUPS.map(group => {
            const groupTabs = accessibleTabs.filter(t => t.groupId === group.id);
            if (groupTabs.length === 0) return null;

            const isExpanded = expandedGroups[group.id];
            const hasActiveTab = groupTabs.some(t => t.key === tab);

            return (
              <div key={group.id} className="mb-2">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition ${
                    hasActiveTab && !isExpanded ? 'bg-slate-50 dark:bg-slate-700/50' : ''
                  } text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg opacity-70">{group.icon}</span>
                    {!sidebarCollapsed && (
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {lang === 'ar' ? group.label : group.labelEn}
                      </span>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <span className={`text-[10px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  )}
                </button>

                {isExpanded && !sidebarCollapsed && (
                  <div className="mt-1 space-y-1 mr-4 ml-4 border-r-2 border-slate-100 dark:border-slate-700 pr-2 pl-2">
                    {groupTabs.map(t => (
                      <button
                        key={t.key}
                        data-testid={`nav-${t.key}`}
                        onMouseEnter={() => handlePrefetch(t.key)}
                        onFocus={() => handlePrefetch(t.key)}
                        onClick={() => setTab(t.key)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                          tab === t.key 
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className="text-base">{t.icon}</span>
                        <span>{lang === 'ar' ? t.label : t.labelEn}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* If collapsed, show icons only if expanded? No, if collapsed, we should probably show a tooltip or just the icons. 
                    Actually, the user said "logical groups". If collapsed, maybe we just show the group icons and clicking them expands?
                    The current implementation of sidebarCollapsed hides labels.
                */}
                {sidebarCollapsed && isExpanded && (
                   <div className="mt-1 space-y-1">
                     {groupTabs.map(t => (
                        <button
                          key={t.key}
                          onClick={() => setTab(t.key)}
                          title={lang === 'ar' ? t.label : t.labelEn}
                          className={`w-full flex justify-center py-2 rounded-md transition ${
                            tab === t.key 
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span className="text-lg">{t.icon}</span>
                        </button>
                     ))}
                   </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
          <ErrorBoundary fallback={<div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">حدث خطأ غير متوقع في لوحة التحكم. يرجى تحديث الصفحة.</div>}>
            <Suspense fallback={<AdminLoadingSkeleton />}>
              {tab === 'dashboard' && <DashboardPanel lang={lang} />}
              {tab === 'analytics' && <AnalyticsPanel />}
              {tab === 'analytics-definitions' && <AnalyticsDefinitionsPanel />}
              {tab === 'experiments' && <ExperimentsPanel />}
              {tab === 'monetization' && <MonetizationPanel />}
              {tab === 'ad-inventory' && <AdInventoryPanel />}
              {tab === 'users' && <UsersPanel />}
              {tab === 'content' && <ContentPanel />}
              {tab === 'calculators' && <CalculatorsPanel />}
              {tab === 'flags' && <FeatureFlagsPanel />}
              {tab === 'tools-features' && <ToolsFeaturesPanel />}
              {tab === 'seo' && <SeoPanel />}
              {tab === 'ads' && <AdsPanel />}
              {tab === 'ai-integrations' && <AIIntegrationsPanel />}
              {tab === 'maintenance' && <MaintenancePanel />}
              {tab === 'settings' && <SettingsPanel />}
              {tab === 'tests' && <TestsPanel />}
              {tab === 'audit' && <AuditPanel />}
              {tab === 'diagnostics' && <DiagnosticsPanel />}
              {tab === 'errors' && <ErrorsPanel />}
              {tab === 'jobs' && <JobsPanel />}
              {tab === 'backups' && <BackupsPanel />}
            </Suspense>
          </ErrorBoundary>
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
      <HealthOverview lang={lang} />
      
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

function HealthOverview({ lang }: { lang: 'ar' | 'en' }) {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/ops/health', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setHealth(data))
      .catch(console.error);
  }, []);

  if (!health) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      <HealthCard 
        title="Database" 
        status={health.db.status} 
        detail={`${health.db.latencyMs}ms`} 
        icon="🗄️" 
      />
      <HealthCard 
        title="Queue" 
        status={health.queue.status} 
        detail={`${health.queue.pendingCount} pending`} 
        icon="📥" 
      />
      <HealthCard 
        title="Analytics" 
        status={health.externalProviders.analytics.status} 
        detail={health.externalProviders.analytics.latencyMs ? `${health.externalProviders.analytics.latencyMs}ms` : 'N/A'} 
        icon="📈" 
      />
      <HealthCard 
        title="Ads" 
        status={health.externalProviders.ads.status} 
        detail={health.externalProviders.ads.latencyMs ? `${health.externalProviders.ads.latencyMs}ms` : 'N/A'} 
        icon="💰" 
      />
      <HealthCard 
        title="App" 
        status="OK" 
        detail={`Uptime: ${Math.floor(health.app.uptime / 3600)}h`} 
        icon="🚀" 
      />
    </div>
  );
}

function HealthCard({ title, status, detail, icon }: { title: string; status: string; detail: string; icon: string }) {
  const statusColor = status === 'OK' ? 'bg-green-500' : status === 'DEGRADED' ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
      <div className="text-2xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
          <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
        </div>
        <div className="text-sm font-bold truncate">{detail}</div>
      </div>
    </div>
  );
}
