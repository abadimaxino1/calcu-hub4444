import React, { useEffect, useState } from 'react';

interface StaticPage {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  isPublished: boolean;
  updatedAt: string;
}

interface BlogPost {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
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

type ContentType = 'pages' | 'blog' | 'faq';

export default function ContentPanel() {
  const [activeTab, setActiveTab] = useState<ContentType>('pages');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  // Editor states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      let endpoint = '';
      switch (activeTab) {
        case 'pages':
          endpoint = '/api/content/pages';
          break;
        case 'blog':
          endpoint = '/api/content/blog';
          break;
        case 'faq':
          endpoint = '/api/content/faq';
          break;
      }

      const response = await fetch(endpoint, { credentials: 'include' });
      const data = await response.json();

      if (response.ok) {
        switch (activeTab) {
          case 'pages':
            setPages(data.pages || []);
            break;
          case 'blog':
            setBlogPosts(data.posts || []);
            break;
          case 'faq':
            setFaqs(data.faqs || []);
            break;
        }
      } else {
        setError(data.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (item: any) => {
    try {
      let endpoint = '';
      let method = item.id ? 'PUT' : 'POST';

      switch (activeTab) {
        case 'pages':
          endpoint = item.id ? `/api/content/pages/${item.id}` : '/api/content/pages';
          break;
        case 'blog':
          endpoint = item.id ? `/api/content/blog/${item.id}` : '/api/content/blog';
          break;
        case 'faq':
          endpoint = item.id ? `/api/content/faq/${item.id}` : '/api/content/faq';
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
          endpoint = `/api/content/pages/${id}`;
          break;
        case 'blog':
          endpoint = `/api/content/blog/${id}`;
          break;
        case 'faq':
          endpoint = `/api/content/faq/${id}`;
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

  const tabs = [
    { key: 'pages' as const, label: 'الصفحات الثابتة', icon: '📄' },
    { key: 'blog' as const, label: 'المدونة', icon: '📝' },
    { key: 'faq' as const, label: 'الأسئلة الشائعة', icon: '❓' },
  ];

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

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          {tabs.find((t) => t.key === activeTab)?.label}
        </h2>
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
          {activeTab === 'pages' && (
            <PagesTable
              pages={pages}
              onEdit={(page) => {
                setEditingItem(page);
                setIsEditorOpen(true);
              }}
              onDelete={handleDelete}
            />
          )}

          {activeTab === 'blog' && (
            <BlogTable
              posts={blogPosts}
              onEdit={(post) => {
                setEditingItem(post);
                setIsEditorOpen(true);
              }}
              onDelete={handleDelete}
            />
          )}

          {activeTab === 'faq' && (
            <FAQTable
              faqs={faqs}
              onEdit={(faq) => {
                setEditingItem(faq);
                setIsEditorOpen(true);
              }}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <EditorModal
          type={activeTab}
          item={editingItem}
          onSave={handleSave}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

// Pages Table Component
function PagesTable({
  pages,
  onEdit,
  onDelete,
}: {
  pages: StaticPage[];
  onEdit: (page: StaticPage) => void;
  onDelete: (id: string) => void;
}) {
  if (pages.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-8 text-center text-slate-600">
        لا توجد صفحات. قم بإضافة صفحة جديدة.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">العنوان</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المسار</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">الحالة</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">آخر تحديث</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pages.map((page) => (
            <tr key={page.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm">{page.titleAr || page.titleEn}</td>
              <td className="px-4 py-3 text-sm text-slate-600" dir="ltr">
                /{page.slug}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    page.isPublished
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {page.isPublished ? 'منشور' : 'مسودة'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {new Date(page.updatedAt).toLocaleDateString('ar-SA')}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onEdit(page)}
                  className="text-blue-600 hover:text-blue-800 mx-1"
                  title="تعديل"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(page.id)}
                  className="text-red-600 hover:text-red-800 mx-1"
                  title="حذف"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Blog Table Component
function BlogTable({
  posts,
  onEdit,
  onDelete,
}: {
  posts: BlogPost[];
  onEdit: (post: BlogPost) => void;
  onDelete: (id: string) => void;
}) {
  const statusLabels = {
    DRAFT: { label: 'مسودة', class: 'bg-slate-100 text-slate-600' },
    PUBLISHED: { label: 'منشور', class: 'bg-green-100 text-green-700' },
    ARCHIVED: { label: 'مؤرشف', class: 'bg-yellow-100 text-yellow-700' },
  };

  if (posts.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-8 text-center text-slate-600">
        لا توجد مقالات. قم بإضافة مقالة جديدة.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">العنوان</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المسار</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">الحالة</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">تاريخ النشر</th>
            <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {posts.map((post) => (
            <tr key={post.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm">{post.titleAr || post.titleEn}</td>
              <td className="px-4 py-3 text-sm text-slate-600" dir="ltr">
                /blog/{post.slug}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-1 text-xs rounded-full ${statusLabels[post.status].class}`}>
                  {statusLabels[post.status].label}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString('ar-SA')
                  : '-'}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onEdit(post)}
                  className="text-blue-600 hover:text-blue-800 mx-1"
                  title="تعديل"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(post.id)}
                  className="text-red-600 hover:text-red-800 mx-1"
                  title="حذف"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// FAQ Table Component
function FAQTable({
  faqs,
  onEdit,
  onDelete,
}: {
  faqs: FAQ[];
  onEdit: (faq: FAQ) => void;
  onDelete: (id: string) => void;
}) {
  if (faqs.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-8 text-center text-slate-600">
        لا توجد أسئلة شائعة. قم بإضافة سؤال جديد.
      </div>
    );
  }

  // Group by category
  const grouped = faqs.reduce((acc, faq) => {
    const cat = faq.category || 'عام';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, categoryFaqs]) => (
        <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 font-medium text-slate-700">{category}</div>
          <div className="divide-y divide-slate-100">
            {categoryFaqs
              .sort((a, b) => a.order - b.order)
              .map((faq) => (
                <div key={faq.id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{faq.questionAr || faq.questionEn}</p>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {faq.answerAr || faq.answerEn}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mr-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          faq.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {faq.isActive ? 'نشط' : 'معطل'}
                      </span>
                      <button
                        onClick={() => onEdit(faq)}
                        className="text-blue-600 hover:text-blue-800"
                        title="تعديل"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDelete(faq.id)}
                        className="text-red-600 hover:text-red-800"
                        title="حذف"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Editor Modal Component
function EditorModal({
  type,
  item,
  onSave,
  onClose,
}: {
  type: ContentType;
  item: any;
  onSave: (item: any) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<any>(
    item || getDefaultFormData(type)
  );

  function getDefaultFormData(contentType: ContentType) {
    switch (contentType) {
      case 'pages':
        return {
          slug: '',
          titleAr: '',
          titleEn: '',
          contentAr: '',
          contentEn: '',
          isPublished: false,
        };
      case 'blog':
        return {
          slug: '',
          titleAr: '',
          titleEn: '',
          excerptAr: '',
          excerptEn: '',
          contentAr: '',
          contentEn: '',
          status: 'DRAFT',
        };
      case 'faq':
        return {
          questionAr: '',
          questionEn: '',
          answerAr: '',
          answerEn: '',
          category: 'عام',
          order: 0,
          isActive: true,
        };
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {item ? 'تعديل' : 'إضافة'}{' '}
            {type === 'pages' ? 'صفحة' : type === 'blog' ? 'مقالة' : 'سؤال'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {type === 'pages' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المسار (Slug)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="about-us"
                  dir="ltr"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">العنوان (عربي)</label>
                  <input
                    type="text"
                    value={formData.titleAr}
                    onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">العنوان (إنجليزي)</label>
                  <input
                    type="text"
                    value={formData.titleEn}
                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المحتوى (عربي)</label>
                <textarea
                  value={formData.contentAr}
                  onChange={(e) => setFormData({ ...formData, contentAr: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg h-40"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المحتوى (إنجليزي)</label>
                <textarea
                  value={formData.contentEn}
                  onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg h-40"
                  dir="ltr"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isPublished" className="text-sm text-slate-700">
                  نشر الصفحة
                </label>
              </div>
            </>
          )}

          {type === 'blog' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المسار (Slug)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="my-article"
                  dir="ltr"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">العنوان (عربي)</label>
                  <input
                    type="text"
                    value={formData.titleAr}
                    onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">العنوان (إنجليزي)</label>
                  <input
                    type="text"
                    value={formData.titleEn}
                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ملخص (عربي)</label>
                  <textarea
                    value={formData.excerptAr}
                    onChange={(e) => setFormData({ ...formData, excerptAr: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg h-20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ملخص (إنجليزي)</label>
                  <textarea
                    value={formData.excerptEn}
                    onChange={(e) => setFormData({ ...formData, excerptEn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg h-20"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">المحتوى (عربي) - Markdown</label>
                  <textarea
                    value={formData.bodyMarkdownAr || formData.contentAr || ''}
                    onChange={(e) => setFormData({ ...formData, bodyMarkdownAr: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg h-40 font-mono text-sm"
                    placeholder="يمكنك استخدام Markdown للتنسيق..."
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">يدعم Markdown: ## عنوان، * قائمة، [نص](رابط)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">المحتوى (إنجليزي) - Markdown</label>
                  <textarea
                    value={formData.bodyMarkdownEn || formData.contentEn || ''}
                    onChange={(e) => setFormData({ ...formData, bodyMarkdownEn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg h-40 font-mono text-sm"
                    placeholder="You can use Markdown for formatting..."
                    dir="ltr"
                  />
                  <p className="text-xs text-slate-500 mt-1" dir="ltr">Supports Markdown: ## heading, * list, [text](url)</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الحالة</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  title="اختر حالة المقالة"
                >
                  <option value="DRAFT">مسودة</option>
                  <option value="PUBLISHED">منشور</option>
                  <option value="ARCHIVED">مؤرشف</option>
                </select>
              </div>
            </>
          )}

          {type === 'faq' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">السؤال (عربي)</label>
                <input
                  type="text"
                  value={formData.questionAr}
                  onChange={(e) => setFormData({ ...formData, questionAr: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">السؤال (إنجليزي)</label>
                <input
                  type="text"
                  value={formData.questionEn}
                  onChange={(e) => setFormData({ ...formData, questionEn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الإجابة (عربي)</label>
                <textarea
                  value={formData.answerAr}
                  onChange={(e) => setFormData({ ...formData, answerAr: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg h-32"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الإجابة (إنجليزي)</label>
                <textarea
                  value={formData.answerEn}
                  onChange={(e) => setFormData({ ...formData, answerEn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg h-32"
                  dir="ltr"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">التصنيف</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    title="FAQ Category"
                  >
                    <option value="عام">عام (General)</option>
                    <option value="pay">💰 حاسبة الراتب (Salary Calculator)</option>
                    <option value="eos">🏆 نهاية الخدمة (End of Service)</option>
                    <option value="work">⏰ ساعات العمل (Work Hours)</option>
                    <option value="dates">📅 التواريخ (Date Calculator)</option>
                    <option value="gosi">🏛️ التأمينات (GOSI)</option>
                    <option value="labor-law">⚖️ نظام العمل (Labor Law)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الترتيب</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min={0}
                  />
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
                  نشط
                </label>
              </div>
            </>
          )}

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
