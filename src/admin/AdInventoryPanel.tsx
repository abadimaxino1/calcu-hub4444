import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Monitor,
  Smartphone,
  Tablet,
  Eye,
  AlertCircle,
  Layers,
  ArrowRight
} from 'lucide-react';

interface AdSlot {
  id: string;
  key: string;
  name: string;
  pageRoute: string;
  pageType: string;
  placement: string;
  responsiveRulesJson: string;
  enabled: boolean;
}

interface AdProfile {
  id: string;
  name: string;
  slotsOrderJson: string;
  policiesJson: string;
}

const AdInventoryPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'slots' | 'profiles'>('slots');
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [profiles, setProfiles] = useState<AdProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<Partial<AdSlot> | null>(null);
  const [showSlotModal, setShowSlotModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = `/api/admin/revenue/ads/${activeTab}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      
      if (activeTab === 'slots') setSlots(data);
      else if (activeTab === 'profiles') setProfiles(data);
      
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSlot = async () => {
    if (!editingSlot?.key || !editingSlot?.name) return;
    
    try {
      const method = editingSlot.id ? 'PUT' : 'POST';
      const url = editingSlot.id 
        ? `/api/admin/revenue/ads/slots/${editingSlot.id}`
        : '/api/admin/revenue/ads/slots';
        
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSlot)
      });
      
      if (!res.ok) throw new Error('Failed to save slot');
      
      setShowSlotModal(false);
      setEditingSlot(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layout className="w-6 h-6 text-emerald-600" />
            Ad Inventory Manager
          </h2>
          <p className="text-slate-500">Manage ad placements, responsive rules, and delivery profiles.</p>
        </div>
        <button 
          onClick={() => {
            if (activeTab === 'slots') {
              setEditingSlot({ key: '', name: '', placement: 'sidebar', enabled: true });
              setShowSlotModal(true);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab === 'slots' ? 'Slot' : 'Profile'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('slots')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'slots' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Ad Slots
          {activeTab === 'slots' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'profiles' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Ad Profiles
          {activeTab === 'profiles' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {activeTab === 'slots' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Slot Key</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Placement</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Page Type</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {slots.map((slot) => (
                  <tr key={slot.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm text-emerald-600">{slot.key}</div>
                      <div className="text-xs text-slate-500">{slot.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium uppercase">
                        {slot.placement}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{slot.pageType || 'All'}</td>
                    <td className="px-6 py-4">
                      {slot.enabled ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-sm">
                          <CheckCircle className="w-4 h-4" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-400 text-sm">
                          <XCircle className="w-4 h-4" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button className="p-2 text-slate-400 hover:text-emerald-600"><Eye className="w-4 h-4" /></button>
                      <button 
                        onClick={() => { setEditingSlot(slot); setShowSlotModal(true); }}
                        className="p-2 text-slate-400 hover:text-indigo-600"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'profiles' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {profiles.map((profile) => (
                <div key={profile.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                        <Layers className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-900">{profile.name}</h3>
                    </div>
                    <button className="text-slate-400 hover:text-emerald-600"><Settings className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-400 uppercase">Slot Sequence</div>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(profile.slotsOrderJson || '[]').map((s: string, i: number) => (
                        <div key={i} className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-[10px] font-mono">
                          {s} {i < JSON.parse(profile.slotsOrderJson || '[]').length - 1 && <ArrowRight className="w-2 h-2" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Slot Modal */}
      {showSlotModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSlot?.id ? 'Edit Ad Slot' : 'New Ad Slot'}
              </h3>
              <button onClick={() => setShowSlotModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Slot Key</label>
                  <input 
                    type="text"
                    value={editingSlot?.key || ''}
                    onChange={e => setEditingSlot({...editingSlot!, key: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Display Name</label>
                  <input 
                    type="text"
                    value={editingSlot?.name || ''}
                    onChange={e => setEditingSlot({...editingSlot!, name: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Placement</label>
                  <select 
                    value={editingSlot?.placement || 'sidebar'}
                    onChange={e => setEditingSlot({...editingSlot!, placement: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="top">Top Banner</option>
                    <option value="sidebar">Sidebar</option>
                    <option value="in-content">In-Content</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Page Type</label>
                  <select 
                    value={editingSlot?.pageType || ''}
                    onChange={e => setEditingSlot({...editingSlot!, pageType: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="">All Pages</option>
                    <option value="calculator">Calculators</option>
                    <option value="blog">Blog Posts</option>
                    <option value="home">Homepage</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Monitor className="w-4 h-4" /> Responsive Rules
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2">
                      <Smartphone className="w-3 h-3" /> MOBILE
                    </div>
                    <select className="w-full text-xs border-none bg-transparent font-medium">
                      <option>320x50</option>
                      <option>300x250</option>
                      <option>Hidden</option>
                    </select>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2">
                      <Tablet className="w-3 h-3" /> TABLET
                    </div>
                    <select className="w-full text-xs border-none bg-transparent font-medium">
                      <option>728x90</option>
                      <option>300x250</option>
                    </select>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2">
                      <Monitor className="w-3 h-3" /> DESKTOP
                    </div>
                    <select className="w-full text-xs border-none bg-transparent font-medium">
                      <option>970x90</option>
                      <option>300x600</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setShowSlotModal(false)} className="px-4 py-2 text-slate-600 font-medium">Cancel</button>
              <button 
                onClick={handleSaveSlot}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdInventoryPanel;
