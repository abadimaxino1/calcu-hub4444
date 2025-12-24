import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  EyeOff,
  Settings,
  Save,
  X,
  Info
} from 'lucide-react';

interface CalculatorRegistry {
  id: string;
  key: string;
  nameAr: string;
  nameEn: string;
  status: 'published' | 'beta' | 'hidden';
  routePath: string;
  configJson: string | null;
  analyticsNamespace: string | null;
  adProfileId: string | null;
  updatedAt: string;
}

export const CalculatorsPanel: React.FC = () => {
  const [calculators, setCalculators] = useState<CalculatorRegistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentCalc, setCurrentCalc] = useState<Partial<CalculatorRegistry> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCalculators();
  }, []);

  const fetchCalculators = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/calculators', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCalculators(data);
      }
    } catch (e) {
      console.error('Failed to fetch calculators', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentCalc?.key || !currentCalc?.nameAr || !currentCalc?.nameEn || !currentCalc?.routePath) {
      alert('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      const method = currentCalc.id ? 'PUT' : 'POST';
      const url = currentCalc.id ? `/api/calculators/${currentCalc.id}` : '/api/calculators';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify(currentCalc)
      });

      if (res.ok) {
        setIsEditing(false);
        fetchCalculators();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      }
    } catch (e) {
      alert('Error saving calculator');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this calculator?')) return;
    try {
      const res = await fetch(`/api/calculators/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) fetchCalculators();
    } catch (e) {
      alert('Error deleting calculator');
    }
  };

  const filtered = calculators.filter(c => 
    c.key.toLowerCase().includes(search.toLowerCase()) || 
    c.nameAr.includes(search) || 
    c.nameEn.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && calculators.length === 0) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            Calculator Registry
          </h2>
          <p className="text-sm text-slate-500">Manage published calculators and their configurations</p>
        </div>
        <button 
          onClick={() => {
            setCurrentCalc({ status: 'hidden', configJson: '{}' });
            setIsEditing(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Add Calculator
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search by key or name..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 transition"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold">Calculator</th>
              <th className="px-6 py-4 text-sm font-semibold">Route</th>
              <th className="px-6 py-4 text-sm font-semibold">Status</th>
              <th className="px-6 py-4 text-sm font-semibold">Last Updated</th>
              <th className="px-6 py-4 text-sm font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.map((calc) => (
              <tr key={calc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium">{calc.nameEn}</div>
                  <div className="text-xs text-slate-500">{calc.nameAr} • {calc.key}</div>
                </td>
                <td className="px-6 py-4 text-sm font-mono text-slate-600">{calc.routePath}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    calc.status === 'published' ? 'bg-green-100 text-green-800' :
                    calc.status === 'beta' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {calc.status === 'published' && <CheckCircle2 className="w-3 h-3" />}
                    {calc.status === 'beta' && <AlertCircle className="w-3 h-3" />}
                    {calc.status === 'hidden' && <EyeOff className="w-3 h-3" />}
                    {calc.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(calc.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => {
                        setCurrentCalc(calc);
                        setIsEditing(true);
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition text-slate-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(calc.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold">{currentCalc?.id ? 'Edit Calculator' : 'Add New Calculator'}</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Key (Unique ID)</label>
                  <input 
                    type="text" 
                    value={currentCalc?.key || ''}
                    onChange={(e) => setCurrentCalc({...currentCalc, key: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="e.g. salary-calc"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select 
                    value={currentCalc?.status || 'hidden'}
                    onChange={(e) => setCurrentCalc({...currentCalc, status: e.target.value as any})}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="hidden">Hidden</option>
                    <option value="beta">Beta</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name (Arabic)</label>
                  <input 
                    type="text" 
                    value={currentCalc?.nameAr || ''}
                    onChange={(e) => setCurrentCalc({...currentCalc, nameAr: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20 text-right"
                    placeholder="حاسبة الرواتب"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name (English)</label>
                  <input 
                    type="text" 
                    value={currentCalc?.nameEn || ''}
                    onChange={(e) => setCurrentCalc({...currentCalc, nameEn: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Salary Calculator"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Route Path</label>
                <input 
                  type="text" 
                  value={currentCalc?.routePath || ''}
                  onChange={(e) => setCurrentCalc({...currentCalc, routePath: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="/calc/salary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Analytics Namespace</label>
                  <input 
                    type="text" 
                    value={currentCalc?.analyticsNamespace || ''}
                    onChange={(e) => setCurrentCalc({...currentCalc, analyticsNamespace: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="salary_calc"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ad Profile ID</label>
                  <input 
                    type="text" 
                    value={currentCalc?.adProfileId || ''}
                    onChange={(e) => setCurrentCalc({...currentCalc, adProfileId: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="standard_calc"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  Config JSON
                  <Info className="w-3 h-3 text-slate-400" title="Defaults, limits, warnings, units" />
                </label>
                <textarea 
                  value={currentCalc?.configJson || ''}
                  onChange={(e) => setCurrentCalc({...currentCalc, configJson: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm h-32"
                  placeholder='{ "defaults": { "tax": 15 }, "limits": { "maxAmount": 1000000 } }'
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
              <button 
                onClick={() => setIsEditing(false)}
                className="flex-1 px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Calculator'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalculatorsPanel;
