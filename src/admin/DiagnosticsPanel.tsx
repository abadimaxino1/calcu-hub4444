import React, { useState, useEffect } from 'react';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';

interface DiagnosticRun {
  id: string;
  type: string;
  status: string;
  payload: string;
  result: string;
  error: string;
  progress: number;
  createdAt: string;
  completedAt: string;
  requestId: string;
}

export default function DiagnosticsPanel() {
  const [runs, setRuns] = useState<DiagnosticRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ops/diagnostics/runs', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setRuns(data.runs);
      }
    } catch (error) {
      console.error('Failed to fetch diagnostic runs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const runDiagnostics = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/admin/ops/diagnostics/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checks: ['db', 'storage', 'env'] }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) {
        fetchRuns();
      }
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
    } finally {
      setRunning(false);
    }
  };

  const columns: ColumnDef<DiagnosticRun>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (val) => new Date(val).toLocaleString()
    },
    {
      key: 'status',
      header: 'Status',
      render: (val, item) => (
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            val === 'COMPLETED' ? 'bg-green-100 text-green-800' :
            val === 'FAILED' ? 'bg-red-100 text-red-800' :
            val === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
            'bg-slate-100 text-slate-800'
          }`}>
            {val}
          </span>
          {val === 'RUNNING' && (
            <span className="text-xs text-slate-500">{item.progress}%</span>
          )}
        </div>
      )
    },
    {
      key: 'requestId',
      header: 'Request ID',
      render: (val) => <code className="text-xs">{val}</code>
    },
    {
      key: 'result',
      header: 'Results',
      render: (val) => {
        if (!val) return '-';
        try {
          const results = JSON.parse(val);
          return (
            <div className="flex gap-2 flex-wrap">
              {Object.entries(results).map(([check, res]: [string, any]) => (
                <span key={check} className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  res.status === 'OK' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
                }`}>
                  {check}: {res.status}
                </span>
              ))}
            </div>
          );
        } catch (e) {
          return <span className="text-xs text-red-500">Error parsing results</span>;
        }
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">System Diagnostics</h3>
          <p className="text-sm text-slate-500">Run deep system checks and view historical results.</p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={running}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            running 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
          }`}
        >
          {running ? 'Running...' : 'Run New Diagnostics'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <AdminDataTable
          columns={columns}
          data={runs}
          isLoading={loading}
          keyField="id"
        />
      </div>
    </div>
  );
}
