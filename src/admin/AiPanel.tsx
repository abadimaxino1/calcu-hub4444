import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  History, 
  ShieldAlert, 
  Plus, 
  Save, 
  Play, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Zap
} from 'lucide-react';

interface AiTemplate {
  id: string;
  key: string;
  name: string;
  purpose: string;
  activeVersionId: string;
  createdAt: string;
}

interface AiVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  modelPreferencesJson: string;
  promptText: string;
  createdAt: string;
}

interface AiUsageLog {
  id: string;
  provider: string;
  model: string;
  featureKey: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  estimatedCost: number;
  status: string;
  errorCode?: string;
  createdAt: string;
}

interface AiFallbackRule {
  id: string;
  featureKey: string;
  primaryProvider: string;
  fallbackChainJson: string;
  timeoutMs: number;
  maxRetries: number;
}

export default function AiPanel() {
  const [activeTab, setActiveTab] = useState<'templates' | 'usage' | 'fallback'>('templates');
  const [templates, setTemplates] = useState<AiTemplate[]>([]);
  const [usageLogs, setUsageLogs] = useState<AiUsageLog[]>([]);
  const [fallbackRules, setFallbackRules] = useState<AiFallbackRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'templates') {
        const res = await fetch('/api/admin/ai/templates');
        setTemplates(await res.json());
      } else if (activeTab === 'usage') {
        const res = await fetch('/api/admin/ai/usage');
        setUsageLogs(await res.json());
      } else if (activeTab === 'fallback') {
        const res = await fetch('/api/admin/ai/fallback');
        setFallbackRules(await res.json());
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-indigo-600" />
            AI Integrations Suite
          </h2>
          <p className="text-gray-500">Manage prompt templates, monitor usage, and configure failover policies.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchData}
            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'templates' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Prompt Templates
          </div>
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'usage' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Usage & Performance
          </div>
        </button>
        <button
          onClick={() => setActiveTab('fallback')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'fallback' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Fallback Rules
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {activeTab === 'templates' && (
          <TemplatesList templates={templates} onRefresh={fetchData} />
        )}
        {activeTab === 'usage' && (
          <UsageDashboard logs={usageLogs} />
        )}
        {activeTab === 'fallback' && (
          <FallbackManager rules={fallbackRules} onRefresh={fetchData} />
        )}
      </div>
    </div>
  );
}

function TemplatesList({ templates, onRefresh }: { templates: AiTemplate[], onRefresh: () => void }) {
  const [selectedTemplate, setSelectedTemplate] = useState<AiTemplate | null>(null);
  const [versions, setVersions] = useState<AiVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const fetchVersions = async (templateId: string) => {
    setLoadingVersions(true);
    try {
      const res = await fetch(`/api/admin/ai/templates/${templateId}/versions`);
      setVersions(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVersions(false);
    }
  };

  return (
    <div className="divide-y divide-gray-200">
      <div className="p-4 bg-gray-50 flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{templates.length} Templates Configured</span>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-gray-200 min-h-[500px]">
        {/* Sidebar: Template List */}
        <div className="col-span-1 overflow-y-auto max-h-[600px]">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTemplate(t);
                fetchVersions(t.id);
              }}
              className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                selectedTemplate?.id === t.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
              }`}
            >
              <div className="font-medium text-gray-900">{t.name}</div>
              <div className="text-xs text-gray-500 font-mono mt-1">{t.key}</div>
              <div className="text-xs text-gray-400 mt-2 line-clamp-1">{t.purpose}</div>
            </button>
          ))}
        </div>

        {/* Main: Versioning & Editor */}
        <div className="col-span-2 p-6">
          {selectedTemplate ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedTemplate.name}</h3>
                  <p className="text-sm text-gray-500">{selectedTemplate.purpose}</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
                    <Play className="w-4 h-4" />
                    Test Prompt
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                    <Plus className="w-4 h-4" />
                    New Version
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Version History</h4>
                {loadingVersions ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {versions.map(v => (
                      <div key={v.id} className={`p-4 rounded-lg border ${v.id === selectedTemplate.activeVersionId ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">v{v.versionNumber}</span>
                            {v.id === selectedTemplate.activeVersionId && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">Active</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">{new Date(v.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-sm text-gray-600 font-mono bg-white p-3 rounded border border-gray-100 line-clamp-3">
                          {v.promptText}
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          {v.id !== selectedTemplate.activeVersionId && (
                            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Rollback to this version</button>
                          )}
                          <button className="text-xs font-medium text-gray-500 hover:text-gray-700">View Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <Cpu className="w-12 h-12 opacity-20" />
              <p>Select a template to manage versions and test prompts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UsageDashboard({ logs }: { logs: AiUsageLog[] }) {
  const stats = {
    totalRequests: logs.length,
    successRate: (logs.filter(l => l.status === 'success').length / logs.length * 100 || 0).toFixed(1),
    avgLatency: (logs.reduce((acc, l) => acc + l.latencyMs, 0) / logs.length || 0).toFixed(0),
    totalCost: logs.reduce((acc, l) => acc + l.estimatedCost, 0).toFixed(4)
  };

  return (
    <div className="p-6 space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <div className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">Total Requests</div>
          <div className="text-2xl font-bold text-indigo-900">{stats.totalRequests}</div>
        </div>
        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
          <div className="text-green-600 text-xs font-bold uppercase tracking-wider mb-1">Success Rate</div>
          <div className="text-2xl font-bold text-green-900">{stats.successRate}%</div>
        </div>
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">Avg Latency</div>
          <div className="text-2xl font-bold text-blue-900">{stats.avgLatency}ms</div>
        </div>
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
          <div className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">Est. Cost (SAR)</div>
          <div className="text-2xl font-bold text-amber-900">${stats.totalCost}</div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-medium border-y border-gray-200">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Feature</th>
                <th className="px-4 py-3">Provider/Model</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{log.featureKey}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-gray-700 font-medium">{log.provider}</span>
                      <span className="text-[10px] text-gray-400 font-mono uppercase">{log.model}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.tokensIn + log.tokensOut}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.latencyMs}ms</td>
                  <td className="px-4 py-3">
                    {log.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">
                        <CheckCircle2 className="w-3 h-3" /> Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase">
                        <AlertCircle className="w-3 h-3" /> {log.errorCode || 'Error'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FallbackManager({ rules, onRefresh }: { rules: AiFallbackRule[], onRefresh: () => void }) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Failover Policies</h3>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rules.map(rule => (
          <div key={rule.id} className="p-5 border border-gray-200 rounded-xl hover:border-indigo-200 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-sm font-mono text-indigo-600 font-bold uppercase tracking-wider">{rule.featureKey}</div>
                <div className="text-xs text-gray-400 mt-1">Configured for high availability</div>
              </div>
              <button className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <Save className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Primary</div>
                <div className="font-bold text-gray-900">{rule.primaryProvider}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
              <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Fallback Chain</div>
                <div className="flex gap-2">
                  {JSON.parse(rule.fallbackChainJson).map((p: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase">{p}</span>
                  ))}
                </div>
              </div>
              <div className="w-32 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Timeout</div>
                <div className="font-bold text-gray-900">{rule.timeoutMs}ms</div>
              </div>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No fallback rules configured. All features will use default providers.</p>
          </div>
        )}
      </div>
    </div>
  );
}
