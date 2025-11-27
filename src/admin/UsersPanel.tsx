import React, { useEffect, useState } from 'react';

// Role definitions with Arabic and English names
const ROLES = [
  { key: 'SUPER_ADMIN', ar: 'مدير النظام', en: 'Super Admin', color: 'bg-purple-100 text-purple-800' },
  { key: 'ADMIN', ar: 'مدير', en: 'Admin', color: 'bg-blue-100 text-blue-800' },
  { key: 'IT', ar: 'تقنية المعلومات', en: 'IT', color: 'bg-green-100 text-green-800' },
  { key: 'DESIGNER', ar: 'مصمم', en: 'Designer', color: 'bg-pink-100 text-pink-800' },
  { key: 'CONTENT_WRITER', ar: 'كاتب محتوى', en: 'Content Writer', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'ADS_MANAGER', ar: 'مدير إعلانات', en: 'Ads Manager', color: 'bg-orange-100 text-orange-800' },
  { key: 'ANALYST', ar: 'محلل', en: 'Analyst', color: 'bg-cyan-100 text-cyan-800' },
  { key: 'VIEW_ONLY', ar: 'مشاهد فقط', en: 'View Only', color: 'bg-gray-100 text-gray-800' },
];

// Permission definitions for each section
const PERMISSIONS = {
  dashboard: { ar: 'لوحة التحكم', en: 'Dashboard' },
  analytics: { ar: 'التحليلات', en: 'Analytics' },
  monetization: { ar: 'الإيرادات', en: 'Monetization' },
  users: { ar: 'إدارة المستخدمين', en: 'User Management' },
  content: { ar: 'المحتوى', en: 'Content' },
  seo: { ar: 'تحسين محركات البحث', en: 'SEO' },
  ads: { ar: 'الإعلانات', en: 'Ads' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  tests: { ar: 'الاختبارات', en: 'Tests' },
};

// Default permissions for each role
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: Object.keys(PERMISSIONS),
  ADMIN: ['dashboard', 'analytics', 'monetization', 'users', 'content', 'seo', 'ads'],
  IT: ['dashboard', 'settings', 'tests'],
  DESIGNER: ['dashboard', 'content'],
  CONTENT_WRITER: ['dashboard', 'content', 'seo'],
  ADS_MANAGER: ['dashboard', 'ads', 'monetization'],
  ANALYST: ['dashboard', 'analytics', 'monetization'],
  VIEW_ONLY: ['dashboard'],
};

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export default function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; userId: string; userName: string }>({ show: false, userId: '', userName: '' });

  // New user form state
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    role: 'VIEW_ONLY',
    isActive: true,
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchUsers = () => {
    setLoading(true);
    fetch('/api/admin/users', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j && j.ok) {
          setUsers(j.users || []);
        } else {
          // If API fails, show demo users for development
          setUsers([
            {
              id: '1',
              email: 'admin@calcuhub.com',
              name: 'المدير الرئيسي',
              role: 'SUPER_ADMIN',
              isActive: true,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
            },
          ]);
        }
      })
      .catch(() => {
        // Show demo users if fetch fails
        setUsers([
          {
            id: '1',
            email: 'admin@calcuhub.com',
            name: 'المدير الرئيسي',
            role: 'SUPER_ADMIN',
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          },
        ]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password) {
      showToast('الرجاء ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        showToast('تم إضافة المستخدم بنجاح', 'success');
        setShowAddUser(false);
        setNewUser({ email: '', name: '', password: '', role: 'VIEW_ONLY', isActive: true });
        fetchUsers();
      } else {
        const data = await response.json();
        showToast(data.error || 'فشل في إضافة المستخدم', 'error');
      }
    } catch (err) {
      showToast('فشل في الاتصال بالخادم', 'error');
    }
  };

  const handleUpdateUser = async () => {
    if (!showEditUser) return;

    try {
      const response = await fetch(`/api/admin/users/${showEditUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(showEditUser),
      });

      if (response.ok) {
        showToast('تم تحديث المستخدم بنجاح', 'success');
        setShowEditUser(null);
        fetchUsers();
      } else {
        const data = await response.json();
        showToast(data.error || 'فشل في تحديث المستخدم', 'error');
      }
    } catch (err) {
      showToast('فشل في الاتصال بالخادم', 'error');
    }
  };

  const handleDeleteUser = async () => {
    const { userId } = deleteConfirm;
    setDeleteConfirm({ show: false, userId: '', userName: '' });

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        showToast('تم حذف المستخدم بنجاح', 'success');
        fetchUsers();
      } else {
        const data = await response.json();
        showToast(data.error || 'فشل في حذف المستخدم', 'error');
      }
    } catch (err) {
      showToast('فشل في الاتصال بالخادم', 'error');
    }
  };

  const getRoleInfo = (roleKey: string) => {
    return ROLES.find(r => r.key === roleKey) || ROLES[ROLES.length - 1];
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">تأكيد الحذف</h3>
            <p className="text-slate-600 mb-4">
              هل تريد حذف المستخدم "{deleteConfirm.userName}"؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                حذف
              </button>
              <button
                onClick={() => setDeleteConfirm({ show: false, userId: '', userName: '' })}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">إضافة مستخدم جديد</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الاسم *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="اسم المستخدم"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الصلاحية</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {ROLES.map(role => (
                    <option key={role.key} value={role.key}>
                      {role.ar} ({role.en})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="newUserActive"
                  checked={newUser.isActive}
                  onChange={e => setNewUser({ ...newUser, isActive: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="newUserActive" className="text-sm">حساب نشط</label>
              </div>
              
              {/* Show permissions for selected role */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm font-medium text-slate-700 mb-2">الصلاحيات المتاحة:</p>
                <div className="flex flex-wrap gap-2">
                  {(ROLE_PERMISSIONS[newUser.role] || []).map(perm => (
                    <span key={perm} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {PERMISSIONS[perm as keyof typeof PERMISSIONS]?.ar || perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddUser}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                إضافة
              </button>
              <button
                onClick={() => setShowAddUser(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">تعديل المستخدم</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الاسم</label>
                <input
                  type="text"
                  value={showEditUser.name}
                  onChange={e => setShowEditUser({ ...showEditUser, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={showEditUser.email}
                  onChange={e => setShowEditUser({ ...showEditUser, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الصلاحية</label>
                <select
                  value={showEditUser.role}
                  onChange={e => setShowEditUser({ ...showEditUser, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {ROLES.map(role => (
                    <option key={role.key} value={role.key}>
                      {role.ar} ({role.en})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editUserActive"
                  checked={showEditUser.isActive}
                  onChange={e => setShowEditUser({ ...showEditUser, isActive: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="editUserActive" className="text-sm">حساب نشط</label>
              </div>
              
              {/* Show permissions for selected role */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm font-medium text-slate-700 mb-2">الصلاحيات المتاحة:</p>
                <div className="flex flex-wrap gap-2">
                  {(ROLE_PERMISSIONS[showEditUser.role] || []).map(perm => (
                    <span key={perm} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {PERMISSIONS[perm as keyof typeof PERMISSIONS]?.ar || perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateUser}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                حفظ التغييرات
              </button>
              <button
                onClick={() => setShowEditUser(null)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">إدارة المستخدمين</h2>
          <p className="text-sm text-slate-600">إدارة المستخدمين والصلاحيات</p>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <span>+</span>
          <span>إضافة مستخدم</span>
        </button>
      </div>

      {/* Roles Overview */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">نظرة عامة على الأدوار</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLES.map(role => {
            const userCount = users.filter(u => u.role === role.key).length;
            return (
              <div key={role.key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${role.color}`}>
                    {role.ar}
                  </span>
                  <span className="text-2xl font-bold text-slate-900">{userCount}</span>
                </div>
                <p className="text-xs text-slate-500">{role.en}</p>
                <div className="mt-2 text-xs text-slate-400">
                  {(ROLE_PERMISSIONS[role.key] || []).length} صلاحية
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">قائمة المستخدمين ({users.length})</h3>
        </div>
        
        {users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <div className="text-4xl mb-2">👥</div>
            <p>لا يوجد مستخدمين حالياً</p>
            <p className="text-sm mt-1">اضغط على "إضافة مستخدم" لإضافة مستخدم جديد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">المستخدم</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">الصلاحية</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">آخر دخول</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(user => {
                  const roleInfo = getRoleInfo(user.role);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-900">{user.name}</div>
                          <div className="text-sm text-slate-500" dir="ltr">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${roleInfo.color}`}>
                          {roleInfo.ar}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {user.lastLogin 
                          ? new Date(user.lastLogin).toLocaleDateString('ar-SA', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'لم يسجل الدخول بعد'
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowEditUser(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="تعديل"
                          >
                            ✏️
                          </button>
                          {user.role !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => setDeleteConfirm({ show: true, userId: user.id, userName: user.name })}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="حذف"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">مصفوفة الصلاحيات</h3>
        <p className="text-sm text-slate-600 mb-4">توضيح الصلاحيات المتاحة لكل دور</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-right font-medium">الصلاحية</th>
                {ROLES.map(role => (
                  <th key={role.key} className="px-3 py-2 text-center font-medium text-xs">
                    {role.ar}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.entries(PERMISSIONS).map(([key, value]) => (
                <tr key={key} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{value.ar}</td>
                  {ROLES.map(role => (
                    <td key={role.key} className="px-3 py-2 text-center">
                      {(ROLE_PERMISSIONS[role.key] || []).includes(key) ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
