import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Lightbulb, AlertTriangle, MapPin, CheckCircle, XCircle, Edit, List, Info, ChevronRight, X, Sparkles, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function RecommendationsPage() {
  const { user, refreshData } = useAppContext() || {};
  
  const [locations, setLocations] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  
  const [selectedLocation, setSelectedLocation] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(''); // 'reject' or 'modify'
  const [activeRec, setActiveRec] = useState(null);
  const [modData, setModData] = useState({ notes: '', planned_date: '', route_id: '', vehicle_id: '' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [selectedLocation, statusFilter]);

  const fetchInitialData = async () => {
    try {
      const [lData, rData, vData] = await Promise.all([
        api.locations.getAll(),
        api.routes.getAll(),
        api.vehicles.getAll()
      ]);
      setLocations(lData);
      setRoutes(rData);
      setVehicles(vData);
      if (lData.length > 0) setSelectedLocation(lData[0].id);
    } catch (err) {
      setError('Failed to load filter data.');
    }
  };

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await api.recommendations.getAll({ location_id: selectedLocation });
      setRecommendations(data.filter(r => statusFilter === 'All' ? true : r.status === statusFilter));
    } catch (err) {
      setError('Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedLocation) return;
    try {
      setGenerating(true);
      await api.recommendations.generate(selectedLocation);
      await loadRecommendations();
      refreshData();
    } catch (err) {
      alert('Error generating recommendations');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (id) => {
    if (window.confirm('Approve this recommendation? This will update the operational delivery plan and log the decision in the Audit Log.')) {
      try {
        await api.recommendations.decide(id, { decision: 'Approved' });
        loadRecommendations();
        refreshData();
      } catch (err) {
        alert('Failed to approve');
      }
    }
  };

  const openReject = (rec) => {
    setActiveRec(rec);
    setModData({ notes: '', planned_date: '', route_id: '', vehicle_id: '' });
    setModalMode('reject');
    setModalOpen(true);
  };

  const openModify = (rec) => {
    setActiveRec(rec);
    setModData({ notes: '', planned_date: '', route_id: '', vehicle_id: '' });
    setModalMode('modify');
    setModalOpen(true);
  };

  const handleSubmitDecision = async () => {
    try {
      if (modalMode === 'reject') {
        await api.recommendations.decide(activeRec.id, { decision: 'Rejected', notes: modData.notes });
      } else if (modalMode === 'modify') {
        const modifications = {};
        if (modData.planned_date) modifications.planned_date = modData.planned_date;
        if (modData.route_id) modifications.route_id = modData.route_id;
        if (modData.vehicle_id) modifications.vehicle_id = modData.vehicle_id;
        await api.recommendations.decide(activeRec.id, { decision: 'Modified', notes: modData.notes, modifications });
      }
      setModalOpen(false);
      loadRecommendations();
      refreshData();
    } catch (err) {
      alert('Failed to save decision');
    }
  };

  const getTypeBadge = (type) => {
    const map = { 
      ADVANCE_DELIVERY: 'bg-amber-50 text-amber-800 border-amber-200', 
      ALTERNATE_ROUTE: 'bg-teal-50 text-teal-800 border-teal-200', 
      INCREASE_QUANTITY: 'bg-blue-50 text-blue-800 border-blue-200', 
      CHANGE_VEHICLE: 'bg-purple-50 text-purple-800 border-purple-200', 
      SPLIT_DELIVERY: 'bg-indigo-50 text-indigo-800 border-indigo-200', 
      MAINTAIN_PLAN: 'bg-emerald-50 text-emerald-800 border-emerald-200' 
    };
    return map[type] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Lightbulb className="text-teal-700" size={22} />
            Suggested Resupply Actions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Smart resupply advice. You have the final decision to Approve, Change, or Reject.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:border-teal-700 cursor-pointer"
          >
            <option value="All">All Actions</option>
            <option value="Pending">Needs Review</option>
            <option value="Approved">Approved</option>
            <option value="Modified">Changed</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select 
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(e.target.value)} 
            className="bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:border-teal-700 cursor-pointer"
          >
            <option value="">Select Base...</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <button 
            onClick={handleGenerate} 
            disabled={!selectedLocation || generating} 
            className="bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Sparkles size={14} /> {generating ? 'Checking...' : 'Check for New Advice'}
          </button>
        </div>
      </div>

      {error && <div className="text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 text-xs font-medium">{error}</div>}
      
      {loading ? (
        <div className="text-center py-16 text-slate-500 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 shadow-sm">
          <RefreshCw className="animate-spin text-teal-700" size={18} /> Analyzing decision engine outputs...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-16 text-slate-400 border border-dashed border-slate-300 rounded-xl bg-white text-xs font-medium">
          No {statusFilter.toLowerCase()} recommendations found for this location.
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map(rec => {
            let factorsList = [];
            try {
              factorsList = typeof rec.factors === 'string' ? JSON.parse(rec.factors) : rec.factors;
            } catch {
              factorsList = Array.isArray(rec.factors) ? rec.factors : [];
            }

            return (
              <div key={rec.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getTypeBadge(rec.type)}`}>
                        {rec.type.replace('_', ' ')}
                      </span>
                      {rec.priority === 'High' && (
                        <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-xs font-bold">
                          High Priority
                        </span>
                      )}
                      <span className="text-slate-600 text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        Status: {rec.status}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{rec.title}</h3>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 font-mono">
                    Generated: {new Date(rec.created_at).toLocaleString()}
                  </div>
                </div>
                
                <p className="text-xs text-slate-700 leading-relaxed font-medium">{rec.explanation}</p>
                
                {/* Contributing Factors */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                  <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Info size={14} className="text-teal-700" />
                    Why is this resupply action recommended?
                  </h4>
                  <ul className="space-y-1">
                    {factorsList.map((f, i) => (
                      <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                        <ChevronRight size={14} className="text-teal-700 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Human-in-the-Loop Decision Buttons (Restricted to Logistics Officer) */}
                {rec.status === 'Pending' && (
                  user?.role === 'Logistics Officer' ? (
                    <div className="flex flex-wrap gap-2.5 pt-3 border-t border-slate-100">
                      <button 
                        onClick={() => handleApprove(rec.id)} 
                        className="flex-1 min-w-[120px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-xs flex justify-center items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle size={15} /> Approve Plan
                      </button>
                      <button 
                        onClick={() => openModify(rec)} 
                        className="flex-1 min-w-[120px] bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-xs flex justify-center items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit size={15} /> Change Details
                      </button>
                      <button 
                        onClick={() => openReject(rec)} 
                        className="flex-1 min-w-[120px] bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold py-2 px-3 rounded-lg text-xs shadow-2xs flex justify-center items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <XCircle size={15} /> Reject Plan
                      </button>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-amber-600" />
                        Final Decision: Requires Logistics Officer Approval
                      </span>
                      <span className="text-slate-500 italic text-[11px]">View only mode for your role</span>
                    </div>
                  )
                )}

                {rec.status !== 'Pending' && rec.decision_notes && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic">
                    <span className="font-semibold text-slate-800 not-italic">Officer Decision Notes:</span> {rec.decision_notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL for Modify / Reject */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {modalMode === 'modify' ? 'Modify Delivery Plan & Recalculate' : 'Reject Recommendation'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 font-medium">Target Recommendation: <span className="font-bold text-slate-900">{activeRec?.title}</span></p>

              {modalMode === 'modify' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Override Delivery Planned Date</label>
                    <input 
                      type="date" 
                      value={modData.planned_date} 
                      onChange={e => setModData({...modData, planned_date: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reroute via Corridor</label>
                    <select 
                      value={modData.route_id} 
                      onChange={e => setModData({...modData, route_id: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900"
                    >
                      <option value="">(Maintain Assigned Route)</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.distance} km - {r.weather_risk?.level || 'Normal'} Risk)</option>
                      ))}
                    </select>
                  </div>
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-800">
                    <span className="font-bold">Automated Fleet Allocation:</span> Supplies quantity is allotted by the Supply Officer, and transport vehicle is automatically assigned by system based on payload weight.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Officer Operational Notes {modalMode === 'reject' && '(Mandatory)'}
                </label>
                <textarea 
                  required={modalMode === 'reject'} 
                  value={modData.notes} 
                  onChange={e => setModData({...modData, notes: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 h-24 focus:outline-none focus:border-teal-700" 
                  placeholder="State operational rationale for this decision..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 text-xs font-semibold">
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitDecision} 
                  className={`px-4 py-2 rounded-lg font-bold text-white text-xs shadow-xs ${
                    modalMode === 'modify' ? 'bg-teal-700 hover:bg-teal-800' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirm {modalMode === 'modify' ? 'Modifications' : 'Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
