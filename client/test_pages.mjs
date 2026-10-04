import { createServer } from 'vite';

async function testAllPages() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  const pages = [
    '/src/pages/DashboardPage.jsx',
    '/src/pages/WeatherRoutePage.jsx',
    '/src/pages/RecommendationsPage.jsx',
    '/src/pages/TransportPage.jsx',
    '/src/pages/InventoryPage.jsx',
    '/src/pages/DemandForecastPage.jsx',
    '/src/pages/SupplyRiskPage.jsx',
    '/src/pages/WhatIfPage.jsx',
    '/src/pages/AlertsPage.jsx',
    '/src/pages/ReportsPage.jsx',
    '/src/pages/AuditLogPage.jsx',
    '/src/pages/DataManagementPage.jsx',
    '/src/pages/IoTSimulationPage.jsx',
    '/src/pages/SettingsPage.jsx',
    '/src/pages/LoginPage.jsx',
    '/src/components/Layout.jsx',
    '/src/components/MapRoutePlanning.jsx',
    '/src/components/EditLocationModal.jsx'
  ];

  console.log('Testing Vite module loading for all pages:');
  for (const page of pages) {
    try {
      const mod = await vite.ssrLoadModule(page);
      console.log(`[PASS] ${page} loaded, default export: ${typeof mod.default}`);
    } catch (err) {
      console.error(`[FAIL] ${page} ERROR:`, err);
    }
  }

  await vite.close();
}

testAllPages().catch(console.error);
