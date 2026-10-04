const http = require('http');

async function req(options, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

async function run() {
  console.log('--- Testing F-LINK Server & 4 Roles ---');
  
  // 1. Dashboard Health Check
  const dash = await req({ hostname: 'localhost', port: 3001, path: '/api/dashboard', method: 'GET' });
  console.log('GET /api/dashboard:', dash.status, dash.status === 200 ? 'PASS' : 'FAIL');
  
  // 2. Test exactly the 4 login roles
  const roles = [
    { u: 'logistics', p: 'demo123', expected: 'Logistics Officer' },
    { u: 'supply', p: 'demo123', expected: 'Supply / Inventory Officer' },
    { u: 'transport', p: 'demo123', expected: 'Transport Coordinator' },
    { u: 'admin', p: 'admin123', expected: 'Administrator' }
  ];
  
  const tokens = {};
  for (const r of roles) {
    const res = await req({
      hostname: 'localhost', port: 3001, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: r.u, password: r.p });
    const parsed = JSON.parse(res.body);
    const match = parsed.user && parsed.user.role === r.expected;
    console.log(`Login [${r.u}]: status=${res.status}, role="${parsed.user?.role}" -> ${match ? 'PASS' : 'FAIL'}`);
    tokens[r.u] = parsed.token;
  }

  // 3. Permission checks:
  // a) Supply Officer CANNOT create vehicles (only Transport / Admin / Logistics)
  const vSupply = await req({
    hostname: 'localhost', port: 3001, path: '/api/vehicles', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokens['supply'] }
  }, { id: 'VH-TEST', name: 'Test', type: 'Truck', capacity: 1000 });
  console.log(`Supply Officer create vehicle (403 forbidden): ${vSupply.status} -> ${vSupply.status === 403 ? 'PASS' : 'FAIL'}`);

  // b) Transport Coordinator CANNOT modify inventory (only Supply / Admin / Logistics)
  const invTrans = await req({
    hostname: 'localhost', port: 3001, path: '/api/inventory/1', method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokens['transport'] }
  }, { quantity: 999 });
  console.log(`Transport Coordinator edit inventory (403 forbidden): ${invTrans.status} -> ${invTrans.status === 403 ? 'PASS' : 'FAIL'}`);

  // c) Non-Logistics role CANNOT decide recommendation (Human-in-the-Loop decision authority)
  const recTrans = await req({
    hostname: 'localhost', port: 3001, path: '/api/recommendations/1/decide', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokens['transport'] }
  }, { decision: 'Approved' });
  console.log(`Transport Coordinator decide recommendation (403 forbidden): ${recTrans.status} -> ${recTrans.status === 403 ? 'PASS' : 'FAIL'}`);

  // d) Logistics Officer CAN decide recommendations
  const recLog = await req({
    hostname: 'localhost', port: 3001, path: '/api/recommendations/1/decide', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokens['logistics'] }
  }, { decision: 'Approved', notes: 'Approved as recommended by Logistics Officer' });
  console.log(`Logistics Officer decide recommendation (200 success): ${recLog.status} -> ${recLog.status === 200 ? 'PASS' : 'FAIL'}`);

  // e) Non-Admin CANNOT update system settings
  const setSupply = await req({
    hostname: 'localhost', port: 3001, path: '/api/settings/safety_stock_days', method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokens['supply'] }
  }, { value: '5' });
  console.log(`Supply Officer update settings (403 forbidden): ${setSupply.status} -> ${setSupply.status === 403 ? 'PASS' : 'FAIL'}`);

  // f) Admin CAN update system settings
  const setAdmin = await req({
    hostname: 'localhost', port: 3001, path: '/api/settings/safety_stock_days', method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokens['admin'] }
  }, { value: '3' });
  console.log(`Admin update settings (200 success): ${setAdmin.status} -> ${setAdmin.status === 200 ? 'PASS' : 'FAIL'}`);

  // 4. Verify Forward Charlie scenario & calculations
  const chStockout = await req({ hostname: 'localhost', port: 3001, path: '/api/forecast/LOC-FWC/stockout', method: 'GET' });
  const stockoutData = JSON.parse(chStockout.body);
  const foodItem = stockoutData.predictions?.find(p => p.item.toLowerCase().includes('food'));
  console.log(`Forward Charlie food days remaining: ${foodItem?.days_until_stockout} days -> ${foodItem?.days_until_stockout === 2 ? 'PASS (2 days critical)' : 'CHECK'}`);

  // 5. Verify Route R-01 weather segments
  const r01Weather = await req({ hostname: 'localhost', port: 3001, path: '/api/weather/route/R-01', method: 'GET' });
  const r01Data = JSON.parse(r01Weather.body);
  console.log(`Route R-01 segments analyzed: ${r01Data.segments?.length} segments, Overall Risk: ${r01Data.overall_risk?.level} -> ${r01Data.segments?.length >= 4 ? 'PASS' : 'FAIL'}`);

  console.log('--- ALL ROLE & FUNCTIONALITY CHECKS COMPLETED ---');
}

run().catch(console.error);
