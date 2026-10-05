import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Truck, MapPin, Battery, Calendar, Package, AlertCircle, 
  CheckCircle, Navigation, Plus, Edit, X, RefreshCw, Send, Check
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function TransportPage() {
  const { user, refreshData } = useAppContext() || {};
  const isTransportCoordinator = user?.role === 'Transport Coordinator';
  // Transport Coordinator cannot create new arbitrary entries as per exact specifications
  const canCreateDelivery = user?.role === 'Administrator' || user?.role === 'Logistics Officer';
  
  const [vehicles, setVehicles] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [locations, setLocations] = useState([]);
  const [routes, setRoutes] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [actionInProgressId, setActionInProgressId] = useState(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [formData, setFormData] = useState({
    source_id: '', destination_id: '', items: '', planned_date: '', vehicle_id: '', route_id: '', priority: 'Normal', notes: '', status: 'Planned'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vData, dData, lData, rData] = await Promise.all([
        api.vehicles.getAll(),
        api.deliveries.getAll(),
        api.locations.getAll(),
        api.routes.getAll()
      ]);
      setVehicles(vData);
      setDeliveries(dData);
      setLocations(lData);
      setRoutes(rData);
    } catch (err) {
      setError('Failed to load transport fleet data.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available':
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Assigned':
      case 'Planned':
      case 'Ready for Dispatch':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'En Route':
      case 'In Transit':
      case 'Loading':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Maintenance':
      case 'Delayed':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getVehicleTerrainSuitability = (vehicleId) => {
    switch (vehicleId) {
      case 'VH-01':
        return {
          short: 'Mountain 6x6 • All-Terrain',
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          desc: 'Heavy Tactical 6x6 rated for steep rocky mountain grades, desert sand, and heavy convoy payloads up to 15,000 kg.'
        };
      case 'VH-02':
        return {
          short: 'Mountain 4x4 • Tactical Ridge',
          badge: 'bg-teal-50 text-teal-800 border-teal-200',
          desc: 'Medium Tactical 4x4 high-clearance; certified for mountain pass switchbacks, dirt tracks & sand dunes up to 8,000 kg.'
        };
      case 'VH-03':
        return {
          short: 'Mountain Agile 4x4 • Sand Dunes',
          badge: 'bg-sky-50 text-sky-800 border-sky-200',
          desc: 'Lightweight high-mobility 4x4; traverses tight mountain switchbacks & rapid response rough ground up to 3,000 kg.'
        };
      case 'VH-04':
        return {
          short: 'Highway Plains Arterial Only',
          badge: 'bg-slate-100 text-slate-800 border-slate-300',
          desc: 'Heavy 4x2 highway transport for flat paved arterial corridors; restricted from steep rocky passes.'
        };
      case 'VH-05':
        return {
          short: 'Medical • All Paved Corridors',
          badge: 'bg-rose-50 text-rose-800 border-rose-200',
          desc: 'All-weather medical vehicle with suspension stabilization.'
        };
      case 'VH-06':
        return {
          short: 'Fuel Tanker • Arterial Staging',
          badge: 'bg-amber-50 text-amber-800 border-amber-200',
          desc: 'High-capacity liquid fuel tanker for primary supply corridors.'
        };
      default:
        return {
          short: 'Tactical All-Terrain',
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          desc: 'General tactical transport asset.'
        };
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({ source_id: '', destination_id: '', items: '{"Food": 1200, "Water": 2400}', planned_date: new Date().toISOString().split('T')[0], vehicle_id: '', route_id: '', priority: 'Normal', notes: '', status: 'Planned' });
    setModalOpen(true);
  };

  const openEditModal = (delivery) => {
    setModalMode('edit');
    setSelectedDeliveryId(delivery.id);
    setFormData({
      source_id: delivery.source_id,
      destination_id: delivery.destination_id,
      items: JSON.stringify(delivery.items || {}),
      planned_date: delivery.planned_date ? delivery.planned_date.split('T')[0] : '',
      vehicle_id: delivery.vehicle_id,
      route_id: delivery.route_id,
      priority: delivery.priority,
      notes: delivery.notes || '',
      status: delivery.status
    });
    setModalOpen(true);
  };

  const handleSaveDelivery = async (e) => {
    e.preventDefault();
    try {
      let parsedItems = {};
      try { parsedItems = JSON.parse(formData.items); } catch(e) {}
      
      const payload = { ...formData, items: parsedItems };

      if (modalMode === 'create') {
        await api.deliveries.create(payload);
      } else {
        await api.deliveries.update(selectedDeliveryId, payload);
      }
      setModalOpen(false);
      await fetchData();
      if (refreshData) refreshData();
    } catch (err) {
      alert('Failed to save delivery mission: ' + err.message);
    }
  };

  const handleDispatch = async (deliveryId) => {
    try {
      setActionInProgressId(deliveryId);
      await api.deliveries.update(deliveryId, {
        status: 'En Route',
        notes: 'Convoy dispatched along approved route.'
      });
      await fetchData();
      if (refreshData) refreshData();
    } catch (err) {
      alert('Failed to dispatch convoy: ' + err.message);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleMarkDelivered = async (deliveryId) => {
    try {
      setActionInProgressId(deliveryId);
      await api.deliveries.completeDelivery(deliveryId);
      await fetchData();
      if (refreshData) refreshData();
      alert('Delivery marked completed! Supplies added to destination inventory and shortage alerts resolved across all portals.');
    } catch (err) {
      alert('Failed to mark delivery completed: ' + err.message);
    } finally {
      setActionInProgressId(null);
    }
  };

  const filteredVehicles = filterStatus === 'All' ? vehicles : vehicles.filter(v => v.status === filterStatus);
  const statusCounts = vehicles.reduce((acc, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1;
    return acc;
  }, {});

  const getDeliveryItems = (delivery) => {
    if (!delivery || !delivery.items) return null;
    if (typeof delivery.items === 'object') return delivery.items;
    try {
      return JSON.parse(delivery.items);
    } catch {
      return null;
    }
  };

  // Deliveries visible to Transport Coordinator must only be those allotted by Supply Officer!
  const transportEligibleDeliveries = isTransportCoordinator 
    ? (deliveries || []).filter(d => d.status === 'Ready for Dispatch' || d.status === 'En Route' || d.status === 'Delivered')
    : (deliveries || []);

  const activeMission = transportEligibleDeliveries.find(d => d.status === 'Ready for Dispatch')
    || transportEligibleDeliveries.find(d => d.status === 'En Route')
    || (transportEligibleDeliveries.length > 0 ? transportEligibleDeliveries[0] : null);
  const assignedVehicle = vehicles.find(v => v.id === activeMission?.vehicle_id);

  const activeMissionItems = getDeliveryItems(activeMission);
  const activeMissionPayload = activeMissionItems ? Math.round(
    ((Number(activeMissionItems['Food Rations'] ?? activeMissionItems.food ?? activeMissionItems.Food ?? 0)) * 1) +
    ((Number(activeMissionItems['Potable Water'] ?? activeMissionItems.water ?? activeMissionItems.Water ?? 0)) * 1) +
    ((Number(activeMissionItems['Medical Supplies'] ?? activeMissionItems.medical ?? activeMissionItems.Medical ?? 0)) * 1) +
    ((Number(activeMissionItems['Diesel Fuel'] ?? activeMissionItems.fuel ?? activeMissionItems.Fuel ?? 0)) * 0.85)
  ) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <RefreshCw className="animate-spin mr-2 text-teal-700" size={20} /> Loading fleet logistics...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs">{error}</div>}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="text-teal-700" size={22} />
            Transport Fleet &amp; Convoy Scheduling
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Fleet asset readiness, convoy dispatch &amp; delivery completion</p>
        </div>

        <button 
          onClick={fetchData} 
          className="p-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* FLEET SECTION */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Fleet Vehicle Readiness</h2>
          <div className="flex flex-wrap gap-1.5">
            {['All', 'Available', 'Assigned', 'En Route', 'Maintenance'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterStatus === s 
                    ? 'bg-teal-700 text-white shadow-xs' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {s} {s !== 'All' && `(${statusCounts[s] || 0})`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredVehicles.map(v => (
            <div key={v.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-teal-500 transition-all">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-slate-900 text-sm truncate">{v.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider ${getStatusColor(v.status)}`}>
                  {v.status}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium mb-3">{v.type} • <span className="font-mono text-teal-800 font-semibold">{v.id}</span></div>
              
              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span className="flex items-center gap-1 text-slate-400 font-medium"><Package size={13}/> Cargo Payload</span>
                    <span className="font-mono font-semibold">{v.capacity.toLocaleString()} {v.capacity_unit}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 border border-slate-200">
                    <div className="bg-teal-600 h-1.5 rounded-full" style={{ width: v.status === 'Assigned' ? '85%' : '15%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span className="flex items-center gap-1 text-slate-400 font-medium"><Battery size={13}/> Fuel Readiness</span>
                    <span className="font-mono font-semibold">{v.fuel_level}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 border border-slate-200">
                    <div className={`h-1.5 rounded-full ${v.fuel_level > 30 ? 'bg-emerald-600' : 'bg-red-600'}`} style={{ width: `${v.fuel_level}%` }}></div>
                  </div>
                </div>

                <div className="flex justify-between border-t border-slate-100 pt-2 text-slate-500">
                  <span className="flex items-center gap-1 text-slate-400"><MapPin size={13}/> Station:</span>
                  <span className="font-semibold text-slate-700 truncate max-w-[130px]">{v.location_name || 'Forward Staging'}</span>
                </div>

                <div className="border-t border-slate-100 pt-2 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="flex items-center gap-1 text-slate-400 font-medium">
                      <Navigation size={12} className="text-teal-600" /> Terrain Fit:
                    </span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${getVehicleTerrainSuitability(v.id).badge}`}>
                      {getVehicleTerrainSuitability(v.id).short.split('•')[0].trim()}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {getVehicleTerrainSuitability(v.id).short}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DELIVERIES SECTION */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Scheduled Resupply Deliveries</h2>
            <p className="text-xs text-slate-500">Active and planned cargo transit missions</p>
          </div>
          {/* Arbitrary create button is hidden for Transport Coordinator */}
          {canCreateDelivery && (
            <button 
              onClick={openCreateModal} 
              className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} /> Schedule New Delivery
            </button>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Mission ID</th>
                  <th className="py-3 px-4">Origin ➔ Destination</th>
                  <th className="py-3 px-3">Assigned Route</th>
                  <th className="py-3 px-3">Planned ETA</th>
                  <th className="py-3 px-3">Assigned Vehicle</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Priority</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transportEligibleDeliveries.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-xs text-teal-800">{d.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>{d.source_name} ➔ {d.dest_name}</span>
                        {d.notes && d.notes.includes('[COMBINED_ROUTE:') && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300 text-[10px] font-black uppercase tracking-wider">
                            Multi-Stop Corridor
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 text-xs">{d.route_name || d.route_id}</div>
                      {(() => {
                        const dItems = getDeliveryItems(d);
                        if (!dItems || Object.keys(dItems).length === 0) return null;
                        return (
                          <div className="text-[10px] text-slate-600 mt-1 flex flex-wrap gap-1 font-mono">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              Food: {dItems['Food Rations'] ?? dItems.food ?? 0}
                            </span>
                            <span className="bg-sky-50 text-sky-800 px-1.5 py-0.5 rounded border border-sky-200">
                              Water: {dItems['Potable Water'] ?? dItems.water ?? 0}L
                            </span>
                            <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                              Med: {dItems['Medical Supplies'] ?? dItems.medical ?? 0}
                            </span>
                            <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                              Fuel: {dItems['Diesel Fuel'] ?? dItems.fuel ?? 0}L
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-3 text-xs font-mono text-slate-700">{new Date(d.planned_date).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-xs text-slate-700">
                      <div className="font-semibold text-slate-800">{d.vehicle_name || d.vehicle_id}</div>
                      <div className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 mt-0.5 inline-block">
                        {getVehicleTerrainSuitability(d.vehicle_id).short.split('•')[0].trim()} Match ✓
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                        d.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        d.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {d.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {d.status !== 'Delivered' && (
                          <>
                            {d.status !== 'En Route' && (
                              <button
                                onClick={() => handleDispatch(d.id)}
                                disabled={actionInProgressId === d.id}
                                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer"
                                title="Dispatch Convoy"
                              >
                                Dispatch
                              </button>
                            )}

                            <button
                              onClick={() => handleMarkDelivered(d.id)}
                              disabled={actionInProgressId === d.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer"
                              title="Mark Delivered & Credit Inventory"
                            >
                              Delivered
                            </button>
                          </>
                        )}

                        {d.status === 'Delivered' && (
                          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle size={14} /> Completed
                          </span>
                        )}

                        {!isTransportCoordinator && (
                          <button 
                            onClick={() => openEditModal(d)} 
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors inline-flex items-center cursor-pointer"
                            title="Edit Delivery"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {transportEligibleDeliveries.length === 0 && (
                  <tr><td colSpan="8" className="p-8 text-center text-xs text-slate-400">No resupply convoys allotted by Supply Officer yet. Convoys will appear once rations are allotted.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{modalMode === 'create' ? 'Create Delivery Mission' : 'Modify Delivery Plan'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleSaveDelivery} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Origin Source</label>
                  <select required value={formData.source_id} onChange={e => setFormData({...formData, source_id: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900">
                    <option value="">Select Origin...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Destination Point</label>
                  <select required value={formData.destination_id} onChange={e => setFormData({...formData, destination_id: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900">
                    <option value="">Select Dest...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Manifest Items (JSON format)</label>
                <input type="text" required value={formData.items} onChange={e => setFormData({...formData, items: e.target.value})} placeholder='{"Water": 100, "Food": 50}' className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900 font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Planned Date</label>
                  <input type="date" required value={formData.planned_date} onChange={e => setFormData({...formData, planned_date: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900">
                    <option>Normal</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assigned Vehicle</label>
                  <select required value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900">
                    <option value="">Select Vehicle...</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.capacity} {v.capacity_unit})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assigned Route</label>
                  <select required value={formData.route_id} onChange={e => setFormData({...formData, route_id: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-900">
                    <option value="">Select Route...</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.distance}km)</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800 cursor-pointer">Save Mission</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
