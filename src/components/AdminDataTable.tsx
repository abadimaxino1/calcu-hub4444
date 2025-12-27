import React, { useState, useMemo } from 'react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface AdminDataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyField?: string;
  isLoading?: boolean;
  onRowAction?: (action: string, item: T) => void;
  onBulkAction?: (action: string, selectedIds: string[]) => void;
  searchPlaceholder?: string;
  enableExport?: boolean;
  // Server-side props
  serverSide?: boolean;
  totalItems?: number;
  currentPage?: number;
  pageSize?: number;
  onParamsChange?: (params: { page: number; search: string; sortBy: string; sortOrder: 'asc' | 'desc' }) => void;
}

export function AdminDataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = 'id',
  isLoading,
  onRowAction,
  onBulkAction,
  searchPlaceholder = 'بحث...',
  enableExport = true,
  serverSide = false,
  totalItems = 0,
  currentPage = 1,
  pageSize = 10,
  onParamsChange,
}: AdminDataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [localPage, setLocalPage] = useState(1);

  const page = serverSide ? currentPage : localPage;

  // Filter & Sort (Client-side only)
  const processedData = useMemo(() => {
    if (serverSide) return data;

    let processed = [...data];

    if (search) {
      const lowerSearch = search.toLowerCase();
      processed = processed.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(lowerSearch)
        )
      );
    }

    if (sortConfig) {
      processed.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return processed;
  }, [data, search, sortConfig, serverSide]);

  // Pagination
  const totalCount = serverSide ? totalItems : processedData.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedData = serverSide ? data : processedData.slice((page - 1) * pageSize, page * pageSize);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(paginatedData.map((item) => String(item[keyField]))));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSort = (key: string) => {
    const newDirection = sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction: newDirection });
    
    if (serverSide && onParamsChange) {
      onParamsChange({ page: 1, search, sortBy: key, sortOrder: newDirection });
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (serverSide) {
      if (onParamsChange) {
        onParamsChange({ 
          page: 1, 
          search: val, 
          sortBy: sortConfig?.key || '', 
          sortOrder: sortConfig?.direction || 'asc' 
        });
      }
    } else {
      setLocalPage(1);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (serverSide) {
      if (onParamsChange) {
        onParamsChange({ 
          page: newPage, 
          search, 
          sortBy: sortConfig?.key || '', 
          sortOrder: sortConfig?.direction || 'asc' 
        });
      }
    } else {
      setLocalPage(newPage);
    }
  };

  const handleExportCSV = () => {
    const dataToExport = serverSide ? data : filteredData;
    if (dataToExport.length === 0) return;

    const headers = columns.map(c => c.header).join(',');
    const rows = dataToExport.map(item => 
      columns.map(c => {
        const val = item[c.key];
        // Simple escape for CSV
        const str = String(val === undefined || val === null ? '' : val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-white rounded-lg shadow">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-xs"
          />
          {enableExport && (
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              title="تصدير CSV"
            >
              📥 تصدير
            </button>
          )}
        </div>

        {selectedIds.size > 0 && onBulkAction && (
          <div className="flex items-center gap-2 animate-fade-in">
            <span className="text-sm text-slate-500">{selectedIds.size} محدد</span>
            <button
              onClick={() => onBulkAction('delete', Array.from(selectedIds))}
              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
            >
              حذف المحدد
            </button>
            <button
              onClick={() => onBulkAction('publish', Array.from(selectedIds))}
              className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm font-medium"
            >
              نشر
            </button>
            <button
              onClick={() => onBulkAction('unpublish', Array.from(selectedIds))}
              className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium"
            >
              إلغاء النشر
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 w-12">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={paginatedData.length > 0 && paginatedData.every((item) => selectedIds.has(String(item[keyField])))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-sm font-medium text-slate-600 ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.sortable ? 'cursor-pointer hover:text-slate-800' : ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    {col.header}
                    {sortConfig?.key === col.key && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
              {onRowAction && <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">إجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.map((item) => (
              <tr key={String(item[keyField])} className="hover:bg-slate-50 group">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(String(item[keyField]))}
                    onChange={() => handleSelectRow(String(item[keyField]))}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-slate-700 ${
                      col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.render ? col.render(item[col.key], item) : item[col.key]}
                  </td>
                ))}
                {onRowAction && (
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onRowAction('edit', item)}
                        className="text-blue-600 hover:text-blue-800"
                        title="تعديل"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onRowAction('clone', item)}
                        className="text-slate-600 hover:text-slate-800"
                        title="نسخ"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => onRowAction('delete', item)}
                        className="text-red-600 hover:text-red-800"
                        title="حذف"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-4 py-8 text-center text-slate-500">
                  لا توجد بيانات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            صفحة {currentPage} من {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              السابق
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
