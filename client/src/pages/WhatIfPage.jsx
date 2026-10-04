import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Activity, Sliders, AlertTriangle, ArrowRight, Save, RotateCcw, MapPin, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function WhatIfPage() {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  
  const [params, setParams] = useState({
    inventory_change: 0,
    consumption_change: 0,
    weather_severity: 'current',
    route_available: true,
    vehicle_available: true,
    delivery_date_offset: 0
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.locations.getAll().then(data => {
      setLocations(data);
      if(data.length > 0) setSelectedLocation(data[0].id);
    });
  }, []);

  const handleParamChange = (field, value) => {
    setParams(prev => ({ ...prev, [field]: value }));
  };

  const handleRunSimulation = async () => {
    if (!selectedLocation) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.simulate.runWhatIf({ location_id: selectedLocation, ...params });
      setResults(data);
    } catch (err) {
      setError('Simulation failed to execute.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setParams({
      inventory_change: 0,
      consumption_change: 0,
      weather_severity: 'current',
      route_available: true,
      vehicle_available: true,
      delivery_date_offset: 0
    });
    setResults(null);
  };

  const getRiskBadge = (level) => {
    const colors = { 
      Normal: 'bg-emerald-50 text-emerald-800 border-emerald-200', 
      Low: 'bg-teal-50 text-teal-800 border-teal-200', 
      Moderate: 'bg-amber-50 text-amber-800 border-amber-200', 
      High: 'bg-orange-50 text-orange-800 border-orange-200', 
      Critical: 'bg-red-50 text-red-800 border-red-200',
      Severe: 'bg-red-50 text-red-800 border-red-200' 
    };
    return colors[level] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Simulation Banner */}
      <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center justify-between text-xs text-amber-900 shadow-2xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-bold uppercase tracking-wider">Predictive Simulation Sandbox</span>
          <span className="text-amber-800">— Changes simulated here do not alter live operational inventory or scheduled deliveries.</span>
        </div>
        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold uppercase text-[10px]">
          Sandbox
        </span>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="text-teal-700" size={22} />
            "What-If" Logistics Simulator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Test hypothetical consumption surges, severe weather events &amp; supply disruptions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* LEFT PANEL - PARAMS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm overflow-y-auto">
          <div className="flex justify-between items-center mb-5 pb-2.5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders size={16} className="text-teal-700" /> Scenario Parameters
            </h2>
            <span className="text-xs text-slate-400">Input Variables</span>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Target Location</label>
              <select 
                value={selectedLocation} 
                onChange={(e) => setSelectedLocation(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-teal-700"
              >
                {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.type})</option>)}
              </select>
            </div>

            <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200 space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Surge / Deplete Inventory (%)</span>
                <span className="text-teal-800 font-mono">{params.inventory_change > 0 ? '+' : ''}{params.inventory_change}%</span>
              </div>
              <input 
                type="range" min="-50" max="50" step="5" 
                value={params.inventory_change} 
                onChange={(e) => handleParamChange('inventory_change', parseInt(e.target.value))} 
                className="w-full accent-teal-700 cursor-pointer" 
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>-50% Stock</span>
                <span>Baseline</span>
                <span>+50% Stock</span>
              </div>
            </div>

            <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200 space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Daily Consumption Rate Spike (%)</span>
                <span className="text-amber-700 font-mono">{params.consumption_change > 0 ? '+' : ''}{params.consumption_change}%</span>
              </div>
              <input 
                type="range" min="-50" max="100" step="5" 
                value={params.consumption_change} 
                onChange={(e) => handleParamChange('consumption_change', parseInt(e.target.value))} 
                className="w-full accent-teal-700 cursor-pointer" 
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>-50% Demand</span>
                <span>Baseline</span>
                <span>+100% Demand</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Weather Severity Simulation</label>
              <select 
                value={params.weather_severity} 
                onChange={(e) => handleParamChange('weather_severity', e.target.value)} 
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-teal-700"
              >
                <option value="current">Current Forecast (Standard)</option>
                <option value="Normal">Normal Clear Skies</option>
                <option value="Low">Low Risk (Minor overcast)</option>
                <option value="Moderate">Moderate (Rain &amp; wind)</option>
                <option value="High">High Risk (Heavy precipitation)</option>
                <option value="Severe">Severe Storm (Disruptive road washout)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Route Open</span>
                <button 
                  type="button"
                  onClick={() => handleParamChange('route_available', !params.route_available)} 
                  className={`w-11 h-6 rounded-full transition-colors relative ${params.route_available ? 'bg-teal-700' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform shadow-xs ${params.route_available ? 'translate-x-5' : 'translate-x-0'}`}></span>
                </button>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Fleet Ready</span>
                <button 
                  type="button"
                  onClick={() => handleParamChange('vehicle_available', !params.vehicle_available)} 
                  className={`w-11 h-6 rounded-full transition-colors relative ${params.vehicle_available ? 'bg-teal-700' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform shadow-xs ${params.vehicle_available ? 'translate-x-5' : 'translate-x-0'}`}></span>
                </button>
              </div>
            </div>

            <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200 space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Delivery Date Reschedule (Days Offset)</span>
                <span className="text-teal-800 font-mono">{params.delivery_date_offset > 0 ? `+${params.delivery_date_offset}` : params.delivery_date_offset} days</span>
              </div>
              <input 
                type="range" min="-3" max="5" step="1" 
                value={params.delivery_date_offset} 
                onChange={(e) => handleParamChange('delivery_date_offset', parseInt(e.target.value))} 
                className="w-full accent-teal-700 cursor-pointer" 
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Advance 3d</span>
                <span>Scheduled</span>
                <span>Delay 5d</span>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={handleReset} 
                className="flex-1 py-2.5 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex justify-center items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button 
                type="button"
                onClick={handleRunSimulation} 
                disabled={loading} 
                className="flex-2 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs flex justify-center items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Activity size={14} /> {loading ? 'Running Scenario...' : 'Execute Simulation'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - RESULTS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm overflow-y-auto">
          <div className="flex justify-between items-center mb-5 pb-2.5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity size={16} className="text-teal-700" /> Scenario Impact Assessment
            </h2>
            <span className="text-xs text-slate-400">Outcome Evaluation</span>
          </div>
          
          {error && <div className="text-red-700 bg-red-50 p-3 rounded-lg text-xs border border-red-200 mb-4">{error}</div>}
          
          {!results && !loading && !error && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Sliders size={22} />
              </div>
              <p className="text-xs font-medium">Select a location and execute simulation to review impact comparison.</p>
            </div>
          )}

          {loading && (
            <div className="h-64 flex flex-col items-center justify-center text-teal-800 space-y-3">
              <RefreshCw className="animate-spin text-teal-700" size={24} />
              <p className="text-xs font-semibold">Recalculating multi-factor supply risks...</p>
            </div>
          )}

          {results && !loading && (
            <div className="space-y-5">
              {/* Comparison Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Current */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <h3 className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1.5">Current Plan Baseline</h3>
                  <div className="text-2xl font-extrabold text-slate-900">{results.current.overall_risk}%</div>
                  <div className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border my-2 ${getRiskBadge(results.current.risk_level)}`}>
                    {results.current.risk_level} Risk
                  </div>
                  <div className="space-y-1.5 text-xs pt-1">
                    {results.current.inventory?.slice(0, 4).map((inv, idx) => (
                      <div key={idx} className="flex justify-between border-t border-slate-200/60 pt-1 text-slate-600">
                        <span>{inv.item}:</span>
                        <span className={`font-mono ${inv.days_remaining <= 2 ? 'text-red-600 font-bold' : 'text-slate-800'}`}>
                          {inv.days_remaining}d
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulated */}
                <div className="bg-teal-50/40 border-2 border-teal-600 p-4 rounded-xl relative">
                  <div className="absolute top-0 right-0 bg-teal-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg uppercase">Simulated</div>
                  <h3 className="text-[11px] text-teal-800 uppercase font-bold tracking-wider mb-1.5">Simulated Outcome</h3>
                  <div className="text-2xl font-extrabold text-slate-900">{results.simulated.overall_risk}%</div>
                  <div className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border my-2 ${getRiskBadge(results.simulated.risk_level)}`}>
                    {results.simulated.risk_level} Risk
                  </div>
                  <div className="space-y-1.5 text-xs pt-1">
                    {results.simulated.inventory?.slice(0, 4).map((inv, idx) => (
                      <div key={idx} className="flex justify-between border-t border-teal-200/60 pt-1 text-slate-700">
                        <span>{inv.item}:</span>
                        <span className={`font-mono font-bold ${inv.days_remaining <= 2 ? 'text-red-600' : 'text-teal-900'}`}>
                          {inv.days_remaining}d
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Risk Change Bar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Risk Level Comparison</h3>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded border ${
                    results.comparison.risk_direction === 'worse' ? 'bg-red-50 text-red-700 border-red-200' : 
                    results.comparison.risk_direction === 'better' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {results.comparison.risk_direction.toUpperCase()} ({results.comparison.risk_change > 0 ? `+${results.comparison.risk_change}` : results.comparison.risk_change} pts)
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Baseline:</span>
                      <span className="font-mono font-bold">{results.current.overall_risk}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-slate-500 h-2 rounded-full" style={{width: `${Math.min(100, results.current.overall_risk)}%`}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Simulated:</span>
                      <span className="font-mono font-bold">{results.simulated.overall_risk}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${results.comparison.risk_direction === 'worse' ? 'bg-red-600' : 'bg-teal-700'}`} style={{width: `${Math.min(100, results.simulated.overall_risk)}%`}}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended Action */}
              <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl text-teal-900">
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-teal-700" />
                  Recommended Operational Action
                </h3>
                <p className="text-xs font-medium leading-relaxed">{results.comparison.recommended_action}</p>
              </div>

              <button 
                type="button"
                className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-xs font-semibold flex justify-center items-center gap-1.5 transition-colors" 
                onClick={() => alert('Applying scenarios modifies live operational database records. In this decision-support demonstration, scenario testing is isolated to the sandbox.')}
              >
                <Save size={14} /> Apply Scenario to Operational Plan (Restricted)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
