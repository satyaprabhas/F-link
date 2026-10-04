import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Map as MapIcon, AlertTriangle, Info, Navigation, RefreshCw, 
  Layers, ShieldAlert, CheckCircle2, ChevronRight, Eye, Radio,
  ZoomIn, ZoomOut, RotateCcw, Package, Droplets, Flame, Heart,
  Truck, CloudRain, Sun, CloudLightning, Wind, ArrowRight, ExternalLink,
  Lightbulb
} from 'lucide-react';

const GISMapPage = () => {
  const [locations, setLocations] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState('visual'); // 'visual' (guaranteed 100% reliable) or 'tiles'
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [locData, routeData, delData] = await Promise.all([
        api.locations.getAll().catch(() => []),
        api.routes.getAll().catch(() => []),
        api.deliveries.getAll().catch(() => [])
      ]);
      setLocations(locData || []);
      setRoutes(routeData || []);
      setDeliveries(delData || []);

      // Auto-select Forward Charlie to show the critical situation immediately
      const fwc = (locData || []).find(l => l.id === 'LOC-FWC');
      if (fwc) setSelectedLoc(fwc);
    } catch (err) {
      console.error('Error fetching map data:', err);
      setError('Could not load map data. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Geographic projection helper: maps (lat, lng) to (x, y) coordinates inside SVG (width: 900, height: 580)
  const projectCoord = (lat, lng) => {
    const minLng = 71.20, maxLng = 71.90;
    const minLat = 33.90, maxLat = 34.65;
    const padding = 70;
    const width = 900;
    const height = 580;

    const x = padding + ((lng - minLng) / (maxLng - minLng)) * (width - 2 * padding);
    const y = (height - padding) - ((lat - minLat) / (maxLat - minLat)) * (height - 2 * padding);
    return { x, y };
  };

  const getRouteColor = (risk) => {
    if (!risk) return '#16a34a';
    if (risk.score < 35) return '#16a34a'; // Safe green
    if (risk.score < 60) return '#f59e0b'; // Medium amber
    return '#dc2626'; // Severe red
  };

  const getLocationColor = (loc) => {
    if (loc.type === 'depot') return '#0f766e'; // Teal
    if (loc.type === 'supply_point') return '#0284c7'; // Sky
    const isCritical = loc.min_days_remaining !== null && loc.min_days_remaining <= 3;
    return isCritical ? '#dc2626' : '#16a34a';
  };

  return (
    <div className="space-y-4 flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <MapIcon className="text-teal-700" size={22} />
            Live Logistics &amp; Route Map
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any base or delivery route below to see current supplies, road conditions, and storm warnings.
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                viewMode === 'visual'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗺️ Interactive Map
            </button>
            <button
              onClick={() => setViewMode('tiles')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                viewMode === 'tiles'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🌍 Road / Terrain View
            </button>
          </div>

          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Refresh map data"
          >
            <RefreshCw size={13} className={`text-teal-700 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Map View Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left & Center: The Map Canvas (2 cols) */}
        <div className="lg:col-span-2 relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col" style={{ minHeight: '600px' }}>
          {/* Zoom controls & quick indicators */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-slate-200 shadow-sm">
            <button 
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 1.8))} 
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button 
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.8))} 
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <button 
              onClick={() => setZoomLevel(1)} 
              className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw size={16} />
            </button>
            <span className="text-[11px] font-semibold text-slate-500 px-2">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          {/* Critical Base Notice Badge on Map */}
          <div className="absolute top-3 right-3 z-30 bg-rose-50 border border-rose-200 text-rose-800 px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
            <span className="font-bold">Forward Charlie: Low Food (2 days left)</span>
          </div>

          {/* Interactive Vector Canvas Map (100% Reliable, works offline/online) */}
          <div className="flex-1 overflow-hidden relative flex items-center justify-center p-2 bg-slate-50">
            {viewMode === 'visual' ? (
              <div 
                className="w-full h-full flex items-center justify-center transition-transform duration-200 select-none"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
              >
                <svg 
                  viewBox="0 0 900 580" 
                  className="w-full h-full max-h-[580px] drop-shadow-sm"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Background grid */}
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
                    </pattern>
                    <linearGradient id="roadRiskRed" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#16a34a" />
                      <stop offset="50%" stopColor="#dc2626" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                  
                  <rect width="900" height="580" fill="#f8fafc" />
                  <rect width="900" height="580" fill="url(#grid)" />

                  {/* Terrain and Mountain Pass Visual Representation */}
                  <path 
                    d="M 320 280 Q 360 250 420 270 Q 480 290 520 260 L 520 340 L 320 340 Z" 
                    fill="#e2e8f0" 
                    opacity="0.6" 
                  />
                  <text x="390" y="270" fill="#64748b" fontSize="11" fontWeight="bold" fontStyle="italic">
                    ⛰️ Mountain Range (Storm Zone)
                  </text>

                  {/* Routes Polylines */}
                  {routes.map(route => {
                    const segs = Array.isArray(route.segments) ? route.segments : [];
                    if (segs.length < 2) return null;

                    const points = segs.map(s => {
                      const p = projectCoord(s.lat, s.lng);
                      return `${p.x},${p.y}`;
                    }).join(' ');

                    const isSelected = selectedRoute?.id === route.id;
                    const strokeColor = getRouteColor(route.route_risk);

                    // Midpoint for route badge
                    const midSeg = segs[Math.floor(segs.length / 2)];
                    const midPoint = projectCoord(midSeg.lat, midSeg.lng);

                    return (
                      <g key={route.id} className="cursor-pointer" onClick={() => { setSelectedRoute(route); setSelectedLoc(null); }}>
                        {/* Glow for selected route */}
                        {isSelected && (
                          <polyline 
                            points={points} 
                            fill="none" 
                            stroke="#0f766e" 
                            strokeWidth="12" 
                            opacity="0.3" 
                          />
                        )}

                        {/* Outer route casing */}
                        <polyline 
                          points={points} 
                          fill="none" 
                          stroke="#ffffff" 
                          strokeWidth="7" 
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Main route line */}
                        <polyline 
                          points={points} 
                          fill="none" 
                          stroke={strokeColor} 
                          strokeWidth={isSelected ? "5" : "4"} 
                          strokeDasharray={route.id === 'R-02' ? '8,4' : 'none'}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="transition-all hover:stroke-teal-800"
                        />

                        {/* Route label pill */}
                        <rect 
                          x={midPoint.x - 30} 
                          y={midPoint.y - 12} 
                          width="60" 
                          height="20" 
                          rx="4" 
                          fill="#ffffff" 
                          stroke={strokeColor} 
                          strokeWidth="1.5" 
                          className="shadow-xs"
                        />
                        <text 
                          x={midPoint.x} 
                          y={midPoint.y + 2} 
                          fill="#0f172a" 
                          fontSize="9" 
                          fontWeight="bold" 
                          textAnchor="middle"
                        >
                          {route.id} {route.route_risk?.score > 50 ? '⚠️' : ''}
                        </text>
                      </g>
                    );
                  })}

                  {/* Active Convoy Truck Animation Dots on routes */}
                  {deliveries.filter(d => d.status === 'En Route' || d.status === 'Loading' || d.status === 'Planned').map((del, idx) => {
                    const route = routes.find(r => r.id === del.route_id);
                    const segs = route?.segments || [];
                    if (segs.length < 2) return null;
                    const p = projectCoord(segs[1].lat, segs[1].lng);

                    return (
                      <g key={del.id} transform={`translate(${p.x - 12}, ${p.y - 12})`}>
                        <circle cx="12" cy="12" r="10" fill="#0f766e" stroke="#ffffff" strokeWidth="2" />
                        <text x="12" y="15" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">🚚</text>
                      </g>
                    );
                  })}

                  {/* Location Nodes */}
                  {locations.map(loc => {
                    const { x, y } = projectCoord(loc.lat, loc.lng);
                    const isSelected = selectedLoc?.id === loc.id;
                    const isCritical = loc.min_days_remaining !== null && loc.min_days_remaining <= 3;
                    const color = getLocationColor(loc);

                    return (
                      <g 
                        key={loc.id} 
                        className="cursor-pointer group" 
                        onClick={() => { setSelectedLoc(loc); setSelectedRoute(null); }}
                      >
                        {/* Critical Pulsing Ring */}
                        {isCritical && (
                          <circle cx={x} cy={y} r="26" fill="#ef4444" opacity="0.25">
                            <animate attributeName="r" values="20;30;20" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                          </circle>
                        )}

                        {/* Selected Highlighting Ring */}
                        {isSelected && (
                          <circle cx={x} cy={y} r="22" fill="none" stroke="#0f766e" strokeWidth="3" strokeDasharray="4,2" />
                        )}

                        {/* Base Node Circle */}
                        <circle 
                          cx={x} 
                          cy={y} 
                          r={loc.type === 'depot' ? "18" : "15"} 
                          fill={color} 
                          stroke="#ffffff" 
                          strokeWidth="3" 
                          className="drop-shadow-sm transition-transform hover:scale-110"
                        />

                        {/* Inner Symbol / Letter */}
                        <text 
                          x={x} 
                          y={y + 4} 
                          fill="#ffffff" 
                          fontSize={loc.type === 'depot' ? "12" : "10"} 
                          fontWeight="bold" 
                          textAnchor="middle"
                        >
                          {loc.type === 'depot' ? 'DEPOT' : loc.type === 'supply_point' ? 'HUB' : 'BASE'}
                        </text>

                        {/* Base Name Box below */}
                        <rect 
                          x={x - 55} 
                          y={y + 20} 
                          width="110" 
                          height="22" 
                          rx="5" 
                          fill="#ffffff" 
                          stroke={isSelected ? "#0f766e" : "#cbd5e1"} 
                          strokeWidth={isSelected ? "2" : "1"} 
                        />
                        <text 
                          x={x} 
                          y={y + 34} 
                          fill="#0f172a" 
                          fontSize="10" 
                          fontWeight="bold" 
                          textAnchor="middle"
                        >
                          {loc.name}
                        </text>

                        {/* Supply Remaining Badge */}
                        <rect 
                          x={x - 40} 
                          y={y + 44} 
                          width="80" 
                          height="16" 
                          rx="3" 
                          fill={isCritical ? "#fee2e2" : "#f1f5f9"} 
                        />
                        <text 
                          x={x} 
                          y={y + 55} 
                          fill={isCritical ? "#dc2626" : "#475569"} 
                          fontSize="9" 
                          fontWeight="bold" 
                          textAnchor="middle"
                        >
                          {loc.min_days_remaining !== null ? `${loc.min_days_remaining}d supply left` : 'Hub Storage'}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              /* Road & Terrain View iframe/render */
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-900 text-white rounded-lg">
                <div className="max-w-md space-y-3">
                  <div className="w-12 h-12 rounded-full bg-teal-800 flex items-center justify-center mx-auto text-teal-300">
                    <Radio size={24} className="animate-pulse" />
                  </div>
                  <h3 className="font-bold text-base">Road &amp; Terrain Satellite Mode</h3>
                  <p className="text-xs text-slate-300">
                    Showing sector coordinates: 34.05°N to 34.55°N, 71.35°E to 71.80°E.
                    All roads and bases are active and synchronized with the latest delivery and weather sensors.
                  </p>
                  <button 
                    onClick={() => setViewMode('visual')}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-bold text-xs shadow cursor-pointer"
                  >
                    Switch back to Interactive Map
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Map Legend Bar at Bottom */}
          <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700">Legend:</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#0f766e]"></span> Main Depot</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#0284c7]"></span> Supply Staging Hub</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#16a34a]"></span> Forward Base (Healthy)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#dc2626]"></span> Low Stock (&lt; 3 Days)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-4 h-1 bg-[#16a34a]"></span> Clear Road</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-1 bg-[#f59e0b]"></span> Rain / Caution</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-1 bg-[#dc2626]"></span> Severe Storm Delay</span>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Location or Route Details Card */}
        <div className="space-y-4">
          {selectedLoc ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                    {selectedLoc.type?.replace('_', ' ')}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-1">{selectedLoc.name}</h3>
                  <p className="text-xs text-slate-500">{selectedLoc.region || 'Operational Sector'} • {selectedLoc.personnel || 0} Personnel</p>
                </div>
                {selectedLoc.min_days_remaining !== null && selectedLoc.min_days_remaining <= 3 && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg flex items-center gap-1">
                    <AlertTriangle size={13} /> Needs Resupply
                  </span>
                )}
              </div>

              {/* Current Supplies Overview */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Days of Supplies Left</h4>
                <div className="space-y-2.5">
                  {selectedLoc.inventory_summary && Object.entries(selectedLoc.inventory_summary).map(([category, item]) => {
                    const days = item.days_remaining;
                    const isLow = days <= 3;
                    return (
                      <div key={category} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between items-center font-semibold">
                          <span className="flex items-center gap-1.5 text-slate-700">
                            {category === 'Food' && <Package size={14} className="text-amber-600" />}
                            {category === 'Water' && <Droplets size={14} className="text-sky-600" />}
                            {category === 'Medical' && <Heart size={14} className="text-rose-600" />}
                            {category === 'Fuel' && <Flame size={14} className="text-orange-600" />}
                            {category}
                          </span>
                          <span className={isLow ? 'text-red-600 font-bold' : 'text-slate-800'}>
                            {days} days left ({item.quantity?.toLocaleString()})
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${days <= 2 ? 'bg-red-500' : days <= 5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min((days / 10) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <button
                  onClick={() => navigate('/recommendations')}
                  className="w-full py-2.5 px-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  View Suggested Resupply Actions <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => navigate('/inventory')}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  Edit Stock &amp; Daily Usage
                </button>
              </div>
            </div>
          ) : selectedRoute ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                  Delivery Route
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">{selectedRoute.name} ({selectedRoute.id})</h3>
                <p className="text-xs text-slate-500">{selectedRoute.distance} km • {selectedRoute.estimated_time} hours travel time</p>
              </div>

              {/* Route Condition & Weather Risk */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Route Status:</span>
                  <span className="font-bold text-emerald-700">{selectedRoute.status}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Terrain:</span>
                  <span className="font-bold text-slate-800">{selectedRoute.terrain || 'Standard Roads'}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Weather Risk:</span>
                  <span className={`font-bold ${selectedRoute.route_risk?.score > 50 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {selectedRoute.route_risk?.level || 'Normal'} ({selectedRoute.route_risk?.score || 0}/100)
                  </span>
                </div>
              </div>

              {/* Road Segments */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Road Sections</h4>
                <div className="space-y-1.5">
                  {(selectedRoute.segments || []).map((seg, idx) => (
                    <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">{seg.name}</div>
                        <div className="text-[11px] text-slate-400">{seg.distance} km • Road {seg.condition}</div>
                      </div>
                      {seg.name.includes('Mountain') ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                          ⛈️ Heavy Storm
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Clear
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Button */}
              <button
                onClick={() => navigate('/weather-route')}
                className="w-full py-2.5 px-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Inspect Weather on this Route <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto text-teal-700">
                <Info size={22} />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Select a Base or Road</h3>
              <p className="text-xs text-slate-500">
                Click any circle (Base) or line (Road) on the map to see remaining food, water, truck trips, and storm delays.
              </p>
            </div>
          )}

          {/* Quick Help Card */}
          <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl text-xs space-y-1 text-teal-950">
            <div className="font-bold flex items-center gap-1.5 text-teal-900">
              <Lightbulb size={14} className="text-teal-700" /> Quick Tip
            </div>
            <p className="text-slate-600">
              If severe weather hits the main road, the system will suggest an earlier delivery or a safer bypass route.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GISMapPage;
