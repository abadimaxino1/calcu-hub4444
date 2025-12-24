import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Filter,
  Layers,
  Users,
  ChevronRight,
  ChevronDown,
  Info,
  AlertCircle
} from 'lucide-react';

interface AnalyticsEvent {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  properties: AnalyticsEventProperty[];
}

interface AnalyticsEventProperty {
  id: string;
  key: string;
  type: string;
  required: boolean;
  exampleValue: string;
}

interface AnalyticsProvider {
  id: string;
  key: string;
  enabled: boolean;
  settingsJson: string;
}

interface Funnel {
  id: string;
  key: string;
  name: string;
  stepsJson: string;
  scope: string;
}

interface Cohort {
  id: string;
  key: string;
  name: string;
  ruleJson: string;
}

const AnalyticsDefinitionsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'events' | 'providers' | 'funnels' | 'cohorts'>('events');
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [providers, setProviders] = useState<AnalyticsProvider[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Partial<AnalyticsEvent> | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = `/api/admin/growth/analytics/${activeTab}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      
      if (activeTab === 'events') setEvents(data);
      else if (activeTab === 'providers') setProviders(data);
      else if (activeTab === 'funnels') setFunnels(data);
      else if (activeTab === 'cohorts') setCohorts(data);
      
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!editingEvent?.key || !editingEvent?.name) return;
    
    try {
      const method = editingEvent.id ? 'PUT' : 'POST';
      const url = editingEvent.id 
        ? `/api/admin/growth/analytics/events/${editingEvent.id}`
        : '/api/admin/growth/analytics/events';
        
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEvent)
      });
      
      if (!res.ok) throw new Error('Failed to save event');
      
      setShowEventModal(false);
      setEditingEvent(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event definition?')) return;
    try {
      const res = await fetch(`/api/admin/growth/analytics/events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete event');
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
            <Activity className="w-6 h-6 text-indigo-600" />
            Analytics Definitions
          </h2>
          <p className="text-slate-500">Manage tracking events, providers, funnels, and cohorts.</p>
        </div>
        <button 
          onClick={() => {
            if (activeTab === 'events') {
              setEditingEvent({ key: '', name: '', category: 'general', enabled: true, properties: [] });
              setShowEventModal(true);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab.slice(0, -1)}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {(['events', 'providers', 'funnels', 'cohorts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab 
                ? 'text-indigo-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {activeTab === 'events' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Event Key</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm text-indigo-600">{event.key}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{event.name}</div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">{event.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                        {event.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {event.enabled ? (
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
                      <button 
                        onClick={() => {
                          setEditingEvent(event);
                          setShowEventModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No events defined yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'providers' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {providers.map((provider) => (
                <div key={provider.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                        <Layers className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 uppercase">{provider.key}</h3>
                        <span className={`text-xs ${provider.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {provider.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    <button className="text-slate-400 hover:text-indigo-600">
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="bg-slate-50 p-3 rounded font-mono text-xs text-slate-600 overflow-hidden">
                    {provider.settingsJson || '{}'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'funnels' && (
            <div className="p-6 space-y-4">
              {funnels.map((funnel) => (
                <div key={funnel.id} className="p-4 border border-slate-200 rounded-lg flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Filter className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="font-bold text-slate-900">{funnel.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">{funnel.key} • {funnel.scope}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded">Edit Steps</button>
                    <button className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'cohorts' && (
            <div className="p-6 space-y-4">
              {cohorts.map((cohort) => (
                <div key={cohort.id} className="p-4 border border-slate-200 rounded-lg flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="font-bold text-slate-900">{cohort.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">{cohort.key}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded">Edit Rules</button>
                    <button className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingEvent?.id ? 'Edit Event Definition' : 'New Event Definition'}
              </h3>
              <button onClick={() => setShowEventModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Event Key (unique)</label>
                  <input 
                    type="text"
                    value={editingEvent?.key || ''}
                    onChange={e => setEditingEvent({...editingEvent!, key: e.target.value})}
                    placeholder="e.g. calculator_view"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Display Name</label>
                  <input 
                    type="text"
                    value={editingEvent?.name || ''}
                    onChange={e => setEditingEvent({...editingEvent!, name: e.target.value})}
                    placeholder="e.g. Calculator View"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <textarea 
                  value={editingEvent?.description || ''}
                  onChange={e => setEditingEvent({...editingEvent!, description: e.target.value})}
                  placeholder="What does this event track?"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Category</label>
                  <select 
                    value={editingEvent?.category || 'general'}
                    onChange={e => setEditingEvent({...editingEvent!, category: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="general">General</option>
                    <option value="calculator">Calculator</option>
                    <option value="conversion">Conversion</option>
                    <option value="engagement">Engagement</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input 
                    type="checkbox"
                    id="event-enabled"
                    checked={editingEvent?.enabled !== false}
                    onChange={e => setEditingEvent({...editingEvent!, enabled: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="event-enabled" className="text-sm font-semibold text-slate-700">Enabled</label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-600" />
                    Properties Schema
                  </h4>
                  <button 
                    onClick={() => {
                      const props = [...(editingEvent?.properties || [])];
                      props.push({ id: '', key: '', type: 'string', required: false, exampleValue: '' });
                      setEditingEvent({...editingEvent!, properties: props});
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    + Add Property
                  </button>
                </div>
                
                <div className="space-y-2">
                  {editingEvent?.properties?.map((prop, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-slate-50 p-2 rounded-lg">
                      <input 
                        placeholder="key"
                        value={prop.key}
                        onChange={e => {
                          const props = [...editingEvent.properties!];
                          props[idx].key = e.target.value;
                          setEditingEvent({...editingEvent, properties: props});
                        }}
                        className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                      />
                      <select 
                        value={prop.type}
                        onChange={e => {
                          const props = [...editingEvent.properties!];
                          props[idx].type = e.target.value;
                          setEditingEvent({...editingEvent, properties: props});
                        }}
                        className="w-24 px-2 py-1 border border-slate-200 rounded text-xs"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="object">Object</option>
                      </select>
                      <div className="flex items-center gap-1 pt-1">
                        <input 
                          type="checkbox"
                          checked={prop.required}
                          onChange={e => {
                            const props = [...editingEvent.properties!];
                            props[idx].required = e.target.checked;
                            setEditingEvent({...editingEvent, properties: props});
                          }}
                        />
                        <span className="text-[10px] font-bold text-slate-500">REQ</span>
                      </div>
                      <button 
                        onClick={() => {
                          const props = editingEvent.properties!.filter((_, i) => i !== idx);
                          setEditingEvent({...editingEvent, properties: props});
                        }}
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button 
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEvent}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Definition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDefinitionsPanel;
