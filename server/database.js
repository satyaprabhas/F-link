const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

function initDatabase() {
  const dbPath = process.env.DB_PATH || './flink.db';
  const dbDir = path.dirname(path.resolve(dbPath));
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  const db = new Database(path.resolve(dbPath));
  db.pragma('journal_mode = WAL');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password_hash TEXT, full_name TEXT, role TEXT, last_login TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS locations (id TEXT PRIMARY KEY, name TEXT, type TEXT, lat REAL, lng REAL, personnel INTEGER, status TEXT, region TEXT);
    CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, location_id TEXT, item TEXT, category TEXT, quantity REAL, unit TEXT, daily_consumption REAL, safety_stock REAL, last_updated TEXT, incoming_quantity REAL DEFAULT 0, expected_delivery TEXT);
    CREATE TABLE IF NOT EXISTS weather (id INTEGER PRIMARY KEY AUTOINCREMENT, location_id TEXT, route_id TEXT, segment TEXT, date TEXT, condition TEXT, temperature REAL, rainfall REAL, visibility REAL, wind_speed REAL, severity TEXT, is_forecast INTEGER DEFAULT 0, source TEXT DEFAULT 'SIMULATED', last_updated TEXT);
    CREATE TABLE IF NOT EXISTS routes (id TEXT PRIMARY KEY, name TEXT, from_location_id TEXT, to_location_id TEXT, distance REAL, estimated_time REAL, segments TEXT, status TEXT, terrain TEXT, alternate_of TEXT);
    CREATE TABLE IF NOT EXISTS vehicles (id TEXT PRIMARY KEY, name TEXT, type TEXT, capacity REAL, capacity_unit TEXT, current_location_id TEXT, status TEXT, assignment TEXT, fuel_level REAL, last_maintenance TEXT);
    CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, source_id TEXT, destination_id TEXT, items TEXT, planned_date TEXT, actual_date TEXT, vehicle_id TEXT, route_id TEXT, status TEXT, eta TEXT, priority TEXT, notes TEXT, created_by TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, severity TEXT, location_id TEXT, title TEXT, message TEXT, status TEXT, data TEXT, created_at TEXT, acknowledged_by TEXT, acknowledged_at TEXT, resolved_at TEXT, resolved_by TEXT);
    CREATE TABLE IF NOT EXISTS recommendations (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, location_id TEXT, delivery_id TEXT, title TEXT, explanation TEXT, factors TEXT, action TEXT, status TEXT, priority TEXT, created_at TEXT, decided_by TEXT, decided_at TEXT, decision_notes TEXT);
    CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, role TEXT, action TEXT, category TEXT, details TEXT, location TEXT, previous_value TEXT, new_value TEXT, timestamp TEXT);
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE, value TEXT, category TEXT, description TEXT);
  `);

  const hasUsers = db.prepare("SELECT count(*) as count FROM users").get().count;
  if (hasUsers === 0) {
    seedUsers(db);
    seedDemoData(db);
  }

  return db;
}

function seedUsers(db) {
  const hash = bcrypt.hashSync('admin123', 10);
  const demoHash = bcrypt.hashSync('demo123', 10);

  const insertUser = db.prepare("INSERT OR IGNORE INTO users (username, password_hash, full_name, role, created_at) VALUES (?, ?, ?, ?, datetime('now'))");
  insertUser.run('admin', hash, 'System Administrator', 'Administrator');
  insertUser.run('logistics', demoHash, 'CPT James Mitchell', 'Logistics Officer');
  insertUser.run('supply', demoHash, 'LT Sarah Chen', 'Supply / Inventory Officer');
  insertUser.run('transport', demoHash, 'SGT Marcus Webb', 'Transport Coordinator');
}

function seedDemoData(db) {
  // Settings
  const insertSetting = db.prepare("INSERT OR REPLACE INTO settings (key, value, category, description) VALUES (?, ?, ?, ?)");
  insertSetting.run('risk_threshold_critical', '80', 'Risk', 'Score threshold for Critical risk level');
  insertSetting.run('risk_threshold_high', '60', 'Risk', 'Score threshold for High risk level');
  insertSetting.run('risk_threshold_medium', '40', 'Risk', 'Score threshold for Medium risk level');
  insertSetting.run('safety_stock_days', '3', 'Inventory', 'Minimum days of supply to maintain');
  insertSetting.run('data_refresh_interval', '300', 'System', 'Data refresh interval in seconds');
  insertSetting.run('weather_forecast_days', '7', 'Weather', 'Number of days for weather forecast');

  // Locations
  const insertLoc = db.prepare("INSERT OR REPLACE INTO locations (id, name, type, lat, lng, personnel, status, region) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  insertLoc.run('LOC-ALPHA', 'Depot Alpha', 'depot', 34.05, 71.35, 500, 'Operational', 'Sector North');
  insertLoc.run('LOC-BRAVO', 'Depot Bravo', 'depot', 34.15, 71.50, 400, 'Operational', 'Sector North');
  insertLoc.run('LOC-SPN', 'Supply Point North', 'supply_point', 34.30, 71.45, 150, 'Operational', 'Sector Central');
  insertLoc.run('LOC-FWC', 'Post Bravo (Mountain Sector)', 'forward_location', 34.55, 71.60, 120, 'Critical', 'Sector Forward');
  insertLoc.run('LOC-FWE', 'Post Delta (Eastern Pass)', 'forward_location', 34.35, 71.90, 110, 'Warning', 'Sector East');
  insertLoc.run('LOC-FWA', 'Post Alpha (North Ridge)', 'forward_location', 34.60, 71.30, 95, 'Warning', 'Sector North Ridge');
  insertLoc.run('LOC-FWD', 'Post Charlie (Valley Sector)', 'forward_location', 34.45, 71.80, 85, 'Operational', 'Sector Forward');
  insertLoc.run('LOC-FWF', 'Post Echo (Desert Border)', 'forward_location', 34.00, 71.75, 75, 'Operational', 'Sector South Border');

  // Inventory - Post Bravo (CRITICAL SCENARIO: 2 days food, 2 days water)
  const insertInv = db.prepare("INSERT INTO inventory (location_id, item, category, quantity, unit, daily_consumption, safety_stock, incoming_quantity, expected_delivery, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))");
  insertInv.run('LOC-FWC', 'Food Rations', 'Food', 2400, 'units', 1200, 1800, 3600, null);
  insertInv.run('LOC-FWC', 'Potable Water', 'Water', 5000, 'liters', 2400, 3600, 7200, null);
  insertInv.run('LOC-FWC', 'Medical Supplies', 'Medical', 800, 'units', 40, 200, 0, null);
  insertInv.run('LOC-FWC', 'Diesel Fuel', 'Fuel', 3000, 'liters', 500, 1500, 2000, null);

  // Inventory - Post Delta (Eastern Pass - ~2.8 days food)
  insertInv.run('LOC-FWE', 'Food Rations', 'Food', 3200, 'units', 1150, 2000, 0, null);
  insertInv.run('LOC-FWE', 'Potable Water', 'Water', 6500, 'liters', 2200, 3000, 0, null);
  insertInv.run('LOC-FWE', 'Medical Supplies', 'Medical', 450, 'units', 35, 150, 0, null);
  insertInv.run('LOC-FWE', 'Diesel Fuel', 'Fuel', 4200, 'liters', 600, 1500, 0, null);

  // Inventory - Post Alpha (North Ridge - ~3.5 days food)
  insertInv.run('LOC-FWA', 'Food Rations', 'Food', 3300, 'units', 950, 1500, 0, null);
  insertInv.run('LOC-FWA', 'Potable Water', 'Water', 7000, 'liters', 1800, 2500, 0, null);
  insertInv.run('LOC-FWA', 'Medical Supplies', 'Medical', 400, 'units', 25, 120, 0, null);
  insertInv.run('LOC-FWA', 'Diesel Fuel', 'Fuel', 3800, 'liters', 450, 1200, 0, null);

  // Inventory - Post Charlie (Valley Sector - ~7.1 days food)
  insertInv.run('LOC-FWD', 'Food Rations', 'Food', 6000, 'units', 850, 1500, 0, null);
  insertInv.run('LOC-FWD', 'Potable Water', 'Water', 12000, 'liters', 1700, 2500, 0, null);
  insertInv.run('LOC-FWD', 'Medical Supplies', 'Medical', 500, 'units', 30, 150, 0, null);
  insertInv.run('LOC-FWD', 'Diesel Fuel', 'Fuel', 8000, 'liters', 400, 1200, 0, null);

  // Inventory - Post Echo (Desert Border - ~12 days food)
  insertInv.run('LOC-FWF', 'Food Rations', 'Food', 9000, 'units', 750, 1500, 0, null);
  insertInv.run('LOC-FWF', 'Potable Water', 'Water', 18000, 'liters', 1500, 3000, 0, null);
  insertInv.run('LOC-FWF', 'Medical Supplies', 'Medical', 600, 'units', 20, 100, 0, null);
  insertInv.run('LOC-FWF', 'Diesel Fuel', 'Fuel', 9500, 'liters', 350, 1000, 0, null);

  // Inventory - Depot Alpha (large stockpiles)
  insertInv.run('LOC-ALPHA', 'Food Rations', 'Food', 50000, 'units', 500, 5000, 0, null);
  insertInv.run('LOC-ALPHA', 'Potable Water', 'Water', 100000, 'liters', 1000, 10000, 0, null);
  insertInv.run('LOC-ALPHA', 'Medical Supplies', 'Medical', 5000, 'units', 50, 500, 0, null);
  insertInv.run('LOC-ALPHA', 'Diesel Fuel', 'Fuel', 50000, 'liters', 200, 5000, 0, null);

  // Inventory - Depot Bravo
  insertInv.run('LOC-BRAVO', 'Food Rations', 'Food', 35000, 'units', 400, 4000, 0, null);
  insertInv.run('LOC-BRAVO', 'Potable Water', 'Water', 80000, 'liters', 800, 8000, 0, null);
  insertInv.run('LOC-BRAVO', 'Medical Supplies', 'Medical', 3000, 'units', 30, 300, 0, null);
  insertInv.run('LOC-BRAVO', 'Diesel Fuel', 'Fuel', 40000, 'liters', 150, 4000, 0, null);

  // Inventory - Supply Point North
  insertInv.run('LOC-SPN', 'Food Rations', 'Food', 15000, 'units', 200, 2000, 0, null);
  insertInv.run('LOC-SPN', 'Potable Water', 'Water', 25000, 'liters', 300, 3000, 0, null);
  insertInv.run('LOC-SPN', 'Diesel Fuel', 'Fuel', 20000, 'liters', 100, 2000, 0, null);

  // Helper for date offsets
  function dateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  // Routes with detailed segments matching exact operational comparison
  const insertRoute = db.prepare("INSERT OR REPLACE INTO routes (id, name, from_location_id, to_location_id, distance, estimated_time, segments, status, terrain, alternate_of) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  
  // Route A (High Risk - passes Mountain Pass storm zone)
  insertRoute.run('R-01', 'Route A (High Risk)', 'LOC-ALPHA', 'LOC-FWC', 420, 8.33,
    JSON.stringify([
      { name: 'Alpha Gate', lat: 34.10, lng: 71.38, distance: 90, condition: 'Good' },
      { name: 'Mountain Pass', lat: 34.25, lng: 71.48, distance: 140, condition: 'Storm Hazard' },
      { name: 'River Valley', lat: 34.40, lng: 71.53, distance: 110, condition: 'Heavy Rain' },
      { name: 'Charlie Approach', lat: 34.50, lng: 71.58, distance: 80, condition: 'Fair' }
    ]), 'Open', 'Mountainous', null);

  // Route B (Medium Risk - Desert Bypass)
  insertRoute.run('R-02', 'Route B (Medium)', 'LOC-ALPHA', 'LOC-FWC', 510, 10.75,
    JSON.stringify([
      { name: 'Alpha South Exit', lat: 34.00, lng: 71.30, distance: 110, condition: 'Good' },
      { name: 'Desert Bypass', lat: 34.15, lng: 71.65, distance: 200, condition: 'Fair' },
      { name: 'Highland Road', lat: 34.35, lng: 71.70, distance: 120, condition: 'Moderate Rain' },
      { name: 'Charlie South', lat: 34.50, lng: 71.63, distance: 80, condition: 'Fair' }
    ]), 'Open', 'Desert/Highland', 'R-01');

  // Route C (Safe - Highland Corridor, Recommended)
  insertRoute.run('R-03', 'Route C (Safe)', 'LOC-ALPHA', 'LOC-FWC', 460, 9.5,
    JSON.stringify([
      { name: 'Alpha North Corridor', lat: 34.12, lng: 71.34, distance: 100, condition: 'Good' },
      { name: 'Highland Ridge', lat: 34.28, lng: 71.42, distance: 160, condition: 'Good' },
      { name: 'Clear Valley', lat: 34.42, lng: 71.50, distance: 120, condition: 'Good' },
      { name: 'Charlie West Gate', lat: 34.52, lng: 71.58, distance: 80, condition: 'Good' }
    ]), 'Open', 'Highland Corridor', 'R-01');

  // Alternate route from Depot Bravo
  insertRoute.run('R-BRAVO', 'Depot Bravo Direct', 'LOC-BRAVO', 'LOC-FWC', 380, 7.5,
    JSON.stringify([
      { name: 'Bravo Gate', lat: 34.18, lng: 71.52, distance: 80, condition: 'Good' },
      { name: 'Central Plains', lat: 34.30, lng: 71.55, distance: 160, condition: 'Good' },
      { name: 'Forward Corridor', lat: 34.45, lng: 71.58, distance: 140, condition: 'Fair' }
    ]), 'Open', 'Plains', null);

  insertRoute.run('R-05', 'Alpha to Delta', 'LOC-ALPHA', 'LOC-FWD', 160, 5.5,
    JSON.stringify([
      { name: 'Alpha East Exit', lat: 34.10, lng: 71.45, distance: 40, condition: 'Good' },
      { name: 'Eastern Corridor', lat: 34.25, lng: 71.65, distance: 70, condition: 'Fair' },
      { name: 'Delta Approach', lat: 34.40, lng: 71.78, distance: 50, condition: 'Good' }
    ]), 'Open', 'Mixed', null);

  insertRoute.run('R-06', 'Bravo to Delta', 'LOC-BRAVO', 'LOC-FWD', 120, 4,
    JSON.stringify([
      { name: 'Bravo South', lat: 34.12, lng: 71.55, distance: 30, condition: 'Good' },
      { name: 'Southern Road', lat: 34.25, lng: 71.70, distance: 50, condition: 'Good' },
      { name: 'Delta South Gate', lat: 34.40, lng: 71.78, distance: 40, condition: 'Good' }
    ]), 'Open', 'Plains', null);

  // Weather data - create the critical scenario
  const insertWeather = db.prepare("INSERT INTO weather (location_id, route_id, segment, date, condition, temperature, rainfall, visibility, wind_speed, severity, is_forecast, source, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SIMULATED', datetime('now'))");
  
  // Today - normal conditions everywhere
  insertWeather.run('LOC-FWC', null, null, dateOffset(0), 'Clear', 22, 0, 10, 8, 'Normal', 0);
  insertWeather.run('LOC-ALPHA', null, null, dateOffset(0), 'Clear', 24, 0, 12, 6, 'Normal', 0);
  insertWeather.run(null, 'R-01', 'Alpha Gate', dateOffset(0), 'Clear', 23, 0, 11, 7, 'Normal', 1);
  insertWeather.run(null, 'R-01', 'Mountain Pass', dateOffset(0), 'Partly Cloudy', 18, 0, 9, 12, 'Normal', 1);
  insertWeather.run(null, 'R-01', 'River Valley', dateOffset(0), 'Clear', 21, 0, 10, 8, 'Normal', 1);
  insertWeather.run(null, 'R-01', 'Charlie Approach', dateOffset(0), 'Clear', 20, 0, 10, 9, 'Normal', 1);

  // Day 1 - building clouds
  insertWeather.run(null, 'R-01', 'Alpha Gate', dateOffset(1), 'Partly Cloudy', 21, 2, 9, 12, 'Low', 1);
  insertWeather.run(null, 'R-01', 'Mountain Pass', dateOffset(1), 'Overcast', 15, 8, 6, 20, 'Moderate', 1);
  insertWeather.run(null, 'R-01', 'River Valley', dateOffset(1), 'Cloudy', 19, 5, 8, 14, 'Low', 1);
  insertWeather.run(null, 'R-01', 'Charlie Approach', dateOffset(1), 'Partly Cloudy', 19, 3, 9, 10, 'Low', 1);

  // Day 2 - HEAVY RAIN on main route, Mountain Pass becomes dangerous
  insertWeather.run(null, 'R-01', 'Alpha Gate', dateOffset(2), 'Rain', 18, 15, 5, 25, 'Moderate', 1);
  insertWeather.run(null, 'R-01', 'Mountain Pass', dateOffset(2), 'Heavy Rain', 12, 55, 1.5, 45, 'Severe', 1);
  insertWeather.run(null, 'R-01', 'River Valley', dateOffset(2), 'Heavy Rain', 16, 40, 3, 30, 'High', 1);
  insertWeather.run(null, 'R-01', 'Charlie Approach', dateOffset(2), 'Rain', 17, 20, 4, 22, 'Moderate', 1);

  // Day 3 - SEVERE STORM on main route (planned delivery day!)
  insertWeather.run(null, 'R-01', 'Alpha Gate', dateOffset(3), 'Heavy Rain', 16, 30, 3, 35, 'High', 1);
  insertWeather.run(null, 'R-01', 'Mountain Pass', dateOffset(3), 'Storm', 8, 80, 0.5, 65, 'Severe', 1);
  insertWeather.run(null, 'R-01', 'River Valley', dateOffset(3), 'Heavy Rain', 14, 45, 2, 40, 'High', 1);
  insertWeather.run(null, 'R-01', 'Charlie Approach', dateOffset(3), 'Rain', 15, 25, 4, 28, 'Moderate', 1);

  // Day 4 - clearing
  insertWeather.run(null, 'R-01', 'Alpha Gate', dateOffset(4), 'Cloudy', 20, 5, 7, 15, 'Low', 1);
  insertWeather.run(null, 'R-01', 'Mountain Pass', dateOffset(4), 'Light Rain', 14, 12, 5, 22, 'Moderate', 1);
  insertWeather.run(null, 'R-01', 'River Valley', dateOffset(4), 'Cloudy', 18, 8, 7, 16, 'Low', 1);
  insertWeather.run(null, 'R-01', 'Charlie Approach', dateOffset(4), 'Partly Cloudy', 19, 3, 8, 12, 'Low', 1);

  // Alternate route R-02 - moderate conditions (better option)
  insertWeather.run(null, 'R-02', 'Alpha South Exit', dateOffset(2), 'Cloudy', 22, 5, 7, 15, 'Low', 1);
  insertWeather.run(null, 'R-02', 'Desert Bypass', dateOffset(2), 'Light Rain', 25, 10, 8, 18, 'Moderate', 1);
  insertWeather.run(null, 'R-02', 'Highland Road', dateOffset(2), 'Cloudy', 20, 8, 7, 16, 'Low', 1);
  insertWeather.run(null, 'R-02', 'Charlie South', dateOffset(2), 'Partly Cloudy', 19, 3, 9, 12, 'Low', 1);

  insertWeather.run(null, 'R-02', 'Alpha South Exit', dateOffset(3), 'Light Rain', 20, 8, 6, 18, 'Low', 1);
  insertWeather.run(null, 'R-02', 'Desert Bypass', dateOffset(3), 'Rain', 23, 15, 6, 22, 'Moderate', 1);
  insertWeather.run(null, 'R-02', 'Highland Road', dateOffset(3), 'Cloudy', 18, 10, 6, 18, 'Moderate', 1);
  insertWeather.run(null, 'R-02', 'Charlie South', dateOffset(3), 'Partly Cloudy', 17, 5, 8, 14, 'Low', 1);

  // Vehicles
  const insertVeh = db.prepare("INSERT OR REPLACE INTO vehicles (id, name, type, capacity, capacity_unit, current_location_id, status, assignment, fuel_level, last_maintenance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  insertVeh.run('VH-01', 'Heavy Transport Alpha', 'Heavy Truck', 15000, 'kg', 'LOC-ALPHA', 'Available', null, 95, dateOffset(-5));
  insertVeh.run('VH-02', 'Medium Transport Bravo', 'Medium Truck', 8000, 'kg', 'LOC-ALPHA', 'Assigned', 'DEL-001', 88, dateOffset(-10));
  insertVeh.run('VH-03', 'Light Vehicle Charlie', 'Light Truck', 3000, 'kg', 'LOC-SPN', 'Available', null, 75, dateOffset(-3));
  insertVeh.run('VH-04', 'Heavy Transport Delta', 'Heavy Truck', 15000, 'kg', 'LOC-BRAVO', 'Available', null, 100, dateOffset(-7));
  insertVeh.run('VH-05', 'Medical Vehicle Echo', 'Ambulance', 2000, 'kg', 'LOC-BRAVO', 'Maintenance', null, 20, dateOffset(-15));
  insertVeh.run('VH-06', 'Fuel Tanker Foxtrot', 'Tanker', 20000, 'L', 'LOC-ALPHA', 'Available', null, 92, dateOffset(-4));

  // Deliveries - KEY SCENARIO
  const insertDel = db.prepare("INSERT OR REPLACE INTO deliveries (id, source_id, destination_id, items, planned_date, actual_date, vehicle_id, route_id, status, eta, priority, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))");
  
  // DEL-001: Critical delivery to Forward Charlie planned in 3 days VIA the risky route
  insertDel.run('DEL-001', 'LOC-ALPHA', 'LOC-FWC', JSON.stringify({ 'Food Rations': 3600, 'Potable Water': 7200 }), dateOffset(3), null, 'VH-02', 'R-01', 'Planned', null, 'High', 'Regular resupply - food and water', 'logistics');
  
  // DEL-002: Routine delivery to Forward Delta
  insertDel.run('DEL-002', 'LOC-BRAVO', 'LOC-FWD', JSON.stringify({ 'Medical Supplies': 400 }), dateOffset(5), null, 'VH-04', 'R-06', 'Planned', null, 'Medium', 'Medical resupply', 'logistics');
  
  // DEL-003: Fuel delivery already loading
  insertDel.run('DEL-003', 'LOC-SPN', 'LOC-FWC', JSON.stringify({ 'Diesel Fuel': 2000 }), dateOffset(1), null, 'VH-03', 'R-04', 'Loading', null, 'High', 'Urgent fuel resupply', 'transport');

  // Alerts - Only generated dynamically from actual officer operations or genuine critical outpost status
  // (No fake/hardcoded seed alerts)

  // Recommendations
  const insertRec = db.prepare("INSERT INTO recommendations (type, location_id, delivery_id, title, explanation, factors, action, status, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, datetime('now'))");
  
  insertRec.run('ADVANCE_DELIVERY', 'LOC-FWC', 'DEL-001',
    'Advance Delivery DEL-001 by 1-2 Days',
    'Forward Charlie has only 2 days of food remaining and 2.1 days of water. The planned delivery DEL-001 is scheduled for Day 3, but severe weather (storm) is forecast on Route R-01 Mountain Pass during that period. The combination of low inventory, increasing demand, and weather-related delivery delay creates a high probability of stockout. Advancing the delivery by 1-2 days would ensure supplies arrive before weather deteriorates.',
    JSON.stringify([
      'Forward Charlie food supply: only 2.0 days remaining',
      'Forward Charlie water supply: only 2.1 days remaining',
      'Both below safety stock threshold of 3 days',
      'Demand trend increasing (+10-15%)',
      'Severe storm forecast on Route R-01 Mountain Pass (Day 2-3)',
      'Heavy rain with visibility < 1km and wind > 60km/h',
      'Delivery DEL-001 planned during severe weather window',
      'High probability of delivery delay (>75%)',
      'Safety stock levels will be breached before delivery'
    ]),
    'ADVANCE', 'High');
  
  insertRec.run('ALTERNATE_ROUTE', 'LOC-FWC', 'DEL-001',
    'Use Alternate Route R-02 for Delivery DEL-001',
    'Route R-01 (Alpha Main Route) passes through Mountain Pass which has severe weather forecast. Route R-02 (Alpha Alternate) is 55km longer (240km vs 185km) and takes 2 hours more, but weather conditions along R-02 are moderate with significantly lower delay probability. The Desert Bypass and Highland Road segments show only light rain and cloudy conditions.',
    JSON.stringify([
      'Route R-01 Mountain Pass: Severe storm forecast (Day 2-3)',
      'R-01 delay probability: >75%',
      'Route R-02 worst condition: Moderate (Desert Bypass)',
      'R-02 delay probability: ~25%',
      'R-02 distance: 240km (+55km longer)',
      'R-02 estimated time: 8 hours (+2 hours)',
      'Trade-off: Longer but significantly safer delivery'
    ]),
    'CHANGE_ROUTE', 'High');

  // Audit log entries
  const insertAudit = db.prepare("INSERT INTO audit_log (user, role, action, category, details, location, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))");
  insertAudit.run('system', 'system', 'SYSTEM_INIT', 'System', 'F-LINK system initialized with demo data', null);
  insertAudit.run('logistics', 'Logistics Officer', 'CREATE', 'Delivery', 'Created delivery DEL-001: Food + Water to Forward Charlie', 'LOC-FWC');
  insertAudit.run('transport', 'Transport Coordinator', 'CREATE', 'Delivery', 'Created delivery DEL-003: Fuel to Forward Charlie', 'LOC-FWC');
  insertAudit.run('system', 'system', 'GENERATE', 'Recommendation', 'Generated 2 recommendations for Forward Charlie', 'LOC-FWC');
}

module.exports = { initDatabase, seedDemoData };
