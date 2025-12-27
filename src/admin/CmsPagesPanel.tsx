import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  ExternalLink, 
  History, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Eye
} from 'lucide-react';
import CmsEditorPanel from './CmsEditorPanel';

interface CmsPage {
  id: string;
  slug: string;
  pageType: string;
  status: 'draft' | 'published' | 'archived';
  currentVersionId: string | null;
  updatedAt: string;
}

export const CmsPagesPanel: React.FC = () => {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPage, setNewPage] = useState({ slug: '', pageType: 'calculator' });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cms/pages', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) setPages(await res.json());
    } catch (e) {
      console.error('Failed to fetch CMS pages', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async () => {
    try {
      const res = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify(newPage)
      });
      if (res.ok) {
        const page = await res.json();
        setPages([page, ...pages]);
        setIsCreating(false);
        setSelectedPageId(page.id);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create page');
      }
    } catch (e) {
      alert('Error creating page');
    }
  };

  if (selectedPageId) {
    return <CmsEditorPanel pageId={selectedPageId} onBack={() => { setSelectedPageId(null); fetchPages(); }} />;
  }

  const filteredPages = pages.filter(p => 
    p.slug.toLowerCase().includes(search.toLowerCase()) || 
    p.pageType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="بحث في الصفحات..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 transition"
          />
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          صفحة جديدة
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">الصفحة</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">النوع</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">الحالة</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">آخر تحديث</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredPages.map((page) => (
              <tr key={page.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{page.slug}</span>
                      <span className="text-xs text-slate-500 font-mono">/{page.slug}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{page.pageType}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    page.status === 'published' ? 'bg-green-100 text-green-800' :
                    page.status === 'draft' ? 'bg-slate-100 text-slate-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {page.status === 'published' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {page.status === 'published' ? 'منشور' : 'مسودة'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(page.updatedAt).toLocaleDateString('ar-SA')}
                </td>
                <td className="px-6 py-4 text-left">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setSelectedPageId(page.id)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="تعديل"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold">إنشاء صفحة جديدة</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">المسار (Slug)</label>
                <input 
                  type="text" 
                  value={newPage.slug}
                  onChange={(e) => setNewPage({...newPage, slug: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="مثال: salary-calculator"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="page-type">نوع الصفحة</label>
                <select 
                  id="page-type"
                  title="Select page type"
                  value={newPage.pageType}
                  onChange={(e) => setNewPage({...newPage, pageType: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="calculator">حاسبة</option>
                  <option value="article">مقال</option>
                  <option value="policy">سياسة</option>
                  <option value="landing">صفحة هبوط</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
              <button 
                onClick={() => setIsCreating(false)}
                className="flex-1 px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition"
              >
                إلغاء
              </button>
              <button 
                onClick={handleCreatePage}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
              >
                إنشاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CmsPagesPanel;
