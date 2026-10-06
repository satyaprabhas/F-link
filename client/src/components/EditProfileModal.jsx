import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, Check, X, Shield, RefreshCw, KeyRound, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';

export default function EditProfileModal({ isOpen, onClose }) {
  const { user, updateUser, t } = useAppContext() || {};
  
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.full_name || user.username || '');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccessMsg('');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 4) {
        setError('New password must be at least 4 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = await api.auth.updateProfile({
        full_name: fullName.trim(),
        password: newPassword.trim() || undefined
      });

      if (res.user) {
        updateUser(res.user, res.token);
      }
      setSuccessMsg('Profile and credentials updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Logistics Officer':
        return 'bg-teal-100 text-teal-900 border-teal-300';
      case 'Supply / Inventory Officer':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Transport Coordinator':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      case 'Administrator':
        return 'bg-slate-200 text-slate-900 border-slate-400';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header with Emblem */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/flink-emblem.png" 
              alt="F-LINK Emblem" 
              className="w-9 h-9 object-contain"
            />
            <div>
              <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                {t('Edit Profile & Password')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {t('Update officer name and access password')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            title={t('Close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
              <span>{t(error)}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
              <Check size={16} className="text-emerald-600 flex-shrink-0" />
              <span>{t(successMsg)}</span>
            </div>
          )}

          {/* Current Role & Username */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('Logged In Account')}</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{user?.username || 'officer'}</span>
            </div>
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getRoleBadge(user?.role)}`}>
              {t(user?.role) || t('Officer')}
            </span>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <User size={14} className="text-teal-700" />
              {t('Officer Full Name')}
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Capt. James Mitchell"
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-teal-700 focus:outline-hidden"
            />
          </div>

          {/* New Password */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock size={14} className="text-teal-700" />
                {t('New Password')}
              </label>
              <span className="text-[10px] text-slate-400 font-medium">{t('Leave blank to keep current')}</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('Enter new password (optional)')}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 pr-10 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-teal-700 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? t('Hide password') : t('Show password')}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          {newPassword.length > 0 && (
            <div className="animate-in fade-in duration-150">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <KeyRound size={14} className="text-teal-700" />
                {t('Confirm New Password')}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('Re-type new password')}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-teal-700 focus:outline-hidden"
              />
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {t('Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> {t('Saving...')}
                </>
              ) : (
                <>
                  <Check size={14} /> {t('Save Profile')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
