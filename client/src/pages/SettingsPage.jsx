import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { Settings, User, Shield, Sliders, Database, Save, Info, CheckCircle2, Edit3, KeyRound } from 'lucide-react';
import EditProfileModal from '../components/EditProfileModal';

const SettingsPage = () => {
  const { user } = useAppContext();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.settings.getAll();
        const settingsMap = {};
        if (data && Array.isArray(data)) {
          data.forEach(s => {
            settingsMap[s.key] = s.value;
          });
        }
        setSettings(settingsMap);
      } catch (err) {
        console.error('Failed to load settings', err);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleUpdate = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const handleSaveGroup = async (keys) => {
    setSaveStatus('Saving configuration...');
    try {
      for (const key of keys) {
        if (settings[key] !== undefined) {
          await api.settings.update(key, settings[key]);
        }
      }
      setSaveStatus('Settings updated successfully.');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error('Error saving settings', err);
      setSaveStatus('Error saving settings.');
    }
  };

  const isAdmin = user?.role === 'Administrator';

  if (loading) return <div className="p-8 text-center text-slate-400">Loading system configuration...</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="text-teal-700" size={22} />
            System Configuration &amp; Risk Parameters
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Threshold calibration, buffer policies &amp; operator permissions</p>
        </div>
      </div>

      {!isAdmin && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <Info size={16} className="text-amber-600 flex-shrink-0" />
          <span>Administrative Notice: System settings, risk calibration, and polling policies are managed by the Administrator. Viewing in read-only mode.</span>
        </div>
      )}

      {saveStatus && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          saveStatus.includes('Error') 
            ? 'bg-red-50 border-red-200 text-red-700' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <CheckCircle2 size={16} />
          {saveStatus}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Profile */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center mb-4 border-b border-slate-100 pb-2.5">
            <User size={16} className="mr-2 text-teal-700" /> Active Session Profile
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 font-bold uppercase block mb-1">Operator Call-sign</label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono">{user?.username || 'admin'}</div>
            </div>
            <div>
              <label className="text-slate-400 font-bold uppercase block mb-1">Full Officer Name</label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold">{user?.full_name || 'CPT James Mitchell'}</div>
            </div>
            <div>
              <label className="text-slate-400 font-bold uppercase block mb-1">Authorized Clearance Role</label>
              <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 font-bold uppercase tracking-wider">{user?.role || 'Logistics Officer'}</div>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setEditProfileOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Edit3 size={14} />
                <span>Edit Name &amp; Password</span>
              </button>
            </div>
          </div>
        </div>

        {/* Risk Thresholds */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center mb-4 border-b border-slate-100 pb-2.5">
            <Shield size={16} className="mr-2 text-teal-700" /> Risk Alert Threshold Calibration
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="text-red-700 font-bold">Critical Risk Trigger Score</label>
                <span className="font-mono font-bold text-red-700">&ge; {settings.risk_threshold_critical || 60} pts</span>
              </div>
              <input type="range" min="0" max="100" value={settings.risk_threshold_critical || 60} onChange={(e) => handleUpdate('risk_threshold_critical', parseInt(e.target.value))} className="w-full accent-red-600" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="text-orange-700 font-bold">High Risk Trigger Score</label>
                <span className="font-mono font-bold text-orange-700">&ge; {settings.risk_threshold_high || 40} pts</span>
              </div>
              <input type="range" min="0" max="100" value={settings.risk_threshold_high || 40} onChange={(e) => handleUpdate('risk_threshold_high', parseInt(e.target.value))} className="w-full accent-orange-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="text-amber-700 font-bold">Medium Risk Trigger Score</label>
                <span className="font-mono font-bold text-amber-700">&ge; {settings.risk_threshold_medium || 20} pts</span>
              </div>
              <input type="range" min="0" max="100" disabled={!isAdmin} value={settings.risk_threshold_medium || 20} onChange={(e) => handleUpdate('risk_threshold_medium', parseInt(e.target.value))} className="w-full accent-amber-500" />
            </div>
            {isAdmin && (
              <button 
                onClick={() => handleSaveGroup(['risk_threshold_critical', 'risk_threshold_high', 'risk_threshold_medium'])}
                className="mt-2 flex items-center px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Save size={13} className="mr-1.5" /> Save Risk Calibration
              </button>
            )}
          </div>
        </div>

        {/* Operational Constraints */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center mb-4 border-b border-slate-100 pb-2.5">
            <Sliders size={16} className="mr-2 text-teal-700" /> Resupply Safety Buffers
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="text-slate-800 font-bold">Safety Stock Horizon</label>
                <span className="text-teal-800 font-mono font-bold">{settings.safety_stock_days || 3} Days</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Forward locations below this threshold automatically generate Critical resupply alerts.</p>
              <input type="range" min="1" max="14" disabled={!isAdmin} value={settings.safety_stock_days || 3} onChange={(e) => handleUpdate('safety_stock_days', parseInt(e.target.value))} className="w-full accent-teal-700" />
            </div>
            
            {isAdmin && (
              <button 
                onClick={() => handleSaveGroup(['safety_stock_days'])}
                className="mt-2 flex items-center px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Save size={13} className="mr-1.5" /> Save Buffer Policy
              </button>
            )}
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center mb-4 border-b border-slate-100 pb-2.5">
            <Database size={16} className="mr-2 text-teal-700" /> Operational Polling Cycle
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-slate-800 font-bold text-xs block mb-1">Telemetry Sync Interval (seconds)</label>
              <p className="text-[11px] text-slate-400 mb-2">Automated background cycle for IoT simulation &amp; alert polling.</p>
              <input 
                type="number" 
                min="10" max="3600" 
                disabled={!isAdmin}
                value={settings.data_refresh_interval || 30} 
                onChange={(e) => handleUpdate('data_refresh_interval', parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-mono" 
              />
            </div>
            
            {isAdmin && (
              <button 
                onClick={() => handleSaveGroup(['data_refresh_interval'])}
                className="mt-2 flex items-center px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Save size={13} className="mr-1.5" /> Save Polling Cycle
              </button>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center text-slate-400 text-xs">
              <Info size={13} className="mr-1 text-teal-700" /> F-LINK Operational Core v2.4.1 — Military Decision Support
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
    </div>
  );
};

export default SettingsPage;
