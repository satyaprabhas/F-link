import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { Bell, Filter, CheckCircle, AlertTriangle, AlertCircle, Info, Clock, RefreshCw } from 'lucide-react';

const AlertsPage = () => {
  const { refreshData } = useAppContext();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.alerts.getAll();
      setAlerts(data);
      if (refreshData) refreshData();
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await api.alerts.acknowledge(id);
      fetchAlerts();
    } catch (err) {
      alert('Failed to acknowledge alert');
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.alerts.resolve(id);
      fetchAlerts();
    } catch (err) {
      alert('Failed to resolve alert');
    }
  };

  const alertList = Array.isArray(alerts) ? alerts : [];
  const filteredAlerts = alertList.filter(a => {
    if (!a) return false;
    if (filterSeverity !== 'All' && a.severity !== filterSeverity) return false;
    if (filterStatus !== 'All' && a.status !== filterStatus) return false;
    if (filterType !== 'All' && a.type !== filterType) return false;
    return true;
  });

  const stats = {
    Critical: alertList.filter(a => a?.severity === 'Critical').length,
    High: alertList.filter(a => a?.severity === 'High').length,
    Medium: alertList.filter(a => a?.severity === 'Medium').length,
    Low: alertList.filter(a => a?.severity === 'Low').length,
  };

  const types = ['All', ...new Set(alertList.map(a => a?.type).filter(Boolean))];

  const getSeverityStyles = (severity) => {
    switch(severity) {
      case 'Critical': return { border: 'border-l-red-600', icon: <AlertTriangle className="text-red-600" size={18} />, badge: 'bg-red-50 text-red-700 border-red-200' };
      case 'High': return { border: 'border-l-orange-500', icon: <AlertCircle className="text-orange-600" size={18} />, badge: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'Medium': return { border: 'border-l-amber-500', icon: <Info className="text-amber-600" size={18} />, badge: 'bg-amber-50 text-amber-700 border-amber-200' };
      default: return { border: 'border-l-teal-600', icon: <Info className="text-teal-700" size={18} />, badge: 'bg-teal-50 text-teal-800 border-teal-200' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="text-teal-700" size={22} />
            Logistics Operational Alert Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Automated threshold warnings, route disruption notifications &amp; incident management</p>
        </div>
        <button 
          onClick={fetchAlerts} 
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-teal-700 flex items-center gap-1.5 shadow-2xs transition-colors"
        >
          <RefreshCw size={13} className="text-teal-700" /> Refresh Alerts
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between border-t-4 border-t-red-600 shadow-sm">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Critical</span>
            <span className="text-2xl font-extrabold text-red-600">{stats.Critical}</span>
          </div>
          <AlertTriangle className="text-red-500 opacity-60" size={24} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between border-t-4 border-t-orange-500 shadow-sm">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">High Priority</span>
            <span className="text-2xl font-extrabold text-orange-600">{stats.High}</span>
          </div>
          <AlertCircle className="text-orange-500 opacity-60" size={24} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between border-t-4 border-t-amber-500 shadow-sm">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Medium</span>
            <span className="text-2xl font-extrabold text-amber-600">{stats.Medium}</span>
          </div>
          <Info className="text-amber-500 opacity-60" size={24} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between border-t-4 border-t-teal-600 shadow-sm">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Low / Info</span>
            <span className="text-2xl font-extrabold text-teal-700">{stats.Low}</span>
          </div>
          <CheckCircle className="text-teal-600 opacity-60" size={24} />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-wrap gap-3 items-center shadow-sm">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mr-2">
          <Filter size={15} className="text-teal-700" />
          <span>Filters:</span>
        </div>
        
        <select 
          value={filterSeverity} 
          onChange={e => setFilterSeverity(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg py-1.5 px-3 text-xs font-medium focus:outline-none focus:border-teal-700"
        >
          <option value="All">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg py-1.5 px-3 text-xs font-medium focus:outline-none focus:border-teal-700"
        >
          <option value="All">All Statuses</option>
          <option value="New">New / Unacknowledged</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="Resolved">Resolved</option>
        </select>

        <select 
          value={filterType} 
          onChange={e => setFilterType(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg py-1.5 px-3 text-xs font-medium focus:outline-none focus:border-teal-700"
        >
          {types.map(t => <option key={t} value={t}>{t === 'All' ? 'All Alert Types' : t}</option>)}
        </select>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 shadow-sm">
            <RefreshCw className="animate-spin text-teal-700" size={18} /> Loading incident logs...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl text-xs font-medium shadow-sm">
            No alerts found matching current filter parameters.
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const styles = getSeverityStyles(alert.severity);
            return (
              <div 
                key={alert.id} 
                className={`bg-white border border-slate-200 rounded-xl p-4 border-l-4 ${styles.border} flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex gap-3.5 items-start w-full md:w-auto">
                  <div className="mt-0.5 shrink-0">{styles.icon}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-slate-900">{alert.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${styles.badge}`}>
                        {alert.severity}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                        {alert.type}
                      </span>
                      {alert.location_name && (
                        <span className="text-xs font-semibold text-teal-800 flex items-center gap-1">
                          • {alert.location_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{alert.message}</p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1 font-mono"><Clock size={11} /> {new Date(alert.created_at).toLocaleString()}</span>
                      {alert.status !== 'New' && <span>By: <span className="font-semibold text-slate-600">{alert.acknowledged_by || 'System'}</span></span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center mt-2 md:mt-0">
                  {alert.status === 'New' && (
                    <button 
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                    >
                      Acknowledge
                    </button>
                  )}
                  {alert.status === 'Acknowledged' && (
                    <button 
                      onClick={() => handleResolve(alert.id)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <CheckCircle size={13} /> Resolve Alert
                    </button>
                  )}
                  {alert.status === 'Resolved' && (
                    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1 font-bold px-2.5 py-1 rounded-full">
                      <CheckCircle size={13} /> Resolved
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
