import React, { useEffect, useState, Suspense, useMemo } from 'react';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';

// Lazy load editor to reduce initial bundle size
const ContentEditor = React.lazy(() => import('./ContentEditor'));
const CmsPagesPanel = React.lazy(() => import('./CmsPagesPanel'));

interface StaticPage {
  id: string;
  slug: string;
  locale: string;
  title: string;
  titleAr?: string;
  titleEn?: string;
  bodyMarkdown: string;
  isPublished: boolean;
  updatedAt: string;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  isPublished: boolean;
  authorId: string;
  publishedAt: string | null;
  updatedAt: string;
}

interface FAQ {
  id: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  category: string;
  order: number;
  isActive: boolean;
}

type ContentType = 'pages' | 'blog' | 'faq' | 'cms-pages';

export default function ContentPanel() {
  const [activeTab, setActiveTab] = useState<ContentType>('cms-pages');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    performance.mark('Content-render');
    console.log('[Perf] ContentPanel mounted/rendered');
  }, []);

  // Data states
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  // Query params state
  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    search: '',
    sortBy: '',
    sortOrder: 'asc' as 'asc' | 'desc',
    includeDeleted: false
  });

  // Editor states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, params]);

  const fetchData = async () => {
    if (activeTab === 'cms-pages') {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      let endpoint = '';
      switch (activeTab) {
        case 'pages':
          endpoint = '/api/admin/content/pages';
          break;
        case 'blog':
          endpoint = '/api/admin/content/blog';
          break;
        case 'faq':
          endpoint = '/api/admin/content/faqs';
          break;
      }

      if (!endpoint) {
        setLoading(false);
        return;
      }

      const query = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
        search: params.search,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        includeDeleted: String(params.includeDeleted)
      }).toString();

      const response = await fetch(`${endpoint}?${query}`, { credentials: 'include' });
      const data = await response.json();

      if (response.ok) {
        switch (activeTab) {
          case 'pages':
            setPages(data.pages || []);
            setTotalItems(data.pagination?.total || 0);
            break;
          case 'blog':
            setBlogPosts(data.posts || []);
            setTotalItems(data.pagination?.total || 0);
            break;
          case 'faq':
            setFaqs(data.faqs || []);
            setTotalItems(data.pagination?.total || 0);
            break;
        }
        performance.mark('Content-data-loaded');
        
        // Measure total time
        try {
          const navStart = performance.getEntriesByName('nav-start-content').pop();
          const loadEnd = performance.getEntriesByName('Content-loaded').pop();
          const renderStart = performance.getEntriesByName('Content-render').pop();
          const dataEnd = performance.getEntriesByName('Content-data-loaded').pop();

          if (navStart && dataEnd) {
             console.log(`[Perf] Total Content Transition: ${(dataEnd.startTime - navStart.startTime).toFixed(2)}ms`);
             if (loadEnd) console.log(`[Perf]  - Module Load: ${(loadEnd.startTime - navStart.startTime).toFixed(2)}ms`);
             if (renderStart && loadEnd) console.log(`[Perf]  - Render Delay: ${(renderStart.startTime - loadEnd.startTime).toFixed(2)}ms`);
             if (renderStart) console.log(`[Perf]  - Data Fetch: ${(dataEnd.startTime - renderStart.startTime).toFixed(2)}ms`);
          }
        } catch (e) { console.error(e); }
      } else {
        setError(data.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleParamsChange = (newParams: any) => {
    setParams(prev => ({ ...prev, ...newParams }));
  };

  const handleTabChange = (tab: ContentType) => {
    setActiveTab(tab);
    setParams({
      page: 1,
      limit: 10,
      search: '',
      sortBy: '',
      sortOrder: 'asc',
      includeDeleted: false
    });
  };

  const handleSave = async (item: any) => {
    try {
      let endpoint = '';
      let method = item.id ? 'PUT' : 'POST';

      switch (activeTab) {
        case 'pages':
          // Pages use POST for upsert in the current repo implementation
          endpoint = '/api/admin/content/pages';
          method = 'POST';
          break;
        case 'blog':
          endpoint = item.id ? `/api/admin/content/blog/${item.id}` : '/api/admin/content/blog';
          break;
        case 'faq':
          endpoint = item.id ? `/api/admin/content/faqs/${item.id}` : '/api/admin/content/faqs';
          break;
      }

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
      let endpoint = '';
      switch (activeTab) {
        case 'pages':
          endpoint = `/api/admin/content/pages/${id}`;
          break;
        case 'blog':
          endpoint = `/api/admin/content/blog/${id}`;
          break;
        case 'faq':
          endpoint = `/api/admin/content/faqs/${id}`;
          break;
      }

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

  const handleBulkAction = async (action: string, selectedIds: string[]) => {
    if (!confirm(`هل أنت متأكد من تنفيذ "${action}" على ${selectedIds.length} عنصر؟`)) return;
    
    try {
      const response = await fetch('/api/admin/content/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, action, ids: selectedIds }),
      });
      
      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Bulk action failed');
      }
    } catch (e) {
      alert('Error performing bulk action');
    }
  };

  const handleClone = async (item: any) => {
     try {
      let endpoint = '';
      switch (activeTab) {
        case 'blog': endpoint = `/api/admin/content/blog/${item.id}/clone`; break;
        case 'faq': endpoint = `/api/admin/content/faqs/${item.id}/clone`; break;
        default: return alert('Clone not supported for this type');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
      });
      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Clone failed');
      }
     } catch (e) {
       alert('Error cloning item');
     }
  };

  const tabs = [
    { key: 'cms-pages' as const, label: 'صفحات الحاسبات (CMS)', icon: '🧮' },
    { key: 'pages' as const, label: 'الصفحات الثابتة', icon: '📄' },
    { key: 'blog' as const, label: 'المدونة', icon: '📝' },
    { key: 'faq' as const, label: 'الأسئلة الشائعة', icon: '❓' },
  ];

  // Column Definitions
  const pageColumns: ColumnDef<StaticPage>[] = useMemo(() => [
    { 
      key: 'title', 
      header: 'العنوان', 
      sortable: true, 
      render: (val, item) => val || item.titleAr || item.titleEn || 'بدون عنوان' 
    },
    { key: 'slug', header: 'المسار', sortable: true, render: (val) => <span dir="ltr">/{val}</span> },
    { key: 'locale', header: 'اللغة', sortable: true, render: (val) => val === 'ar' ? 'العربية' : 'English' },
    { key: 'isPublished', header: 'الحالة', sortable: true, render: (val) => (
      <span className={`px-2 py-1 text-xs rounded-full ${val ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
        {val ? 'منشور' : 'مسودة'}
      </span>
    )},
    { key: 'updatedAt', header: 'آخر تحديث', sortable: true, render: (val) => new Date(val).toLocaleDateString('ar-SA') },
    { key: 'id', header: 'رابط', render: (_, item) => (
      <a 
        href={item.slug === 'home' ? '/' : `/p/${item.slug}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline flex items-center gap-1"
      >
        <span>عرض</span>
        <span className="text-[10px]">↗</span>
      </a>
    )}
  ], []);

  const blogColumns: ColumnDef<BlogPost>[] = useMemo(() => [
    { 
      key: 'title', 
      header: 'العنوان', 
      sortable: true, 
      render: (val, item) => val || item.titleAr || item.titleEn || 'بدون عنوان' 
    },
    { key: 'slug', header: 'المسار', sortable: true, render: (val) => <span dir="ltr">/blog/{val}</span> },
    { key: 'isPublished', header: 'الحالة', sortable: true, render: (val) => (
       <span className={`px-2 py-1 text-xs rounded-full ${val ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
         {val ? 'منشور' : 'مسودة'}
       </span>
    )},
    { key: 'publishedAt', header: 'تاريخ النشر', sortable: true, render: (val) => val ? new Date(val).toLocaleDateString('ar-SA') : '-' },
    { key: 'id', header: 'رابط', render: (_, item) => (
      <a 
        href={`/blog/${item.slug}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline flex items-center gap-1"
      >
        <span>عرض</span>
        <span className="text-[10px]">↗</span>
      </a>
    )}
  ], []);

  const faqColumns: ColumnDef<FAQ>[] = useMemo(() => [
    { key: 'questionAr', header: 'السؤال', sortable: true, render: (val, item) => val || item.questionEn || 'بدون سؤال' },
    { key: 'category', header: 'التصنيف', sortable: true },
    { key: 'isPublished', header: 'الحالة', sortable: true, render: (val) => (
      <span className={`px-2 py-1 text-xs rounded-full ${val ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
        {val ? 'منشور' : 'مسودة'}
      </span>
    )},
    { key: 'sortOrder', header: 'الترتيب', sortable: true },
  ], []);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
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
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-slate-800">
            {tabs.find((t) => t.key === activeTab)?.label}
          </h2>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={params.includeDeleted}
              onChange={(e) => handleParamsChange({ includeDeleted: e.target.checked, page: 1 })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            عرض المحذوفات
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            وضع التصحيح (Debug)
          </label>
        </div>
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
          {debugMode && (
            <div className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto max-h-64 text-xs font-mono mb-4">
              <pre>{JSON.stringify({ activeTab, totalItems, data: activeTab === 'pages' ? pages : activeTab === 'blog' ? blogPosts : faqs }, null, 2)}</pre>
            </div>
          )}
          
          {activeTab === 'cms-pages' && (
            <Suspense fallback={<div>Loading CMS...</div>}>
              <CmsPagesPanel />
            </Suspense>
          )}

          {activeTab === 'pages' && (
            <AdminDataTable
              columns={pageColumns}
              data={pages}
              serverSide
              totalItems={totalItems}
              onParamsChange={handleParamsChange}
              onRowAction={(action, item) => {
                if (action === 'edit') { setEditingItem(item); setIsEditorOpen(true); }
                if (action === 'delete') handleDelete(item.id);
              }}
              onBulkAction={handleBulkAction}
            />
          )}

          {activeTab === 'blog' && (
            <AdminDataTable
              columns={blogColumns}
              data={blogPosts}
              serverSide
              totalItems={totalItems}
              onParamsChange={handleParamsChange}
              onRowAction={(action, item) => {
                if (action === 'edit') { setEditingItem(item); setIsEditorOpen(true); }
                if (action === 'delete') handleDelete(item.id);
                if (action === 'clone') handleClone(item);
              }}
              onBulkAction={handleBulkAction}
            />
          )}

          {activeTab === 'faq' && (
            <AdminDataTable
              columns={faqColumns}
              data={faqs}
              serverSide
              totalItems={totalItems}
              onParamsChange={handleParamsChange}
              onRowAction={(action, item) => {
                if (action === 'edit') { setEditingItem(item); setIsEditorOpen(true); }
                if (action === 'delete') handleDelete(item.id);
                if (action === 'clone') handleClone(item);
              }}
              onBulkAction={handleBulkAction}
            />
          )}
        </>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white p-8 rounded-lg shadow-xl">Loading Editor...</div></div>}>
          <ContentEditor
            type={activeTab}
            item={editingItem}
            onSave={handleSave}
            onClose={() => {
              setIsEditorOpen(false);
              setEditingItem(null);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}


