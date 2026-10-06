import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Activity, MapPin, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const DemandForecastPage = () => {
  const { t } = useAppContext() || { t: k => k };
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  
  const [forecastData, setForecastData] = useState(null);
  const [stockoutData, setStockoutData] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      const [fData, sData] = await Promise.all([
        api.forecast.getByLocation(locId),
        api.forecast.getStockout(locId)
      ]);
      setForecastData(fData);
      setStockoutData(sData);
    } catch (err) {
      setError('Failed to load forecast data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up' || trend === 'increasing') return <span className="inline-flex items-center text-amber-600 font-semibold gap-0.5"><TrendingUp size={15} /> {t('Inc')}</span>;
    if (trend === 'down' || trend === 'decreasing') return <span className="inline-flex items-center text-emerald-600 font-semibold gap-0.5"><TrendingDown size={15} /> {t('Dec')}</span>;
    return <span className="inline-flex items-center text-slate-400 font-medium gap-0.5"><Minus size={15} /> {t('Stable')}</span>;
  };

  const getConfidenceBadge = (confidence) => {
    let confNum = typeof confidence === 'number' ? confidence : (confidence === 'High' ? 0.85 : confidence === 'Medium' ? 0.65 : 0.4);
    let colorClass = 'bg-teal-50 text-teal-800 border-teal-200';
    if (confNum >= 0.8) colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    else if (confNum >= 0.6) colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
    else colorClass = 'bg-red-50 text-red-800 border-red-200';
    
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${colorClass}`}>
        {typeof confidence === 'string' ? t(confidence) : `${Math.round(confNum * 100)}%`}
      </span>
    );
  };

  const getChartData = () => {
    if (!forecastData || !forecastData.forecasts) return [];
    
    const aggregates = { 'Current': 0, 'Day 1': 0, 'Day 3': 0, 'Day 7': 0, 'Day 14': 0 };
    forecastData.forecasts.forEach(f => {
      aggregates['Current'] += f.current_daily || 0;
      aggregates['Day 1'] += f.forecast_1d || 0;
      aggregates['Day 3'] += f.forecast_3d || 0;
      aggregates['Day 7'] += f.forecast_7d || 0;
      aggregates['Day 14'] += f.forecast_14d || 0;
    });

    return [
      { name: t('Current'), demand: Math.round(aggregates['Current']) },
      { name: t('1-Day'), demand: Math.round(aggregates['Day 1']) },
      { name: t('3-Day'), demand: Math.round(aggregates['Day 3']) },
      { name: t('7-Day'), demand: Math.round(aggregates['Day 7']) },
      { name: t('14-Day'), demand: Math.round(aggregates['Day 14']) }
    ];
  };

  const selectedLocationObj = locations.find(l => l.id === selectedLocation);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="text-teal-700" size={22} />
            {t('Supply & Demand Forecasting')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('Multi-horizon consumption modeling (1d, 3d, 7d, 14d) & supply exhaustion predictions')}</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs">
          <MapPin size={16} className="text-teal-700" />
          <span className="text-xs font-semibold text-slate-500">{t('Location:')}</span>
          <select 
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-transparent border-none text-slate-900 font-semibold text-xs focus:ring-0 outline-none cursor-pointer"
          >
            <optgroup label={t('── Forward Posts (Outposts) ──')}>
              {locations.filter(l => l.type === 'forward_location').map(loc => (
                <option key={loc.id} value={loc.id} className="bg-white">{t(loc.name)} ({t(loc.region || 'Forward Sector')})</option>
              ))}
            </optgroup>
            <optgroup label={t('── Main Supply Depots ──')}>
              {locations.filter(l => l.type === 'depot').map(loc => (
                <option key={loc.id} value={loc.id} className="bg-white">{t(loc.name)} ({t('Strategic Reserve')})</option>
              ))}
            </optgroup>
            <optgroup label={t('── Forward Supply Staging Points ──')}>
              {locations.filter(l => l.type === 'supply_point').map(loc => (
                <option key={loc.id} value={loc.id} className="bg-white">{t(loc.name)} ({t('Transit Staging')})</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Selected Location Details Bar */}
      {selectedLocationObj && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-md font-bold uppercase text-[10px] ${
              selectedLocationObj.type === 'forward_location' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
              selectedLocationObj.type === 'depot' ? 'bg-sky-100 text-sky-900 border border-sky-300' :
              'bg-teal-100 text-teal-900 border border-teal-300'
            }`}>
              {t(selectedLocationObj.type === 'forward_location' ? 'Forward Post' : selectedLocationObj.type === 'depot' ? 'Supply Depot' : 'Supply Staging')}
            </span>
            <span className="font-extrabold text-slate-900 text-sm">{t(selectedLocationObj.name)}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 font-medium">{t('Sector:')} <strong>{t(selectedLocationObj.region || 'Forward Sector')}</strong></span>
            {selectedLocationObj.personnel && (
              <>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 font-medium">{t('Troop Count:')} <strong>{selectedLocationObj.personnel} {t('Pax')}</strong></span>
              </>
            )}
          </div>
          <span className="text-slate-500 font-mono text-[11px]">{t('Node ID:')} {selectedLocationObj.id}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-500 border border-slate-200 rounded-xl bg-white flex items-center justify-center gap-2 shadow-sm">
          <RefreshCw className="animate-spin text-teal-700" size={18} /> {t('Calculating predictive models...')}
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-700 border border-red-200 rounded-xl bg-red-50 text-sm font-medium">{t(error)}</div>
      ) : (
        <>
          {/* Chart Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{t('Aggregate Demand Trajectory')}</h2>
                <p className="text-xs text-slate-500">{t('Total forward consumption projected over the next 14 days')}</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-md">
                {t('14-Day Planning Horizon')}
              </span>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getChartData()} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: '#e2e8f0', 
                      color: '#0f172a',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                    itemStyle={{ color: '#0f766e' }}
                  />
                  <Area type="monotone" dataKey="demand" stroke="#0f766e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDemand)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Forecast Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-900">{t('Per-Item Multi-Period Forecast')}</h2>
              <span className="text-xs text-slate-500">{t('Includes weather adjustment & operational activity factor')}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">{t('Item')}</th>
                    <th className="py-3 px-3 text-right">{t('Daily Baseline')}</th>
                    <th className="py-3 px-3 text-right">{t('1-Day')}</th>
                    <th className="py-3 px-3 text-right">{t('3-Day')}</th>
                    <th className="py-3 px-3 text-right">{t('7-Day')}</th>
                    <th className="py-3 px-3 text-right">{t('14-Day')}</th>
                    <th className="py-3 px-3 text-center">{t('Trend')}</th>
                    <th className="py-3 px-4 text-center">{t('Confidence')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forecastData?.forecasts?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/25 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{t(item.item)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">{Number(item.current_daily || 0).toFixed(0)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-800">{Number(item.forecast_1d || 0).toFixed(0)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-800">{Number(item.forecast_3d || 0).toFixed(0)}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-teal-800">{Number(item.forecast_7d || 0).toFixed(0)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{Number(item.forecast_14d || 0).toFixed(0)}</td>
                      <td className="py-3 px-3 text-center text-xs">
                        {getTrendIcon(item.trend)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getConfidenceBadge(item.confidence)}
                      </td>
                    </tr>
                  ))}
                  {(!forecastData || !forecastData.forecasts || forecastData.forecasts.length === 0) && (
                    <tr>
                      <td colSpan="8" className="p-6 text-center text-slate-400">{t('No forecast data available for this location.')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stockout Predictions */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-red-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                <AlertTriangle className="text-red-600" size={17} />
                <span>{t('Stockout Early Warning Predictions')}</span>
              </div>
              <span className="text-xs bg-white border border-red-200 text-red-700 px-2 py-0.5 rounded font-bold">
                {t('Automated Risk Detection')}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">{t('Item')}</th>
                    <th className="py-3 px-3 text-right">{t('Days Until Shortage')}</th>
                    <th className="py-3 px-3">{t('Est. Date')}</th>
                    <th className="py-3 px-3 text-right">{t('Supply Gap')}</th>
                    <th className="py-3 px-3 text-center">{t('Risk Level')}</th>
                    <th className="py-3 px-3 text-right">{t('Incoming Supply')}</th>
                    <th className="py-3 px-3 text-center">{t('Arrive In Time?')}</th>
                    <th className="py-3 px-4">{t('Prediction Reason')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockoutData?.predictions?.map((pred, idx) => {
                    let daysColor = 'text-emerald-700 font-bold';
                    if (pred.days_until_stockout <= 3) daysColor = 'text-red-600 font-extrabold';
                    else if (pred.days_until_stockout <= 7) daysColor = 'text-amber-600 font-bold';

                    let riskBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                    if (pred.risk_level === 'Critical' || pred.risk_level === 'High') riskBadge = 'bg-red-50 text-red-700 border-red-200';
                    else if (pred.risk_level === 'Medium') riskBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                    else if (pred.risk_level === 'Low' || pred.risk_level === 'Normal') riskBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{t(pred.item)}</td>
                        <td className={`py-3 px-3 text-right font-mono text-sm ${daysColor}`}>
                          {pred.days_until_stockout} {t('days')}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 font-mono">{pred.stockout_date ? new Date(pred.stockout_date).toLocaleDateString() : '-'}</td>
                        <td className="py-3 px-3 text-right font-mono text-red-600 font-semibold">{pred.supply_gap > 0 ? `-${pred.supply_gap.toLocaleString()}` : '0'}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${riskBadge}`}>
                            {t(pred.risk_level)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-teal-800 font-medium">{pred.incoming_quantity > 0 ? `+${pred.incoming_quantity.toLocaleString()}` : '-'}</td>
                        <td className="py-3 px-3 text-center">
                          {pred.incoming_quantity > 0 ? (
                            pred.will_arrive_in_time 
                              ? <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-200">{t('Yes')}</span>
                              : <span className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded text-xs border border-red-200">{t('No (Delayed)')}</span>
                          ) : (
                            <span className="text-slate-400 text-xs">{t('No Deliveries')}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 max-w-xs leading-relaxed">{t(pred.reason)}</td>
                      </tr>
                    );
                  })}
                  {(!stockoutData || stockoutData.predictions.length === 0) && (
                    <tr>
                      <td colSpan="8" className="p-6 text-center text-emerald-700 font-medium">{t('No immediate supply shortages detected.')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DemandForecastPage;
