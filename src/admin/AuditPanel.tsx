import React, { useState, useEffect } from 'react';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';

interface AuditLog {
  id: string;
  occurredAt: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  actorUserId: string;
  actorName?: string; // Joined from user
  actorRole: string;
  actorIp: string;
  severity: string;
  requestId: string;
  beforeJson: string;
  afterJson: string;
  diffJson: string;
  metadataJson: string;
}

export default function AuditPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 20,
    search: '',
    action: '',
    entityType: '',
    severity: '',
    startDate: '',
    endDate: '',
    sortBy: 'occurredAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: params.page.toString(),
        limit: params.pageSize.toString(),
        search: params.search,
        action: params.action,
        entityType: params.entityType,
        severity: params.severity,
        startDate: params.startDate,
        endDate: params.endDate,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder
      });
      const res = await fetch(`/api/system/audit-logs?${query}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [params]);

  const columns: ColumnDef<AuditLog>[] = [
    {
      key: 'occurredAt',
      header: 'Time',
      render: (val) => new Date(val).toLocaleString(),
      sortable: true
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          val?.toUpperCase() === 'CRITICAL' ? 'bg-red-100 text-red-800' :
          val?.toUpperCase() === 'HIGH' ? 'bg-orange-100 text-orange-800' :
          val?.toUpperCase() === 'WARN' || val?.toUpperCase() === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {val?.toUpperCase()}
        </span>
      )
    },
    {
      key: 'action',
      header: 'Action',
      render: (val) => <code className="text-xs bg-slate-100 p-1 rounded">{val}</code>
    },
    {
      key: 'entityType',
      header: 'Entity',
      render: (_, item) => (
        <div>
          <div className="font-medium">{item.entityLabel || item.entityType}</div>
          <div className="text-xs text-slate-500">{item.entityId}</div>
        </div>
      )
    },
    {
      key: 'actorName',
      header: 'Actor',
      render: (_, item) => (
        <div>
          <div className="font-medium">{item.actorName || item.actorUserId || 'System'}</div>
          <div className="text-xs text-slate-500">{item.actorRole} • {item.actorIp}</div>
        </div>
      )
    },
    {
      key: 'actions',
      header: '',
      render: (_, item) => (
        <button 
          onClick={() => setSelectedLog(item)}
          className="text-blue-600 hover:underline text-sm"
        >
          Details
        </button>
      )
    }
  ];

  const handleExport = async (format: 'csv' | 'json') => {
    const query = new URLSearchParams({
      ...params,
      format,
      limit: '1000' // Export more
    } as any);
    window.open(`/api/system/audit-logs/export?${query}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
          <input 
            type="text" 
            placeholder="Search actor, entity, ID..."
            className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700"
            value={params.search}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Severity</label>
          <select 
            className="px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700"
            value={params.severity}
            onChange={(e) => setParams({ ...params, severity: e.target.value, page: 1 })}
          >
            <option value="">All</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
          <input 
            type="date" 
            className="px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700"
            value={params.startDate}
            onChange={(e) => setParams({ ...params, startDate: e.target.value, page: 1 })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
          <input 
            type="date" 
            className="px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700"
            value={params.endDate}
            onChange={(e) => setParams({ ...params, endDate: e.target.value, page: 1 })}
          />
        </div>
        <div className="flex items-end gap-2">
          <button 
            onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md text-sm font-medium"
          >
            Export CSV
          </button>
        </div>
      </div>

      <AdminDataTable
        columns={columns}
        data={logs}
        isLoading={loading}
        serverSide={true}
        totalItems={total}
        currentPage={params.page}
        pageSize={params.pageSize}
        onParamsChange={(newParams) => setParams({ ...params, ...newParams })}
      />

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">Audit Log Details</h3>
              <button onClick={() => setSelectedLog(null)} className="text-2xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-slate-500">Action</div>
                  <div className="font-mono font-bold">{selectedLog.action}</div>
                </div>
                <div>
                  <div className="text-slate-500">Entity</div>
                  <div>{selectedLog.entityType} ({selectedLog.entityId})</div>
                </div>
                <div>
                  <div className="text-slate-500">Actor</div>
                  <div>{selectedLog.actorName || selectedLog.actorUserId || 'System'} ({selectedLog.actorRole})</div>
                </div>
                <div>
                  <div className="text-slate-500">Request ID</div>
                  <div className="font-mono text-xs">{selectedLog.requestId}</div>
                </div>
              </div>

              {selectedLog.diffJson && (
                <div>
                  <h4 className="font-bold mb-2">Changes</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900">
                        <tr>
                          <th className="px-4 py-2 text-left">Field</th>
                          <th className="px-4 py-2 text-left">Before</th>
                          <th className="px-4 py-2 text-left">After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(() => {
                          try {
                            const diffs = JSON.parse(selectedLog.diffJson);
                            if (!Array.isArray(diffs)) return <tr><td colSpan={3} className="p-4 text-center">No structured diff available</td></tr>;
                            return diffs.map((diff: any, i: number) => (
                              <tr key={i}>
                                <td className="px-4 py-2 font-mono text-blue-600">{diff.path}</td>
                                <td className="px-4 py-2 text-red-600 line-through">{JSON.stringify(diff.before)}</td>
                                <td className="px-4 py-2 text-green-600">{JSON.stringify(diff.after)}</td>
                              </tr>
                            ));
                          } catch (e) {
                            return <tr><td colSpan={3} className="p-4 text-center">Error parsing diff</td></tr>;
                          }
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold mb-2">Full Metadata</h4>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.metadataJson), null, 2);
                      } catch (e) {
                        return selectedLog.metadataJson;
                      }
                    })()}
                  </pre>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Context</h4>
                  <div className="text-sm space-y-1">
                    <div><span className="text-slate-500">IP:</span> {selectedLog.actorIp}</div>
                    <div><span className="text-slate-500">User Agent:</span> {selectedLog.userAgent}</div>
                    <div><span className="text-slate-500">Timestamp:</span> {new Date(selectedLog.occurredAt).toISOString()}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

