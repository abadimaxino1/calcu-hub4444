import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  Play, 
  Pause, 
  CheckCircle2, 
  Target,
  BarChart3,
  Users,
  Calendar,
  XCircle,
  AlertCircle,
  Settings
} from 'lucide-react';

interface Experiment {
  id: string;
  key: string;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  allocationJson: string;
  targetingJson: string;
  startAt: string;
  endAt: string;
  primaryMetric: string;
  variantsJson: string;
}

const ExperimentsPanel: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingExp, setEditingExp] = useState<Partial<Experiment> | null>(null);

  useEffect(() => {
    fetchExperiments();
  }, []);

  const fetchExperiments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/growth/experiments');
      if (!res.ok) throw new Error('Failed to fetch experiments');
      const data = await res.json();
      setExperiments(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingExp?.key || !editingExp?.name) return;
    try {
      const method = editingExp.id ? 'PUT' : 'POST';
      const url = editingExp.id 
        ? `/api/admin/growth/experiments/${editingExp.id}`
        : '/api/admin/growth/experiments';
        
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingExp)
      });
      
      if (!res.ok) throw new Error('Failed to save experiment');
      
      setShowModal(false);
      setEditingExp(null);
      fetchExperiments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Running</span>;
      case 'paused': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold flex items-center gap-1"><Pause className="w-3 h-3" /> Paused</span>;
      case 'completed': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      default: return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">Draft</span>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-purple-600" />
            Experiment Framework
          </h2>
          <p className="text-slate-500">Run A/B tests on ad profiles, layouts, and features.</p>
        </div>
        <button 
          onClick={() => {
            setEditingExp({ key: '', name: '', status: 'draft', allocationJson: '{"control": 50, "variant": 50}' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Experiment
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {experiments.map((exp) => (
            <div key={exp.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{exp.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-xs text-slate-500">{exp.key}</span>
                      {getStatusBadge(exp.status)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-400 hover:text-purple-600"><BarChart3 className="w-5 h-5" /></button>
                  <button 
                    onClick={() => { setEditingExp(exp); setShowModal(true); }}
                    className="p-2 text-slate-400 hover:text-indigo-600"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Allocation</div>
                    <div className="text-sm font-medium text-slate-700">50/50 Split</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Duration</div>
                    <div className="text-sm font-medium text-slate-700">Dec 22 - Jan 05</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Primary Metric</div>
                    <div className="text-sm font-medium text-slate-700">{exp.primaryMetric || 'Page Views'}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {experiments.length === 0 && (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No experiments found. Start your first A/B test!</p>
            </div>
          )}
        </div>
      )}

      {/* Experiment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingExp?.id ? 'Edit Experiment' : 'New Experiment'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Experiment Key</label>
                  <input 
                    type="text"
                    value={editingExp?.key || ''}
                    onChange={e => setEditingExp({...editingExp!, key: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Name</label>
                  <input 
                    type="text"
                    value={editingExp?.name || ''}
                    onChange={e => setEditingExp({...editingExp!, name: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <select 
                    value={editingExp?.status || 'draft'}
                    onChange={e => setEditingExp({...editingExp!, status: e.target.value as any})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="draft">Draft</option>
                    <option value="running">Running</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Primary Metric</label>
                  <select 
                    value={editingExp?.primaryMetric || ''}
                    onChange={e => setEditingExp({...editingExp!, primaryMetric: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="page_views">Page Views</option>
                    <option value="ad_clicks">Ad Clicks</option>
                    <option value="revenue">Revenue</option>
                    <option value="calc_usage">Calculator Usage</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <div className="flex items-center gap-2 text-purple-700 font-bold text-sm mb-3">
                  <Settings className="w-4 h-4" /> Performance Note
                </div>
                <p className="text-xs text-purple-600 leading-relaxed">
                  This experiment will automatically create a feature flag named <span className="font-mono font-bold">exp_{editingExp?.key || 'key'}</span>. 
                  Public pages will evaluate this flag for lightweight variant assignment.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 font-medium">Cancel</button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Experiment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExperimentsPanel;
