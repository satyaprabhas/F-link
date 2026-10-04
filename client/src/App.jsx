import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { RefreshCw } from 'lucide-react';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import DemandForecastPage from './pages/DemandForecastPage';
import SupplyRiskPage from './pages/SupplyRiskPage';
import TransportPage from './pages/TransportPage';
import WeatherRoutePage from './pages/WeatherRoutePage';
import WhatIfPage from './pages/WhatIfPage';
import RecommendationsPage from './pages/RecommendationsPage';
import IoTSimulationPage from './pages/IoTSimulationPage';
import DataManagementPage from './pages/DataManagementPage';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogPage from './pages/AuditLogPage';
import SettingsPage from './pages/SettingsPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAppContext();
  
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 text-slate-600 text-sm">
        <RefreshCw className="animate-spin text-teal-700 mr-2.5" size={20} />
        <span className="font-semibold">Initializing F-LINK Portal...</span>
      </div>
    );
  }

  return isAuthenticated ? (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  ) : (
    <Navigate to="/login" replace />
  );
};

const AppContent = () => {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="demand-forecast" element={<DemandForecastPage />} />
          <Route path="supply-risk" element={<SupplyRiskPage />} />
          <Route path="transport" element={<TransportPage />} />
          <Route path="gis-map" element={<Navigate to="/weather-route" replace />} />
          <Route path="weather-route" element={<WeatherRoutePage />} />
          <Route path="what-if" element={<WhatIfPage />} />
          <Route path="recommendations" element={<RecommendationsPage />} />
          <Route path="iot-simulation" element={<IoTSimulationPage />} />
          <Route path="data-management" element={<DataManagementPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit-log" element={<AuditLogPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
};

const App = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
