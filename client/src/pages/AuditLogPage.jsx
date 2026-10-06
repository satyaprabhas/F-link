import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FileText, Search, Download, Filter, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const AuditLogPage = () => {
  const { t } = useAppContext() || { t: k => k };
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

  const actions = ['All', 'CREATE', 'UPDATE', 'LOGIN', 'APPROVE', 'REJECT', 'MODIFY', 'ACKNOWLEDGE', 'RESOLVE', 'GENERATE', 'IOT_SIMULATION'];
  const categories = ['All', 'Auth', 'Inventory', 'Delivery', 'Recommendation', 'Alert', 'Vehicle', 'Settings', 'System', 'IoT'];

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.audit.getAll();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    const act = (action || '').toUpperCase();
    if (act.includes('APPROVE') || act.includes('RESOLVE')) return 'text-emerald-800 bg-emerald-50 border-emerald-200';
    if (act.includes('REJECT')) return 'text-red-800 bg-red-50 border-red-200';
    if (act.includes('MODIFY') || act.includes('UPDATE')) return 'text-amber-800 bg-amber-50 border-amber-200';
    if (act.includes('CREATE') || act.includes('GENERATE')) return 'text-teal-800 bg-teal-50 border-teal-200';
    if (act.includes('LOGIN')) return 'text-slate-600 bg-slate-100 border-slate-200';
    return 'text-slate-800 bg-slate-100 border-slate-200';
  };

  const logList = Array.isArray(logs) ? logs : [];
  const filteredLogs = logList.filter(log => {
    if (!log) return false;
    if (userFilter && !String(log.user || '').toLowerCase().includes(userFilter.toLowerCase())) return false;
    if (actionFilter !== 'All' && log.action !== actionFilter) return false;
    if (categoryFilter !== 'All' && log.category !== categoryFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Category', 'Details', 'Location', 'Previous Value', 'New Value'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(l => [
        `"${new Date(l.timestamp).toISOString()}"`,
        `"${l.user}"`,
        `"${l.role || ''}"`,
        `"${l.action}"`,
        `"${l.category}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`,
        `"${l.location || ''}"`,
        `"${l.previous_value ? String(l.previous_value).replace(/"/g, '""') : ''}"`,
        `"${l.new_value ? String(l.new_value).replace(/"/g, '""') : ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `flink_audit_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="text-teal-700" size={22} />
            {t('Command Center Audit Trail')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('Immutable event provenance, officer approvals & system state modifications')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchLogs} 
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-teal-700 flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <RefreshCw size={13} className="text-teal-700" /> {t('Refresh')}
          </button>
          <button 
            onClick={handleExportCSV}
            className="bg-white border border-slate-300 hover:border-teal-700 hover:bg-slate-50 text-slate-700 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors text-xs font-semibold shadow-2xs"
          >
            <Download size={14} className="text-teal-700" /> {t('Export CSV')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-wrap gap-3 items-center shadow-sm">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
          <Filter size={15} className="text-teal-700" />
          <span>{t('Filter')}:</span>
        </div>
        
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder={t('Search by operator...')} 
            value={userFilter}
            onChange={(e) => {setUserFilter(e.target.value); setPage(1);}}
            className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg py-1.5 pl-8 pr-3 text-xs w-44 focus:outline-none focus:border-teal-700"
          />
        </div>

        <select 
          value={actionFilter} 
          onChange={e => {setActionFilter(e.target.value); setPage(1);}}
          className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg py-1.5 px-3 text-xs font-medium focus:outline-none focus:border-teal-700"
        >
          {actions.map(a => <option key={a} value={a}>{a === 'All' ? t('All Operations') || t('All Actions') : t(a)}</option>)}
        </select>

        <select 
          value={categoryFilter} 
          onChange={e => {setCategoryFilter(e.target.value); setPage(1);}}
          className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg py-1.5 px-3 text-xs font-medium focus:outline-none focus:border-teal-700"
        >
          {categories.map(c => <option key={c} value={c}>{c === 'All' ? t('All Modules') : t(c)}</option>)}
        </select>
        
        <div className="ml-auto text-xs text-slate-500 font-medium">
          {t('Showing')} <span className="font-bold text-slate-800">{filteredLogs.length}</span> {t('entries')}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">{t('Event Timestamp')}</th>
                <th className="py-3 px-3">{t('Operator ID')}</th>
                <th className="py-3 px-3">{t('Assigned Role')}</th>
                <th className="py-3 px-3">{t('Action')}</th>
                <th className="py-3 px-3">{t('Category')}</th>
                <th className="py-3 px-4 w-1/4">{t('Event Summary')}</th>
                <th className="py-3 px-3">{t('Location:')}</th>
                <th className="py-3 px-3">{t('Previous State')}</th>
                <th className="py-3 px-4">{t('New State')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="9" className="p-8 text-center text-slate-400">{t('Loading')}...</td></tr>
              ) : paginatedLogs.length === 0 ? (
                <tr><td colSpan="9" className="p-8 text-center text-slate-400">{t('No audit entries found matching criteria.')}</td></tr>
              ) : (
                paginatedLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{log.user}</td>
                    <td className="py-3 px-3 text-xs text-slate-500 font-medium">{t(log.role || '-')}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase ${getActionColor(log.action)}`}>
                        {t(log.action)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 font-semibold">{t(log.category)}</td>
                    <td className="py-3 px-4 text-xs text-slate-700 truncate max-w-xs font-medium" title={log.details}>{t(log.details)}</td>
                    <td className="py-3 px-3 text-xs text-slate-500 font-mono">{t(log.location || '-')}</td>
                    <td className="py-3 px-3 text-xs font-mono text-slate-400 truncate max-w-[130px]" title={String(log.previous_value || '')}>{log.previous_value || '-'}</td>
                    <td className="py-3 px-4 text-xs font-mono text-teal-800 font-medium truncate max-w-[130px]" title={String(log.new_value || '')}>{log.new_value || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
            <span className="text-slate-500">{t('Page')} <span className="font-bold text-slate-700">{page}</span> {t('of')} {totalPages}</span>
            <div className="flex gap-1.5">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogPage;
