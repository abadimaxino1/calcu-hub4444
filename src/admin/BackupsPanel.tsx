import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  RotateCcw, 
  Trash2, 
  Calendar, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  Settings,
  FileText,
  HardDrive,
  RefreshCw
} from 'lucide-react';

interface Backup {
  id: string;
  type: 'manual' | 'scheduled' | 'pre_deploy' | 'pre_restore';
  storageProvider: string;
  filePath: string;
  fileSizeBytes: number;
  checksum: string | null;
  durationMs: number | null;
  status: 'success' | 'failed';
  errorJson: string | null;
  createdAt: string;
  createdById: string | null;
}

interface BackupSchedule {
  id: string;
  cron: string;
  retentionCount: number;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export const BackupsPanel: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRestoreModal, setShowRestoreModal] = useState<string | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');

  useEffect(() => {
    fetchBackups();
    fetchSchedule();
  }, []);

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/admin/ops/backups', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) setBackups(await res.json());
    } catch (e) {
      console.error('Failed to fetch backups', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async () => {
    try {
      const res = await fetch('/api/admin/ops/backups/schedule', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) setSchedule(await res.json());
    } catch (e) {
      console.error('Failed to fetch schedule', e);
    }
  };

  const createBackup = async () => {
    try {
      const res = await fetch('/api/admin/ops/backups', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) {
        alert('Backup job enqueued successfully');
        fetchBackups();
      }
    } catch (e) {
      alert('Failed to trigger backup');
    }
  };

  const handleRestore = async (id: string) => {
    if (restoreConfirm !== 'RESTORE') {
      alert('Please type RESTORE to confirm');
      return;
    }

    setRestoring(true);
    try {
      const res = await fetch(`/api/admin/ops/backups/${id}/restore`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify({ confirmation: 'RESTORE' })
      });

      if (res.ok) {
        alert('Database restored successfully. The application will now reload.');
        window.location.reload();
      } else {
        const data = await res.json();
        alert(`Restore failed: ${data.error}`);
      }
    } catch (e) {
      alert('Restore failed due to a network error');
    } finally {
      setRestoring(false);
      setShowRestoreModal(null);
      setRestoreConfirm('');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-500" />
            النسخ الاحتياطي وقواعد البيانات
          </h2>
          <p className="text-slate-500 dark:text-slate-400">إدارة النسخ الاحتياطي واستعادة البيانات</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchBackups}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={createBackup}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            نسخة احتياطية فورية
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'list' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          قائمة النسخ
          {activeTab === 'list' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'settings' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          الإعدادات والجدولة
          {activeTab === 'settings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">التاريخ</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">النوع</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">الحجم</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">الحالة</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {backups.map((backup) => (
                <tr key={backup.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {new Date(backup.createdAt).toLocaleString('ar-SA')}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{backup.id.split('-')[0]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      backup.type === 'manual' ? 'bg-blue-100 text-blue-800' :
                      backup.type === 'scheduled' ? 'bg-purple-100 text-purple-800' :
                      backup.type === 'pre_restore' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {backup.type === 'manual' ? 'يدوي' :
                       backup.type === 'scheduled' ? 'مجدول' :
                       backup.type === 'pre_restore' ? 'قبل الاستعادة' : backup.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {formatSize(backup.fileSizeBytes)}
                  </td>
                  <td className="px-6 py-4">
                    {backup.status === 'success' ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        ناجح
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" />
                        فاشل
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowRestoreModal(backup.id)}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="استعادة"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <a 
                        href={`/api/admin/ops/backups/${backup.id}/download`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="تحميل"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {backups.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    لا توجد نسخ احتياطية حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              جدولة النسخ التلقائي
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تكرار النسخ (Cron)</label>
                <input 
                  type="text" 
                  value={schedule?.cron || ''} 
                  onChange={(e) => setSchedule(s => s ? {...s, cron: e.target.value} : null)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent"
                  placeholder="0 0 * * *"
                />
                <p className="text-xs text-slate-500 mt-1">مثال: 0 0 * * * (يومياً عند منتصف الليل)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">عدد النسخ المحفوظة (Retention)</label>
                <input 
                  type="number" 
                  value={schedule?.retentionCount || 7} 
                  onChange={(e) => setSchedule(s => s ? {...s, retentionCount: parseInt(e.target.value)} : null)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={schedule?.enabled || false} 
                  onChange={(e) => setSchedule(s => s ? {...s, enabled: e.target.checked} : null)}
                  id="schedule-enabled"
                />
                <label htmlFor="schedule-enabled" className="text-sm font-medium">تفعيل الجدولة التلقائية</label>
              </div>
              <button 
                onClick={async () => {
                  if (!schedule) return;
                  const res = await fetch('/api/admin/ops/backups/schedule', {
                    method: 'PUT',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
                    },
                    body: JSON.stringify(schedule)
                  });
                  if (res.ok) alert('تم حفظ الإعدادات بنجاح');
                }}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                حفظ الإعدادات
              </button>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-xl border border-amber-200 dark:border-amber-800/50">
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-400 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              إرشادات الأمان
            </h3>
            <ul className="space-y-3 text-sm text-amber-700 dark:text-amber-300">
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                يتم أخذ نسخة احتياطية تلقائية دائماً قبل أي عملية استعادة (Pre-restore backup).
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                عملية الاستعادة تتطلب صلاحيات "مدير النظام" (Super Admin) حصراً.
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                يُنصح بتحميل النسخ الاحتياطية الهامة وحفظها خارج الخادم بشكل دوري.
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                تأكد من صحة تعبير Cron عند تعديل الجدولة لتجنب توقف النسخ التلقائي.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                تأكيد استعادة البيانات
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-600 dark:text-slate-300">
                أنت على وشك استعادة قاعدة البيانات من النسخة الاحتياطية المختارة. 
                <strong className="text-red-600 block mt-2">سيتم استبدال البيانات الحالية بالكامل!</strong>
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-xs font-mono text-slate-500">
                ID: {showRestoreModal}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">اكتب كلمة <span className="text-red-600 font-bold">RESTORE</span> للتأكيد:</label>
                <input 
                  type="text" 
                  value={restoreConfirm}
                  onChange={(e) => setRestoreConfirm(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-red-100 focus:border-red-500 rounded-lg bg-transparent outline-none transition-colors"
                  placeholder="RESTORE"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
              <button 
                onClick={() => {
                  setShowRestoreModal(null);
                  setRestoreConfirm('');
                }}
                className="flex-1 px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={() => handleRestore(showRestoreModal)}
                disabled={restoreConfirm !== 'RESTORE' || restoring}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {restoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                تأكيد الاستعادة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupsPanel;
