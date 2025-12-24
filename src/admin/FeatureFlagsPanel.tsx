import React, { useState, useEffect } from 'react';
import { 
  Flag, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Settings, 
  Users, 
  Globe, 
  Layers,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';

interface FeatureFlagRule {
  id: string;
  environment: 'dev' | 'staging' | 'prod';
  enabled: boolean;
  rolloutPercentage: number;
  targetingJson: string | null;
  dependenciesJson: string | null;
}

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabledByDefault: boolean;
  rules: FeatureFlagRule[];
  updatedAt: string;
}

export const FeatureFlagsPanel: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentFlag, setCurrentFlag] = useState<Partial<FeatureFlag> | null>(null);
  const [activeEnv, setActiveEnv] = useState<'dev' | 'staging' | 'prod'>('prod');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/flags', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFlags(data);
      }
    } catch (e) {
      console.error('Failed to fetch flags', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFlag = async () => {
    if (!currentFlag?.key || !currentFlag?.name) {
      alert('Key and Name are required');
      return;
    }

    setSaving(true);
    try {
      const method = currentFlag.id ? 'PUT' : 'POST';
      const url = currentFlag.id ? `/api/flags/${currentFlag.id}` : '/api/flags';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify(currentFlag)
      });

      if (res.ok) {
        setIsEditing(false);
        fetchFlags();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      }
    } catch (e) {
      alert('Error saving flag');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRule = async (flagId: string, ruleId: string, updates: Partial<FeatureFlagRule>) => {
    try {
      const res = await fetch(`/api/flags/${flagId}/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        fetchFlags();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update rule');
      }
    } catch (e) {
      alert('Error updating rule');
    }
  };

  const handleDeleteFlag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this flag? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/flags/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) fetchFlags();
    } catch (e) {
      alert('Error deleting flag');
    }
  };

  const filteredFlags = flags.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Flag className="w-6 h-6 text-indigo-600" />
            Feature Flags
          </h2>
          <p className="text-gray-500">Manage professional-grade feature rollouts and targeting</p>
        </div>
        <button
          onClick={() => {
            setCurrentFlag({ enabledByDefault: false });
            setIsEditing(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Flag
        </button>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search flags by name or key..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {(['dev', 'staging', 'prod'] as const).map(env => (
            <button
              key={env}
              onClick={() => setActiveEnv(env)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeEnv === env 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {env.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredFlags.map(flag => {
            const rule = flag.rules.find(r => r.environment === activeEnv);
            return (
              <div key={flag.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 flex items-start justify-between border-b border-gray-50">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-lg ${rule?.enabled ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                      <Flag className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{flag.name}</h3>
                        <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{flag.key}</code>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{flag.description || 'No description provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCurrentFlag(flag);
                        setIsEditing(true);
                      }}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFlag(flag.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-gray-50/50 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Status & Rollout */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Status</span>
                      <button
                        onClick={() => rule && handleUpdateRule(flag.id, rule.id, { enabled: !rule.enabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          rule?.enabled ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          rule?.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium text-gray-500">
                        <span>Rollout</span>
                        <span>{rule?.rolloutPercentage}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={rule?.rolloutPercentage || 0}
                        onChange={(e) => rule && handleUpdateRule(flag.id, rule.id, { rolloutPercentage: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Targeting */}
                  <div className="space-y-3 border-l border-gray-100 pl-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Users className="w-4 h-4 text-gray-400" />
                      Targeting
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {rule?.targetingJson ? (
                        (() => {
                          const t = JSON.parse(rule.targetingJson);
                          const counts = [
                            t.roles?.length && `${t.roles.length} roles`,
                            t.countries?.length && `${t.countries.length} countries`,
                            t.userIds?.length && `${t.userIds.length} users`
                          ].filter(Boolean);
                          return counts.length > 0 ? (
                            counts.map((c, i) => (
                              <span key={i} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                                {c}
                              </span>
                            ))
                          ) : <span className="text-xs text-gray-400 italic">Everyone</span>;
                        })()
                      ) : <span className="text-xs text-gray-400 italic">Everyone</span>}
                    </div>
                    <button 
                      onClick={() => {
                        const targeting = rule?.targetingJson ? JSON.parse(rule.targetingJson) : { roles: [], countries: [], userIds: [] };
                        const role = prompt('Add role (e.g. ADMIN, IT):');
                        if (role) {
                          targeting.roles = [...(targeting.roles || []), role.toUpperCase()];
                          rule && handleUpdateRule(flag.id, rule.id, { targetingJson: JSON.stringify(targeting) });
                        }
                      }}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Rule
                    </button>
                  </div>

                  {/* Dependencies */}
                  <div className="space-y-3 border-l border-gray-100 pl-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Layers className="w-4 h-4 text-gray-400" />
                      Dependencies
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {rule?.dependenciesJson ? (
                        JSON.parse(rule.dependenciesJson).map((dep: string, i: number) => (
                          <span key={i} className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            {dep}
                            <X className="w-2 h-2 cursor-pointer" onClick={() => {
                              const deps = JSON.parse(rule.dependenciesJson!).filter((d: string) => d !== dep);
                              handleUpdateRule(flag.id, rule.id, { dependenciesJson: JSON.stringify(deps) });
                            }} />
                          </span>
                        ))
                      ) : <span className="text-xs text-gray-400 italic">None</span>}
                    </div>
                    <select 
                      className="text-xs border-none bg-transparent text-indigo-600 focus:ring-0 cursor-pointer"
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const deps = rule?.dependenciesJson ? JSON.parse(rule.dependenciesJson) : [];
                        if (!deps.includes(e.target.value)) {
                          handleUpdateRule(flag.id, rule!.id, { dependenciesJson: JSON.stringify([...deps, e.target.value]) });
                        }
                        e.target.value = '';
                      }}
                    >
                      <option value="">+ Add Dependency</option>
                      {flags.filter(f => f.id !== flag.id).map(f => (
                        <option key={f.id} value={f.key}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {currentFlag?.id ? 'Edit Feature Flag' : 'Create Feature Flag'}
              </h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flag Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={currentFlag?.name || ''}
                  onChange={(e) => setCurrentFlag({ ...currentFlag, name: e.target.value })}
                  placeholder="e.g. New Dashboard UI"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flag Key (Unique)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50"
                  value={currentFlag?.key || ''}
                  onChange={(e) => setCurrentFlag({ ...currentFlag, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g. new_dashboard_ui"
                  disabled={!!currentFlag?.id}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                  value={currentFlag?.description || ''}
                  onChange={(e) => setCurrentFlag({ ...currentFlag, description: e.target.value })}
                  placeholder="What does this flag control?"
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                <input
                  type="checkbox"
                  id="enabledByDefault"
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  checked={currentFlag?.enabledByDefault || false}
                  onChange={(e) => setCurrentFlag({ ...currentFlag, enabledByDefault: e.target.checked })}
                />
                <label htmlFor="enabledByDefault" className="text-sm font-medium text-indigo-900">
                  Enabled by default (fallback)
                </label>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFlag}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-b-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save Flag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
