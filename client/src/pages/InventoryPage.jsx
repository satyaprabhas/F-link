import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Package, Search, Filter, Edit, Plus, AlertTriangle, 
  CheckCircle, Clock, Save, X, RefreshCw, ShieldAlert
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const InventoryPage = () => {
  const { user, t, language } = useAppContext() || {};
  const canManageInventory = user?.role === 'Supply / Inventory Officer' || user?.role === 'Administrator';
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [formData, setFormData] = useState({
    location_id: '',
    item: '',
    category: 'Food',
    quantity: 0,
    unit: 'pallets',
    daily_consumption: 0,
    safety_stock: 0,
    incoming_quantity: 0,
    expected_delivery: ''
  });

  const categories = ['All', 'Food', 'Water', 'Medical', 'Fuel'];

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [selectedLocation]);

  const fetchLocations = async () => {
    try {
      const data = await api.locations.getAll();
      setLocations(data);
    } catch (err) {
      console.error('Failed to fetch locations', err);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.inventory.getAll(selectedLocation || undefined);
      setInventory(data);
    } catch (err) {
      setError('Failed to load inventory data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setFormData({
      quantity: item.quantity,
      daily_consumption: item.daily_consumption,
      safety_stock: item.safety_stock,
      incoming_quantity: item.incoming_quantity || 0,
      expected_delivery: item.expected_delivery || ''
    });
    setIsEditModalOpen(true);
  };

  const handleAddClick = () => {
    setFormData({
      location_id: locations.length > 0 ? locations[0].id : '',
      item: '',
      category: 'Food',
      quantity: 0,
      unit: 'units',
      daily_consumption: 0,
      safety_stock: 0,
    });
    setIsAddModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.inventory.update(editingItem.id, formData);
      setIsEditModalOpen(false);
      fetchInventory();
    } catch (err) {
      alert('Failed to update inventory');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.inventory.create(formData);
      setIsAddModalOpen(false);
      fetchInventory();
    } catch (err) {
      alert('Failed to add inventory');
    }
  };

  const filteredInventory = inventory.filter(item => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  // Calculate summary metrics
  const totalItems = inventory.length;
  const criticalItems = inventory.filter(i => i.status === 'Critical').length;
  const lowItems = inventory.filter(i => i.status === 'Low').length;
  
  const validDays = inventory.filter(i => i.daily_consumption > 0);
  const avgDaysRemaining = validDays.length 
    ? Math.round(validDays.reduce((acc, i) => acc + (i.quantity / i.daily_consumption), 0) / validDays.length) 
    : 0;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Critical': return 'text-red-700 bg-red-50 border-red-200';
      case 'Low': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Adequate': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Surplus': return 'text-teal-700 bg-teal-50 border-teal-200';
      default: return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="text-teal-700" size={22} />
            {t('Forward Inventory Management')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('Stock monitoring, days-of-supply analysis & resupply safety buffers')}</p>
        </div>
        {canManageInventory ? (
          <button 
            onClick={handleAddClick}
            className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={16} /> {t('Add Inventory Item')}
          </button>
        ) : (
          <div className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
            <span className="font-semibold text-slate-700">{t('Current Role')}:</span> {t(user?.role)}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{t('Total Stock Items')}</div>
          <div className="text-2xl font-extrabold text-slate-900">{totalItems}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-red-600 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <AlertTriangle size={13} /> {t('Critical Items')}
          </div>
          <div className="text-2xl font-extrabold text-red-600">{criticalItems}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-amber-600 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <AlertTriangle size={13} /> {t('Low Supply Items')}
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{lowItems}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock size={13} /> {t('Avg Days Remaining')}
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{avgDaysRemaining} <span className="text-sm font-medium text-slate-500">{t('Days Remaining')}</span></div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Filter size={15} className="text-teal-700" />
            <span>{t('Filter Location:')}</span>
          </div>
          <select 
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg py-1.5 px-3 text-xs font-medium focus:outline-none focus:border-teal-700"
          >
            <option value="">{t('All Locations (Depots & Forward)')}</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{t(loc.name)} ({t(loc.type)})</option>
            ))}
          </select>
        </div>
        
        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat 
                  ? 'bg-teal-700 text-white shadow-xs' 
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {t(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="animate-spin text-teal-700" size={18} /> {t('Loading')}...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 font-medium">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">{t('Location')}</th>
                  <th className="py-3 px-4">{t('Item')}</th>
                  <th className="py-3 px-3">{t('Category')}</th>
                  <th className="py-3 px-3 text-right">{t('Quantity')}</th>
                  <th className="py-3 px-3">{t('Unit')}</th>
                  <th className="py-3 px-3 text-right">{t('Daily Consumption')}</th>
                  <th className="py-3 px-3 text-right">{t('Days Remaining')}</th>
                  <th className="py-3 px-3 text-right">{t('Safety Stock')}</th>
                  <th className="py-3 px-3">{t('Health Status')}</th>
                  <th className="py-3 px-3 text-right">{t('Incoming')}</th>
                  <th className="py-3 px-4">{t('Expected Delivery')}</th>
                  <th className="py-3 px-4 text-center">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="p-8 text-center text-slate-400">No inventory records found for current filters.</td>
                  </tr>
                ) : (
                  filteredInventory.map(item => {
                    const daysRem = item.daily_consumption > 0 
                      ? Math.round((item.quantity / item.daily_consumption) * 10) / 10 
                      : 'N/A';
                    
                    let daysColor = 'text-slate-800';
                    if (daysRem !== 'N/A') {
                      if (daysRem <= 2) daysColor = 'text-red-600 font-bold';
                      else if (daysRem <= 5) daysColor = 'text-amber-600 font-bold';
                      else daysColor = 'text-emerald-700 font-bold';
                    }

                    return (
                      <tr key={item.id} className="hover:bg-teal-50/25 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{t(item.location_name)}</td>
                        <td className="py-3 px-4 font-bold text-teal-900">{t(item.item)}</td>
                        <td className="py-3 px-3 text-xs text-slate-600">{t(item.category)}</td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-900">{item.quantity.toLocaleString()}</td>
                        <td className="py-3 px-3 text-xs text-slate-500">{t(item.unit)}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">{item.daily_consumption.toLocaleString()}</td>
                        <td className={`py-3 px-3 text-right font-mono ${daysColor}`}>{daysRem !== 'N/A' ? `${daysRem}d` : 'N/A'}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">{item.safety_stock.toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(item.status)}`}>
                            {t(item.status)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-teal-800 font-semibold">{item.incoming_quantity ? `+${item.incoming_quantity.toLocaleString()}` : '-'}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">{item.expected_delivery || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          {canManageInventory ? (
                            <button 
                              onClick={() => handleEditClick(item)}
                              className="text-teal-700 hover:text-teal-900 hover:bg-teal-50 p-1.5 rounded-md transition-colors inline-flex items-center cursor-pointer"
                              title={t('Edit Base')}
                            >
                              <Edit size={15} />
                            </button>
                          ) : (
                            <span className="text-slate-300 text-xs font-mono">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">{t('Modify')}: {t(editingItem?.item)}</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">{t('Quantity')}</label>
                  <input type="number" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">{t('Daily Consumption')}</label>
                  <input type="number" step="0.1" required value={formData.daily_consumption} onChange={e => setFormData({...formData, daily_consumption: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">{t('Safety Stock')}</label>
                  <input type="number" required value={formData.safety_stock} onChange={e => setFormData({...formData, safety_stock: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">{t('Incoming')}</label>
                  <input type="number" value={formData.incoming_quantity} onChange={e => setFormData({...formData, incoming_quantity: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">{t('Expected Delivery')}</label>
                  <input type="date" value={formData.expected_delivery || ''} onChange={e => setFormData({...formData, expected_delivery: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 text-xs font-semibold cursor-pointer">{t('Cancel')}</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-teal-700 text-white font-semibold flex items-center gap-1.5 hover:bg-teal-800 text-xs shadow-xs cursor-pointer"><Save size={14} /> {t('Save Changes')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Add New Inventory Stock</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Forward / Depot Location</label>
                <select required value={formData.location_id} onChange={e => setFormData({...formData, location_id: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-sm">
                  <option value="">Select Location</option>
                  {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Item Description</label>
                  <input type="text" required placeholder="e.g. Food Rations Pack" value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-sm">
                    {categories.filter(c => c !== 'All').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit of Measure</label>
                  <input type="text" required placeholder="units, liters, kg" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Initial Quantity</label>
                  <input type="number" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Daily Cons. Rate</label>
                  <input type="number" step="0.1" required value={formData.daily_consumption} onChange={e => setFormData({...formData, daily_consumption: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Safety Stock Threshold</label>
                  <input type="number" required value={formData.safety_stock} onChange={e => setFormData({...formData, safety_stock: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-teal-700 text-white font-semibold flex items-center gap-1.5 hover:bg-teal-800 text-xs shadow-xs"><Plus size={14} /> Add Stock Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
