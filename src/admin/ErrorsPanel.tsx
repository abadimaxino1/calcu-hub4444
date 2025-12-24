import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Filter, 
  ChevronRight, 
  ChevronDown,
  Clock,
  User,
  Globe,
  Shield
} from 'lucide-react';

interface SentryError {
  id: string;
  message: string;
  culprit: string;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  status: string;
  level: string;
  permalink: string;
  project: {
    slug: string;
    name: string;
  };
}

export const ErrorsPanel: React.FC = () => {
  const [errors, setErrors] = useState<SentryError[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unresolved');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchErrors();
  }, [filter]);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      // In a real app, this would call your backend which proxies to Sentry API
      // For now, we'll simulate the API call to the backend
      const response = await fetch(`/api/admin/ops/errors?status=${filter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setErrors(data.errors || []);
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'fatal': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-500" />
            Error Monitoring
          </h2>
          <p className="text-gray-500">Track and manage system errors via Sentry integration</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
            <option value="all">All Errors</option>
          </select>
          <button 
            onClick={fetchErrors}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Total Issues</div>
          <div className="text-2xl font-bold text-gray-900">{errors.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Affected Users</div>
          <div className="text-2xl font-bold text-gray-900">
            {errors.reduce((acc, curr) => acc + curr.userCount, 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Total Events</div>
          <div className="text-2xl font-bold text-gray-900">
            {errors.reduce((acc, curr) => acc + curr.count, 0)}
          </div>
        </div>
      </div>

      {/* Error List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Loading error data...
                  </td>
                </tr>
              ) : errors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No errors found matching the current filter.
                  </td>
                </tr>
              ) : (
                errors.map((error) => (
                  <React.Fragment key={error.id}>
                    <tr className={`hover:bg-gray-50 cursor-pointer ${expandedId === error.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getLevelColor(error.level)}`}>
                            {error.level}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 line-clamp-1">{error.message}</div>
                            <div className="text-xs text-gray-500 font-mono mt-1">{error.culprit}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{error.count}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{error.userCount}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(error.lastSeen).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a 
                          href={error.permalink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Sentry <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                    {expandedId === error.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Details</h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  <span>First seen: {new Date(error.firstSeen).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Shield className="w-4 h-4" />
                                  <span>Project: {error.project.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Globe className="w-4 h-4" />
                                  <span>Status: <span className="capitalize">{error.status}</span></span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Actions</h4>
                              <div className="flex gap-2">
                                <button className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium hover:bg-gray-50">
                                  Resolve
                                </button>
                                <button className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium hover:bg-gray-50">
                                  Ignore
                                </button>
                                <button className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium hover:bg-gray-50">
                                  Assign
                                </button>
                              </div>
                            </div>
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

      {/* Integration Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Shield className="w-5 h-5 text-blue-500 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Security & Privacy</p>
          <p>
            All error reports are sanitized before being sent to Sentry. Sensitive data like passwords, 
            tokens, and API keys are automatically masked. Request bodies are filtered to prevent 
            PII leakage.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorsPanel;