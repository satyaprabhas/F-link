import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldAlert, MapPin, AlertCircle, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SupplyRiskPage = () => {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  
  const [riskData, setRiskData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      fetchData(selectedLocation);
    }
  }, [selectedLocation]);

  const fetchLocations = async () => {
    try {
      const data = await api.locations.getAll();
      setLocations(data);
      if (data.length > 0) {
        setSelectedLocation(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch locations', err);
    }
  };

  const fetchData = async (locId) => {
    setLoading(true);
    setError('');
    try {
      const [rData, recData] = await Promise.all([
        api.risk.getByLocation(locId),
        api.recommendations.getAll({ location_id: locId })
      ]);
      setRiskData(rData);
      setRecommendations(recData || []);
    } catch (err) {
      setError('Failed to load risk data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColorClass = (level) => {
    if (level === 'Critical') return 'text-red-700 border-red-500 bg-red-50/60';
    if (level === 'High') return 'text-orange-700 border-orange-500 bg-orange-50/60';
    if (level === 'Medium') return 'text-amber-700 border-amber-500 bg-amber-50/60';
    return 'text-emerald-700 border-emerald-500 bg-emerald-50/60';
  };

  const getBarColorClass = (level) => {
    if (level === 'Critical') return 'bg-red-600';
    if (level === 'High') return 'bg-orange-500';
    if (level === 'Medium') return 'bg-amber-500';
    return 'bg-emerald-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-teal-700" size={22} />
            Composite Supply Chain Risk Analysis
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Multi-factor operational risk scoring &amp; decision support</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs">
          <MapPin size={16} className="text-teal-700" />
          <span className="text-xs font-semibold text-slate-500">Location:</span>
          <select 
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-transparent border-none text-slate-900 font-semibold text-xs focus:ring-0 outline-none cursor-pointer"
          >
            {locations.map(loc => (
              <option key={loc.id} value={loc.id} className="bg-white">{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-500 border border-slate-200 rounded-xl bg-white flex items-center justify-center gap-2 shadow-sm">
          <RefreshCw className="animate-spin text-teal-700" size={18} /> Evaluating risk dimensions...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-700 border border-red-200 rounded-xl bg-red-50 text-sm font-medium">{error}</div>
      ) : riskData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Risk Score */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Overall Composite Risk</h2>
              <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center mb-4 shadow-sm ${getRiskColorClass(riskData.risk_level)}`}>
                <span className="text-4xl font-extrabold tracking-tight">{riskData.overall_risk}</span>
                <span className="text-xs font-semibold text-slate-500 mt-0.5">/ 100</span>
              </div>
              <div className={`px-4 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getRiskColorClass(riskData.risk_level)}`}>
                {riskData.risk_level} RISK LEVEL
              </div>
              <p className="text-[11px] text-slate-400 mt-4 font-mono">
                Calculated: {new Date(riskData.calculated_at || Date.now()).toLocaleTimeString()}
              </p>
            </div>

            {/* Risk Factors */}
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">Factor Dimension Breakdown</h2>
                <span className="text-xs text-slate-400">Weighted Multi-Factor Contribution</span>
              </div>
              
              <div className="space-y-4">
                {riskData.factors?.map((factor, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        {factor.name}
                        <span className={`text-[10px] px-2 py-0.2 rounded-full border font-bold ${getRiskColorClass(factor.level)}`}>
                          {factor.level}
                        </span>
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700">{factor.score} / 100</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                      <div 
                        className={`h-full ${getBarColorClass(factor.level)} transition-all duration-500`} 
                        style={{ width: `${Math.max(2, factor.score)}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">{factor.details}</p>
                  </div>
                ))}
                {(!riskData.factors || riskData.factors.length === 0) && (
                  <p className="text-slate-400 text-sm">No risk factors evaluated.</p>
                )}
              </div>
            </div>
          </div>

          {/* Connected Recommendations */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="text-teal-700" size={18} />
                Actionable AI Decision Recommendations
              </h2>
              <button 
                onClick={() => navigate('/recommendations')} 
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1"
              >
                Manage in Recommendation Center <ArrowRight size={13} />
              </button>
            </div>
            
            <div className="space-y-3">
              {recommendations.length > 0 ? (
                recommendations.map(rec => (
                  <div key={rec.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl flex items-start gap-3 hover:border-teal-400 transition-colors shadow-2xs">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 mt-0.5">
                      <ArrowRight size={15} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-900">{rec.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                          rec.priority === 'Critical' || rec.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-teal-50 text-teal-800 border-teal-200'
                        }`}>
                          {rec.priority || 'Normal'} Priority
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{rec.explanation || rec.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  All parameters within operational tolerance. No urgent mitigation required.
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default SupplyRiskPage;
