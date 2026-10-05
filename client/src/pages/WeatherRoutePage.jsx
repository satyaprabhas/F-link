import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Route as RouteIcon, MapPin, CloudRain, Wind, Eye, Thermometer, 
  AlertTriangle, Navigation, AlertCircle, ArrowRight, RefreshCw, 
  CheckCircle, Calendar, Send, Shield, Compass, Truck, Building2,
  Package, ChevronRight, Info, Check, X
} from 'lucide-react';
import MapRoutePlanning from '../components/MapRoutePlanning';
import { useAppContext } from '../context/AppContext';

// Forward posts available in the system ranked by priority with unique recommended corridors
const FORWARD_POSTS = [
  { id: 'LOC-FWC', name: 'Post Bravo (Mountain Sector)', shortName: 'Post Bravo', sector: 'Mountain Sector', priority: 'Critical', days: 2.0, food: 2400, water: 5000, personnel: 120, hazard: 'Mountain Pass Storm (Days 2–3)', recommendedRouteId: 'R-03', recommendedRouteLabel: 'Route C (Highland Safe Corridor)' },
  { id: 'LOC-FWE', name: 'Post Delta (Eastern Pass)', shortName: 'Post Delta', sector: 'Eastern Pass', priority: 'High Risk', days: 2.8, food: 1400, water: 2900, personnel: 110, hazard: 'Gale Force Gorge Winds (65 km/h)', recommendedRouteId: 'R-01', recommendedRouteLabel: 'Route A (Northern Ridge Expressway)' },
  { id: 'LOC-FWA', name: 'Post Alpha (North Ridge)', shortName: 'Post Alpha', sector: 'North Ridge', priority: 'Warning', days: 3.5, food: 1600, water: 3400, personnel: 95, hazard: 'Sub-Zero Alpine Blizzard (-18°C)', recommendedRouteId: 'R-02', recommendedRouteLabel: 'Route B (Heated Tunnel Highway)' },
  { id: 'LOC-FWD', name: 'Post Charlie (Valley Sector)', shortName: 'Post Charlie', sector: 'Valley Sector', priority: 'Normal', days: 7.1, food: 3200, water: 6500, personnel: 85, hazard: 'River Valley Flash Flood', recommendedRouteId: 'R-01', recommendedRouteLabel: 'Route A (Elevated Viaduct Span)' },
  { id: 'LOC-FWF', name: 'Post Echo (Desert Border)', shortName: 'Post Echo', sector: 'Desert Border', priority: 'Normal', days: 12.0, food: 4800, water: 9200, personnel: 75, hazard: 'Desert Sandstorm & Dust Drifts', recommendedRouteId: 'R-02', recommendedRouteLabel: 'Route B (North Shielded Highway)' }
];

export const getCorridorName = (postId, routeId) => {
  if (postId === 'LOC-FWC') {
    if (routeId === 'R-03') return 'Route C (Highland Safe Corridor - Safest Green)';
    if (routeId === 'R-02') return 'Route B (Desert Southern Bypass - Moderate Yellow)';
    return 'Route A (Mountain Pass Storm Corridor - Danger Red)';
  }
  if (postId === 'LOC-FWE') {
    if (routeId === 'R-01') return 'Route A (Northern Ridge Expressway - Safest Green)';
    if (routeId === 'R-02') return 'Route B (South Plateau Bypass - Moderate Yellow)';
    return 'Route C (Gale Gorge Direct Cut - Danger Red)';
  }
  if (postId === 'LOC-FWA') {
    if (routeId === 'R-02') return 'Route B (Heated Tunnel Highway - Safest Green)';
    if (routeId === 'R-03') return 'Route C (Western Foothills Track - Moderate Yellow)';
    return 'Route A (Alpine Blizzard Pass - Danger Red)';
  }
  if (postId === 'LOC-FWD') {
    if (routeId === 'R-01') return 'Route A (Elevated Viaduct Span - Safest Green)';
    if (routeId === 'R-03') return 'Route C (Southern Hill Crest - Moderate Yellow)';
    return 'Route B (River Basin Road - Danger Red)';
  }
  if (postId === 'LOC-FWF') {
    if (routeId === 'R-02') return 'Route B (North Shielded Highway - Safest Green)';
    if (routeId === 'R-03') return 'Route C (South Border Perimeter - Moderate Yellow)';
    return 'Route A (Desert Basin Dunes - Danger Red)';
  }
  return `${routeId} Tactical Corridor`;
};

export default function WeatherRoutePage() {
  const { refreshData, login } = useAppContext() || {};
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialPostId = searchParams.get('post') || 'LOC-FWC';
  const initialPost = FORWARD_POSTS.find(p => p.id === initialPostId) || FORWARD_POSTS[0];
  
  // Post selection state
  const [selectedPostId, setSelectedPostId] = useState(initialPostId);
  const [selectedDepotId, setSelectedDepotId] = useState(initialPostId === 'LOC-FWA' ? 'LOC-BRAVO' : 'LOC-ALPHA');
  const [selectedRouteId, setSelectedRouteId] = useState(initialPost.recommendedRouteId || 'R-03');
  
  // Combined Multi-Post Route state (Logistics Officer can combine nearby at-risk posts)
  const [isCombinedRoute, setIsCombinedRoute] = useState(false);
  const [secondaryPostId, setSecondaryPostId] = useState(initialPostId === 'LOC-FWE' ? 'LOC-FWC' : 'LOC-FWE');
  
  // Pre-pone departure date state
  const [preponedDate, setPreponedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [directiveDispatched, setDirectiveDispatched] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);
  const [dispatchedDetails, setDispatchedDetails] = useState(null);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    const postParam = searchParams.get('post');
    if (postParam && postParam !== selectedPostId) {
      handleSelectPost(postParam);
    }
  }, [searchParams]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const locData = await api.locations.getAll().catch(() => []);
      setLocations(locData);
    } catch (err) {
      console.warn('Locations load error', err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamically merge static post profiles with live database inventory and status
  const dynamicPosts = FORWARD_POSTS.map(base => {
    const liveLoc = locations.find(l => l.id === base.id);
    if (!liveLoc) return base;
    const inv = liveLoc.inventory_summary || liveLoc.inventory || {};
    const foodQty = inv.Food ? inv.Food.quantity : base.food;
    const waterQty = inv.Water ? inv.Water.quantity : base.water;
    const medQty = inv.Medical ? inv.Medical.quantity : 800;
    const fuelQty = inv.Fuel ? inv.Fuel.quantity : 3000;
    const daysArr = ['Food', 'Water', 'Medical', 'Fuel']
      .map(c => inv[c]?.days_remaining)
      .filter(d => d !== null && d !== undefined);
    const minDays = daysArr.length > 0 ? Math.min(...daysArr) : base.days;
    const priority = minDays <= 2 ? 'Critical' : minDays <= 5 ? 'High Risk' : 'Adequate';
    return {
      ...base,
      food: foodQty,
      water: waterQty,
      medical: medQty,
      fuel: fuelQty,
      days: Math.round(minDays * 10) / 10,
      priority,
      status: liveLoc.status || (minDays > 2 ? 'Operational' : 'Critical')
    };
  });

  // Switch active post and adjust suggested depot and route
  const handleSelectPost = (postId) => {
    setSelectedPostId(postId);
    const postObj = dynamicPosts.find(p => p.id === postId) || dynamicPosts[0];
    setSelectedRouteId(postObj.recommendedRouteId || 'R-01');
    setDirectiveDispatched(false);
    setStatusNotice(null);
    // Suggest nearby secondary post
    setSecondaryPostId(postId === 'LOC-FWE' ? 'LOC-FWC' : postId === 'LOC-FWD' ? 'LOC-FWE' : 'LOC-FWE');
    // Suggest depot based on post
    if (postId === 'LOC-FWA') {
      setSelectedDepotId('LOC-BRAVO');
    } else {
      setSelectedDepotId('LOC-ALPHA');
    }
  };

  // Submit resupply directive to Supply Officer (No redirect - passes and updates in supply portal)
  const handleApproveDirective = async () => {
    try {
      setIsSubmitting(true);
      setStatusNotice(null);
      const postObj = dynamicPosts.find(p => p.id === selectedPostId) || dynamicPosts[0];
      const secPostObj = isCombinedRoute ? (dynamicPosts.find(p => p.id === secondaryPostId) || null) : null;
      const depotName = selectedDepotId === 'LOC-ALPHA' ? 'Depot Alpha' : 'Depot Bravo';
      const corridorName = getCorridorName(selectedPostId, selectedRouteId);
      
      const res = await api.resupply.issueDirective({
        post_id: selectedPostId,
        depot_id: selectedDepotId,
        route_id: selectedRouteId,
        planned_date: preponedDate,
        is_combined: isCombinedRoute,
        secondary_post_id: isCombinedRoute ? secondaryPostId : null,
        notes: isCombinedRoute && secPostObj
          ? `Combined Directive: Stop 1 -> ${postObj.name}, Stop 2 -> ${secPostObj.name}. Dispatched from ${depotName} via ${corridorName}. Multi-post resupply mission.`
          : `Logistics Directive for ${postObj.name}: Dispatched from ${depotName} via ${corridorName}. Departure pre-poned to ${preponedDate} to evade ${postObj.hazard}.`
      });

      setDirectiveDispatched(true);
      setDispatchedDetails({
        post: postObj,
        secondaryPost: secPostObj,
        isCombined: isCombinedRoute,
        depotName,
        routeId: selectedRouteId,
        corridorName,
        date: preponedDate,
        deliveryId: res?.delivery_id
      });
      setStatusNotice({
        type: 'success',
        title: isCombinedRoute 
          ? 'Combined Multi-Post Directive Passed to Supply Portal!' 
          : 'Directive Passed ONLY to Supply Portal!',
        message: isCombinedRoute && secPostObj
          ? `Successfully approved combined multi-stop corridor linking ${postObj.name} (Stop 1) and ${secPostObj.name} (Stop 2). Both outposts evaluated at risk. Passed to Supply Portal to allocate rations for BOTH outposts.`
          : `Successfully passed resupply directive for ${postObj.name} exclusively to the Supply Portal. Origin: ${depotName} • Corridor: ${corridorName} • Departure Date: ${preponedDate}. This directive will only reach the Transportation Portal after the Supply Officer enters and allots rations.`
      });
      if (refreshData) refreshData();
    } catch (err) {
      setStatusNotice({
        type: 'error',
        title: 'Failed to update Supply Portal',
        message: err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPost = dynamicPosts.find(p => p.id === selectedPostId) || dynamicPosts[0];
  const secondaryPost = isCombinedRoute ? (dynamicPosts.find(p => p.id === secondaryPostId) || null) : null;

  return (
    <div className="space-y-6">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-teal-100 text-teal-900 text-[11px] font-extrabold rounded uppercase tracking-wide">
              Logistics Portal
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <RouteIcon className="text-teal-700" size={22} />
              Forward Post Corridor &amp; Weather Planning
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Select forward post to inspect specific corridors, weather hazards, and pre-pone departure to beat storm blockages
          </p>
        </div>

        <button 
          onClick={loadLocations} 
          className="p-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── STEP 1: FORWARD POST SELECTOR (REPLACES BURN INTENSITY SLIDER) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
          <div className="flex items-center gap-2">
            <MapPin size={17} className="text-teal-700" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Select Forward Post (Map &amp; Routes Dynamically Adjust):
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Posts sorted by supply criticality
          </span>
        </div>

        {/* 5 Post Selection Tabs / Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {dynamicPosts.map(post => {
            const isSelected = selectedPostId === post.id;
            return (
              <button
                key={post.id}
                onClick={() => handleSelectPost(post.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-teal-950 text-white border-teal-600 shadow-md ring-2 ring-teal-500/40'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {post.shortName}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                    post.priority === 'Critical' ? (isSelected ? 'bg-red-500 text-white' : 'bg-red-100 text-red-800') :
                    post.priority === 'High Risk' ? (isSelected ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-800') :
                    post.priority === 'Warning' ? (isSelected ? 'bg-amber-500 text-slate-900' : 'bg-amber-100 text-amber-800') :
                    (isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800')
                  }`}>
                    {post.days}d left
                  </span>
                </div>
                <div className={`text-[11px] font-medium truncate ${isSelected ? 'text-teal-300' : 'text-slate-500'}`}>
                  {post.sector}
                </div>
                <div className={`text-[10px] mt-2 font-mono ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  Food: {post.food.toLocaleString()}u • {post.personnel} Pax
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Post Tactical Context Card */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-950 to-teal-950 text-white border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
              currentPost.priority === 'Critical' ? 'bg-red-500/20 border border-red-500/50 text-red-400' :
              currentPost.priority === 'High Risk' ? 'bg-orange-500/20 border border-orange-500/50 text-orange-400' :
              'bg-teal-500/20 border border-teal-500/50 text-teal-300'
            }`}>
              <AlertTriangle size={22} className={currentPost.priority === 'Critical' ? 'animate-pulse' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                  currentPost.priority === 'Critical' ? 'bg-red-500/30 text-red-200 border border-red-500/40' :
                  currentPost.priority === 'High Risk' ? 'bg-orange-500/30 text-orange-200 border border-orange-500/40' :
                  'bg-teal-500/30 text-teal-200 border border-teal-500/40'
                }`}>
                  {currentPost.priority} Status
                </span>
                <span className="text-xs text-slate-400 font-mono">{currentPost.name} ({currentPost.personnel} Personnel)</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Weather Hazard: {currentPost.hazard}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Food remaining: <strong className="text-amber-300 font-mono">{currentPost.days} days</strong>. Pre-pone delivery and select the green bypass corridor to ensure convoys arrive safely.
              </p>
            </div>
          </div>

          {directiveDispatched && (
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold">
              <CheckCircle size={16} /> Directive Sent to Supply Officer
            </div>
          )}
        </div>

        {/* Origin Depot & Pre-pone Controls */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Origin Depot Selection */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Building2 size={14} className="text-teal-700" /> Origin Supplying Depot:
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => {
                  setSelectedDepotId('LOC-ALPHA');
                  setDirectiveDispatched(false);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedDepotId === 'LOC-ALPHA'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Depot Alpha {selectedPostId !== 'LOC-FWA' && '(Recommended)'}
              </button>
              <button
                onClick={() => {
                  setSelectedDepotId('LOC-BRAVO');
                  setDirectiveDispatched(false);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedDepotId === 'LOC-BRAVO'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Depot Bravo {selectedPostId === 'LOC-FWA' && '(Recommended)'}
              </button>
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              {selectedDepotId === 'LOC-ALPHA' 
                ? 'Depot Alpha: 45,000 units stocked • Clear weather at origin staging area'
                : 'Depot Bravo: 38,000 units stocked • Clear weather at origin staging area'}
            </div>
          </div>

          {/* Pre-pone Delivery Date Picker */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-teal-700" /> Pre-pone Departure Date (Evade Weather Blockage):
            </label>
            <input 
              type="date"
              value={preponedDate}
              onChange={(e) => {
                setPreponedDate(e.target.value);
                setDirectiveDispatched(false);
              }}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-mono font-bold focus:ring-1 focus:ring-teal-700"
            />
            <div className="text-[11px] text-amber-700 mt-2 font-medium">
              Departure on {preponedDate} arrives prior to severe weather intensification.
            </div>
          </div>

        </div>

        {/* ── OPTION: COMBINED MULTI-POST CORRIDOR (Nearby at-risk posts) ── */}
        <div className="mt-4 p-4 rounded-xl border border-teal-300 bg-teal-50/80">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-start gap-2.5">
              <input 
                type="checkbox"
                id="combinedRouteToggle"
                checked={isCombinedRoute}
                onChange={(e) => {
                  setIsCombinedRoute(e.target.checked);
                  setDirectiveDispatched(false);
                }}
                className="mt-1 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
              />
              <div>
                <label htmlFor="combinedRouteToggle" className="text-xs font-black text-slate-900 cursor-pointer flex items-center gap-1.5">
                  <RouteIcon size={15} className="text-teal-700" />
                  Combine with Nearby Forward Post (Multi-Stop Resupply Route)
                </label>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Select an adjacent forward outpost that is also at risk. Approving a single multi-stop corridor coordinates convoys and evades storm perimeters for both outposts.
                </p>
              </div>
            </div>

            {isCombinedRoute && (
              <div className="w-full sm:w-auto flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Stop 2 (Nearby Post):</span>
                <select
                  value={secondaryPostId}
                  onChange={(e) => {
                    setSecondaryPostId(e.target.value);
                    setDirectiveDispatched(false);
                  }}
                  className="bg-white border border-teal-500 rounded-lg p-1.5 text-xs text-slate-900 font-bold focus:ring-1 focus:ring-teal-700 shadow-2xs"
                >
                  {FORWARD_POSTS.filter(p => p.id !== selectedPostId).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.shortName} ({p.priority} • {p.days}d) - {p.sector}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {isCombinedRoute && secondaryPost && (
            <div className="mt-3 pt-3 border-t border-teal-200/80 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-teal-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Stop 1 (Primary)</span>
                <span className="font-extrabold text-slate-900">{currentPost.shortName}</span>
                <span className="text-[10px] text-red-600 font-bold ml-1.5">({currentPost.days}d left • {currentPost.priority})</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Stop 2 (Nearby Linked)</span>
                <span className="font-extrabold text-slate-900">{secondaryPost.shortName}</span>
                <span className="text-[10px] text-orange-600 font-bold ml-1.5">({secondaryPost.days}d left • {secondaryPost.priority})</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Mission Synergy</span>
                <span className="font-bold text-teal-800">Ridge Link (+48 km)</span>
                <div className="text-[10px] text-slate-500">Both posts at risk — combined directive issued</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── STEP 2: DYNAMIC TACTICAL ROUTE MAP CANVAS ── */}
      <div>
        <MapRoutePlanning 
          selectedRouteId={selectedRouteId}
          onSelectRoute={(id) => {
            setSelectedRouteId(id);
            setDirectiveDispatched(false);
          }}
          singleRouteMode={false}
          depotName={selectedDepotId === 'LOC-ALPHA' ? 'Depot Alpha' : 'Depot Bravo'}
          postName={currentPost.shortName}
          selectedPostId={selectedPostId}
          isCombinedRoute={isCombinedRoute}
          secondaryPostId={secondaryPostId}
          secondaryPostName={secondaryPost?.shortName}
          postDays={currentPost.days}
          postPriority={currentPost.priority}
        />
      </div>

      {/* ── INLINE STATUS NOTICE (NO REDIRECT) ── */}
      {statusNotice && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all shadow-sm ${
          statusNotice.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-900'
            : 'bg-emerald-50 border-emerald-300 text-emerald-950'
        }`}>
          <div className={`p-2 rounded-xl flex-shrink-0 ${
            statusNotice.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white shadow-xs'
          }`}>
            {statusNotice.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-slate-900">{statusNotice.title}</span>
              <button 
                type="button"
                onClick={() => setStatusNotice(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md hover:bg-slate-100 transition-colors"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
            <p className="text-xs mt-1 text-slate-700 leading-relaxed font-medium">
              {statusNotice.message}
            </p>
            {statusNotice.type !== 'error' && (
              <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex flex-wrap items-center gap-4 text-[11px] font-bold text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-600" />
                  Supply Officer portal updated with this directive
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 font-semibold">
                  You remain in Logistics Portal — no automatic redirect
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 3: ACTION BAR - TRANSMIT RESUPPLY DIRECTIVE TO SUPPLY OFFICER ── */}
      <div className={`p-4 sm:p-5 rounded-2xl shadow-sm border transition-all ${
        directiveDispatched 
          ? 'bg-emerald-50/80 border-emerald-300' 
          : 'bg-white border-teal-200'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shadow-xs transition-colors ${
              directiveDispatched 
                ? 'bg-emerald-600 text-white' 
                : 'bg-teal-100 text-teal-800'
            }`}>
              {directiveDispatched ? <CheckCircle size={22} /> : <Send size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-slate-900">
                  {isCombinedRoute && secondaryPost
                    ? `Transmit Combined Multi-Post Directive (${currentPost.shortName} + ${secondaryPost.shortName})`
                    : `Transmit Logistics Resupply Directive for ${currentPost.shortName}`}
                </span>
                {directiveDispatched && (
                  <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-extrabold uppercase rounded-full">
                    ✓ Updated in Supply Portal
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {isCombinedRoute && secondaryPost ? (
                  <span>
                    Multi-Stop Corridor: <strong className="text-slate-900">Stop 1: {currentPost.name}</strong> ➔ <strong className="text-slate-900">Stop 2: {secondaryPost.name}</strong> • Depot: <strong className="text-slate-900">{selectedDepotId === 'LOC-ALPHA' ? 'Depot Alpha' : 'Depot Bravo'}</strong> • Corridor: <strong className="text-teal-800">{getCorridorName(selectedPostId, selectedRouteId)}</strong> • Date: <strong className="font-mono text-slate-900">{preponedDate}</strong>
                  </span>
                ) : (
                  <span>
                    Target Post: <strong className="text-slate-900">{currentPost.name}</strong> • Depot: <strong className="text-slate-900">{selectedDepotId === 'LOC-ALPHA' ? 'Depot Alpha' : 'Depot Bravo'}</strong> • Corridor: <strong className="text-teal-800">{getCorridorName(selectedPostId, selectedRouteId)}</strong> • Date: <strong className="font-mono text-slate-900">{preponedDate}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleApproveDirective}
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                directiveDispatched
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-teal-700 hover:bg-teal-800 text-white'
              }`}
            >
              {isSubmitting ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : directiveDispatched ? (
                <CheckCircle size={15} />
              ) : (
                <Send size={15} />
              )}
              <span>
                {isSubmitting 
                  ? 'Transmitting Directive...' 
                  : directiveDispatched 
                  ? '✓ Directive Dispatched (Click to Re-send)' 
                  : isCombinedRoute && secondaryPost
                  ? 'Approve Combined Multi-Post Route ➔'
                  : 'Approve Route & Pass Directive to Supply Portal ➔'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Cross-Portal Instructions Note */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
        <Info size={16} className="text-teal-700 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Operational Flow Synchronization:</span> When you approve this directive, it is dispatched <strong className="text-teal-900">exclusively to the Supply Officer Portal</strong>. It will NOT appear in the Transportation Portal until the Supply Officer has reviewed the outpost requirements and entered the ration allotment.
        </div>
      </div>
    </div>
  );
}
