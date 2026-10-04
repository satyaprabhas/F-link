import { createServer } from 'vite';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

async function testRender() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  const { MemoryRouter } = await vite.ssrLoadModule('react-router-dom');
  const { AppContext } = await vite.ssrLoadModule('/src/context/AppContext.jsx');

  const mockContextValue = {
    user: { id: 1, username: 'logistics', role: 'Logistics Officer', full_name: 'Logistics Officer' },
    token: 'test-token',
    isAuthenticated: true,
    alerts: [],
    alertCount: 0,
    connectivity: 'Online',
    lastSync: new Date().toLocaleTimeString(),
    login: () => {},
    logout: () => {},
    refreshData: () => {}
  };

  const pages = [
    { name: 'DashboardPage (Logistics)', path: '/src/pages/DashboardPage.jsx', role: 'Logistics Officer' },
    { name: 'DashboardPage (Supply)', path: '/src/pages/DashboardPage.jsx', role: 'Supply / Inventory Officer' },
    { name: 'DashboardPage (Transport)', path: '/src/pages/DashboardPage.jsx', role: 'Transport Coordinator' },
    { name: 'DashboardPage (Admin)', path: '/src/pages/DashboardPage.jsx', role: 'Administrator' },
    { name: 'WeatherRoutePage', path: '/src/pages/WeatherRoutePage.jsx' },
    { name: 'RecommendationsPage', path: '/src/pages/RecommendationsPage.jsx' },
    { name: 'TransportPage', path: '/src/pages/TransportPage.jsx' },
    { name: 'InventoryPage', path: '/src/pages/InventoryPage.jsx' },
    { name: 'DemandForecastPage', path: '/src/pages/DemandForecastPage.jsx' },
    { name: 'SupplyRiskPage', path: '/src/pages/SupplyRiskPage.jsx' },
    { name: 'WhatIfPage', path: '/src/pages/WhatIfPage.jsx' },
    { name: 'AlertsPage', path: '/src/pages/AlertsPage.jsx' },
    { name: 'ReportsPage', path: '/src/pages/ReportsPage.jsx' },
    { name: 'AuditLogPage', path: '/src/pages/AuditLogPage.jsx' },
    { name: 'DataManagementPage', path: '/src/pages/DataManagementPage.jsx' },
    { name: 'IoTSimulationPage', path: '/src/pages/IoTSimulationPage.jsx' },
    { name: 'SettingsPage', path: '/src/pages/SettingsPage.jsx' },
    { name: 'Layout (Logistics)', path: '/src/components/Layout.jsx', role: 'Logistics Officer' },
    { name: 'Layout (Supply)', path: '/src/components/Layout.jsx', role: 'Supply / Inventory Officer' },
    { name: 'Layout (Transport)', path: '/src/components/Layout.jsx', role: 'Transport Coordinator' },
    { name: 'Layout (Admin)', path: '/src/components/Layout.jsx', role: 'Administrator' }
  ];

  for (const page of pages) {
    try {
      const mod = await vite.ssrLoadModule(page.path);
      const Component = mod.default;
      const ctx = { ...mockContextValue, user: { ...mockContextValue.user, role: page.role || mockContextValue.user.role } };
      
      const element = React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(
          AppContext.Provider,
          { value: ctx },
          React.createElement(Component)
        )
      );

      ReactDOMServer.renderToString(element);
      console.log(`[RENDER PASS] ${page.name}`);
    } catch (err) {
      console.error(`[RENDER FAIL] ${page.name}:`, err.message, err.stack);
    }
  }

  await vite.close();
}

testRender().catch(console.error);
