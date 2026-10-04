import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Cpu, Activity, AlertTriangle, Package, RefreshCw, Thermometer, Droplets, Database, Zap, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function IoTSimulationPage() {
  const { refreshData } = useAppContext() || { refreshData: () => {} };
  
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [inventory, setInventory] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    api.locations.getAll().then(data => {
      setLocations(data);
      if(data.length > 0) {
        setSelectedLocation(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadInventory();
      setResults(null);
    }
  }, [selectedLocation]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await api.inventory.getByLocation(selectedLocation);
      setInventory(data);
    } catch (err) {
      console.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async (type) => {
    if (!selectedLocation) return;
    try {
      setSimLoading(true);
      const data = await api.iot.simulate({ type, location_id: selectedLocation, data: {} });
      setResults(data);
      loadInventory();
      refreshData();
    } catch (err) {
      alert(`Simulation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSimLoading(false);
    }
  };

  const getHealthColor = (days) => {
    if (days > 7) return 'bg-emerald-600';
    if (days > 3) return 'bg-teal-600';
    if (days > 1) return 'bg-amber-500';
    return 'bg-red-600';
  };

  return (
    <div className="space-y-6">
      {/* SIMULATED IOT DATA BANNER */}
      <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-800">
            <Cpu size={22} />
          </div>
          <div>
            <h2 className="font-extrabold text-teal-900 text-sm tracking-tight">Simulated IoT Sensor Telemetry Hub</h2>
            <p className="text-teal-700 text-xs">Inject synthetic sensor events to test decision engine responsiveness.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-teal-800 bg-white px-3 py-1 rounded-full text-xs font-bold border border-teal-200 shadow-2xs">
          <Zap size={13} className="text-teal-700 fill-teal-700" /> SIMULATED TELEMETRY
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 text-xs font-bold uppercase tracking-wider">
          <Database size={16} className="text-teal-700" />
          <span>Select Monitored Base:</span>
        </div>
        <select 
          value={selectedLocation} 
          onChange={(e) => setSelectedLocation(e.target.value)} 
          className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 min-w-[240px] focus:outline-none focus:border-teal-700"
        >
          {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.type})</option>)}
        </select>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button 
          onClick={() => handleSimulate('consumption')} 
          disabled={simLoading} 
          className="bg-white border border-slate-200 hover:border-teal-600 hover:shadow-md p-5 rounded-xl flex flex-col items-center gap-2.5 transition-all text-center group disabled:opacity-50 shadow-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 group-hover:scale-110 transition-transform">
            <Activity size={24} />
          </div>
          <span className="font-bold text-xs text-slate-900">Simulate Consumption Spike</span>
          <span className="text-[11px] text-slate-400">Drains supply stock via recorded daily consumption rates</span>
        </button>
        
        <button 
          onClick={() => handleSimulate('delivery')} 
          disabled={simLoading} 
          className="bg-white border border-slate-200 hover:border-teal-600 hover:shadow-md p-5 rounded-xl flex flex-col items-center gap-2.5 transition-all text-center group disabled:opacity-50 shadow-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform">
            <Package size={24} />
          </div>
          <span className="font-bold text-xs text-slate-900">Simulate Delivery Arrival</span>
          <span className="text-[11px] text-slate-400">Ingests pending inbound convoy payload into stock</span>
        </button>

        <button 
          onClick={() => handleSimulate('sensor_update')} 
          disabled={simLoading} 
          className="bg-white border border-slate-200 hover:border-teal-600 hover:shadow-md p-5 rounded-xl flex flex-col items-center gap-2.5 transition-all text-center group disabled:opacity-50 shadow-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 group-hover:scale-110 transition-transform">
            <RefreshCw size={24} />
          </div>
          <span className="font-bold text-xs text-slate-900">Sensor Calibration Pulse</span>
          <span className="text-[11px] text-slate-400">Broadcasts latest digital gauge calibration packets</span>
        </button>

        <button 
          onClick={() => handleSimulate('low_stock')} 
          disabled={simLoading} 
          className="bg-white border border-slate-200 hover:border-rose-600 hover:shadow-md p-5 rounded-xl flex flex-col items-center gap-2.5 transition-all text-center group disabled:opacity-50 shadow-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 group-hover:scale-110 transition-transform">
            <AlertTriangle size={24} />
          </div>
          <span className="font-bold text-xs text-slate-900">Trigger Critical Low Stock</span>
          <span className="text-[11px] text-slate-400">Forces essential supplies below minimum safety buffers</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SENSOR DASHBOARD */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity size={16} className="text-teal-700" /> Forward Sensor Telemetry
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Live Ingestion</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Thermometer size={20} />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Depot Temp</div>
                <div className="text-base font-extrabold text-slate-800 font-mono">19.4°C</div>
              </div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                <Droplets size={20} />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Warehouse Hum.</div>
                <div className="text-base font-extrabold text-slate-800 font-mono">48% RH</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tank &amp; Pallet Sensor Readings</div>
            {loading ? (
              <div className="text-slate-400 text-xs py-4 text-center">Reading digital telemetry...</div>
            ) : (
              inventory.map(item => (
                <div key={item.id} className="bg-slate-50/75 p-3 rounded-lg border border-slate-200">
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-slate-900">{item.item}</span>
                    <span className="font-mono text-slate-700">{item.quantity} {item.unit}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1.5">
                    <div className={`h-1.5 rounded-full ${getHealthColor(item.days_remaining)}`} style={{ width: `${Math.min(100, Math.max(10, item.days_remaining * 10))}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Supply remaining: <span className="font-bold text-slate-700">{item.days_remaining} days</span></span>
                    <span>Safety buffer: {item.safety_stock}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SIMULATION RESULTS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database size={16} className="text-teal-700" /> Sensor Stream Event Log
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Output Stream</span>
          </div>
          
          {!results ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Activity size={24} className="opacity-30" />
              <p className="text-xs font-medium">Click one of the simulation triggers above to view real-time system reaction.</p>
            </div>
          ) : (
            <div className="space-y-4 mt-3">
              <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-500 border border-slate-200 font-mono">
                Synced: {new Date(results.timestamp).toLocaleTimeString()} | Feed: {results.data_source}
              </div>

              {results.events && results.events.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Raw Telemetry Events</h4>
                  {results.events.map((ev, i) => (
                    <div key={i} className="text-xs bg-teal-50/50 border border-teal-200/80 p-2 rounded-md flex items-start gap-1.5 text-teal-900">
                      <ChevronRight size={13} className="text-teal-700 shrink-0 mt-0.5" />
                      <span className="font-mono text-[11px]">{ev}</span>
                    </div>
                  ))}
                </div>
              )}

              {results.new_alerts && results.new_alerts.length > 0 && (
                <div className="space-y-1.5 mt-3">
                  <h4 className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Triggered Operational Alerts</h4>
                  {results.new_alerts.map((alert, i) => (
                    <div key={i} className="text-xs bg-rose-50 border border-rose-200 p-2 rounded-md flex items-start gap-1.5 text-rose-800">
                      <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                      <span className="font-medium">{alert.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {results.updated_inventory && (
                <div className="space-y-1.5 mt-3">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inventory Ledger Adjustments</h4>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="pb-1">Supply Item</th>
                        <th className="pb-1 text-right">Prior</th>
                        <th className="pb-1 text-right">Delta</th>
                        <th className="pb-1 text-right">Current Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.updated_inventory.map((ui, i) => (
                        <tr key={i}>
                          <td className="py-1.5 font-bold text-slate-800">{ui.item}</td>
                          <td className="py-1.5 text-right font-mono text-slate-500">{ui.previous}</td>
                          <td className={`py-1.5 text-right font-mono font-bold ${ui.consumed ? 'text-amber-600' : ui.delivered ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {ui.consumed ? `-${ui.consumed}` : ui.delivered ? `+${ui.delivered}` : (ui.adjustment ? `${ui.adjustment > 0 ? '+' : ''}${ui.adjustment}` : '0')}
                          </td>
                          <td className="py-1.5 text-right font-mono font-bold text-slate-900">{ui.new_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
