import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Link as LinkIcon, 
  AlertTriangle, 
  Settings, 
  Plus, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  ExternalLink,
  FileCode,
  Search
} from 'lucide-react';

interface Redirect {
  id: string;
  fromPath: string;
  toPath: string;
  type: number;
  enabled: boolean;
}

interface BrokenLink {
  id: string;
  url: string;
  statusCode: number;
  sourcePage: string;
  lastChecked: string;
  isFixed: boolean;
}

interface SeoConfig {
  key: string;
  value: string;
}

interface SchemaTemplate {
  id: string;
  name: string;
  template: string;
  description: string;
}

interface PageMetadata {
  id: string;
  pagePath: string;
  titleEn: string;
  descriptionEn: string;
}

export default function SeoPanel() {
  const [activeTab, setActiveTab] = useState<'metadata' | 'redirects' | 'broken-links' | 'config' | 'schema'>('metadata');
  const [metadata, setMetadata] = useState<PageMetadata[]>([]);
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [brokenLinks, setBrokenLinks] = useState<BrokenLink[]>([]);
  const [configs, setConfigs] = useState<SeoConfig[]>([]);
  const [schemas, setSchemas] = useState<SchemaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'metadata') {
        const res = await fetch('/api/seo/configs');
        if (res.ok) {
          const data = await res.json();
          setMetadata(data.configs || []);
        }
      } else if (activeTab === 'redirects') {
        const res = await fetch('/api/admin/growth/seo/redirects');
        if (res.ok) setRedirects(await res.json());
      } else if (activeTab === 'broken-links') {
        const res = await fetch('/api/admin/growth/seo/broken-links');
        if (res.ok) setBrokenLinks(await res.json());
      } else if (activeTab === 'config') {
        const res = await fetch('/api/admin/growth/seo/config');
        if (res.ok) setConfigs(await res.json());
      } else if (activeTab === 'schema') {
        const res = await fetch('/api/admin/growth/seo/schema-templates');
        if (res.ok) setSchemas(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch SEO data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScan = async () => {
    setScanning(true);
    try {
      await fetch('/api/admin/growth/seo/broken-links/scan', { method: 'POST' });
      alert('Scan started! Check back in a few minutes.');
    } catch (error) {
      alert('Failed to start scan');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveConfig = async (key: string, value: string) => {
    try {
      await fetch('/api/admin/growth/seo/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      fetchData();
    } catch (error) {
      alert('Failed to save config');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Globe className="w-6 h-6 text-indigo-600" />
          SEO Operations
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={fetchData}
            className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'metadata', label: 'Page Metadata', icon: Search },
          { id: 'redirects', label: 'Redirects', icon: LinkIcon },
          { id: 'broken-links', label: 'Broken Links', icon: AlertTriangle },
          { id: 'config', label: 'Global Config', icon: Settings },
          { id: 'schema', label: 'Schema Library', icon: FileCode },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {activeTab === 'metadata' && (
          <div className="p-6">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Page SEO Metadata</h3>
              <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" />
                New Page Config
              </button>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-4 py-3">Path</th>
                  <th className="px-4 py-3">Title (EN)</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {metadata.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 font-mono text-sm">{m.pagePath}</td>
                    <td className="px-4 py-4 text-sm">{m.titleEn}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 truncate max-w-xs">{m.descriptionEn}</td>
                    <td className="px-4 py-4 text-right">
                      <button className="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                      <button className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'redirects' && (
          <div className="p-6">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Path Redirects (301/302)</h3>
              <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" />
                Add Redirect
              </button>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-4 py-3">From Path</th>
                  <th className="px-4 py-3">To Path</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {redirects.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 font-mono text-sm">{r.fromPath}</td>
                    <td className="px-4 py-4 font-mono text-sm">{r.toPath}</td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        r.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {r.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button className="text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'broken-links' && (
          <div className="p-6">
            <div className="flex justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Broken Link Report</h3>
                <p className="text-sm text-gray-500">Last scan: {brokenLinks[0]?.lastChecked || 'Never'}</p>
              </div>
              <button 
                onClick={handleStartScan}
                disabled={scanning}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                {scanning ? 'Scanning...' : 'Run Full Scan'}
              </button>
            </div>
            <div className="space-y-4">
              {brokenLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-4 border border-red-100 bg-red-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-1" />
                    <div>
                      <div className="font-medium text-red-900 flex items-center gap-2">
                        {link.url}
                        <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">
                          HTTP {link.statusCode}
                        </span>
                      </div>
                      <div className="text-sm text-red-700">
                        Found on: <span className="font-mono">{link.sourcePage}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-gray-500 hover:text-indigo-600 bg-white rounded-md border border-gray-200 shadow-sm">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-green-600 bg-white rounded-md border border-gray-200 shadow-sm">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {brokenLinks.length === 0 && !loading && (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900">No broken links found!</h4>
                  <p className="text-gray-500">Your site is looking healthy.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold">Global SEO Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Robots.txt Rules</label>
                <textarea 
                  className="w-full h-32 p-3 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="User-agent: *&#10;Disallow: /admin/"
                  defaultValue={configs.find(c => c.key === 'robots_txt')?.value || ''}
                  onBlur={(e) => handleSaveConfig('robots_txt', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Canonical Base URL</label>
                <input 
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://calcu-hub.com"
                  defaultValue={configs.find(c => c.key === 'canonical_base')?.value || ''}
                  onBlur={(e) => handleSaveConfig('canonical_base', e.target.value)}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h4 className="font-medium mb-4">OG Image Generator Preview</h4>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="block text-sm text-gray-500">Test Title</label>
                  <input 
                    type="text" 
                    id="og-test-title"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Mortgage Calculator"
                  />
                </div>
                <button 
                  onClick={() => {
                    const title = (document.getElementById('og-test-title') as HTMLInputElement).value;
                    window.open(`/api/admin/growth/seo/og-image?title=${encodeURIComponent(title)}`, '_blank');
                  }}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Generate Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="p-6">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">JSON-LD Schema Templates</h3>
              <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" />
                New Template
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schemas.map((s) => (
                <div key={s.id} className="p-4 border border-gray-200 rounded-xl hover:border-indigo-300 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900">{s.name}</h4>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-gray-400 hover:text-indigo-600"><Settings className="w-4 h-4" /></button>
                      <button className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{s.description}</p>
                  <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono text-gray-600 overflow-hidden h-24">
                    {s.template}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

