import React, { useState } from 'react';
import { api } from '../services/api';
import { 
  FileText, Download, Printer, Activity, Box, Truck, Map, CloudRain, 
  ShieldAlert, RefreshCw, BarChart2, CheckSquare 
} from 'lucide-react';

const reportTypes = [
  { id: 'inventory', name: 'Inventory Status', icon: <Box size={20} /> },
  { id: 'demand', name: 'Demand Forecast', icon: <BarChart2 size={20} /> },
  { id: 'supply-risk', name: 'Supply Risk', icon: <ShieldAlert size={20} /> },
  { id: 'route-risk', name: 'Route Safety', icon: <Map size={20} /> },
  { id: 'fleet', name: 'Fleet Readiness', icon: <Truck size={20} /> },
  { id: 'delivery', name: 'Delivery Log', icon: <Activity size={20} /> },
  { id: 'weather', name: 'Weather Impact', icon: <CloudRain size={20} /> },
  { id: 'recommendation', name: 'AI Decision Recs', icon: <CheckSquare size={20} /> },
  { id: 'audit', name: 'System Audit', icon: <FileText size={20} /> }
];

const exportCSV = (data, filename) => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
  const csv = [
    headers.join(','), 
    ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); 
  a.href = url; 
  a.download = filename + '.csv'; 
  a.click();
};

const ReportsPage = () => {
  const [activeReport, setActiveReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateReport = async (typeId) => {
    setLoading(true);
    setError('');
    setActiveReport(reportTypes.find(r => r.id === typeId));
    try {
      const res = await api.reports.generate(typeId);
      setReportData(res);
    } catch (err) {
      console.error('Report error:', err);
      setError('Failed to generate report.');
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="text-teal-700" size={22} />
            Executive Logistics Reports &amp; Exports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Generate formal operational summaries, print dossiers &amp; export CSV data</p>
        </div>
      </div>

      {/* Report Selector Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {reportTypes.map(rt => {
          const isSelected = activeReport?.id === rt.id;
          return (
            <button
              key={rt.id}
              onClick={() => generateReport(rt.id)}
              className={`flex flex-col items-center justify-center p-3.5 border rounded-xl transition-all text-center shadow-xs ${
                isSelected 
                  ? 'bg-teal-50 border-teal-700 text-teal-800 font-bold shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-teal-500 font-medium'
              }`}
            >
              <div className={`mb-2 p-2 rounded-lg ${isSelected ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>
                {rt.icon}
              </div>
              <span className="text-xs leading-tight">{rt.name}</span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center items-center py-16 text-slate-500 bg-white border border-slate-200 rounded-xl shadow-sm">
          <RefreshCw size={22} className="animate-spin mr-2 text-teal-700" />
          <span className="text-xs font-semibold">Compiling logistics report dossier...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {reportData && !loading && (
        <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden" id="printable-report">
          <div className="p-5 border-b border-slate-200 bg-slate-50/75 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wider">
                Official Report
              </span>
              <h2 className="text-base font-extrabold text-slate-900 mt-1">{reportData.title || activeReport.name}</h2>
              <p className="text-xs text-slate-400 font-mono">Dossier Timestamp: {new Date(reportData.generated_at || Date.now()).toLocaleString()}</p>
            </div>
            
            <div className="flex items-center gap-2 print:hidden">
              <button 
                onClick={handlePrint} 
                className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
                title="Print Report"
              >
                <Printer size={16} />
              </button>
              <button 
                onClick={() => exportCSV(reportData.data, `${activeReport.id}_report`)} 
                className="flex items-center px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Download size={14} className="mr-1.5" /> Export CSV
              </button>
            </div>
          </div>

          {reportData.summary && (
            <div className="p-4 border-b border-slate-200 bg-slate-50/40 grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(reportData.summary).map(([key, val]) => (
                <div key={key} className="p-3 border border-slate-200 rounded-lg bg-white shadow-2xs">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">{key.replace(/_/g, ' ')}</div>
                  <div className="text-base font-extrabold text-slate-900 font-mono">{String(val)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-auto p-4">
            {Array.isArray(reportData.data) && reportData.data.length > 0 && reportData.data[0] ? (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold tracking-wider">
                    {Object.keys(reportData.data[0] || {}).filter(k => typeof (reportData.data[0] || {})[k] !== 'object').map(h => (
                      <th key={h} className="px-4 py-2.5">{h.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      {Object.keys(row || {}).filter(k => typeof (row || {})[k] !== 'object').map(h => (
                        <td key={h} className="px-4 py-2.5 font-medium text-slate-700">{String((row || {})[h] ?? '-')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">No records available for this report type.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
