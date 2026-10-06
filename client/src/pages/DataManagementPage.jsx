import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Database, RefreshCw, AlertCircle, CheckCircle, Clock, Search, DownloadCloud, Server } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const DataManagementPage = () => {
  const { t } = useAppContext() || { t: k => k };
  const [activeTab, setActiveTab] = useState('Quality');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [qualityStats, setQualityStats] = useState([]);
  
  const tabs = ['Quality', 'Locations', 'Inventory', 'Weather', 'Routes', 'Vehicles', 'Deliveries'];

  const fetchDataForTab = async (tab) => {
    setLoading(true);
    try {
      if (tab === 'Quality') {
        const res = await api.dataQuality.check();
        setQualityStats(res || []);
      } else {
        const method = tab.toLowerCase();
        if (api[method] && api[method].getAll) {
          const res = await api[method].getAll();
          setData(res || []);
        }
      }
    } catch (err) {
      console.error(`Error fetching data for ${tab}:`, err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDataForTab(activeTab);
  }, [activeTab]);

  const handleDemoLoad = async () => {
    setLoading(true);
    try {
      await api.demo.load();
      await fetchDataForTab(activeTab);
    } catch (err) {
      console.error('Failed to load demo data', err);
    }
    setLoading(false);
  };

  const handleDemoReset = async () => {
    if (!confirm('Reset all operational data to baseline demo defaults?')) return;
    setLoading(true);
    try {
      await api.demo.reset();
      await fetchDataForTab(activeTab);
    } catch (err) {
      console.error('Failed to reset data', err);
    }
    setLoading(false);
  };

  const renderQualitySummary = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {qualityStats.map((stat, idx) => (
        <div key={idx} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center">
              <Database size={16} className="mr-2 text-teal-700" />
              {t(stat.source)}
            </h3>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider border ${
              stat.status === 'Good' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
              stat.status === 'Warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
              stat.status === 'Simulated' ? 'bg-teal-50 text-teal-800 border-teal-200' :
              'bg-red-50 text-red-800 border-red-200'
            }`}>
              {t(stat.status)}
            </span>
          </div>
          
          <div className="space-y-2 text-xs text-slate-600 mb-4 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-400">{t('Record Volume:')}</span>
              <span className="font-mono font-bold text-slate-800">{stat.records} records</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t('Last Telemetry Update:')}</span>
              <span className="font-mono text-slate-700">{new Date(stat.last_update).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t('Confidence Metric:')}</span>
              <span className="font-mono font-bold text-teal-800">{stat.confidence}%</span>
            </div>
            {stat.data_source && (
              <div className="flex justify-between">
                <span className="text-slate-400">{t('Origin Feed:')}</span>
                <span className="text-xs truncate ml-2 text-teal-800 font-semibold">{t(stat.data_source)}</span>
              </div>
            )}
          </div>
          
          {stat.issues && stat.issues.length > 0 ? (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-amber-700 mb-1.5 flex items-center">
                <AlertCircle size={13} className="mr-1" /> {t('Detected Data Issues:')}
              </h4>
              <ul className="text-xs text-slate-600 space-y-1">
                {stat.issues.map((issue, i) => (
                  <li key={i} className="flex items-start text-[11px]">
                    <span className="mr-1 text-amber-600">•</span> {t(issue)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center text-emerald-700 text-xs font-semibold">
              <CheckCircle size={14} className="mr-1.5" /> {t('No active telemetry anomalies detected. Data stream healthy.')}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderDataTable = () => {
    if (!data || !Array.isArray(data) || data.length === 0 || !data[0]) {
      return <div className="text-slate-400 p-8 text-center text-xs bg-white rounded-xl border border-slate-200">{t('No records available for this report type.')}</div>;
    }
    
    const headers = Object.keys(data[0] || {}).filter(k => typeof (data[0] || {})[k] !== 'object');
    
    return (
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold tracking-wider">
            <tr>
              {headers.map(h => (
                <th key={h} className="px-4 py-3">{t(h.replace(/_/g, ' '))}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                {headers.map(h => (
                  <td key={h} className="px-4 py-2.5 truncate max-w-[200px] text-slate-700 font-medium">
                    {t(String(row[h] ?? '-'))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Server className="text-teal-700" size={22} />
            {t('Master Data & Telemetry Quality Management')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('Source integrity monitoring, record volume audits & demo data resets')}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDemoLoad}
            disabled={loading}
            className="flex items-center px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <DownloadCloud size={14} className="mr-1.5" /> {t('Load Demo Data')}
          </button>
          <button 
            onClick={handleDemoReset}
            disabled={loading}
            className="flex items-center px-3.5 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className="mr-1.5" /> {t('Reset Data')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold transition-all whitespace-nowrap border-b-2 ${
              activeTab === tab 
                ? 'border-teal-700 text-teal-800 bg-teal-50/50 rounded-t-lg' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg'
            }`}
          >
            {tab === 'Quality' ? t('Data Quality Health') : t(tab)}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-slate-500 bg-white border border-slate-200 rounded-xl shadow-sm">
            <RefreshCw size={24} className="animate-spin text-teal-700 mr-2" />
            <span className="text-xs font-semibold">{t('Loading')}...</span>
          </div>
        ) : (
          activeTab === 'Quality' ? renderQualitySummary() : renderDataTable()
        )}
      </div>
    </div>
  );
};

export default DataManagementPage;
