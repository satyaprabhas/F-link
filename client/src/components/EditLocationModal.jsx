import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, MapPin, Users, Building, Shield } from 'lucide-react';
import { api } from '../services/api';

export default function EditLocationModal({ location, isOpen, onClose, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'forward_location',
    personnel: 120,
    region: 'Northern Sector',
    status: 'Operational'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        type: location.type || 'forward_location',
        personnel: location.personnel || 0,
        region: location.region || '',
        status: location.status || 'Operational'
      });
      setError('');
    }
  }, [location]);

  if (!isOpen || !location) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Location / Post name cannot be empty');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await api.locations.update(location.id, {
        name: formData.name.trim(),
        type: formData.type,
        personnel: Number(formData.personnel) || 0,
        region: formData.region.trim(),
        status: formData.status
      });
      onSaveSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update location details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Edit3 size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Edit Base &amp; Post Information</h3>
              <p className="text-[11px] text-slate-500">ID: {location.id}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building size={14} className="text-teal-700" /> Base / Post Name
            </label>
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
              placeholder="e.g. Post Bravo (Forward Charlie)"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin size={14} className="text-teal-700" /> Facility Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
              >
                <option value="forward_location">Forward Post</option>
                <option value="depot">Supply Depot</option>
                <option value="supply_point">Staging Point</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Users size={14} className="text-teal-700" /> Personnel Count
              </label>
              <input 
                type="number"
                min="0"
                value={formData.personnel}
                onChange={(e) => setFormData({ ...formData, personnel: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                placeholder="120"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Region / Sector
              </label>
              <input 
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                placeholder="Sector North"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Shield size={14} className="text-teal-700" /> Operational Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
              >
                <option value="Operational">Operational</option>
                <option value="Critical Shortage">Critical Shortage</option>
                <option value="Alert">Alert</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save size={14} />
              {saving ? 'Saving Changes...' : 'Save & Update Everywhere'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
