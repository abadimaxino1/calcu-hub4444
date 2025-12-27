import React, { useState } from 'react';
import SimpleMDE from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";

type ContentType = 'pages' | 'blog' | 'faq';

interface ContentEditorProps {
  type: ContentType;
  item: any;
  onSave: (item: any) => void;
  onClose: () => void;
}

export default function ContentEditor({
  type,
  item,
  onSave,
  onClose,
}: ContentEditorProps) {
  const [formData, setFormData] = useState<any>(() => {
    const base = item || getDefaultFormData(type);
    
    // Pre-fill bilingual fields from legacy if empty (for Blog)
    if (type === 'blog' && item) {
      return {
        ...base,
        titleAr: base.titleAr || (base.title || ''),
        excerptAr: base.excerptAr || (base.excerpt || ''),
        bodyMarkdownAr: base.bodyMarkdownAr || (base.bodyMarkdown || ''),
      };
    }

    // Pre-fill bilingual fields from legacy if empty (for FAQ)
    if (type === 'faq' && item) {
      return {
        ...base,
        questionAr: base.questionAr || (base.question || ''),
        answerAr: base.answerAr || (base.answer || ''),
      };
    }
    
    return base;
  });

  function getDefaultFormData(contentType: ContentType) {
    switch (contentType) {
      case 'pages':
        return {
          slug: '',
          locale: 'ar',
          title: '',
          bodyMarkdown: '',
          isPublished: true,
        };
      case 'blog':
        return {
          slug: '',
          titleAr: '',
          titleEn: '',
          excerptAr: '',
          excerptEn: '',
          bodyMarkdownAr: '',
          bodyMarkdownEn: '',
          isPublished: false,
        };
      case 'faq':
        return {
          questionAr: '',
          questionEn: '',
          answerAr: '',
          answerEn: '',
          category: 'global',
          sortOrder: 0,
          isPublished: true,
        };
    }
  }

  const handleGenerateAI = async (field: string, prompt: string) => {
    if (!prompt) return alert('Please enter a title first');
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt, type: 'blog_post' }),
      });
      if (res.ok) {
        const data = await res.json();
        setFormData((prev: any) => ({ ...prev, [field]: prev[field] ? prev[field] + '\n\n' + data.text : data.text }));
      } else {
        alert('AI generation failed. Check configuration.');
      }
    } catch (err) {
      console.error('AI generation failed:', err);
    }
  };

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
              <div className="grid grid-cols-2 gap-4">
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
                    disabled={!!item}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اللغة (Locale)</label>
                  <select
                    value={formData.locale}
                    onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={!!item}
                  >
                    <option value="ar">العربية (ar)</option>
                    <option value="en">English (en)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">العنوان</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المحتوى (Markdown)</label>
                <SimpleMDE
                  value={formData.bodyMarkdown}
                  onChange={(val) => setFormData({ ...formData, bodyMarkdown: val })}
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
              <div className="grid grid-cols-2 gap-4">
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
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.status === 'PUBLISHED'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'PUBLISHED' : 'DRAFT' })}
                      className="rounded"
                    />
                    نشر المقالة
                  </label>
                </div>
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
              <div className="grid grid-cols-1 gap-4">
                <div dir="rtl">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-slate-700">المحتوى (عربي)</label>
                    <button
                      type="button"
                      onClick={() => handleGenerateAI('bodyMarkdownAr', formData.titleAr)}
                      className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 flex items-center gap-1"
                      title="Generate content using AI based on title"
                    >
                      <span>✨</span> توليد بالذكاء الاصطناعي
                    </button>
                  </div>
                  <SimpleMDE
                    value={formData.bodyMarkdownAr || ''}
                    onChange={(value) => setFormData({ ...formData, bodyMarkdownAr: value })}
                    options={{
                      spellChecker: false,
                      direction: "rtl",
                      placeholder: "اكتب المحتوى هنا...",
                      minHeight: "200px",
                      status: false
                    }}
                  />
                </div>
                <div dir="ltr">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-slate-700">Content (English)</label>
                    <button
                      type="button"
                      onClick={() => handleGenerateAI('bodyMarkdownEn', formData.titleEn)}
                      className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 flex items-center gap-1"
                      title="Generate content using AI based on title"
                    >
                      <span>✨</span> Generate with AI
                    </button>
                  </div>
                  <SimpleMDE
                    value={formData.bodyMarkdownEn || ''}
                    onChange={(value) => setFormData({ ...formData, bodyMarkdownEn: value })}
                    options={{
                      spellChecker: false,
                      placeholder: "Write content here...",
                      minHeight: "200px",
                      status: false
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {type === 'faq' && (
            <>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">التصنيف</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    title="FAQ Category"
                  >
                    <option value="global">عام (General)</option>
                    <option value="pay">💰 حاسبة الراتب (Salary Calculator)</option>
                    <option value="eos">🏆 نهاية الخدمة (End of Service)</option>
                    <option value="work">⏰ ساعات العمل (Work Hours)</option>
                    <option value="dates">📅 التواريخ (Date Calculator)</option>
                    <option value="gosi">🏛️ التأمينات (GOSI)</option>
                    <option value="labor-law">⚖️ نظام العمل (Labor Law)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">النطاق (Scope)</label>
                  <input
                    type="text"
                    value={formData.scope || 'global'}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="global or pageKey"
                    dir="ltr"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                      className="rounded"
                    />
                    نشر السؤال
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
