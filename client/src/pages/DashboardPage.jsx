import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, AlertTriangle, Shield, Activity, Truck, Car, CloudRain, 
  TrendingDown, RefreshCw, Database, Lightbulb, GitBranch, 
  ArrowRight, CheckCircle2, ChevronRight, Package, Droplets, Flame, 
  Clock, ShieldAlert, Users, Settings, List, FileText, CheckCircle,
  Calendar, Edit3, Send, Check, AlertCircle, Info, Navigation
} from 'lucide-react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import MapRoutePlanning from '../components/MapRoutePlanning';
import EditLocationModal from '../components/EditLocationModal';

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [dataQuality, setDataQuality] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, refreshData } = useAppContext();
  const navigate = useNavigate();

  const roleName = user?.role || 'Logistics Officer';

  // ── Supply Officer allotment states ──
  const [selectedSupplyPostId, setSelectedSupplyPostId] = useState('LOC-FWC');
  const [foodRations, setFoodRations] = useState(3600);
  const [waterRations, setWaterRations] = useState(7200);
  const [medicalRations, setMedicalRations] = useState(400);
  const [fuelRations, setFuelRations] = useState(2000);
  const [isAllotting, setIsAllotting] = useState(false);
  const [allotmentSuccess, setAllotmentSuccess] = useState(false);

  // ── Transport Coordinator execution states ──
  const [selectedTransportDelId, setSelectedTransportDelId] = useState(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isCompletingDelivery, setIsCompletingDelivery] = useState(false);
  const [deliveryCompletedSuccess, setDeliveryCompletedSuccess] = useState(false);

  // ── Base / Location Edit Modal states ──
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashData, vData, rData] = await Promise.all([
        api.dashboard.get(),
        api.vehicles.getAll().catch(() => []),
        api.routes.getAll().catch(() => [])
      ]);
      setData(dashData);
      setLocations(dashData.locations || []);
      setAlerts(dashData.recentAlerts || []);
      setDeliveries(dashData.activeDeliveries_list || []);
      setVehicles(vData || []);
      setRoutes(rData || []);

      if (roleName === 'Administrator') {
        const [aLogs, dQuality] = await Promise.all([
          api.audit.getAll({ limit: 5 }).catch(() => []),
          api.dataQuality.check().catch(() => [])
        ]);
        setAuditLogs(aLogs || []);
        setDataQuality(dQuality || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchDashboard(); 
  }, [roleName]);

  // When deliveries update, auto-select post with pending directive in Supply Portal
  useEffect(() => {
    if (deliveries && deliveries.length > 0) {
      const pendingDel = deliveries.find(d => d.status === 'Pending Supply Allotment');
      if (pendingDel?.destination_id) {
        setSelectedSupplyPostId(pendingDel.destination_id);
      }
    }
  }, [deliveries]);

  const handleLoadDemo = async () => {
    try {
      await api.demo.load();
      await fetchDashboard();
      refreshData();
      setAllotmentSuccess(false);
      setDeliveryCompletedSuccess(false);
    } catch (err) { setError(err.message); }
  };

  const handleReset = async () => {
    if (!confirm('Reset all data to demo defaults?')) return;
    try {
      await api.demo.reset();
      await fetchDashboard();
      refreshData();
      setAllotmentSuccess(false);
      setDeliveryCompletedSuccess(false);
    } catch (err) { setError(err.message); }
  };

  // Find active delivery mission
  const activeDelivery = deliveries.find(d => d.status !== 'Delivered') || deliveries[0];

  // Specific delivery for Supply Officer based on currently selected post:
  const activeDeliveryForSupply = deliveries.find(d => d.destination_id === selectedSupplyPostId && d.status === 'Pending Supply Allotment')
    || deliveries.find(d => d.destination_id === selectedSupplyPostId && d.status !== 'Delivered')
    || deliveries.find(d => d.destination_id === selectedSupplyPostId)
    || deliveries.find(d => d.status === 'Pending Supply Allotment')
    || activeDelivery;

  // ── Transport Coordinator Deliveries: ONLY directives where rations have been allotted by Supply Officer! ──
  const transportEligibleDeliveries = (deliveries || []).filter(d => 
    d.status === 'Ready for Dispatch' || d.status === 'En Route' || d.status === 'Delivered'
  );

  const activeTransportDelivery = (selectedTransportDelId && transportEligibleDeliveries.find(d => d.id === selectedTransportDelId))
    || transportEligibleDeliveries.find(d => d.status === 'Ready for Dispatch')
    || transportEligibleDeliveries.find(d => d.status === 'En Route')
    || (transportEligibleDeliveries.length > 0 ? transportEligibleDeliveries[0] : null);

  const postForTransportDelivery = locations.find(l => l.id === activeTransportDelivery?.destination_id) || locations.find(l => l.id === 'LOC-FWC');
  const postNameForTransportDelivery = postForTransportDelivery?.name || (activeTransportDelivery?.dest_name || 'Forward Post');

  const getDeliveryItems = (delivery) => {
    if (!delivery || !delivery.items) return null;
    if (typeof delivery.items === 'object') return delivery.items;
    try {
      return JSON.parse(delivery.items);
    } catch {
      return null;
    }
  };

  const transportDeliveryItems = getDeliveryItems(activeTransportDelivery);
  
  // Calculate transport payload weight from activeTransportDelivery.items
  const transportPayloadWeight = transportDeliveryItems ? Math.round(
    ((Number(transportDeliveryItems['Food Rations'] ?? transportDeliveryItems.food ?? transportDeliveryItems.Food ?? 0)) * 1) +
    ((Number(transportDeliveryItems['Potable Water'] ?? transportDeliveryItems.water ?? transportDeliveryItems.Water ?? 0)) * 1) +
    ((Number(transportDeliveryItems['Medical Supplies'] ?? transportDeliveryItems.medical ?? transportDeliveryItems.Medical ?? 0)) * 1) +
    ((Number(transportDeliveryItems['Diesel Fuel'] ?? transportDeliveryItems.fuel ?? transportDeliveryItems.Fuel ?? 0)) * 0.85)
  ) : null;

  // Helper calculations for Supply Officer payload
  const totalPayloadWeight = Math.round(
    (Number(foodRations) * 1) + 
    (Number(waterRations) * 1) + 
    (Number(medicalRations) * 1) + 
    (Number(fuelRations) * 0.85)
  );

  const displayedPayloadWeight = (roleName === 'Transport Coordinator' && transportPayloadWeight !== null && transportPayloadWeight > 0)
    ? transportPayloadWeight
    : totalPayloadWeight;

  // Auto vehicle selection based on payload weight
  let autoVehicleName = 'Medium Transport Bravo (8,000 kg)';
  let autoVehicleCap = 8000;
  let autoVehicleId = 'VH-02';
  const evalWeight = displayedPayloadWeight;
  if (evalWeight <= 3000) {
    autoVehicleName = 'Light Vehicle Charlie (3,000 kg)';
    autoVehicleCap = 3000;
    autoVehicleId = 'VH-03';
  } else if (evalWeight <= 8000) {
    autoVehicleName = 'Medium Transport Bravo (8,000 kg)';
    autoVehicleCap = 8000;
    autoVehicleId = 'VH-02';
  } else {
    autoVehicleName = 'Heavy Transport Alpha (15,000 kg)';
    autoVehicleCap = 15000;
    autoVehicleId = 'VH-01';
  }

  // ── Supply Officer: Allot Rations & Transmit to Transport Portal ──
  const handleAllotRations = async () => {
    try {
      setIsAllotting(true);
      await api.resupply.allotRations({
        delivery_id: activeDeliveryForSupply?.id,
        destination_id: selectedSupplyPostId,
        items: {
          'Food Rations': Number(foodRations),
          'Potable Water': Number(waterRations),
          'Medical Supplies': Number(medicalRations),
          'Diesel Fuel': Number(fuelRations)
        },
        notes: `Rations allotted by Supply Officer for ${selectedSupplyPostId}. Total cargo payload: ${totalPayloadWeight} kg. Assigned ${autoVehicleName}.`
      });
      setAllotmentSuccess(true);
      await fetchDashboard();
      refreshData();
    } catch (err) {
      alert('Error saving ration allotment: ' + err.message);
    } finally {
      setIsAllotting(false);
    }
  };

  // ── Transport Coordinator: Dispatch Convoy ──
  const handleDispatchConvoy = async () => {
    if (!activeTransportDelivery) return;
    try {
      setIsDispatching(true);
      await api.deliveries.update(activeTransportDelivery.id, {
        status: 'En Route',
        notes: 'Convoy dispatched on approved route. Real-time tracking active.'
      });
      await fetchDashboard();
      refreshData();
    } catch (err) {
      alert('Error dispatching convoy: ' + err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  // ── Transport Coordinator: Complete Delivery (Mark Delivered) ──
  const handleCompleteDelivery = async () => {
    try {
      setIsCompletingDelivery(true);
      const deliveryIdToDeliver = activeTransportDelivery?.id || 'active';
      await api.deliveries.completeDelivery(deliveryIdToDeliver);
      setDeliveryCompletedSuccess(true);
      await fetchDashboard();
      refreshData();
    } catch (err) {
      alert('Error marking delivery complete: ' + err.message);
    } finally {
      setIsCompletingDelivery(false);
    }
  };

  const openEditModal = (loc) => {
    setLocationToEdit(loc);
    setEditModalOpen(true);
  };

  const getDaysColor = (days) => {
    if (days === null || days === undefined) return 'text-slate-400';
    if (days <= 2) return 'text-red-600 font-extrabold';
    if (days <= 5) return 'text-amber-600 font-bold';
    return 'text-emerald-600 font-semibold';
  };

  const getDays = (loc, category) => {
    if (!loc) return null;
    const inv = loc.inventory_summary?.[category] || loc.inventory?.[category];
    return inv ? inv.days_remaining : null;
  };

  const getQty = (loc, category, defaultVal = 0) => {
    if (!loc) return defaultVal;
    const inv = loc.inventory_summary?.[category] || loc.inventory?.[category];
    return inv && inv.quantity !== undefined ? inv.quantity : defaultVal;
  };

  const getMinDays = (loc) => {
    if (!loc) return 999;
    const food = getDays(loc, 'Food');
    const water = getDays(loc, 'Water');
    const medical = getDays(loc, 'Medical');
    const fuel = getDays(loc, 'Fuel');
    const daysArr = [food, water, medical, fuel].filter(d => d !== null && d !== undefined);
    if (daysArr.length === 0) return 999;
    return Math.min(...daysArr);
  };

  // Sort locations strictly by priority: Critical (<=2d) first, then Warning (<=5d), then Normal (>5d)
  const locList = Array.isArray(locations) ? locations : [];
  const forwardLocationsSorted = locList
    .filter(l => l && l.type === 'forward_location')
    .sort((a, b) => getMinDays(a) - getMinDays(b));

  const criticalLocationsList = forwardLocationsSorted.filter(l => getMinDays(l) <= 2);
  const warningLocationsList = forwardLocationsSorted.filter(l => getMinDays(l) > 2 && getMinDays(l) <= 5);
  const normalLocationsList = forwardLocationsSorted.filter(l => getMinDays(l) > 5);

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'Critical': return 'border-l-4 border-l-red-500 bg-red-50/50 text-red-800';
      case 'High': return 'border-l-4 border-l-orange-500 bg-orange-50/50 text-orange-800';
      case 'Medium': return 'border-l-4 border-l-amber-500 bg-amber-50/50 text-amber-800';
      default: return 'border-l-4 border-l-teal-500 bg-teal-50/50 text-teal-800';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-500">
      <RefreshCw className="animate-spin mr-2 text-teal-700" size={20} /> Loading {roleName} Dashboard...
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
      Error: {error} <button onClick={fetchDashboard} className="ml-4 underline font-semibold cursor-pointer">Retry</button>
    </div>
  );

  if (!data) return null;

  // ─────────────────────────────────────────────────────────────
  // 1. LOGISTICS OFFICER DASHBOARD
  // Role: Main operational decision-making role
  // Rule: Weather overview is removed. Dashboard shows ONLY availability of stock
  // in the posts according to priority!
  // ─────────────────────────────────────────────────────────────
  if (roleName === 'Logistics Officer') {
    return (
      <div className="space-y-6">
        {/* Header (No Live Map button) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-teal-100 text-teal-900 text-[11px] font-extrabold rounded uppercase tracking-wide">
                Logistics Command Portal
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Forward Outposts Stock Availability</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Posts prioritized strictly by days of supply remaining. Select any post to plan route corridors.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => navigate('/weather-route')} 
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Navigation size={14} /> Routes &amp; Weather Planning &rarr;
            </button>
            <button 
              onClick={() => navigate('/recommendations')} 
              className="px-3.5 py-1.5 bg-white border border-teal-600 text-teal-800 hover:bg-teal-50 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Lightbulb size={14} className="text-teal-700" /> AI Recommendations
            </button>
            <button 
              onClick={fetchDashboard} 
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* ── PRIORITY STOCK KPI CARDS (NO WEATHER OVERVIEW) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-red-50 text-red-600 border-red-200 pulse-alert">
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">Critical Outposts (&le; 2 Days)</div>
              <div className="text-2xl font-black text-red-600 mt-0.5">{criticalLocationsList.length} Posts</div>
              <div className="text-[10px] text-red-600 font-semibold">{criticalLocationsList[0]?.name || 'Post Bravo'} (Immediate Resupply)</div>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-amber-50 text-amber-600 border-amber-200">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">High Shortage Risk (2–5 Days)</div>
              <div className="text-2xl font-black text-amber-600 mt-0.5">{warningLocationsList.length} Posts</div>
              <div className="text-[10px] text-amber-700 font-semibold">Post Delta &amp; Post Alpha</div>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-emerald-50 text-emerald-600 border-emerald-200">
              <Activity size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">Adequate Stock (&gt; 5 Days)</div>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">{normalLocationsList.length} Posts</div>
              <div className="text-[10px] text-emerald-700 font-semibold">Post Charlie &amp; Post Echo</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-teal-50 text-teal-700 border-teal-200">
              <Package size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">Total Monitored Outposts</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{forwardLocationsSorted.length} Posts</div>
              <div className="text-[10px] text-teal-700 font-semibold">All Sectors Monitored</div>
            </div>
          </div>
        </div>

        {/* ── PRIORITY-RANKED STOCK AVAILABILITY TABLE ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/75 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <List size={18} className="text-teal-700" />
                Forward Posts Stock Availability (Ranked by Criticality Priority)
              </h3>
              <p className="text-xs text-slate-500">
                Sorted strictly by days remaining. Outposts facing stockout within 2 days appear at the top.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200">
              Click 'Plan Route' to dispatch resupply
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3.5 text-center">Priority Rank</th>
                  <th className="px-4 py-3.5">Forward Post &amp; Sector</th>
                  <th className="px-3 py-3.5 text-center">Food Rations</th>
                  <th className="px-3 py-3.5 text-center">Potable Water</th>
                  <th className="px-3 py-3.5 text-center">Medical Units</th>
                  <th className="px-3 py-3.5 text-center">Diesel Fuel</th>
                  <th className="px-4 py-3.5 text-center">Critical Days</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forwardLocationsSorted.map((loc, index) => {
                  const foodDays = getDays(loc, 'Food');
                  const waterDays = getDays(loc, 'Water');
                  const medDays = getDays(loc, 'Medical');
                  const fuelDays = getDays(loc, 'Fuel');
                  const minDays = getMinDays(loc);

                  const isCritical = minDays <= 2;
                  const isWarning = minDays > 2 && minDays <= 5;

                  return (
                    <tr 
                      key={loc.id} 
                      className={`transition-colors ${
                        isCritical ? 'bg-red-50/40 hover:bg-red-50/70' :
                        isWarning ? 'bg-amber-50/30 hover:bg-amber-50/60' :
                        'hover:bg-slate-50'
                      }`}
                    >
                      {/* Priority Rank Badge */}
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black tracking-wide ${
                          isCritical ? 'bg-red-600 text-white shadow-xs animate-pulse' :
                          isWarning ? 'bg-amber-500 text-slate-900 font-bold' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          #{index + 1} {isCritical ? 'CRITICAL' : isWarning ? 'HIGH RISK' : 'ADEQUATE'}
                        </span>
                      </td>

                      {/* Post Name & Troops */}
                      <td className="px-4 py-4">
                        <div className="font-extrabold text-slate-900 text-sm">{loc.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-teal-800 font-semibold">{loc.id}</span>
                          <span>•</span>
                          <span>{loc.region || 'Forward Sector'}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-700">{loc.personnel || 100} Pax</span>
                        </div>
                      </td>

                      {/* Food Days */}
                      <td className={`px-3 py-4 text-center font-mono ${getDaysColor(foodDays)}`}>
                        <div className="text-sm font-black">{foodDays !== null ? `${foodDays}d` : '-'}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{getQty(loc, 'Food', 2400).toLocaleString()}u</div>
                      </td>

                      {/* Water Days */}
                      <td className={`px-3 py-4 text-center font-mono ${getDaysColor(waterDays)}`}>
                        <div className="text-sm font-black">{waterDays !== null ? `${waterDays}d` : '-'}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{getQty(loc, 'Water', 5000).toLocaleString()}L</div>
                      </td>

                      {/* Medical Days */}
                      <td className={`px-3 py-4 text-center font-mono ${getDaysColor(medDays)}`}>
                        <div className="text-sm font-black">{medDays !== null ? `${medDays}d` : '-'}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{getQty(loc, 'Medical', 600).toLocaleString()}u</div>
                      </td>

                      {/* Fuel Days */}
                      <td className={`px-3 py-4 text-center font-mono ${getDaysColor(fuelDays)}`}>
                        <div className="text-sm font-black">{fuelDays !== null ? `${fuelDays}d` : '-'}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{getQty(loc, 'Fuel', 3000).toLocaleString()}L</div>
                      </td>

                      {/* Min Days Status */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-black ${
                          isCritical ? 'bg-red-100 text-red-800 border border-red-300' :
                          isWarning ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {minDays.toFixed(1)} Days Left
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/weather-route?post=${loc.id}`)}
                            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Navigation size={12} /> Plan Route
                          </button>
                          <button
                            onClick={() => openEditModal(loc)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Edit Post Information"
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Resupply Deliveries */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/75 font-bold text-slate-900 text-sm flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Truck size={17} className="text-teal-700" /> Active Resupply Deliveries &amp; Convoys
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {deliveries.length} Missions Scheduled
            </span>
          </div>
          <div className="p-4">
            {deliveries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No active resupply deliveries scheduled.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {deliveries.map(del => (
                  <div key={del.id} className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs space-y-2 hover:border-teal-300 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-900">{del.source_name} ➔ {del.dest_name}</span>
                      <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{del.id}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Route: <span className="font-semibold text-slate-800">{del.route_name || del.route_id}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                        del.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        del.status === 'En Route' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-sky-50 text-sky-700 border-sky-200'
                      }`}>
                        {del.status}
                      </span>
                      <span className="font-mono font-medium">ETA: {del.planned_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Location Edit Modal */}
        <EditLocationModal 
          location={locationToEdit}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSaveSuccess={async () => {
            await fetchDashboard();
            refreshData();
          }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. SUPPLY / INVENTORY OFFICER DASHBOARD
  // Role: Focuses on "What supplies are available and how quickly they are being consumed"
  // Flow: Receives approved directive, manually enters ration quantities allotted to post,
  // payload weight is calculated, auto-selects vehicle, transmits to transport portal.
  // ─────────────────────────────────────────────────────────────
  if (roleName === 'Supply / Inventory Officer') {
    const activeTargetPost = locations.find(l => l.id === selectedSupplyPostId) || locations[0];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[11px] font-extrabold rounded uppercase tracking-wide">
                Supply Command Portal
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Forward Outposts Stock Availability &amp; Ration Priorities</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Posts prioritized strictly by days of supply remaining. Select any post to enter and allot rations based on requirement.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => navigate('/inventory')} 
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Package size={14} /> Full Inventory
            </button>
            <button 
              onClick={fetchDashboard} 
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* ── PRIORITY STOCK KPI CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-red-50 text-red-600 border-red-200 pulse-alert">
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">Critical Outposts (&le; 2 Days)</div>
              <div className="text-2xl font-black text-red-600 mt-0.5">{criticalLocationsList.length} Posts</div>
              <div className="text-[10px] text-red-600 font-semibold">{criticalLocationsList[0]?.name || 'Post Bravo'} (Immediate Resupply)</div>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-amber-50 text-amber-600 border-amber-200">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">High Shortage Risk (2–5 Days)</div>
              <div className="text-2xl font-black text-amber-600 mt-0.5">{warningLocationsList.length} Posts</div>
              <div className="text-[10px] text-amber-700 font-semibold">Post Delta &amp; Post Alpha</div>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-emerald-50 text-emerald-600 border-emerald-200">
              <Activity size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">Adequate Stock (&gt; 5 Days)</div>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">{normalLocationsList.length} Posts</div>
              <div className="text-[10px] text-emerald-700 font-semibold">Post Charlie &amp; Post Echo</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-emerald-50 text-emerald-700 border-emerald-200">
              <Package size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">Total Monitored Outposts</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{forwardLocationsSorted.length} Posts</div>
              <div className="text-[10px] text-emerald-700 font-semibold">All Sectors Monitored</div>
            </div>
          </div>
        </div>

        {/* ── PRIORITY-RANKED STOCK AVAILABILITY TABLE ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/75 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <List size={18} className="text-emerald-700" />
                Forward Posts Stock Availability (Ranked by Criticality Priority)
              </h3>
              <p className="text-xs text-slate-500">
                Sorted strictly by days remaining. Outposts facing stockout within 2 days appear at the top.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200">
              Click 'Allot Rations' to enter allocations
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3.5 text-center">Priority Rank</th>
                  <th className="px-4 py-3.5">Forward Post &amp; Sector</th>
                  <th className="px-3 py-3.5 text-center">Food Rations</th>
                  <th className="px-3 py-3.5 text-center">Potable Water</th>
                  <th className="px-3 py-3.5 text-center">Medical Units</th>
                  <th className="px-3 py-3.5 text-center">Diesel Fuel</th>
                  <th className="px-4 py-3.5 text-center">Critical Days</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forwardLocationsSorted.map((loc, index) => {
                  const foodDays = getDays(loc, 'Food');
                  const waterDays = getDays(loc, 'Water');
                  const medDays = getDays(loc, 'Medical');
                  const fuelDays = getDays(loc, 'Fuel');
                  const minDays = getMinDays(loc);

                  const isCritical = minDays <= 2;
                  const isWarning = minDays > 2 && minDays <= 5;
                  const isSelectedForSupply = selectedSupplyPostId === loc.id;

                  return (
                    <tr 
                      key={loc.id} 
                      className={`transition-colors ${
                        isSelectedForSupply ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' :
                        isCritical ? 'bg-red-50/40 hover:bg-red-50/70' :
                        isWarning ? 'bg-amber-50/30 hover:bg-amber-50/60' :
                        'hover:bg-slate-50'
                      }`}
                    >
                      {/* Priority Rank Badge */}
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black tracking-wide ${
                          isCritical ? 'bg-red-600 text-white shadow-xs animate-pulse' :
                          isWarning ? 'bg-amber-500 text-slate-900 font-bold' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          #{index + 1} {isCritical ? 'CRITICAL' : isWarning ? 'HIGH RISK' : 'ADEQUATE'}
                        </span>
                      </td>

                      {/* Post Name & Troops */}
                      <td className="px-4 py-4">
                        <div className="font-extrabold text-slate-900 text-sm">{loc.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-emerald-800 font-semibold">{loc.id}</span>
                          <span>•</span>
                          <span>{loc.region || 'Forward Sector'}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-700">{loc.personnel || 100} Pax</span>
                        </div>
                      </td>

                      {/* Food Days */}
                      <td className={`px-3 py-4 text-center font-mono ${getDaysColor(foodDays)}`}>
                        <div className="text-sm font-black">{foodDays !== null ? `${foodDays}d` : '-'}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{getQty(loc, 'Food', 2400).toLocaleString()}u</div>
                      </td>

                      {/* Water Days */}
                      <td className={`px-3 py-4 text-center font-mono ${getDaysColor(waterDays)}`}>
                        <div className="text-sm font-black">{waterDays !== null ? `${waterDays}d` : '-'}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{getQty(loc, 'Water', 5000).toLocaleString()}L</div>
                      </td>

                      {/* Medical Days */}
                      <td className={`px-3 py-4 text-center font-mono ${getDaysColor(medDays)}`}>
                        <div className="text-sm font-black">{medDays !== null ? `${medDays}d` : '-'}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{getQty(loc, 'Medical', 600).toLocaleString()}u</div>
                      </td>

                      {/* Fuel Days */}
                      <td className={`px-3 py-4 text-center font-mono ${getDaysColor(fuelDays)}`}>
                        <div className="text-sm font-black">{fuelDays !== null ? `${fuelDays}d` : '-'}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{getQty(loc, 'Fuel', 3000).toLocaleString()}L</div>
                      </td>

                      {/* Min Days Status */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-black ${
                          isCritical ? 'bg-red-100 text-red-800 border border-red-300' :
                          isWarning ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {minDays.toFixed(1)} Days Left
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedSupplyPostId(loc.id);
                              setAllotmentSuccess(false);
                              document.getElementById('ration-allotment-section')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer ${
                              isSelectedForSupply
                                ? 'bg-emerald-700 text-white ring-2 ring-emerald-400'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            <Package size={12} /> {isSelectedForSupply ? '✓ Selected' : 'Allot Rations'}
                          </button>
                          <button
                            onClick={() => openEditModal(loc)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Edit Post Information"
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── STEP 2: RATION ALLOTMENT & CARGO PAYLOAD FORM ── */}
        <div id="ration-allotment-section" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden scroll-mt-6">
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded">
                  Logistics Directive Received
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  Resupply Directive for {activeTargetPost?.name || 'Forward Post'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Origin: <strong>{activeDeliveryForSupply?.source_name || 'Depot Alpha'}</strong> • Route: <strong className="text-emerald-300">{activeDeliveryForSupply?.route_name || activeDeliveryForSupply?.route_id || 'Pending Route Approval by Logistics Officer'}</strong> • Target Delivery: <strong className="font-mono text-emerald-300">{activeDeliveryForSupply?.planned_date || 'Day 1'}</strong>
                </p>
              </div>

              {allotmentSuccess ? (
                <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold">
                  <CheckCircle size={16} /> Allotment Saved &amp; Transmitted to Transport Fleet Database
                </div>
              ) : activeDeliveryForSupply?.status === 'Pending Supply Allotment' ? (
                <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/50 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold">
                  <AlertCircle size={15} /> Awaiting Your Ration Allocation
                </div>
              ) : null}
            </div>

            {/* Post Selector for Supply Officer */}
            <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-300 font-bold">Allot Rations For Post:</span>
              {forwardLocationsSorted.map(post => (
                <button
                  key={post.id}
                  onClick={() => {
                    setSelectedSupplyPostId(post.id);
                    setAllotmentSuccess(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedSupplyPostId === post.id
                      ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {post.name.split('(')[0].trim()} ({getMinDays(post).toFixed(1)}d)
                </button>
              ))}
            </div>

            {/* Manual Ration Entry Form */}
            <div className="mt-4 pt-3 border-t border-slate-700/60">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Package size={15} className="text-emerald-400" /> Enter Ration Quantities Allotted to Post:
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Food Rations (kg / units)</label>
                  <input 
                    type="number"
                    min="0"
                    value={foodRations}
                    onChange={(e) => setFoodRations(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono font-bold focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">Standard: 3,600 units</div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Potable Water (Liters)</label>
                  <input 
                    type="number"
                    min="0"
                    value={waterRations}
                    onChange={(e) => setWaterRations(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono font-bold focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">Standard: 7,200 L</div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Medical Supplies (units)</label>
                  <input 
                    type="number"
                    min="0"
                    value={medicalRations}
                    onChange={(e) => setMedicalRations(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono font-bold focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">Standard: 400 units</div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Diesel Fuel (Liters)</label>
                  <input 
                    type="number"
                    min="0"
                    value={fuelRations}
                    onChange={(e) => setFuelRations(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono font-bold focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">Standard: 2,000 L</div>
                </div>
              </div>

              {/* Real-time Payload Calculation & Auto-Vehicle Assignment Banner */}
              <div className="mt-4 p-3.5 bg-slate-900/90 border border-slate-700 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">
                    Calculated Total Payload Weight: <strong className="font-mono text-emerald-400 text-sm">{totalPayloadWeight.toLocaleString()} kg</strong>
                  </div>
                  <div className="text-xs text-slate-300 flex items-center gap-1.5">
                    <Truck size={14} className="text-sky-400" />
                    Automatic Vehicle Selection: <strong className="text-sky-300 font-bold">{autoVehicleName}</strong>
                  </div>
                </div>

                <button
                  onClick={handleAllotRations}
                  disabled={isAllotting}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Send size={14} />
                  {isAllotting ? 'Allotting Rations...' : 'Allot Rations & Transmit to Transport Fleet'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Resupply Deliveries */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/75 font-bold text-slate-900 text-sm flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Truck size={17} className="text-teal-700" /> Active Resupply Deliveries &amp; Convoys
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {deliveries.length} Missions Scheduled
            </span>
          </div>
          <div className="p-4">
            {deliveries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No active resupply deliveries scheduled.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {deliveries.map(del => (
                  <div key={del.id} className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs space-y-2 hover:border-emerald-300 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-900">{del.source_name} ➔ {del.dest_name}</span>
                      <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{del.id}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Route: <span className="font-semibold text-slate-800">{del.route_name || del.route_id}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                        del.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        del.status === 'En Route' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-sky-50 text-sky-700 border-sky-200'
                      }`}>
                        {del.status}
                      </span>
                      <span className="font-mono font-medium">ETA: {del.planned_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Location Edit Modal */}
        <EditLocationModal 
          location={locationToEdit}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSaveSuccess={async () => {
            await fetchDashboard();
            refreshData();
          }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. TRANSPORT COORDINATOR DASHBOARD
  // Role: Focuses on "How supplies are moved from source to destination"
  // Flow: Displays ONLY ONE ROUTE (suggested by Logistics Officer), vehicle is auto-selected,
  // arbitrary "New Entry" option is removed, includes "Dispatch Convoy" and "Mark Delivered".
  // ─────────────────────────────────────────────────────────────
  if (roleName === 'Transport Coordinator') {
    const availableCount = vehicles.filter(v => v.status === 'Available').length;
    const activeRouteId = activeTransportDelivery?.route_id || 'R-03';
    const assignedVeh = vehicles.find(v => v.id === activeTransportDelivery?.vehicle_id) || {
      id: autoVehicleId,
      name: autoVehicleName,
      capacity: autoVehicleCap
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-sky-100 text-sky-900 text-[11px] font-extrabold rounded uppercase tracking-wide">
                Transport Command Portal
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Forward Outposts Resupply &amp; Fleet Convoy Priority</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Posts prioritized strictly by days of supply remaining. Select any outpost to dispatch or track active resupply convoys.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => navigate('/transport')} 
              className="px-3.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Truck size={14} /> Fleet Vehicles
            </button>
            <button 
              onClick={fetchDashboard} 
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* ── PRIORITY STOCK KPI CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-red-50 text-red-600 border-red-200 pulse-alert">
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">Critical Outposts (&le; 2 Days)</div>
              <div className="text-2xl font-black text-red-600 mt-0.5">{criticalLocationsList.length} Posts</div>
              <div className="text-[10px] text-red-600 font-semibold">{criticalLocationsList[0]?.name || 'Post Bravo'} (Immediate Resupply)</div>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-amber-50 text-amber-600 border-amber-200">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">High Shortage Risk (2–5 Days)</div>
              <div className="text-2xl font-black text-amber-600 mt-0.5">{warningLocationsList.length} Posts</div>
              <div className="text-[10px] text-amber-700 font-semibold">Post Delta &amp; Post Alpha</div>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-emerald-50 text-emerald-600 border-emerald-200">
              <Activity size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">Adequate Stock (&gt; 5 Days)</div>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">{normalLocationsList.length} Posts</div>
              <div className="text-[10px] text-emerald-700 font-semibold">Post Charlie &amp; Post Echo</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-sky-50 text-sky-700 border-sky-200">
              <Package size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">Total Monitored Outposts</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{forwardLocationsSorted.length} Posts</div>
              <div className="text-[10px] text-sky-700 font-semibold">All Sectors Monitored</div>
            </div>
          </div>
        </div>

        {/* ── PRIORITY-RANKED FORWARD POSTS RESUPPLY TABLE ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/75 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <List size={18} className="text-sky-700" />
                Forward Posts Resupply Priority (Ranked by Criticality Priority)
              </h3>
              <p className="text-xs text-slate-500">
                Sorted strictly by days remaining. Outposts facing stockout within 2 days appear at the top.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200">
              Click 'Dispatch / Track' to control mission
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3.5 text-center">Priority Rank</th>
                  <th className="px-4 py-3.5">Forward Post &amp; Sector</th>
                  <th className="px-3 py-3.5 text-center">Food Rations</th>
                  <th className="px-3 py-3.5 text-center">Potable Water</th>
                  <th className="px-3 py-3.5 text-center">Medical Units</th>
                  <th className="px-3 py-3.5 text-center">Diesel Fuel</th>
                  <th className="px-4 py-3.5 text-center">Critical Days</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forwardLocationsSorted.map((loc, index) => {
                  const foodDays = getDays(loc, 'Food');
                  const waterDays = getDays(loc, 'Water');
                  const medDays = getDays(loc, 'Medical');
                  const fuelDays = getDays(loc, 'Fuel');
                  const minDays = getMinDays(loc);

                  const isCritical = minDays <= 2;
                  const isWarning = minDays > 2 && minDays <= 5;
                  const isTrackingThis = activeTransportDelivery?.destination_id === loc.id;

                  return (
                    <tr 
                      key={loc.id} 
                      className={`transition-colors ${
                        isTrackingThis ? 'bg-sky-50/70 border-l-4 border-l-sky-600' :
                        isCritical ? 'bg-red-50/40 hover:bg-red-50/70' :
                        isWarning ? 'bg-amber-50/30 hover:bg-amber-50/60' :
                        'hover:bg-slate-50'
                      }`}
                    >
                      {/* Priority Rank Badge */}
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black tracking-wide ${
                          isCritical ? 'bg-red-600 text-white shadow-xs animate-pulse' :
                          isWarning ? 'bg-amber-500 text-slate-900 font-bold' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          #{index + 1} {isCritical ? 'CRITICAL' : isWarning ? 'HIGH RISK' : 'ADEQUATE'}
                        </span>
                      </td>

                      {/* Post Name & Troops */}
                      <td className="px-4 py-4">
                        <div className="font-extrabold text-slate-900 text-sm">{loc.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-sky-800 font-semibold">{loc.id}</span>
                          <span>•</span>
                          <span>{loc.region || 'Forward Sector'}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-700">{loc.personnel || 100} Pax</span>
                        </div>
                      </td>

                      {/* Food Days */}
                      <td className={`px-3 py-4 text-center font-mono ${getDaysColor(foodDays)}`}>
                        <div className="text-sm font-black">{foodDays !== null ? `${foodDays}d` : '-'}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{getQty(loc, 'Food', 2400).toLocaleString()}u</div>
                      </td>

                      {/* Water Days */}
                      <td className={`px-3 py-4 text-center font-mono ${getDaysColor(waterDays)}`}>
                        <div className="text-sm font-black">{waterDays !== null ? `${waterDays}d` : '-'}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{getQty(loc, 'Water', 5000).toLocaleString()}L</div>
                      </td>

                      {/* Medical Days */}
                      <td className={`px-3 py-4 text-center font-mono ${getDaysColor(medDays)}`}>
                        <div className="text-sm font-black">{medDays !== null ? `${medDays}d` : '-'}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{getQty(loc, 'Medical', 600).toLocaleString()}u</div>
                      </td>

                      {/* Fuel Days */}
                      <td className={`px-3 py-4 text-center font-mono ${getDaysColor(fuelDays)}`}>
                        <div className="text-sm font-black">{fuelDays !== null ? `${fuelDays}d` : '-'}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{getQty(loc, 'Fuel', 3000).toLocaleString()}L</div>
                      </td>

                      {/* Min Days Status */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-black ${
                          isCritical ? 'bg-red-100 text-red-800 border border-red-300' :
                          isWarning ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {minDays.toFixed(1)} Days Left
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {(() => {
                            const matchingDel = transportEligibleDeliveries.find(d => d.destination_id === loc.id && d.status !== 'Delivered') 
                              || transportEligibleDeliveries.find(d => d.destination_id === loc.id);
                            const isPendingSupply = (deliveries || []).some(d => d.destination_id === loc.id && d.status === 'Pending Supply Allotment');
                            const isTrackingThis = activeTransportDelivery?.id === matchingDel?.id;

                            if (matchingDel) {
                              return (
                                <button
                                  onClick={() => {
                                    setSelectedTransportDelId(matchingDel.id);
                                    document.getElementById('transport-tactical-map')?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer ${
                                    isTrackingThis
                                      ? 'bg-sky-800 text-white ring-2 ring-sky-400'
                                      : 'bg-sky-700 hover:bg-sky-800 text-white'
                                  }`}
                                >
                                  <Truck size={12} /> {isTrackingThis ? '✓ Tracking Convoy' : 'Dispatch / Track'}
                                </button>
                              );
                            }

                            if (isPendingSupply) {
                              return (
                                <span 
                                  className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-default"
                                  title="Logistics directive approved. Awaiting Supply Officer to enter and allot rations."
                                >
                                  <Clock size={12} className="text-amber-600" /> Awaiting Supply
                                </span>
                              );
                            }

                            return (
                              <span 
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-400 rounded-lg text-xs font-medium"
                              >
                                No Convoy Allotted
                              </span>
                            );
                          })()}
                          <button
                            onClick={() => openEditModal(loc)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Edit Post Information"
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Completion Success Banner */}
        {deliveryCompletedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 flex justify-between items-center shadow-xs">
            <div className="flex items-center gap-3">
              <CheckCircle size={22} className="text-emerald-600 flex-shrink-0" />
              <div>
                <div className="font-extrabold text-sm text-emerald-950">Mission Completed &amp; Stock Replenished Across All Portals!</div>
                <div className="text-xs text-emerald-800">Post inventory updated, shortages cleared, and fleet vehicle returned to Available status.</div>
              </div>
            </div>
            <button
              onClick={() => setDeliveryCompletedSuccess(false)}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── STEP 1: SINGLE-ROUTE TACTICAL MAP DISPLAY (NO OTHER ROUTES SHOWN) ── */}
        <div id="transport-tactical-map" className="scroll-mt-6">
          {activeTransportDelivery ? (
            <MapRoutePlanning 
              selectedRouteId={activeRouteId}
              singleRouteMode={true}
              depotName={activeTransportDelivery?.source_name || 'Depot Alpha'}
              postName={postNameForTransportDelivery}
              selectedPostId={activeTransportDelivery?.destination_id || 'LOC-FWC'}
              assignedVehicle={assignedVeh}
              payloadWeight={displayedPayloadWeight}
              items={transportDeliveryItems}
              deliveryStatus={activeTransportDelivery?.status || 'Ready for Dispatch'}
              onDispatchConvoy={handleDispatchConvoy}
              onCompleteDelivery={handleCompleteDelivery}
              isExecuting={isDispatching || isCompletingDelivery}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm space-y-3">
              <div className="w-12 h-12 bg-sky-50 text-sky-700 rounded-full flex items-center justify-center mx-auto">
                <Truck size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-base">No Resupply Convoys Ready for Dispatch</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Directives approved by the Logistics Officer must first have rations allotted by the Supply Officer. Once the Supply Officer allots rations in their portal, the assigned convoy will automatically appear here for dispatch and delivery tracking.
              </p>
            </div>
          )}
        </div>

        {/* Transport KPI Cards: Deliveries, Vehicles, Readiness */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-emerald-50 text-emerald-600 border-emerald-200">
              <Car size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Available Vehicles</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{availableCount} Fleet Units</div>
              <div className="text-[10px] text-emerald-700 font-semibold">Ready for Dispatch</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-sky-50 text-sky-600 border-sky-200">
              <Truck size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Active Supply Convoys</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{data.activeDeliveries} Missions</div>
              <div className="text-[10px] text-sky-700 font-semibold">{activeDelivery?.status || 'Scheduled'}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-amber-50 text-amber-600 border-amber-200">
              <Shield size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-500 font-semibold">Assigned Route</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5 truncate" title={activeTransportDelivery?.route_name || activeTransportDelivery?.route_id}>
                {activeTransportDelivery?.route_name || activeTransportDelivery?.route_id || 'Route C (Highland)'}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold truncate">Approved by Logistics Officer</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center">
            <div className="p-3 rounded-xl border mr-3.5 bg-slate-100 text-slate-700 border-slate-200">
              <Package size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Payload Allocation</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{displayedPayloadWeight.toLocaleString()} kg</div>
              <div className="text-[10px] text-slate-600 font-semibold">Auto-Allocated Vehicle</div>
            </div>
          </div>
        </div>

        {/* Assigned Convoys Table (Arbitrary "New Entry" form is removed) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/75 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Assigned Resupply Convoys</h3>
                  <p className="text-[11px] text-slate-500">Route, vehicle assignment, payload, status &amp; ETA</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Assigned by Logistics &amp; Supply Officers
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-left text-xs uppercase tracking-wider font-semibold">
                      <th className="px-5 py-3">Mission ID</th>
                      <th className="px-4 py-3">Assigned Route &amp; Cargo Manifest</th>
                      <th className="px-4 py-3">Assigned Vehicle</th>
                      <th className="px-3 py-3 text-center">Planned Date</th>
                      <th className="px-3 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transportEligibleDeliveries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400 font-medium">
                          No resupply convoys allotted by Supply Officer yet. Convoys will appear once rations are allotted.
                        </td>
                      </tr>
                    ) : (
                      transportEligibleDeliveries.map(del => {
                        const isSelected = activeTransportDelivery?.id === del.id;
                        const delItems = getDeliveryItems(del);
                        return (
                          <tr 
                            key={del.id} 
                            onClick={() => setSelectedTransportDelId(del.id)}
                            className={`transition-colors cursor-pointer ${
                              isSelected ? 'bg-sky-100/70 border-l-4 border-l-sky-600 font-medium' : 'hover:bg-sky-50/40'
                            }`}
                            title="Click to view and control this convoy mission"
                          >
                            <td className="px-5 py-3.5 font-bold font-mono text-sky-900 text-xs">
                              <div className="flex items-center gap-1.5">
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>}
                                {del.id}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-900">{del.source_name} ➔ {del.dest_name}</div>
                              <div className="text-[11px] text-teal-700 font-semibold">{del.route_name || del.route_id || 'Assigned Route'}</div>
                              {delItems && Object.keys(delItems).length > 0 && (
                                <div className="text-[10px] text-slate-600 mt-1 flex flex-wrap gap-1 font-mono">
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    Food: {delItems['Food Rations'] ?? delItems.food ?? 0}
                                  </span>
                                  <span className="bg-sky-50 text-sky-800 px-1.5 py-0.5 rounded border border-sky-200">
                                    Water: {delItems['Potable Water'] ?? delItems.water ?? 0}L
                                  </span>
                                  <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                                    Med: {delItems['Medical Supplies'] ?? delItems.medical ?? 0}
                                  </span>
                                  <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                                    Fuel: {delItems['Diesel Fuel'] ?? delItems.fuel ?? 0}L
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-700 font-medium">
                              {del.vehicle_name || autoVehicleName}
                            </td>
                            <td className="px-3 py-3.5 text-center font-mono text-xs text-slate-700">
                              {del.planned_date}
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                del.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                                del.status === 'En Route' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                                'bg-sky-100 text-sky-800'
                              }`}>
                                {del.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Vehicle Fleet Status */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/75 font-bold text-slate-900 text-sm flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <Car size={15} className="text-sky-700" /> Vehicle Fleet Readiness
                </span>
              </div>
              <div className="p-3 space-y-2.5 max-h-96 overflow-y-auto">
                {vehicles.map(v => (
                  <div key={v.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold text-slate-900">
                      <span>{v.name}</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        v.status === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                        v.status === 'Maintenance' ? 'bg-red-100 text-red-800' : 'bg-sky-100 text-sky-800'
                      }`}>
                        {v.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex justify-between">
                      <span>Type: {v.type}</span>
                      <span>Cap: {v.capacity} {v.capacity_unit}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Location: {v.location_name || v.current_location_id}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

        {/* Location Edit Modal */}
        <EditLocationModal 
          location={locationToEdit}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSaveSuccess={async () => {
            await fetchDashboard();
            refreshData();
          }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. ADMINISTRATOR DASHBOARD
  // Role: Manages the application itself
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[11px] font-extrabold rounded uppercase tracking-wide">
              Admin Portal
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">System &amp; Data Overview</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            System settings, base configurations, data quality health, and user activity history
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => navigate('/settings')} 
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Settings size={13} /> Settings
          </button>
          <button 
            onClick={() => navigate('/data-management')} 
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Database size={13} className="text-teal-700" /> Manage Data
          </button>
          <button 
            onClick={handleLoadDemo} 
            className="px-3 py-1.5 bg-white border border-teal-600 text-teal-800 hover:bg-teal-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Load Demo Data
          </button>
          <button 
            onClick={handleReset} 
            className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Reset Data
          </button>
        </div>
      </div>

      {/* Admin Emphasized KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center">
          <div className="p-3 rounded-xl border mr-3.5 bg-teal-50 text-teal-700 border-teal-200">
            <Users size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">Active System Roles</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">4 Roles</div>
            <div className="text-[10px] text-teal-700 font-semibold">Logistics, Supply, Transport, Admin</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center">
          <div className="p-3 rounded-xl border mr-3.5 bg-emerald-50 text-emerald-600 border-emerald-200">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">System Status</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">Online</div>
            <div className="text-[10px] text-emerald-700 font-semibold">Backend v2.4 Operational</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center">
          <div className="p-3 rounded-xl border mr-3.5 bg-sky-50 text-sky-600 border-sky-200">
            <Database size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">Data Quality Health</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">92%</div>
            <div className="text-[10px] text-sky-700 font-semibold">6 Data Tables Synchronized</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center">
          <div className="p-3 rounded-xl border mr-3.5 bg-slate-100 text-slate-700 border-slate-200">
            <List size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">Audit Trail</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">Active</div>
            <div className="text-[10px] text-slate-500 font-semibold">All Officer Decisions Logged</div>
          </div>
        </div>
      </div>

      {/* Admin Content Layout: Forward Bases Management & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/75 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Configured Forward Bases &amp; Depots</h3>
                <p className="text-[11px] text-slate-500">Edit post names, troop counts, and sector assignments</p>
              </div>
              <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-medium text-slate-600">
                {locations.length} Nodes
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-left text-xs uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3">Node ID</th>
                    <th className="px-4 py-3">Location Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-3 py-3 text-center">Personnel</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-3 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {locations.map(loc => (
                    <tr key={loc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{loc.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{loc.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 capitalize">{loc.type?.replace('_', ' ')}</td>
                      <td className="px-3 py-3 text-center text-xs text-slate-700">{loc.personnel || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {loc.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => openEditModal(loc)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-md text-xs font-semibold flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Audit Log Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/75 font-bold text-slate-900 text-sm flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <List size={15} className="text-teal-700" /> Recent System Audit History
              </span>
              <button onClick={() => navigate('/audit-log')} className="text-xs text-teal-700 hover:text-teal-900 font-semibold hover:underline">
                View All
              </button>
            </div>
            <div className="p-3 space-y-2.5 max-h-96 overflow-y-auto">
              {auditLogs.length === 0 ? (
                <div className="text-slate-400 text-xs text-center p-4">No recent audit records.</div>
              ) : (
                auditLogs.map((log, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">{log.details}</div>
                    <div className="text-[10px] text-teal-700 font-medium">User: {log.user} ({log.role})</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Edit Modal */}
      <EditLocationModal 
        location={locationToEdit}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSaveSuccess={async () => {
          await fetchDashboard();
          refreshData();
        }}
      />
    </div>
  );
};

export default DashboardPage;
