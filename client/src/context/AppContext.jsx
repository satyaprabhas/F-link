import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { api } from '../services/api';

export const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [connectivity, setConnectivity] = useState('Online');
  const [lastSync, setLastSync] = useState(new Date().toISOString());

  // Check existing session on mount (Strictly sessionStorage so new window/tab opens login portal first)
  useEffect(() => {
    try {
      // Clear legacy persistent localStorage to prevent session leakage across tabs/persons
      localStorage.removeItem('flink_token');
      localStorage.removeItem('flink_user');

      const token = sessionStorage.getItem('flink_token');
      const savedUser = sessionStorage.getItem('flink_user');
      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch {
      sessionStorage.removeItem('flink_token');
      sessionStorage.removeItem('flink_user');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (credentialsOrUser, explicitToken) => {
    if (explicitToken) {
      sessionStorage.setItem('flink_token', explicitToken);
    }
    if (credentialsOrUser && credentialsOrUser.role && !credentialsOrUser.password) {
      const userStr = JSON.stringify(credentialsOrUser);
      sessionStorage.setItem('flink_user', userStr);
      setUser(credentialsOrUser);
      setIsAuthenticated(true);
      return;
    }
    const { token, user: userData } = await api.auth.login(credentialsOrUser);
    const userStr = JSON.stringify(userData);
    sessionStorage.setItem('flink_token', token);
    sessionStorage.setItem('flink_user', userStr);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const updateUser = (updatedUser, explicitToken) => {
    if (explicitToken) {
      sessionStorage.setItem('flink_token', explicitToken);
    }
    const userStr = JSON.stringify(updatedUser);
    sessionStorage.setItem('flink_user', userStr);
    setUser(updatedUser);
  };

  const logout = () => {
    sessionStorage.removeItem('flink_token');
    sessionStorage.removeItem('flink_user');
    localStorage.removeItem('flink_token');
    localStorage.removeItem('flink_user');
    setUser(null);
    setIsAuthenticated(false);
    setAlerts([]);
    setAlertCount(0);
  };

  const refreshData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const alertData = await api.alerts.getAll({ status: 'New' });
      const activeAlerts = Array.isArray(alertData) ? alertData : [];
      setAlerts(activeAlerts);
      setAlertCount(activeAlerts.length);
      setConnectivity('Online');
      setLastSync(new Date().toISOString());
    } catch (err) {
      if (err.message?.includes('Failed to fetch') || err.message?.includes('unavailable')) {
        setConnectivity('Offline');
      } else {
        setConnectivity('Limited');
      }
    }
  }, [isAuthenticated]);

  // Poll for alerts when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
      const interval = setInterval(refreshData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refreshData]);

  return (
    <AppContext.Provider value={{
      user, isAuthenticated, login, logout, updateUser,
      alerts, alertCount, connectivity, lastSync, refreshData, loading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
