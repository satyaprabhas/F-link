import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import LanguageToggle from '../components/LanguageToggle';
import { 
  Lock, User, Eye, EyeOff, Package, Truck, ShieldAlert, Settings, Info, Check
} from 'lucide-react';

const LoginPage = () => {
  const [selectedRole, setSelectedRole] = useState('Logistics Officer');
  const [username, setUsername] = useState('logistics');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login: contextLogin, t } = useAppContext();

  const roleCredentials = {
    'Logistics Officer': { u: 'logistics', p: 'demo123', label: 'Logistics Officer' },
    'Supply / Inventory Officer': { u: 'supply', p: 'demo123', label: 'Supply Officer' },
    'Transport Coordinator': { u: 'transport', p: 'demo123', label: 'Transport Coordinator' },
    'Administrator': { u: 'admin', p: 'admin123', label: 'Administrator' }
  };

  const handleSelectRole = (roleKey) => {
    setSelectedRole(roleKey);
    const creds = roleCredentials[roleKey];
    if (creds) {
      setUsername(creds.u);
      setPassword(creds.p);
    }
    setError('');
  };

  const executeLogin = async (u, p) => {
    setLoading(true);
    setError('');

    try {
      const data = await api.auth.login({ username: u, password: p });
      
      sessionStorage.setItem('flink_token', data.token);
      sessionStorage.setItem('flink_user', JSON.stringify(data.user));
      
      if (contextLogin) {
        contextLogin(data.user, data.token);
      }
      
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please check credentials or server connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = (e) => {
    e?.preventDefault();
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }
    executeLogin(username, password);
  };

  const handleRoleQuickLogin = (u, p, roleKey) => {
    if (roleKey) setSelectedRole(roleKey);
    setUsername(u);
    setPassword(p);
    executeLogin(u, p);
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row">
      
      {/* ── LEFT HALF: Full Half-Page Hero Graphic (Edge-to-Edge) ── */}
      <div className="w-full lg:w-1/2 min-h-[340px] sm:min-h-[440px] lg:min-h-screen relative overflow-hidden bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200 flex items-stretch">
        <img 
          src="/login-hero.jpg" 
          alt="Stronger Supply Lines, Safer Operations" 
          className="w-full h-full object-cover object-center select-none block"
        />
      </div>

      {/* ── RIGHT HALF: Clean Centered Login Dashboard ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12 bg-white overflow-y-auto">
        <div className="w-full max-w-sm sm:max-w-md space-y-3.5 sm:space-y-4">
          
          {/* Top Language Toggle Switcher */}
          <div className="flex justify-end">
            <LanguageToggle />
          </div>

          {/* Header */}
          <div className="text-center flex flex-col items-center">
            <img 
              src="/flink-emblem.png" 
              alt="F-LINK Emblem" 
              className="w-13 h-auto object-contain mb-1.5 drop-shadow-xs select-none" 
            />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-wider">
              F-LINK
            </h1>
            <p className="text-teal-700 font-bold text-[11px] sm:text-xs uppercase tracking-widest mt-0.5">
              {t('Forward Logistics Intelligence & Network')}
            </p>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 mt-2">
              {t('Welcome')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {t('Smart supply prediction & resupply decision assistant for forward locations.')}
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-700 border border-rose-200 p-2.5 text-xs rounded-xl font-medium text-center">
              {error}
            </div>
          )}

          {/* Select Your Role (Clean Interactive Cards) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 tracking-wide">
              {t('Select Your Role')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              
              {/* 1. Logistics Officer */}
              <button
                type="button"
                onClick={() => handleSelectRole('Logistics Officer')}
                className={`relative p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[72px] ${
                  selectedRole === 'Logistics Officer'
                    ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-600/20 text-teal-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                {selectedRole === 'Logistics Officer' && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-teal-600 rounded-full flex items-center justify-center text-white">
                    <Check size={9} strokeWidth={3} />
                  </span>
                )}
                <ShieldAlert size={18} className={selectedRole === 'Logistics Officer' ? 'text-teal-700' : 'text-slate-500'} />
                <span className="text-[11px] font-bold mt-1 leading-tight">{t('Logistics')}</span>
                <span className="text-[9px] text-slate-500 font-medium">{t('Officer')}</span>
              </button>

              {/* 2. Supply Officer */}
              <button
                type="button"
                onClick={() => handleSelectRole('Supply / Inventory Officer')}
                className={`relative p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[72px] ${
                  selectedRole === 'Supply / Inventory Officer'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 text-emerald-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                {selectedRole === 'Supply / Inventory Officer' && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-600 rounded-full flex items-center justify-center text-white">
                    <Check size={9} strokeWidth={3} />
                  </span>
                )}
                <Package size={18} className={selectedRole === 'Supply / Inventory Officer' ? 'text-emerald-700' : 'text-slate-500'} />
                <span className="text-[11px] font-bold mt-1 leading-tight">{t('Supply')}</span>
                <span className="text-[9px] text-slate-500 font-medium">{t('Officer')}</span>
              </button>

              {/* 3. Transport Coordinator */}
              <button
                type="button"
                onClick={() => handleSelectRole('Transport Coordinator')}
                className={`relative p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[72px] ${
                  selectedRole === 'Transport Coordinator'
                    ? 'border-sky-600 bg-sky-50/70 ring-2 ring-sky-600/20 text-sky-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                {selectedRole === 'Transport Coordinator' && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-sky-600 rounded-full flex items-center justify-center text-white">
                    <Check size={9} strokeWidth={3} />
                  </span>
                )}
                <Truck size={18} className={selectedRole === 'Transport Coordinator' ? 'text-sky-700' : 'text-slate-500'} />
                <span className="text-[11px] font-bold mt-1 leading-tight">{t('Transport')}</span>
                <span className="text-[9px] text-slate-500 font-medium">{t('Coordinator')}</span>
              </button>

              {/* 4. Administrator */}
              <button
                type="button"
                onClick={() => handleSelectRole('Administrator')}
                className={`relative p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[72px] ${
                  selectedRole === 'Administrator'
                    ? 'border-slate-700 bg-slate-100 ring-2 ring-slate-400/30 text-slate-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                {selectedRole === 'Administrator' && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-slate-700 rounded-full flex items-center justify-center text-white">
                    <Check size={9} strokeWidth={3} />
                  </span>
                )}
                <Settings size={18} className={selectedRole === 'Administrator' ? 'text-slate-800' : 'text-slate-500'} />
                <span className="text-[11px] font-bold mt-1 leading-tight">{t('Admin')}</span>
                <span className="text-[9px] text-slate-500 font-medium">{t('System')}</span>
              </button>

            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleManualLogin} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Username')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={15} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-teal-700 text-xs font-medium transition-colors"
                  placeholder={t('Enter username')}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('Password')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-teal-700 text-xs font-medium transition-colors"
                  placeholder={t('Enter password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-teal-700 hover:bg-teal-800 text-white font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center text-xs tracking-wide shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? t('Authenticating...') : t('Login to Dashboard')}
            </button>
          </form>

          {/* Quick Demo Login Box (Reference Placement at Bottom) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs mt-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px] mb-2">
              <Info size={14} className="text-teal-700" />
              <span>{t('Quick Demo Login:')}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => handleRoleQuickLogin('logistics', 'demo123', 'Logistics Officer')}
                className="p-1.5 bg-white border border-slate-200 hover:border-teal-500 hover:bg-teal-50 rounded-lg text-left transition-colors flex justify-between items-center px-2 cursor-pointer shadow-2xs"
              >
                <span className="font-semibold text-slate-800">{t('Logistics')}</span>
                <span className="text-[10px] text-slate-400">demo123</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleQuickLogin('supply', 'demo123', 'Supply / Inventory Officer')}
                className="p-1.5 bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 rounded-lg text-left transition-colors flex justify-between items-center px-2 cursor-pointer shadow-2xs"
              >
                <span className="font-semibold text-slate-800">{t('Supply')}</span>
                <span className="text-[10px] text-slate-400">demo123</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleQuickLogin('transport', 'demo123', 'Transport Coordinator')}
                className="p-1.5 bg-white border border-slate-200 hover:border-sky-500 hover:bg-sky-50 rounded-lg text-left transition-colors flex justify-between items-center px-2 cursor-pointer shadow-2xs"
              >
                <span className="font-semibold text-slate-800">{t('Transport')}</span>
                <span className="text-[10px] text-slate-400">demo123</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleQuickLogin('admin', 'admin123', 'Administrator')}
                className="p-1.5 bg-white border border-slate-200 hover:border-slate-500 hover:bg-slate-100 rounded-lg text-left transition-colors flex justify-between items-center px-2 cursor-pointer shadow-2xs"
              >
                <span className="font-semibold text-slate-800">{t('Admin')}</span>
                <span className="text-[10px] text-slate-400">admin123</span>
              </button>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-[10px] text-slate-400 pt-1">
            {t('F-LINK Tactical Logistics Core v2.5 • Decision Support System')}
          </p>

        </div>
      </div>

    </div>
  );
};

export default LoginPage;
