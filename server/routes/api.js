const express = require('express');
const { authMiddleware, roleCheck } = require('../middleware/auth');
const intel = require('../services/intelligence');

module.exports = (db) => {
  const router = express.Router();
  router.use(authMiddleware);

  // Helper: add audit log
  function auditLog(user, role, action, category, details, location, prevVal, newVal) {
    try {
      db.prepare("INSERT INTO audit_log (user,role,action,category,details,location,previous_value,new_value,timestamp) VALUES (?,?,?,?,?,?,?,?,datetime('now'))").run(user||'system',role||'system',action,category,details||'',location||'',prevVal||'',newVal||'');
    } catch(e) { console.error('Audit log error:', e.message); }
  }

  // Helper: map post and route id to tactical corridor name & risk level
  function getRouteDetails(destId, routeId) {
    const routeMap = {
      'LOC-FWC': {
        'R-01': 'Route A (Mountain Pass - Danger Red)',
        'R-02': 'Route B (Desert Bypass - Moderate Yellow)',
        'R-03': 'Route C (Highland Safe Corridor - Safest Green)'
      },
      'LOC-FWE': {
        'R-01': 'Route A (Northern Ridge Expressway - Safest Green)',
        'R-02': 'Route B (South Plateau Track - Moderate Yellow)',
        'R-03': 'Route C (Gale Wind Gorge Cut - Danger Red)'
      },
      'LOC-FWA': {
        'R-01': 'Route A (Alpine Climb Core - Danger Red)',
        'R-02': 'Route B (Heated Tunnel Highway - Safest Green)',
        'R-03': 'Route C (Western Serpentine Track - Moderate Yellow)'
      },
      'LOC-FWD': {
        'R-01': 'Route A (Elevated Viaduct Span - Safest Green)',
        'R-02': 'Route B (River Basin Causeway - Danger Red)',
        'R-03': 'Route C (Hill Crest Perimeter - Moderate Yellow)'
      },
      'LOC-FWF': {
        'R-01': 'Route A (Dune Basin Direct - Danger Red)',
        'R-02': 'Route B (North Shielded Highway - Safest Green)',
        'R-03': 'Route C (South Border Perimeter - Moderate Yellow)'
      }
    };
    return routeMap[destId]?.[routeId] || (routeId === 'R-03' ? 'Route C' : routeId === 'R-02' ? 'Route B' : 'Route A');
  }

  // ── DASHBOARD ──
  router.get('/dashboard', (req, res) => {
    try {
      const totalLocations = db.prepare("SELECT count(*) as c FROM locations WHERE type='forward_location'").get().c;
      const allInv = db.prepare("SELECT i.*, l.name as location_name, l.type as location_type FROM inventory i JOIN locations l ON i.location_id=l.id").all();
      const forwardInv = allInv.filter(i => i.location_type === 'forward_location');
      
      let criticalCount = 0, atRiskCount = 0, healthSum = 0, healthCount = 0;
      const locHealthMap = {};
      for (const inv of forwardInv) {
        const days = intel.calculateDaysRemaining(inv.quantity, inv.daily_consumption);
        const locId = inv.location_id;
        if (!locHealthMap[locId]) locHealthMap[locId] = { minDays: 999, items: 0, totalHealth: 0 };
        locHealthMap[locId].minDays = Math.min(locHealthMap[locId].minDays, days);
        const h = Math.min(100, (days / 7) * 100);
        locHealthMap[locId].totalHealth += h;
        locHealthMap[locId].items++;
      }
      for (const [locId, data] of Object.entries(locHealthMap)) {
        if (data.minDays <= 2) criticalCount++;
        else if (data.minDays <= 5) atRiskCount++;
        healthSum += data.totalHealth / data.items;
        healthCount++;
      }
      
      const activeDeliveries = db.prepare("SELECT count(*) as c FROM deliveries WHERE status IN ('Loading','En Route','Planned','Pending Supply Allotment','Ready for Dispatch')").get().c;
      const availableVehicles = db.prepare("SELECT count(*) as c FROM vehicles WHERE status='Available'").get().c;
      const weatherAlerts = db.prepare("SELECT count(*) as c FROM alerts WHERE (type='Weather' OR type='Weather Risk') AND status!='Resolved'").get().c;
      
      // Predicted shortages: items with < 3 days supply
      const shortages = forwardInv.filter(i => intel.calculateDaysRemaining(i.quantity, i.daily_consumption) <= 3).length;
      
      // Location summaries - populates both inventory and inventory_summary for all nodes
      const locations = db.prepare("SELECT * FROM locations").all();
      const locationSummaries = locations.map(loc => {
        const inv = allInv.filter(i => i.location_id === loc.id);
        const summary = { ...loc, inventory: {}, inventory_summary: {} };
        for (const item of inv) {
          const itemSummary = {
            quantity: item.quantity,
            daily_consumption: item.daily_consumption,
            days_remaining: intel.calculateDaysRemaining(item.quantity, item.daily_consumption),
            status: intel.getInventoryStatus(intel.calculateDaysRemaining(item.quantity, item.daily_consumption))
          };
          summary.inventory[item.category] = itemSummary;
          summary.inventory_summary[item.category] = itemSummary;
        }
        return summary;
      });
      
      const recentAlerts = db.prepare("SELECT a.*, l.name as location_name FROM alerts a LEFT JOIN locations l ON a.location_id=l.id WHERE (a.title NOT LIKE '%Weather Forecast%' AND a.title NOT LIKE '%Vehicle VH-05%' AND a.title NOT LIKE '%Forward Charlie%') ORDER BY a.created_at DESC LIMIT 10").all();
      
      // Transport Coordinator only receives deliveries after the Supply Officer allots rations
      let delQuery = "SELECT d.*, ls.name as source_name, ld.name as dest_name, v.name as vehicle_name, r.name as route_name FROM deliveries d LEFT JOIN locations ls ON d.source_id=ls.id LEFT JOIN locations ld ON d.destination_id=ld.id LEFT JOIN vehicles v ON d.vehicle_id=v.id LEFT JOIN routes r ON d.route_id=r.id WHERE d.status != 'Cancelled'";
      if (req.user?.role === 'Transport Coordinator') {
        delQuery += " AND d.status IN ('Ready for Dispatch', 'En Route', 'Delivered')";
      }
      delQuery += " ORDER BY CASE d.status WHEN 'Pending Supply Allotment' THEN 1 WHEN 'Ready for Dispatch' THEN 2 WHEN 'En Route' THEN 3 WHEN 'Loading' THEN 4 WHEN 'Planned' THEN 5 ELSE 6 END, d.planned_date";
      const activeDels = db.prepare(delQuery).all();
      activeDels.forEach(d => { 
        try { d.items = typeof d.items === 'string' ? JSON.parse(d.items) : (d.items || {}); } catch{ d.items = {}; }
        d.route_name = getRouteDetails(d.destination_id, d.route_id) || d.route_name;
      });
      
      res.json({
        totalLocations,
        criticalLocations: criticalCount,
        locationsAtRisk: atRiskCount,
        avgInventoryHealth: healthCount > 0 ? Math.round(healthSum / healthCount) : 0,
        activeDeliveries,
        availableVehicles,
        weatherAlerts,
        predictedShortages: shortages,
        locations: locationSummaries,
        recentAlerts,
        activeDeliveries_list: activeDels
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── LOCATIONS ──
  router.get('/locations', (req, res) => {
    try {
      const locations = db.prepare("SELECT * FROM locations").all();
      // Enrich with inventory summary
      for (const loc of locations) {
        const inv = db.prepare("SELECT * FROM inventory WHERE location_id=?").all(loc.id);
        loc.inventory_summary = {};
        loc.min_days_remaining = 999;
        for (const item of inv) {
          const days = intel.calculateDaysRemaining(item.quantity, item.daily_consumption);
          loc.inventory_summary[item.category] = { quantity: item.quantity, days_remaining: days, status: intel.getInventoryStatus(days) };
          loc.min_days_remaining = Math.min(loc.min_days_remaining, days);
        }
        if (loc.min_days_remaining === 999) loc.min_days_remaining = null;
        const alerts = db.prepare("SELECT count(*) as c FROM alerts WHERE location_id=? AND status!='Resolved'").get(loc.id);
        loc.active_alerts = alerts.c;
      }
      res.json(locations);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/locations/:id', (req, res) => {
    try {
      const loc = db.prepare("SELECT * FROM locations WHERE id=?").get(req.params.id);
      if (!loc) return res.status(404).json({ error: 'Location not found' });
      const inv = db.prepare("SELECT * FROM inventory WHERE location_id=?").all(loc.id);
      loc.inventory = inv.map(i => ({ ...i, days_remaining: intel.calculateDaysRemaining(i.quantity, i.daily_consumption), status: intel.getInventoryStatus(intel.calculateDaysRemaining(i.quantity, i.daily_consumption)) }));
      const alerts = db.prepare("SELECT * FROM alerts WHERE location_id=? AND status!='Resolved'").all(loc.id);
      loc.alerts = alerts;
      res.json(loc);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/locations', (req, res) => {
    try {
      const { id, name, type, lat, lng, personnel, status, region } = req.body;
      db.prepare("INSERT INTO locations (id,name,type,lat,lng,personnel,status,region) VALUES (?,?,?,?,?,?,?,?)").run(id,name,type,lat||0,lng||0,personnel||0,status||'Operational',region||'');
      auditLog(req.user?.username, req.user?.role, 'CREATE', 'Location', `Created location ${name}`, id, null, JSON.stringify(req.body));
      res.json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/locations/:id', (req, res) => {
    try {
      const prev = db.prepare("SELECT * FROM locations WHERE id=?").get(req.params.id);
      if (!prev) return res.status(404).json({ error: 'Location not found' });
      const { name, type, lat, lng, personnel, status, region } = req.body;
      db.prepare("UPDATE locations SET name=COALESCE(?,name),type=COALESCE(?,type),lat=COALESCE(?,lat),lng=COALESCE(?,lng),personnel=COALESCE(?,personnel),status=COALESCE(?,status),region=COALESCE(?,region) WHERE id=?")
        .run(name ?? prev.name, type ?? prev.type, lat ?? prev.lat, lng ?? prev.lng, personnel ?? prev.personnel, status ?? prev.status, region ?? prev.region, req.params.id);
      auditLog(req.user?.username, req.user?.role, 'UPDATE', 'Location', `Updated location ${name || prev.name}`, req.params.id, JSON.stringify(prev), JSON.stringify(req.body));
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── INVENTORY ──
  router.get('/inventory', (req, res) => {
    try {
      let query = "SELECT i.*, l.name as location_name, l.type as location_type FROM inventory i JOIN locations l ON i.location_id=l.id";
      const params = [];
      if (req.query.location_id) { query += " WHERE i.location_id=?"; params.push(req.query.location_id); }
      const items = db.prepare(query).all(...params);
      const mapped = items.map(i => ({
        ...i,
        days_remaining: intel.calculateDaysRemaining(i.quantity, i.daily_consumption),
        status: intel.getInventoryStatus(intel.calculateDaysRemaining(i.quantity, i.daily_consumption))
      }));
      res.json(mapped);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/inventory/:locationId', (req, res) => {
    try {
      const items = db.prepare("SELECT i.*, l.name as location_name FROM inventory i JOIN locations l ON i.location_id=l.id WHERE i.location_id=?").all(req.params.locationId);
      const mapped = items.map(i => ({
        ...i,
        days_remaining: intel.calculateDaysRemaining(i.quantity, i.daily_consumption),
        status: intel.getInventoryStatus(intel.calculateDaysRemaining(i.quantity, i.daily_consumption))
      }));
      res.json(mapped);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/inventory', (req, res) => {
    try {
      if (req.user?.role === 'Transport Coordinator') {
        return res.status(403).json({ error: 'Transport Coordinator is not authorized to modify inventory' });
      }
      const { location_id, item, category, quantity, unit, daily_consumption, safety_stock, incoming_quantity, expected_delivery } = req.body;
      const result = db.prepare("INSERT INTO inventory (location_id,item,category,quantity,unit,daily_consumption,safety_stock,incoming_quantity,expected_delivery,last_updated) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))").run(location_id,item,category,quantity,unit,daily_consumption,safety_stock,incoming_quantity||0,expected_delivery||null);
      auditLog(req.user?.username, req.user?.role, 'CREATE', 'Inventory', `Added ${item} at ${location_id}`, location_id, null, JSON.stringify(req.body));
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/inventory/:id', (req, res) => {
    try {
      if (req.user?.role === 'Transport Coordinator') {
        return res.status(403).json({ error: 'Transport Coordinator is not authorized to modify inventory' });
      }
      const prev = db.prepare("SELECT * FROM inventory WHERE id=?").get(req.params.id);
      if (!prev) return res.status(404).json({ error: 'Inventory item not found' });
      const { quantity, daily_consumption, safety_stock, incoming_quantity, expected_delivery } = req.body;
      db.prepare("UPDATE inventory SET quantity=?,daily_consumption=?,safety_stock=?,incoming_quantity=?,expected_delivery=?,last_updated=datetime('now') WHERE id=?")
        .run(quantity ?? prev.quantity, daily_consumption ?? prev.daily_consumption, safety_stock ?? prev.safety_stock, incoming_quantity ?? prev.incoming_quantity, expected_delivery ?? prev.expected_delivery, req.params.id);
      auditLog(req.user?.username, req.user?.role, 'UPDATE', 'Inventory', `Updated inventory #${req.params.id}`, prev.location_id, JSON.stringify(prev), JSON.stringify(req.body));
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── WEATHER ──
  router.get('/weather', (req, res) => {
    try {
      let q = "SELECT * FROM weather";
      const params = [];
      if (req.query.location_id) { q += " WHERE location_id=?"; params.push(req.query.location_id); }
      if (req.query.route_id) { q = "SELECT * FROM weather WHERE route_id=?"; params.length = 0; params.push(req.query.route_id); }
      res.json(db.prepare(q).all(...params));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/weather/location/:locationId', (req, res) => {
    try {
      const w = db.prepare("SELECT * FROM weather WHERE location_id=? ORDER BY date").all(req.params.locationId);
      res.json(w);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/weather/route/:routeId', (req, res) => {
    try {
      const route = db.prepare("SELECT * FROM routes WHERE id=?").get(req.params.routeId);
      if (!route) return res.status(404).json({ error: 'Route not found' });
      const segments = JSON.parse(route.segments || '[]');
      const weatherData = db.prepare("SELECT * FROM weather WHERE route_id=? ORDER BY date").all(req.params.routeId);
      
      // Build per-segment weather
      const segmentWeather = segments.map(seg => {
        const segW = weatherData.filter(w => w.segment === seg.name);
        return {
          segment: seg.name,
          lat: seg.lat,
          lng: seg.lng,
          distance: seg.distance,
          condition: seg.condition,
          weather: segW.length > 0 ? segW : [{
            condition: 'Clear', temperature: 25, rainfall: 0, visibility: 10, wind_speed: 10, severity: 'Normal', source: 'SIMULATED', date: new Date().toISOString().split('T')[0]
          }],
          risk: segW.length > 0 ? intel.calculateWeatherRisk(segW) : { score: 0, level: 'Normal' }
        };
      });
      
      const overallRisk = intel.calculateRouteRisk(route, weatherData);
      
      res.json({
        route,
        segments: segmentWeather,
        overall_risk: overallRisk,
        data_source: 'SIMULATED',
        last_updated: new Date().toISOString()
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/weather', (req, res) => {
    try {
      const { location_id, route_id, segment, date, condition, temperature, rainfall, visibility, wind_speed, severity, is_forecast } = req.body;
      db.prepare("INSERT INTO weather (location_id,route_id,segment,date,condition,temperature,rainfall,visibility,wind_speed,severity,is_forecast,source,last_updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))").run(location_id,route_id,segment,date,condition,temperature,rainfall,visibility,wind_speed,severity,is_forecast?1:0,'SIMULATED');
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── ROUTES ──
  router.get('/routes', (req, res) => {
    try {
      const routes = db.prepare("SELECT r.*, lf.name as from_name, lt.name as to_name FROM routes r LEFT JOIN locations lf ON r.from_location_id=lf.id LEFT JOIN locations lt ON r.to_location_id=lt.id").all();
      for (const r of routes) {
        try { r.segments = JSON.parse(r.segments); } catch { r.segments = []; }
        const weather = db.prepare("SELECT * FROM weather WHERE route_id=?").all(r.id);
        r.weather_risk = intel.calculateWeatherRisk(weather);
        r.route_risk = intel.calculateRouteRisk(r, weather);
      }
      res.json(routes);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/routes/compare', (req, res) => {
    try {
      const { from, to } = req.query;
      let routes;
      if (from && to) {
        routes = db.prepare("SELECT * FROM routes WHERE from_location_id=? AND to_location_id=?").all(from, to);
      } else if (to) {
        routes = db.prepare("SELECT * FROM routes WHERE to_location_id=?").all(to);
      } else {
        routes = db.prepare("SELECT * FROM routes").all();
      }
      for (const r of routes) {
        try { r.segments = JSON.parse(r.segments); } catch { r.segments = []; }
        const weather = db.prepare("SELECT * FROM weather WHERE route_id=?").all(r.id);
        r.weather_risk = intel.calculateWeatherRisk(weather);
        r.route_risk = intel.calculateRouteRisk(r, weather);
      }
      res.json(routes);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/routes/:id', (req, res) => {
    try {
      const route = db.prepare("SELECT r.*, lf.name as from_name, lt.name as to_name FROM routes r LEFT JOIN locations lf ON r.from_location_id=lf.id LEFT JOIN locations lt ON r.to_location_id=lt.id WHERE r.id=?").get(req.params.id);
      if (!route) return res.status(404).json({ error: 'Route not found' });
      try { route.segments = JSON.parse(route.segments); } catch { route.segments = []; }
      const weather = db.prepare("SELECT * FROM weather WHERE route_id=?").all(route.id);
      route.weather_data = weather;
      route.route_risk = intel.calculateRouteRisk(route, weather);
      res.json(route);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/routes', (req, res) => {
    try {
      const { id, name, from_location_id, to_location_id, distance, estimated_time, segments, status, terrain, alternate_of } = req.body;
      db.prepare("INSERT INTO routes (id,name,from_location_id,to_location_id,distance,estimated_time,segments,status,terrain,alternate_of) VALUES (?,?,?,?,?,?,?,?,?,?)").run(id,name,from_location_id,to_location_id,distance,estimated_time,JSON.stringify(segments||[]),status||'Open',terrain||'',alternate_of||null);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/routes/:id', (req, res) => {
    try {
      const { name, status, terrain } = req.body;
      db.prepare("UPDATE routes SET name=COALESCE(?,name), status=COALESCE(?,status), terrain=COALESCE(?,terrain) WHERE id=?").run(name,status,terrain,req.params.id);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── VEHICLES ──
  router.get('/vehicles', (req, res) => {
    try {
      const vehicles = db.prepare("SELECT v.*, l.name as location_name FROM vehicles v LEFT JOIN locations l ON v.current_location_id=l.id").all();
      res.json(vehicles);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/vehicles/:id', (req, res) => {
    try {
      const v = db.prepare("SELECT v.*, l.name as location_name FROM vehicles v LEFT JOIN locations l ON v.current_location_id=l.id WHERE v.id=?").get(req.params.id);
      if (!v) return res.status(404).json({ error: 'Vehicle not found' });
      res.json(v);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/vehicles', (req, res) => {
    try {
      if (req.user?.role === 'Supply / Inventory Officer') {
        return res.status(403).json({ error: 'Supply / Inventory Officer is not authorized to manage vehicles' });
      }
      const { id, name, type, capacity, capacity_unit, current_location_id, status, fuel_level } = req.body;
      db.prepare("INSERT INTO vehicles (id,name,type,capacity,capacity_unit,current_location_id,status,assignment,fuel_level,last_maintenance) VALUES (?,?,?,?,?,?,?,null,?,datetime('now'))").run(id,name,type,capacity,capacity_unit,current_location_id,status||'Available',fuel_level||100);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/vehicles/:id', (req, res) => {
    try {
      if (req.user?.role === 'Supply / Inventory Officer') {
        return res.status(403).json({ error: 'Supply / Inventory Officer is not authorized to manage vehicles' });
      }
      const prev = db.prepare("SELECT * FROM vehicles WHERE id=?").get(req.params.id);
      if (!prev) return res.status(404).json({ error: 'Vehicle not found' });
      const { status, assignment, current_location_id, fuel_level } = req.body;
      db.prepare("UPDATE vehicles SET status=COALESCE(?,status), assignment=COALESCE(?,assignment), current_location_id=COALESCE(?,current_location_id), fuel_level=COALESCE(?,fuel_level) WHERE id=?")
        .run(status, assignment, current_location_id, fuel_level, req.params.id);
      auditLog(req.user?.username, req.user?.role, 'UPDATE', 'Vehicle', `Updated vehicle ${req.params.id}`, null, prev.status, status);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── DELIVERIES ──
  router.get('/deliveries', (req, res) => {
    try {
      let q = "SELECT d.*, ls.name as source_name, ld.name as dest_name, v.name as vehicle_name, r.name as route_name FROM deliveries d LEFT JOIN locations ls ON d.source_id=ls.id LEFT JOIN locations ld ON d.destination_id=ld.id LEFT JOIN vehicles v ON d.vehicle_id=v.id LEFT JOIN routes r ON d.route_id=r.id";
      if (req.user?.role === 'Transport Coordinator') {
        q += " WHERE d.status IN ('Ready for Dispatch', 'En Route', 'Delivered')";
      }
      const dels = db.prepare(q).all();
      dels.forEach(d => { 
        try { d.items = typeof d.items === 'string' ? JSON.parse(d.items) : (d.items || {}); } catch{ d.items = {}; }
        d.route_name = getRouteDetails(d.destination_id, d.route_id) || d.route_name;
      });
      res.json(dels);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/deliveries/:id', (req, res) => {
    try {
      const del = db.prepare("SELECT d.*, ls.name as source_name, ld.name as dest_name, v.name as vehicle_name, r.name as route_name FROM deliveries d LEFT JOIN locations ls ON d.source_id=ls.id LEFT JOIN locations ld ON d.destination_id=ld.id LEFT JOIN vehicles v ON d.vehicle_id=v.id LEFT JOIN routes r ON d.route_id=r.id WHERE d.id=?").get(req.params.id);
      if (!del) return res.status(404).json({ error: 'Delivery not found' });
      try { del.items = JSON.parse(del.items); } catch{}
      
      // Calculate delivery risk
      const route = db.prepare("SELECT * FROM routes WHERE id=?").get(del.route_id);
      const weather = del.route_id ? db.prepare("SELECT * FROM weather WHERE route_id=?").all(del.route_id) : [];
      const vehicle = del.vehicle_id ? db.prepare("SELECT * FROM vehicles WHERE id=?").get(del.vehicle_id) : null;
      del.risk = intel.calculateDeliveryRisk(del, route, weather, vehicle);
      
      res.json(del);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/deliveries', (req, res) => {
    try {
      const { id, source_id, destination_id, items, planned_date, vehicle_id, route_id, priority, notes } = req.body;
      const delId = id || 'DEL-' + Date.now().toString(36).toUpperCase();
      db.prepare("INSERT INTO deliveries (id,source_id,destination_id,items,planned_date,vehicle_id,route_id,status,priority,notes,created_by,created_at) VALUES (?,?,?,?,?,?,?,'Planned',?,?,?,datetime('now'))")
        .run(delId,source_id,destination_id,JSON.stringify(items),planned_date,vehicle_id,route_id,priority||'Medium',notes||'',req.user?.username||'system');
      if (vehicle_id) db.prepare("UPDATE vehicles SET status='Assigned', assignment=? WHERE id=?").run(delId, vehicle_id);
      auditLog(req.user?.username, req.user?.role, 'CREATE', 'Delivery', `Created delivery ${delId}`, destination_id, null, JSON.stringify(req.body));
      res.json({ success: true, id: delId });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── COMPLETE DELIVERY (Executed by Transport Coordinator or when status updated to Delivered) ──
  const handleDeliveryCompletion = (req, res) => {
    try {
      let del = null;
      if (req.params.id && req.params.id !== 'active') {
        del = db.prepare("SELECT * FROM deliveries WHERE id=?").get(req.params.id);
      }
      if (!del) {
        del = db.prepare("SELECT * FROM deliveries WHERE status IN ('Ready for Dispatch','En Route','Loading','Planned','Pending Supply Allotment') ORDER BY created_at DESC LIMIT 1").get();
      }
      if (!del) {
        // Last fallback: get any delivery not yet delivered
        del = db.prepare("SELECT * FROM deliveries WHERE status!='Delivered' ORDER BY created_at DESC LIMIT 1").get();
      }
      if (!del) {
        return res.status(404).json({ error: 'No active delivery found to mark as completed' });
      }

      // 1. Mark delivery delivered
      db.prepare("UPDATE deliveries SET status='Delivered', actual_date=datetime('now') WHERE id=?").run(del.id);

      // 2. Add cargo quantities to destination inventory
      let parsed = {};
      try { parsed = typeof del.items === 'string' ? JSON.parse(del.items) : (del.items || {}); } catch {}
      
      const primaryItems = parsed.primary_items || parsed;
      const secondaryItems = parsed.secondary_items;
      const secondaryDest = parsed.secondary_destination_id;

      const replenishPost = (targetLocationId, itemList) => {
        if (!targetLocationId || !itemList) return;
        for (const [key, rawVal] of Object.entries(itemList)) {
          const qty = Number(rawVal) || 0;
          if (qty > 0) {
            const k = key.toLowerCase();
            const cat = k.includes('food') ? 'Food' 
                      : k.includes('water') ? 'Water' 
                      : (k.includes('med') || k.includes('health')) ? 'Medical' 
                      : (k.includes('fuel') || k.includes('diesel')) ? 'Fuel' 
                      : key;
            const invItem = db.prepare("SELECT id, quantity FROM inventory WHERE location_id=? AND (category=? OR item LIKE ?)").get(targetLocationId, cat, `%${cat}%`);
            if (invItem) {
              db.prepare("UPDATE inventory SET quantity=quantity+?, incoming_quantity=0, last_updated=datetime('now') WHERE id=?")
                .run(qty, invItem.id);
            } else {
              db.prepare("INSERT INTO inventory (location_id, item, category, quantity, unit, daily_consumption, safety_stock, incoming_quantity, last_updated) VALUES (?, ?, ?, ?, 'units', 100, 200, 0, datetime('now'))")
                .run(targetLocationId, key, cat, qty);
            }
          }
        }
        // Clear all remaining incoming quantities for destination post
        db.prepare("UPDATE inventory SET incoming_quantity=0 WHERE location_id=?").run(targetLocationId);
        // Mark all active alerts for this post as resolved
        db.prepare("UPDATE alerts SET status='Resolved', resolved_at=datetime('now'), resolved_by=? WHERE location_id=? AND status!='Resolved'")
          .run(req.user?.username || 'Transport Coordinator', targetLocationId);
        // Mark any pending recommendations as approved
        db.prepare("UPDATE recommendations SET status='Approved', decided_at=datetime('now'), decision_notes='Delivery completed; supplies replenished' WHERE location_id=? AND status='Pending'")
          .run(targetLocationId);
        // Mark post location status as Operational
        db.prepare("UPDATE locations SET status='Operational' WHERE id=?").run(targetLocationId);
      };

      replenishPost(del.destination_id, primaryItems);
      if (secondaryDest && secondaryItems) {
        replenishPost(secondaryDest, secondaryItems);
      }

      // 3. Free up vehicle
      if (del.vehicle_id) {
        db.prepare("UPDATE vehicles SET status='Available', assignment=null, current_location_id=? WHERE id=?")
          .run(del.destination_id, del.vehicle_id);
      }

      auditLog(req.user?.username, req.user?.role, 'DELIVER', 'Transport', `Confirmed delivery ${del.id} at ${del.destination_id}${secondaryDest ? ' + ' + secondaryDest : ''}. All rations received.`, del.destination_id, 'En Route', 'Delivered');

      res.json({ success: true, message: 'Delivery completed and post inventory replenished', delivery_id: del.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
  };

  router.put('/deliveries/:id', (req, res) => {
    try {
      const prev = db.prepare("SELECT * FROM deliveries WHERE id=?").get(req.params.id);
      if (!prev) return res.status(404).json({ error: 'Delivery not found' });
      const { status, planned_date, vehicle_id, route_id, items, eta, notes } = req.body;
      if (status === 'Delivered') {
        return handleDeliveryCompletion(req, res);
      }
      db.prepare("UPDATE deliveries SET status=COALESCE(?,status), planned_date=COALESCE(?,planned_date), vehicle_id=COALESCE(?,vehicle_id), route_id=COALESCE(?,route_id), items=COALESCE(?,items), eta=COALESCE(?,eta), notes=COALESCE(?,notes) WHERE id=?")
        .run(status, planned_date, vehicle_id, route_id, items ? JSON.stringify(items) : null, eta, notes, req.params.id);
      auditLog(req.user?.username, req.user?.role, 'UPDATE', 'Delivery', `Updated delivery ${req.params.id}`, null, prev.status, status || 'modified');
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/deliveries/:id/deliver', handleDeliveryCompletion);
  router.put('/deliveries/:id/deliver', handleDeliveryCompletion);
  router.post('/deliveries/:id/complete', handleDeliveryCompletion);
  router.put('/deliveries/:id/complete', handleDeliveryCompletion);

  // ── RESUPPLY DIRECTIVE (Issued by Logistics Officer) ──
  router.post('/resupply/directive', (req, res) => {
    try {
      const { post_id, depot_id, route_id, planned_date, intensity, notes, is_combined, secondary_post_id } = req.body;
      const targetPost = post_id || 'LOC-FWC';
      const targetDepot = depot_id || 'LOC-ALPHA';
      const targetRoute = route_id || 'R-03';
      const targetDate = planned_date || new Date(Date.now() + 86400000).toISOString().split('T')[0];

      // 1. If intensity/consumption was modified, update post's inventory daily_consumption
      if (intensity && Number(intensity) > 0) {
        db.prepare("UPDATE inventory SET daily_consumption=?, last_updated=datetime('now') WHERE location_id=? AND (category='Food' OR item LIKE '%Food%')")
          .run(Number(intensity), targetPost);
      }

      const postName = db.prepare("SELECT name FROM locations WHERE id=?").get(targetPost)?.name || targetPost;
      const secPostName = secondary_post_id ? (db.prepare("SELECT name FROM locations WHERE id=?").get(secondary_post_id)?.name || secondary_post_id) : null;
      const depotName = db.prepare("SELECT name FROM locations WHERE id=?").get(targetDepot)?.name || targetDepot;
      const corridorTitle = getRouteDetails(targetPost, targetRoute);

      const directiveNote = is_combined && secondary_post_id
        ? `[COMBINED_ROUTE:${targetPost}+${secondary_post_id}] Multi-Stop Resupply: Stop 1 -> ${postName}, Stop 2 -> ${secPostName} from ${depotName} via ${corridorTitle}. Departure: ${targetDate}.`
        : (notes || `Directive for ${postName} from ${depotName} via ${corridorTitle}`);

      // 2. Find or create delivery
      let del = db.prepare("SELECT * FROM deliveries WHERE destination_id=? AND status NOT IN ('Delivered','Cancelled') ORDER BY created_at DESC LIMIT 1").get(targetPost);
      let deliveryId;
      if (del) {
        deliveryId = del.id;
        db.prepare("UPDATE deliveries SET source_id=?, route_id=?, planned_date=?, status='Pending Supply Allotment', notes=?, priority='High' WHERE id=?")
          .run(targetDepot, targetRoute, targetDate, directiveNote, deliveryId);
      } else {
        deliveryId = 'DEL-' + Date.now().toString(36).toUpperCase();
        db.prepare("INSERT INTO deliveries (id,source_id,destination_id,items,planned_date,vehicle_id,route_id,status,priority,notes,created_by,created_at) VALUES (?,?,?,?,?,'VH-02',?,'Pending Supply Allotment','High',?,?,datetime('now'))")
          .run(deliveryId, targetDepot, targetPost, JSON.stringify({}), targetDate, targetRoute, directiveNote, req.user?.username || 'logistics');
      }

      // 3. Create active alerts to notify Supply Officer (resolving older alert for these posts first)
      db.prepare("UPDATE alerts SET status='Resolved', resolved_at=datetime('now') WHERE location_id=? AND type='resupply' AND status='New'")
        .run(targetPost);
      
      const alertMsg = is_combined && secPostName
        ? `Logistics Officer approved COMBINED route from ${depotName} via ${corridorTitle} for both ${postName} and ${secPostName}. Awaiting Supply Officer ration allotment for both outposts.`
        : `Logistics Officer approved resupply from ${depotName} via ${corridorTitle}. Awaiting Supply Officer ration allotment.`;

      db.prepare("INSERT INTO alerts (type, severity, location_id, title, message, status, created_at) VALUES ('resupply', 'High', ?, ?, ?, 'New', datetime('now'))")
        .run(targetPost, is_combined ? 'Combined Resupply Directive Issued' : 'Resupply Directive Issued', alertMsg);

      if (is_combined && secondary_post_id) {
        db.prepare("UPDATE alerts SET status='Resolved', resolved_at=datetime('now') WHERE location_id=? AND type='resupply' AND status='New'")
          .run(secondary_post_id);
        db.prepare("INSERT INTO alerts (type, severity, location_id, title, message, status, created_at) VALUES ('resupply', 'High', ?, 'Combined Resupply Directive Issued', ?, 'New', datetime('now'))")
          .run(secondary_post_id, alertMsg);
      }

      auditLog(req.user?.username, req.user?.role, 'DIRECTIVE', 'Resupply', `Issued resupply directive for ${postName}${secPostName ? ' + ' + secPostName : ''} from ${depotName} via ${corridorTitle}`, targetPost, null, JSON.stringify(req.body));

      res.json({ 
        success: true, 
        delivery_id: deliveryId, 
        is_combined: Boolean(is_combined),
        secondary_post_id,
        message: is_combined 
          ? `Combined resupply directive for ${postName} and ${secPostName} dispatched to Supply Officer`
          : `Resupply directive for ${postName} dispatched to Supply Officer` 
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── RESUPPLY RATION ALLOTMENT (Entered by Supply Officer) ──
  router.post('/resupply/allot', (req, res) => {
    try {
      const { delivery_id, destination_id, items, secondary_items, secondary_destination_id, notes } = req.body;
      let del = null;
      if (delivery_id) {
        del = db.prepare("SELECT * FROM deliveries WHERE id=?").get(delivery_id);
      }
      if ((!del || (destination_id && del.destination_id !== destination_id)) && destination_id) {
        del = db.prepare("SELECT * FROM deliveries WHERE destination_id=? AND status NOT IN ('Delivered','Cancelled') ORDER BY created_at DESC LIMIT 1").get(destination_id);
      }
      if (!del) {
        del = db.prepare("SELECT * FROM deliveries WHERE status IN ('Pending Supply Allotment','Planned') ORDER BY created_at DESC LIMIT 1").get();
      }
      if (!del) {
        // Fallback: create fresh delivery if none pending
        const dest = destination_id || 'LOC-FWC';
        const defaultRoute = (dest === 'LOC-FWE' || dest === 'LOC-FWD') ? 'R-01' : (dest === 'LOC-FWA' || dest === 'LOC-FWF') ? 'R-02' : 'R-03';
        del = { id: 'DEL-' + Date.now().toString(36).toUpperCase(), destination_id: dest, source_id: 'LOC-ALPHA', route_id: defaultRoute, planned_date: new Date(Date.now() + 86400000).toISOString().split('T')[0] };
        db.prepare("INSERT INTO deliveries (id,source_id,destination_id,items,planned_date,vehicle_id,route_id,status,priority,notes,created_by,created_at) VALUES (?,?,?,?,?,'VH-02',?,'Ready for Dispatch','High',?,'supply',datetime('now'))")
          .run(del.id, del.source_id, del.destination_id, JSON.stringify(items || {}), del.planned_date, del.route_id, notes || 'Ration allotment created');
      }

      // Calculate payload weight across primary items
      const food = Number(items?.['Food Rations'] ?? items?.['Food'] ?? 0);
      const water = Number(items?.['Potable Water'] ?? items?.['Water'] ?? 0);
      const med = Number(items?.['Medical Supplies'] ?? items?.['Medical'] ?? 0);
      const fuel = Number(items?.['Diesel Fuel'] ?? items?.['Fuel'] ?? 0);
      let totalWeight = (food * 1) + (water * 1) + (med * 1) + (fuel * 0.85);

      // If secondary items exist (for combined multi-post route), add them
      if (secondary_items && typeof secondary_items === 'object') {
        const sFood = Number(secondary_items['Food Rations'] ?? secondary_items['Food'] ?? 0);
        const sWater = Number(secondary_items['Potable Water'] ?? secondary_items['Water'] ?? 0);
        const sMed = Number(secondary_items['Medical Supplies'] ?? secondary_items['Medical'] ?? 0);
        const sFuel = Number(secondary_items['Diesel Fuel'] ?? secondary_items['Fuel'] ?? 0);
        totalWeight += (sFood * 1) + (sWater * 1) + (sMed * 1) + (sFuel * 0.85);
      }

      // ── TERRAIN-BASED VEHICLE SELECTION ──
      // Lookup route to inspect terrain profile (Mountain, Desert, Plains)
      const route = db.prepare("SELECT * FROM routes WHERE id=?").get(del.route_id);
      const terrain = (route?.terrain || 'Mountainous').toLowerCase();

      let selectedVehicleId = 'VH-02'; // default Medium Tactical 4x4
      let terrainNotes = '';

      if (terrain.includes('mountain') || terrain.includes('highland') || terrain.includes('pass')) {
        // Mountainous terrain: Strictly Tactical 4x4 or 6x6 All-Terrain vehicles
        // (VH-04 Heavy Highway Carrier is excluded from steep mountain passes)
        if (totalWeight <= 3000) {
          selectedVehicleId = 'VH-03'; // Light Tactical 4x4 (Agile Mountain)
          terrainNotes = 'Selected VH-03 (Light Tactical 4x4) - Certified for steep mountain pass switchbacks.';
        } else if (totalWeight <= 8000) {
          selectedVehicleId = 'VH-02'; // Medium Tactical 4x4
          terrainNotes = 'Selected VH-02 (Medium Tactical 4x4) - Optimal balance for mountain terrain with high ground clearance.';
        } else {
          selectedVehicleId = 'VH-01'; // Heavy Tactical 6x6
          terrainNotes = 'Selected VH-01 (Heavy Tactical 6x6) - Certified for heavy mountain payloads with all-wheel drive.';
        }
      } else if (terrain.includes('desert')) {
        // Desert terrain: High heat cooling and sand capability
        if (totalWeight <= 3000) {
          selectedVehicleId = 'VH-03';
          terrainNotes = 'Selected VH-03 (Light Tactical 4x4) - Desert sand dune capable.';
        } else if (totalWeight <= 8000) {
          selectedVehicleId = 'VH-02';
          terrainNotes = 'Selected VH-02 (Medium Tactical 4x4) - Sand-rated tires and cooling.';
        } else {
          selectedVehicleId = 'VH-01';
          terrainNotes = 'Selected VH-01 (Heavy Tactical 6x6) - Desert crossing heavy hauler.';
        }
      } else {
        // Plains / Paved Highway
        if (totalWeight <= 3000) {
          selectedVehicleId = 'VH-03';
        } else if (totalWeight <= 8000) {
          selectedVehicleId = 'VH-02';
        } else {
          selectedVehicleId = 'VH-04'; // Heavy Highway Carrier (15000kg)
          terrainNotes = 'Selected VH-04 (Heavy Transport Delta) - Max highway payload efficiency on paved plains.';
        }
      }

      // Check if vehicle exists and assign
      const veh = db.prepare("SELECT * FROM vehicles WHERE id=?").get(selectedVehicleId);
      if (veh) {
        db.prepare("UPDATE vehicles SET status='Assigned', assignment=? WHERE id=?").run(del.id, selectedVehicleId);
      }

      // Package items with optional secondary post breakdown
      const finalItemsPayload = secondary_items && Object.keys(secondary_items).length > 0
        ? { primary_items: items, secondary_items, secondary_destination_id }
        : items;

      // Update delivery record
      const fullNotes = (notes ? notes + ' • ' : '') + terrainNotes;
      db.prepare("UPDATE deliveries SET items=?, vehicle_id=?, status='Ready for Dispatch', notes=? WHERE id=?")
        .run(JSON.stringify(finalItemsPayload || {}), selectedVehicleId, fullNotes, del.id);

      // Update destination post incoming inventory quantity for all commodities
      if (food > 0) {
        db.prepare("UPDATE inventory SET incoming_quantity=?, expected_delivery=?, last_updated=datetime('now') WHERE location_id=? AND (category='Food' OR item LIKE '%Food%')")
          .run(food, del.planned_date, del.destination_id);
      }
      if (water > 0) {
        db.prepare("UPDATE inventory SET incoming_quantity=?, expected_delivery=?, last_updated=datetime('now') WHERE location_id=? AND (category='Water' OR item LIKE '%Water%')")
          .run(water, del.planned_date, del.destination_id);
      }
      if (med > 0) {
        db.prepare("UPDATE inventory SET incoming_quantity=?, expected_delivery=?, last_updated=datetime('now') WHERE location_id=? AND (category='Medical' OR item LIKE '%Med%')")
          .run(med, del.planned_date, del.destination_id);
      }
      if (fuel > 0) {
        db.prepare("UPDATE inventory SET incoming_quantity=?, expected_delivery=?, last_updated=datetime('now') WHERE location_id=? AND (category='Fuel' OR item LIKE '%Fuel%')")
          .run(fuel, del.planned_date, del.destination_id);
      }

      // If secondary destination has items, update incoming inventory for secondary post too
      if (secondary_destination_id && secondary_items) {
        const sFood = Number(secondary_items['Food Rations'] ?? secondary_items['Food'] ?? 0);
        const sWater = Number(secondary_items['Potable Water'] ?? secondary_items['Water'] ?? 0);
        const sMed = Number(secondary_items['Medical Supplies'] ?? secondary_items['Medical'] ?? 0);
        const sFuel = Number(secondary_items['Diesel Fuel'] ?? secondary_items['Fuel'] ?? 0);
        if (sFood > 0) {
          db.prepare("UPDATE inventory SET incoming_quantity=?, expected_delivery=?, last_updated=datetime('now') WHERE location_id=? AND (category='Food' OR item LIKE '%Food%')")
            .run(sFood, del.planned_date, secondary_destination_id);
        }
        if (sWater > 0) {
          db.prepare("UPDATE inventory SET incoming_quantity=?, expected_delivery=?, last_updated=datetime('now') WHERE location_id=? AND (category='Water' OR item LIKE '%Water%')")
            .run(sWater, del.planned_date, secondary_destination_id);
        }
        if (sMed > 0) {
          db.prepare("UPDATE inventory SET incoming_quantity=?, expected_delivery=?, last_updated=datetime('now') WHERE location_id=? AND (category='Medical' OR item LIKE '%Med%')")
            .run(sMed, del.planned_date, secondary_destination_id);
        }
        if (sFuel > 0) {
          db.prepare("UPDATE inventory SET incoming_quantity=?, expected_delivery=?, last_updated=datetime('now') WHERE location_id=? AND (category='Fuel' OR item LIKE '%Fuel%')")
            .run(sFuel, del.planned_date, secondary_destination_id);
        }
      }

      // Acknowledge the directive alert since Supply Officer has now acted on it
      db.prepare("UPDATE alerts SET status='Acknowledged', acknowledged_by=?, acknowledged_at=datetime('now') WHERE location_id=? AND type='resupply' AND status='New'")
        .run(req.user?.username || 'Supply Officer', del.destination_id);
      if (secondary_destination_id) {
        db.prepare("UPDATE alerts SET status='Acknowledged', acknowledged_by=?, acknowledged_at=datetime('now') WHERE location_id=? AND type='resupply' AND status='New'")
          .run(req.user?.username || 'Supply Officer', secondary_destination_id);
      }

      auditLog(req.user?.username, req.user?.role, 'ALLOT', 'Supply', `Supply Officer allotted rations (${Math.round(totalWeight)} kg). Terrain: ${terrain}. Assigned ${veh?.name || selectedVehicleId}`, del.destination_id, del.items, JSON.stringify(finalItemsPayload));

      res.json({ 
        success: true, 
        delivery_id: del.id, 
        payload_weight: Math.round(totalWeight),
        vehicle: veh || { id: selectedVehicleId, name: 'Assigned Vehicle', capacity: 15000 },
        terrain: route?.terrain || 'Mountainous',
        terrain_note: terrainNotes,
        items: finalItemsPayload,
        route_id: del.route_id,
        route_name: getRouteDetails(del.destination_id, del.route_id)
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });



  // ── ALERTS ──
  router.get('/alerts', (req, res) => {
    try {
      let q = "SELECT a.*, l.name as location_name FROM alerts a LEFT JOIN locations l ON a.location_id=l.id WHERE (a.title NOT LIKE '%Weather Forecast%' AND a.title NOT LIKE '%Vehicle VH-05%' AND a.title NOT LIKE '%Forward Charlie%')";
      const params = [];
      if (req.query.status) { q += " AND a.status=?"; params.push(req.query.status); }
      if (req.query.severity) { q += " AND a.severity=?"; params.push(req.query.severity); }
      if (req.query.type) { q += " AND a.type=?"; params.push(req.query.type); }
      q += " ORDER BY CASE a.severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END, a.created_at DESC";
      res.json(db.prepare(q).all(...params));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/alerts', (req, res) => {
    try {
      const { type, severity, location_id, title, message, data } = req.body;
      const result = db.prepare("INSERT INTO alerts (type,severity,location_id,title,message,status,data,created_at) VALUES (?,?,?,?,?,'New',?,datetime('now'))").run(type,severity,location_id,title,message,data?JSON.stringify(data):null);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/alerts/:id/acknowledge', (req, res) => {
    try {
      db.prepare("UPDATE alerts SET status='Acknowledged', acknowledged_by=?, acknowledged_at=datetime('now') WHERE id=?").run(req.user?.username || 'unknown', req.params.id);
      auditLog(req.user?.username, req.user?.role, 'ACKNOWLEDGE', 'Alert', `Acknowledged alert #${req.params.id}`, null, 'New', 'Acknowledged');
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/alerts/:id/resolve', (req, res) => {
    try {
      db.prepare("UPDATE alerts SET status='Resolved', resolved_by=?, resolved_at=datetime('now') WHERE id=?").run(req.user?.username || 'unknown', req.params.id);
      auditLog(req.user?.username, req.user?.role, 'RESOLVE', 'Alert', `Resolved alert #${req.params.id}`, null, 'Acknowledged', 'Resolved');
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── FORECAST ──
  router.get('/forecast/:locationId', (req, res) => {
    try {
      const loc = db.prepare("SELECT * FROM locations WHERE id=?").get(req.params.locationId);
      const inv = db.prepare("SELECT * FROM inventory WHERE location_id=?").all(req.params.locationId);
      const weather = db.prepare("SELECT * FROM weather WHERE location_id=? OR route_id IN (SELECT id FROM routes WHERE to_location_id=?)").all(req.params.locationId, req.params.locationId);
      const forecasts = intel.calculateDemandForecast(inv, weather, loc);
      res.json({ location: loc, forecasts, generated_at: new Date().toISOString() });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/forecast/:locationId/stockout', (req, res) => {
    try {
      const loc = db.prepare("SELECT * FROM locations WHERE id=?").get(req.params.locationId);
      const inv = db.prepare("SELECT * FROM inventory WHERE location_id=?").all(req.params.locationId);
      const weather = db.prepare("SELECT * FROM weather WHERE location_id=? OR route_id IN (SELECT id FROM routes WHERE to_location_id=?)").all(req.params.locationId, req.params.locationId);
      const deliveries = db.prepare("SELECT * FROM deliveries WHERE destination_id=? AND status NOT IN ('Delivered','Cancelled')").all(req.params.locationId);
      const forecasts = intel.calculateDemandForecast(inv, weather, loc);
      const stockouts = intel.calculateStockoutPrediction(inv, forecasts, deliveries);
      res.json({ location: loc, predictions: stockouts, generated_at: new Date().toISOString() });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── RISK ──
  router.get('/risk/:locationId', (req, res) => {
    try {
      const loc = db.prepare("SELECT * FROM locations WHERE id=?").get(req.params.locationId);
      if (!loc) return res.status(404).json({ error: 'Location not found' });
      const inv = db.prepare("SELECT * FROM inventory WHERE location_id=?").all(req.params.locationId);
      const weather = db.prepare("SELECT * FROM weather WHERE location_id=? OR route_id IN (SELECT id FROM routes WHERE to_location_id=?)").all(req.params.locationId, req.params.locationId);
      const routes = db.prepare("SELECT * FROM routes WHERE to_location_id=?").all(req.params.locationId);
      routes.forEach(r => { try { r.segments = JSON.parse(r.segments); } catch { r.segments = []; } });
      const vehicles = db.prepare("SELECT * FROM vehicles").all();
      const deliveries = db.prepare("SELECT * FROM deliveries WHERE destination_id=? AND status NOT IN ('Delivered','Cancelled')").all(req.params.locationId);
      const forecasts = intel.calculateDemandForecast(inv, weather, loc);
      const risk = intel.calculateSupplyRisk(inv, forecasts, weather, routes, vehicles, deliveries, loc);
      res.json(risk);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/risk/delivery/:deliveryId', (req, res) => {
    try {
      const del = db.prepare("SELECT * FROM deliveries WHERE id=?").get(req.params.deliveryId);
      if (!del) return res.status(404).json({ error: 'Delivery not found' });
      const route = del.route_id ? db.prepare("SELECT * FROM routes WHERE id=?").get(del.route_id) : null;
      if (route) { try { route.segments = JSON.parse(route.segments); } catch { route.segments = []; } }
      const weather = del.route_id ? db.prepare("SELECT * FROM weather WHERE route_id=?").all(del.route_id) : [];
      const vehicle = del.vehicle_id ? db.prepare("SELECT * FROM vehicles WHERE id=?").get(del.vehicle_id) : null;
      const risk = intel.calculateDeliveryRisk(del, route, weather, vehicle);
      res.json(risk);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── RECOMMENDATIONS ──
  router.get('/recommendations', (req, res) => {
    try {
      let q = "SELECT r.*, l.name as location_name FROM recommendations r LEFT JOIN locations l ON r.location_id=l.id";
      const params = [];
      if (req.query.location_id) { q += " WHERE r.location_id=?"; params.push(req.query.location_id); }
      if (req.query.status) { q += (params.length ? " AND" : " WHERE") + " r.status=?"; params.push(req.query.status); }
      q += " ORDER BY CASE r.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END, r.created_at DESC";
      const recs = db.prepare(q).all(...params);
      recs.forEach(r => { try { r.factors = JSON.parse(r.factors); } catch {} });
      res.json(recs);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/recommendations/:locationId', (req, res) => {
    try {
      const recs = db.prepare("SELECT r.*, l.name as location_name FROM recommendations r LEFT JOIN locations l ON r.location_id=l.id WHERE r.location_id=? ORDER BY r.created_at DESC").all(req.params.locationId);
      recs.forEach(r => { try { r.factors = JSON.parse(r.factors); } catch {} });
      res.json(recs);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/recommendations/:id/decide', (req, res) => {
    try {
      if (req.user?.role !== 'Logistics Officer' && req.user?.username !== 'demo') {
        return res.status(403).json({ error: 'Operational decision authority is strictly restricted to Logistics Officer' });
      }
      const { decision, notes, modifications } = req.body;
      const prev = db.prepare("SELECT * FROM recommendations WHERE id=?").get(req.params.id);
      db.prepare("UPDATE recommendations SET status=?, decided_by=?, decided_at=datetime('now'), decision_notes=? WHERE id=?")
        .run(decision, req.user?.username || 'unknown', notes || '', req.params.id);
      
      auditLog(req.user?.username, req.user?.role, decision.toUpperCase(), 'Recommendation', `${decision} recommendation #${req.params.id}: ${prev?.title}`, prev?.location_id, prev?.status, decision);
      
      // If approved/modified and linked to delivery, optionally update delivery
      if ((decision === 'Approved' || decision === 'Modified') && modifications && prev?.delivery_id) {
        const { planned_date, route_id, vehicle_id } = modifications;
        if (planned_date || route_id || vehicle_id) {
          db.prepare("UPDATE deliveries SET planned_date=COALESCE(?,planned_date), route_id=COALESCE(?,route_id), vehicle_id=COALESCE(?,vehicle_id) WHERE id=?")
            .run(planned_date, route_id, vehicle_id, prev.delivery_id);
          auditLog(req.user?.username, req.user?.role, 'UPDATE', 'Delivery', `Modified delivery ${prev.delivery_id} based on recommendation`, null, null, JSON.stringify(modifications));
        }
      }
      
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/recommendations/generate/:locationId', (req, res) => {
    try {
      const loc = db.prepare("SELECT * FROM locations WHERE id=?").get(req.params.locationId);
      if (!loc) return res.status(404).json({ error: 'Location not found' });
      const inv = db.prepare("SELECT * FROM inventory WHERE location_id=?").all(req.params.locationId);
      const weather = db.prepare("SELECT * FROM weather WHERE location_id=? OR route_id IN (SELECT id FROM routes WHERE to_location_id=?)").all(req.params.locationId, req.params.locationId);
      const routes = db.prepare("SELECT * FROM routes WHERE to_location_id=?").all(req.params.locationId);
      const vehicles = db.prepare("SELECT * FROM vehicles").all();
      const deliveries = db.prepare("SELECT * FROM deliveries WHERE destination_id=? AND status NOT IN ('Delivered','Cancelled')").all(req.params.locationId);
      const forecasts = intel.calculateDemandForecast(inv, weather, loc);
      const riskData = intel.calculateSupplyRisk(inv, forecasts, weather, routes, vehicles, deliveries, loc);
      const recs = intel.generateRecommendations(req.params.locationId, riskData, inv, deliveries, routes, weather);
      
      // Save to DB
      const insertRec = db.prepare("INSERT INTO recommendations (type,location_id,delivery_id,title,explanation,factors,action,status,priority,created_at) VALUES (?,?,?,?,?,?,?,'Pending',?,datetime('now'))");
      for (const rec of recs) {
        insertRec.run(rec.type, rec.location_id, rec.delivery_id, rec.title, rec.explanation, typeof rec.factors === 'string' ? rec.factors : JSON.stringify(rec.factors), rec.action, rec.priority);
      }
      
      auditLog(req.user?.username, req.user?.role, 'GENERATE', 'Recommendation', `Generated ${recs.length} recommendations for ${loc.name}`, req.params.locationId, null, null);
      res.json({ success: true, count: recs.length, recommendations: recs });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── SIMULATION ──
  router.post('/simulate', (req, res) => {
    try {
      const { location_id } = req.body;
      const loc = db.prepare("SELECT * FROM locations WHERE id=?").get(location_id);
      if (!loc) return res.status(404).json({ error: 'Location not found' });
      const inv = db.prepare("SELECT * FROM inventory WHERE location_id=?").all(location_id);
      const weather = db.prepare("SELECT * FROM weather WHERE location_id=? OR route_id IN (SELECT id FROM routes WHERE to_location_id=?)").all(location_id, location_id);
      const deliveries = db.prepare("SELECT * FROM deliveries WHERE destination_id=? AND status NOT IN ('Delivered','Cancelled')").all(location_id);
      const result = intel.runSimulation(req.body, { inventory: inv, weather, deliveries, location: loc });
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── IOT SIMULATION ──
  router.post('/iot/simulate', (req, res) => {
    try {
      const { type, location_id, data } = req.body;
      const results = { updated_inventory: [], new_alerts: [], risk_changes: [], events: [] };
      
      if (type === 'consumption') {
        const inv = db.prepare("SELECT * FROM inventory WHERE location_id=?").all(location_id);
        for (const item of inv) {
          const consumed = Math.round(item.daily_consumption * (0.1 + Math.random() * 0.15));
          const newQty = Math.max(0, item.quantity - consumed);
          db.prepare("UPDATE inventory SET quantity=?, last_updated=datetime('now') WHERE id=?").run(newQty, item.id);
          const days = intel.calculateDaysRemaining(newQty, item.daily_consumption);
          results.updated_inventory.push({ item: item.item, previous: item.quantity, consumed, new_quantity: newQty, days_remaining: days });
          results.events.push(`[SENSOR] ${item.item} consumption: ${consumed} ${item.unit} consumed`);
          if (days <= 2 && days < intel.calculateDaysRemaining(item.quantity, item.daily_consumption)) {
            db.prepare("INSERT INTO alerts (type,severity,location_id,title,message,status,created_at) VALUES (?,?,?,?,?,'New',datetime('now'))")
              .run('Inventory', days <= 1 ? 'Critical' : 'High', location_id, `Low ${item.item} Supply`, `${item.item} at ${location_id} down to ${days.toFixed(1)} days supply after IoT consumption update`);
            results.new_alerts.push({ severity: days <= 1 ? 'Critical' : 'High', message: `${item.item}: ${days.toFixed(1)} days remaining` });
          }
        }
      } else if (type === 'delivery') {
        const inv = db.prepare("SELECT * FROM inventory WHERE location_id=?").all(location_id);
        for (const item of inv) {
          const delivered = Math.round(item.daily_consumption * 3);
          const newQty = item.quantity + delivered;
          db.prepare("UPDATE inventory SET quantity=?, last_updated=datetime('now') WHERE id=?").run(newQty, item.id);
          results.updated_inventory.push({ item: item.item, previous: item.quantity, delivered, new_quantity: newQty, days_remaining: intel.calculateDaysRemaining(newQty, item.daily_consumption) });
          results.events.push(`[SENSOR] ${item.item} delivery received: +${delivered} ${item.unit}`);
        }
      } else if (type === 'sensor_update') {
        const inv = db.prepare("SELECT * FROM inventory WHERE location_id=?").all(location_id);
        for (const item of inv) {
          const variance = Math.round(item.quantity * (Math.random() * 0.04 - 0.02));
          const newQty = Math.max(0, item.quantity + variance);
          db.prepare("UPDATE inventory SET quantity=?, last_updated=datetime('now') WHERE id=?").run(newQty, item.id);
          results.updated_inventory.push({ item: item.item, previous: item.quantity, adjustment: variance, new_quantity: newQty, days_remaining: intel.calculateDaysRemaining(newQty, item.daily_consumption) });
          results.events.push(`[SENSOR] ${item.item} sensor calibration: ${variance >= 0 ? '+' : ''}${variance} ${item.unit}`);
        }
      } else if (type === 'low_stock') {
        const food = db.prepare("SELECT * FROM inventory WHERE location_id=? AND category='Food'").get(location_id);
        if (food) {
          const newQty = Math.round(food.daily_consumption * 0.8);
          db.prepare("UPDATE inventory SET quantity=?, last_updated=datetime('now') WHERE id=?").run(newQty, food.id);
          results.updated_inventory.push({ item: food.item, previous: food.quantity, new_quantity: newQty, days_remaining: intel.calculateDaysRemaining(newQty, food.daily_consumption) });
          results.events.push(`[SENSOR] CRITICAL: Food supply dropped to ${newQty} ${food.unit}`);
          db.prepare("INSERT INTO alerts (type,severity,location_id,title,message,status,created_at) VALUES (?,?,?,?,?,'New',datetime('now'))")
            .run('Inventory', 'Critical', location_id, 'Critical Food Shortage', `IoT sensor detected food supply at critically low level: ${newQty} ${food.unit}`);
          results.new_alerts.push({ severity: 'Critical', message: `Food supply critically low: ${newQty} ${food.unit}` });
        }
      }
      
      results.data_source = 'SIMULATED IoT DATA';
      results.timestamp = new Date().toISOString();
      auditLog('IoT System', 'system', 'IOT_SIMULATION', 'IoT', `Simulated ${type} at ${location_id}`, location_id, null, JSON.stringify(results.events));
      res.json(results);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── REPORTS ──
  router.get('/reports/:type', (req, res) => {
    try {
      const reportType = req.params.type;
      let report = { type: reportType, generated_at: new Date().toISOString(), title: '', data: [] };
      
      switch (reportType) {
        case 'inventory': {
          report.title = 'Inventory Status Report';
          const inv = db.prepare("SELECT i.*, l.name as location_name FROM inventory i JOIN locations l ON i.location_id=l.id ORDER BY l.name, i.category").all();
          report.data = inv.map(i => ({ ...i, days_remaining: intel.calculateDaysRemaining(i.quantity, i.daily_consumption), status: intel.getInventoryStatus(intel.calculateDaysRemaining(i.quantity, i.daily_consumption)) }));
          report.summary = { total_items: inv.length, critical: report.data.filter(i => i.status === 'Critical').length, low: report.data.filter(i => i.status === 'Low').length, adequate: report.data.filter(i => i.status === 'Adequate').length };
          break;
        }
        case 'demand': {
          report.title = 'Demand Forecast Report';
          const locs = db.prepare("SELECT * FROM locations WHERE type='forward_location'").all();
          for (const loc of locs) {
            const inv = db.prepare("SELECT * FROM inventory WHERE location_id=?").all(loc.id);
            const weather = db.prepare("SELECT * FROM weather WHERE location_id=?").all(loc.id);
            const forecasts = intel.calculateDemandForecast(inv, weather, loc);
            report.data.push({ location: loc.name, forecasts });
          }
          break;
        }
        case 'supply-risk': {
          report.title = 'Supply Risk Report';
          const locs = db.prepare("SELECT * FROM locations WHERE type='forward_location'").all();
          for (const loc of locs) {
            const inv = db.prepare("SELECT * FROM inventory WHERE location_id=?").all(loc.id);
            const weather = db.prepare("SELECT * FROM weather WHERE route_id IN (SELECT id FROM routes WHERE to_location_id=?)").all(loc.id);
            const routes = db.prepare("SELECT * FROM routes WHERE to_location_id=?").all(loc.id);
            const vehicles = db.prepare("SELECT * FROM vehicles").all();
            const deliveries = db.prepare("SELECT * FROM deliveries WHERE destination_id=?").all(loc.id);
            const forecasts = intel.calculateDemandForecast(inv, weather, loc);
            report.data.push({ location: loc.name, risk: intel.calculateSupplyRisk(inv, forecasts, weather, routes, vehicles, deliveries, loc) });
          }
          break;
        }
        case 'route-risk': {
          report.title = 'Route Risk Report';
          const routes = db.prepare("SELECT r.*, lf.name as from_name, lt.name as to_name FROM routes r LEFT JOIN locations lf ON r.from_location_id=lf.id LEFT JOIN locations lt ON r.to_location_id=lt.id").all();
          for (const r of routes) {
            try { r.segments = JSON.parse(r.segments); } catch { r.segments = []; }
            const weather = db.prepare("SELECT * FROM weather WHERE route_id=?").all(r.id);
            report.data.push({ ...r, risk: intel.calculateRouteRisk(r, weather) });
          }
          break;
        }
        case 'fleet': {
          report.title = 'Fleet Status Report';
          report.data = db.prepare("SELECT v.*, l.name as location_name FROM vehicles v LEFT JOIN locations l ON v.current_location_id=l.id").all();
          report.summary = { total: report.data.length, available: report.data.filter(v => v.status === 'Available').length, assigned: report.data.filter(v => v.status === 'Assigned').length, en_route: report.data.filter(v => v.status === 'En Route').length, maintenance: report.data.filter(v => v.status === 'Maintenance').length };
          break;
        }
        case 'delivery': {
          report.title = 'Delivery Performance Report';
          report.data = db.prepare("SELECT d.*, ls.name as source_name, ld.name as dest_name FROM deliveries d LEFT JOIN locations ls ON d.source_id=ls.id LEFT JOIN locations ld ON d.destination_id=ld.id ORDER BY d.planned_date").all();
          report.data.forEach(d => { try { d.items = JSON.parse(d.items); } catch{} });
          report.summary = { total: report.data.length, planned: report.data.filter(d => d.status === 'Planned').length, loading: report.data.filter(d => d.status === 'Loading').length, en_route: report.data.filter(d => d.status === 'En Route').length, delivered: report.data.filter(d => d.status === 'Delivered').length, delayed: report.data.filter(d => d.status === 'Delayed').length };
          break;
        }
        case 'weather': {
          report.title = 'Weather Impact Report';
          report.data = db.prepare("SELECT * FROM weather ORDER BY date").all();
          report.summary = { total_records: report.data.length, severe: report.data.filter(w => w.severity === 'Severe').length, high: report.data.filter(w => w.severity === 'High').length };
          break;
        }
        case 'recommendation': {
          report.title = 'Recommendation History Report';
          const recs = db.prepare("SELECT r.*, l.name as location_name FROM recommendations r LEFT JOIN locations l ON r.location_id=l.id ORDER BY r.created_at DESC").all();
          recs.forEach(r => { try { r.factors = JSON.parse(r.factors); } catch {} });
          report.data = recs;
          report.summary = { total: recs.length, pending: recs.filter(r => r.status === 'Pending').length, approved: recs.filter(r => r.status === 'Approved').length, rejected: recs.filter(r => r.status === 'Rejected').length };
          break;
        }
        case 'audit': {
          report.title = 'Audit History Report';
          report.data = db.prepare("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 500").all();
          break;
        }
        default:
          return res.status(400).json({ error: 'Unknown report type' });
      }
      
      res.json(report);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── AUDIT LOG ──
  router.get('/audit', (req, res) => {
    try {
      let q = "SELECT * FROM audit_log WHERE 1=1";
      const params = [];
      if (req.query.user) { q += " AND user=?"; params.push(req.query.user); }
      if (req.query.action) { q += " AND action=?"; params.push(req.query.action); }
      if (req.query.category) { q += " AND category=?"; params.push(req.query.category); }
      if (req.query.from) { q += " AND timestamp>=?"; params.push(req.query.from); }
      if (req.query.to) { q += " AND timestamp<=?"; params.push(req.query.to); }
      q += " ORDER BY timestamp DESC LIMIT 500";
      res.json(db.prepare(q).all(...params));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── SETTINGS ──
  router.get('/settings', (req, res) => {
    try { res.json(db.prepare("SELECT * FROM settings").all()); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/settings/:key', (req, res) => {
    try {
      const s = db.prepare("SELECT * FROM settings WHERE key=?").get(req.params.key);
      if (!s) return res.status(404).json({ error: 'Setting not found' });
      res.json(s);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/settings/:key', (req, res) => {
    try {
      if (req.user?.role !== 'Administrator' && req.user?.username !== 'demo') {
        return res.status(403).json({ error: 'System settings management is restricted to Administrator' });
      }
      const prev = db.prepare("SELECT * FROM settings WHERE key=?").get(req.params.key);
      db.prepare("UPDATE settings SET value=? WHERE key=?").run(req.body.value, req.params.key);
      auditLog(req.user?.username, req.user?.role, 'UPDATE', 'Settings', `Updated ${req.params.key}`, null, prev?.value, req.body.value);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── DATA QUALITY ──
  router.get('/data-quality', (req, res) => {
    try {
      const sources = [];
      const invCount = db.prepare("SELECT count(*) as c FROM inventory").get().c;
      const invOldest = db.prepare("SELECT MIN(last_updated) as oldest FROM inventory").get();
      sources.push({ source: 'Inventory', records: invCount, last_update: invOldest.oldest, status: invCount > 0 ? 'Good' : 'Missing', confidence: invCount > 0 ? 85 : 0, issues: invCount === 0 ? ['No inventory data'] : [] });

      const wCount = db.prepare("SELECT count(*) as c FROM weather").get().c;
      sources.push({ source: 'Weather', records: wCount, last_update: new Date().toISOString(), status: wCount > 0 ? 'Good' : 'Warning', confidence: wCount > 0 ? 70 : 0, issues: wCount === 0 ? ['No weather data available'] : ['Data is simulated'], data_source: 'SIMULATED' });

      const rCount = db.prepare("SELECT count(*) as c FROM routes").get().c;
      sources.push({ source: 'Routes', records: rCount, last_update: new Date().toISOString(), status: rCount > 0 ? 'Good' : 'Warning', confidence: rCount > 0 ? 90 : 0, issues: rCount === 0 ? ['No route data'] : [] });

      const vCount = db.prepare("SELECT count(*) as c FROM vehicles").get().c;
      sources.push({ source: 'Vehicles', records: vCount, last_update: new Date().toISOString(), status: vCount > 0 ? 'Good' : 'Warning', confidence: vCount > 0 ? 90 : 0, issues: vCount === 0 ? ['No vehicle data'] : [] });

      const dCount = db.prepare("SELECT count(*) as c FROM deliveries").get().c;
      sources.push({ source: 'Deliveries', records: dCount, last_update: new Date().toISOString(), status: 'Good', confidence: 90, issues: [] });

      sources.push({ source: 'IoT Sensors', records: 0, last_update: null, status: 'Simulated', confidence: 50, issues: ['IoT data is simulated', 'No real sensor connections'], data_source: 'SIMULATED' });

      res.json(sources);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── DEMO DATA ──
  router.post('/demo/load', (req, res) => {
    try {
      // Clear and re-seed
      db.exec("DELETE FROM inventory; DELETE FROM weather; DELETE FROM routes; DELETE FROM vehicles; DELETE FROM deliveries; DELETE FROM alerts; DELETE FROM recommendations; DELETE FROM audit_log; DELETE FROM locations;");
      // Re-run seed (we need to re-import)
      const { seedDemoData } = require('../database');
      seedDemoData(db);
      auditLog(req.user?.username, req.user?.role, 'LOAD_DEMO', 'System', 'Loaded demo data', null, null, null);
      res.json({ success: true, message: 'Demo data loaded successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/demo/reset', (req, res) => {
    try {
      db.exec("DELETE FROM inventory; DELETE FROM weather; DELETE FROM routes; DELETE FROM vehicles; DELETE FROM deliveries; DELETE FROM alerts; DELETE FROM recommendations; DELETE FROM audit_log; DELETE FROM locations; DELETE FROM settings;");
      const { seedDemoData } = require('../database');
      seedDemoData(db);
      auditLog(req.user?.username, req.user?.role, 'RESET_DATA', 'System', 'Reset all data', null, null, null);
      res.json({ success: true, message: 'Data reset successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  return router;
};
