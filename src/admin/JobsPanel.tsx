import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RefreshCw, 
  Settings, 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Calendar,
  Filter,
  Search,
  MoreVertical,
  Pause,
  Zap
} from 'lucide-react';

interface JobDefinition {
  key: string;
  name: string;
  description: string;
  scheduleCron: string | null;
  enabled: boolean;
  defaultPayload: string;
  _count?: { runs: number };
}

interface JobRun {
  id: string;
  jobKey: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELED';
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  attempt: number;
  maxAttempts: number;
  payloadJson: string;
  resultJson: string | null;
  errorJson: string | null;
  requestId: string | null;
  createdAt: string;
  definition?: { name: string };
}

export const JobsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'definitions' | 'runs' | 'history'>('definitions');
  const [definitions, setDefinitions] = useState<JobDefinition[]>([]);
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    if (activeTab === 'definitions') fetchDefinitions();
    else fetchRuns();
  }, [activeTab, filterStatus]);

  const fetchDefinitions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ops/jobs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) setDefinitions(await res.json());
    } catch (e) {
      console.error('Failed to fetch definitions', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/admin/ops/jobs/runs', window.location.origin);
      if (filterStatus) url.searchParams.append('status', filterStatus);
      
      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs);
      }
    } catch (e) {
      console.error('Failed to fetch runs', e);
    } finally {
      setLoading(false);
    }
  };

  const triggerJob = async (key: string) => {
    try {
      const res = await fetch(`/api/admin/ops/jobs/${key}/run`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) {
        alert('Job queued successfully');
        if (activeTab !== 'definitions') fetchRuns();
      }
    } catch (e) {
      alert('Failed to trigger job');
    }
  };

  const toggleJob = async (key: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/ops/jobs/${key}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) fetchDefinitions();
    } catch (e) {
      alert('Failed to update job');
    }
  };

  const retryRun = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/ops/jobs/runs/${id}/retry`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) fetchRuns();
    } catch (e) {
      alert('Failed to retry job');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Success</span>;
      case 'FAILED': return <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</span>;
      case 'RUNNING': return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium flex items-center gap-1 animate-pulse"><RefreshCw className="w-3 h-3 animate-spin" /> Running</span>;
      case 'QUEUED': return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Queued</span>;
      default: return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Jobs & Queue
          </h2>
          <p className="text-gray-500">Manage background tasks, schedules, and worker status</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('definitions')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'definitions' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Definitions
          </button>
          <button 
            onClick={() => setActiveTab('runs')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'runs' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Active Runs
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === 'definitions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {definitions.map(def => (
            <div key={def.key} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-lg ${def.enabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                  <Settings className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleJob(def.key, !def.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${def.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${def.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{def.name}</h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">{def.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Cron: <code className="bg-gray-100 px-1 rounded">{def.scheduleCron || 'Manual Only'}</code></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <History className="w-3.5 h-3.5" />
                  <span>Total Runs: {def._count?.runs || 0}</span>
                </div>
              </div>

              <button 
                onClick={() => triggerJob(def.key)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                <Play className="w-4 h-4" /> Run Now
              </button>
            </div>
          ))}
        </div>
      )}

      {(activeTab === 'runs' || activeTab === 'history') && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search jobs..." 
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
                />
              </div>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
              >
                <option value="">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
                <option value="RUNNING">Running</option>
                <option value="QUEUED">Queued</option>
              </select>
            </div>
            <button onClick={fetchRuns} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold">Job</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Started</th>
                  <th className="px-6 py-3 font-semibold">Duration</th>
                  <th className="px-6 py-3 font-semibold">Attempts</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No job runs found.
                    </td>
                  </tr>
                ) : (
                  runs.map(run => (
                    <React.Fragment key={run.id}>
                      <tr 
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${expandedRunId === run.id ? 'bg-blue-50/30' : ''}`}
                        onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{run.definition?.name || run.jobKey}</div>
                          <div className="text-xs text-gray-400 font-mono">{run.id.split('-')[0]}</div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(run.status)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {run.startedAt ? new Date(run.startedAt).toLocaleString() : 'Pending'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {run.durationMs ? `${(run.durationMs / 1000).toFixed(2)}s` : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {run.attempt} / {run.maxAttempts}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {run.status === 'FAILED' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); retryRun(run.id); }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Retry Job"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {expandedRunId === run.id && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Payload</h4>
                                <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-auto max-h-40">
                                  {JSON.stringify(JSON.parse(run.payloadJson), null, 2)}
                                </pre>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Result / Error</h4>
                                {run.errorJson ? (
                                  <pre className="p-3 bg-red-900/10 text-red-700 border border-red-200 rounded-lg text-xs overflow-auto max-h-40">
                                    {JSON.stringify(JSON.parse(run.errorJson), null, 2)}
                                  </pre>
                                ) : run.resultJson ? (
                                  <pre className="p-3 bg-green-900/10 text-green-700 border border-green-200 rounded-lg text-xs overflow-auto max-h-40">
                                    {JSON.stringify(JSON.parse(run.resultJson), null, 2)}
                                  </pre>
                                ) : (
                                  <div className="text-xs text-gray-400 italic">No output yet</div>
                                )}
                              </div>
                            </div>
                            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                              <span>Request ID: <code className="bg-gray-100 px-1 rounded">{run.requestId || 'N/A'}</code></span>
                              <span>Created: {new Date(run.createdAt).toLocaleString()}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsPanel;