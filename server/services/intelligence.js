// F-LINK Intelligence Service - Forecast, Risk, Recommendation Logic

function calculateDaysRemaining(quantity, dailyConsumption) {
  if (!dailyConsumption || dailyConsumption <= 0) return quantity > 0 ? 999 : 0;
  return Math.round((quantity / dailyConsumption) * 10) / 10;
}

function getInventoryStatus(daysRemaining, safetyStockDays = 3) {
  if (daysRemaining <= 1) return 'Critical';
  if (daysRemaining <= safetyStockDays) return 'Low';
  if (daysRemaining <= safetyStockDays * 2) return 'Adequate';
  return 'Surplus';
}

function calculateDemandForecast(inventory, weatherData, location) {
  const results = [];
  if (!Array.isArray(inventory)) return results;
  
  for (const inv of inventory) {
    const baseDailyRate = inv.daily_consumption || 0;
    const personnel = location ? (location.personnel || 100) : 100;
    const personnelFactor = personnel / 100;
    
    // Weather impact
    let weatherImpact = 1.0;
    if (weatherData && weatherData.length > 0) {
      const severeCount = weatherData.filter(w => w.severity === 'Severe' || w.severity === 'High').length;
      if (severeCount > 0) weatherImpact = 1.15; // increase demand in bad weather
    }
    
    // Trend: slight increase for forward locations
    const trendFactor = location && location.type === 'forward_location' ? 1.05 : 1.0;
    
    // Seasonal factor (simplified)
    const month = new Date().getMonth();
    const seasonFactor = (month >= 5 && month <= 8) ? 1.1 : 1.0; // summer increase
    
    const adjustedDaily = baseDailyRate * weatherImpact * trendFactor * seasonFactor;
    
    const forecast1d = Math.round(adjustedDaily);
    const forecast3d = Math.round(adjustedDaily * 3);
    const forecast7d = Math.round(adjustedDaily * 7 * 1.02); // slight increase over time
    const forecast14d = Math.round(adjustedDaily * 14 * 1.05);
    
    const confidence = weatherData && weatherData.length > 0 ? 
      (weatherData.some(w => w.severity === 'Severe') ? 'Medium' : 'High') : 'Medium';
    
    const trend = adjustedDaily > baseDailyRate ? 'increasing' : 
                  adjustedDaily < baseDailyRate ? 'decreasing' : 'stable';
    
    results.push({
      item: inv.item,
      category: inv.category,
      current_daily: baseDailyRate,
      adjusted_daily: Math.round(adjustedDaily),
      forecast_1d: forecast1d,
      forecast_3d: forecast3d,
      forecast_7d: forecast7d,
      forecast_14d: forecast14d,
      confidence,
      trend,
      factors: {
        weather_impact: weatherImpact,
        trend_factor: trendFactor,
        season_factor: seasonFactor,
        personnel_factor: personnelFactor
      }
    });
  }
  return results;
}

function calculateStockoutPrediction(inventory, forecasts, deliveries) {
  const results = [];
  if (!Array.isArray(inventory)) return results;
  
  for (const inv of inventory) {
    const forecast = forecasts.find(f => f.item === inv.item);
    const dailyRate = forecast ? forecast.adjusted_daily : inv.daily_consumption;
    const daysRemaining = calculateDaysRemaining(inv.quantity, dailyRate);
    
    // Check incoming deliveries
    const incoming = deliveries.filter(d => {
      try {
        const items = typeof d.items === 'string' ? JSON.parse(d.items) : d.items;
        return items && (items[inv.item] || items[inv.category]);
      } catch { return false; }
    });
    
    let incomingQty = 0;
    let incomingETA = null;
    let willArriveInTime = true;
    
    if (incoming.length > 0) {
      for (const del of incoming) {
        const items = typeof del.items === 'string' ? JSON.parse(del.items) : del.items;
        incomingQty += items[inv.item] || items[inv.category] || 0;
        if (!incomingETA && del.planned_date) {
          incomingETA = del.planned_date;
          const daysUntilDelivery = Math.ceil((new Date(del.planned_date) - new Date()) / (1000 * 60 * 60 * 24));
          willArriveInTime = daysUntilDelivery < daysRemaining;
        }
      }
    }
    
    const stockoutDate = new Date();
    stockoutDate.setDate(stockoutDate.getDate() + Math.floor(daysRemaining));
    
    const supplyGap = Math.max(0, (dailyRate * 3) - inv.quantity - incomingQty); // 3-day safety gap
    
    let riskLevel = 'Normal';
    if (daysRemaining <= 1) riskLevel = 'Critical';
    else if (daysRemaining <= 2) riskLevel = 'High';
    else if (daysRemaining <= 3) riskLevel = 'Medium';
    else if (daysRemaining <= 5) riskLevel = 'Low';
    
    let reason = [];
    if (daysRemaining <= 2) reason.push(`Only ${daysRemaining} days of supply remaining`);
    if (inv.quantity <= inv.safety_stock) reason.push('Below safety stock level');
    if (!willArriveInTime && incoming.length > 0) reason.push('Delivery may not arrive before stockout');
    if (forecast && forecast.trend === 'increasing') reason.push('Demand trend is increasing');
    if (reason.length === 0) reason.push('Supply levels adequate');
    
    results.push({
      item: inv.item,
      category: inv.category,
      current_quantity: inv.quantity,
      daily_consumption: dailyRate,
      days_until_stockout: Math.round(daysRemaining * 10) / 10,
      stockout_date: stockoutDate.toISOString().split('T')[0],
      supply_gap: Math.round(supplyGap),
      risk_level: riskLevel,
      incoming_quantity: incomingQty,
      incoming_eta: incomingETA,
      will_arrive_in_time: willArriveInTime,
      reason: reason.join('; ')
    });
  }
  return results;
}

function calculateWeatherRisk(weatherData) {
  if (!weatherData || weatherData.length === 0) return { score: 0, level: 'Normal', details: 'No weather data available' };
  
  const severityScores = { 'Normal': 0, 'Low': 10, 'Moderate': 30, 'High': 50, 'Severe': 80 };
  let maxScore = 0;
  let worstCondition = 'Normal';
  
  for (const w of weatherData) {
    const score = severityScores[w.severity] || 0;
    if (score > maxScore) {
      maxScore = score;
      worstCondition = w.condition || w.severity;
    }
    // Additional factors
    if (w.rainfall > 50) maxScore = Math.min(100, maxScore + 10);
    if (w.visibility < 2) maxScore = Math.min(100, maxScore + 10);
    if (w.wind_speed > 50) maxScore = Math.min(100, maxScore + 10);
  }
  
  const level = maxScore >= 80 ? 'Critical' : maxScore >= 60 ? 'High' : maxScore >= 40 ? 'Medium' : maxScore >= 20 ? 'Low' : 'Normal';
  
  return {
    score: Math.min(100, maxScore),
    level,
    details: `Worst condition: ${worstCondition}`,
    worst_severity: worstCondition,
    data_points: weatherData.length
  };
}

function calculateRouteRisk(route, weatherData) {
  if (!route) return { score: 0, level: 'Normal', details: 'No route data' };
  
  let segments;
  try {
    segments = typeof route.segments === 'string' ? JSON.parse(route.segments) : route.segments;
  } catch { segments = []; }
  
  if (!segments || segments.length === 0) {
    const weatherRisk = calculateWeatherRisk(weatherData);
    return { score: weatherRisk.score, level: weatherRisk.level, details: 'No segment data available', segments: [] };
  }
  
  let maxSegmentRisk = 0;
  const segmentRisks = [];
  
  for (const seg of segments) {
    let segScore = 0;
    
    // Route condition
    if (seg.condition === 'Poor') segScore += 30;
    else if (seg.condition === 'Fair') segScore += 10;
    
    // Weather for this segment
    const segWeather = weatherData ? weatherData.filter(w => w.segment === seg.name) : [];
    if (segWeather.length > 0) {
      const wRisk = calculateWeatherRisk(segWeather);
      segScore += wRisk.score * 0.7;
    }
    
    segScore = Math.min(100, Math.round(segScore));
    if (segScore > maxSegmentRisk) maxSegmentRisk = segScore;
    
    segmentRisks.push({
      name: seg.name,
      risk_score: segScore,
      risk_level: segScore >= 70 ? 'Critical' : segScore >= 50 ? 'High' : segScore >= 30 ? 'Medium' : segScore >= 10 ? 'Low' : 'Normal',
      condition: seg.condition,
      weather: segWeather.length > 0 ? segWeather[0] : null,
      delay_probability: Math.min(95, segScore + 5)
    });
  }
  
  const avgRisk = Math.round(segmentRisks.reduce((sum, s) => sum + s.risk_score, 0) / segmentRisks.length);
  const overallScore = Math.round(maxSegmentRisk * 0.6 + avgRisk * 0.4); // Weight worst segment more
  const level = overallScore >= 70 ? 'Critical' : overallScore >= 50 ? 'High' : overallScore >= 30 ? 'Medium' : overallScore >= 10 ? 'Low' : 'Normal';
  
  return {
    score: overallScore,
    level,
    details: `${segmentRisks.length} segments analyzed, worst: ${segmentRisks.reduce((w, s) => s.risk_score > w.risk_score ? s : w, segmentRisks[0]).name}`,
    segments: segmentRisks,
    distance: route.distance,
    estimated_time: route.estimated_time
  };
}

function calculateDeliveryRisk(delivery, route, weatherData, vehicle) {
  let score = 0;
  const factors = [];
  
  // Route risk
  const routeRisk = calculateRouteRisk(route, weatherData);
  score += routeRisk.score * 0.35;
  factors.push({ name: 'Route Risk', score: routeRisk.score, level: routeRisk.level, details: routeRisk.details });
  
  // Weather risk
  const weatherRisk = calculateWeatherRisk(weatherData);
  score += weatherRisk.score * 0.25;
  factors.push({ name: 'Weather Risk', score: weatherRisk.score, level: weatherRisk.level, details: weatherRisk.details });
  
  // Vehicle risk
  let vehicleRiskScore = 0;
  if (!vehicle) {
    vehicleRiskScore = 50;
    factors.push({ name: 'Vehicle Risk', score: 50, level: 'High', details: 'No vehicle assigned' });
  } else if (vehicle.status === 'Maintenance') {
    vehicleRiskScore = 80;
    factors.push({ name: 'Vehicle Risk', score: 80, level: 'Critical', details: 'Vehicle in maintenance' });
  } else if (vehicle.fuel_level < 30) {
    vehicleRiskScore = 40;
    factors.push({ name: 'Vehicle Risk', score: 40, level: 'Medium', details: 'Low fuel level' });
  } else {
    vehicleRiskScore = 5;
    factors.push({ name: 'Vehicle Risk', score: 5, level: 'Normal', details: 'Vehicle ready' });
  }
  score += vehicleRiskScore * 0.15;
  
  // Timing risk
  let timingRiskScore = 0;
  if (delivery && delivery.planned_date) {
    const daysUntil = Math.ceil((new Date(delivery.planned_date) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 0) timingRiskScore = 60;
    else if (daysUntil <= 1) timingRiskScore = 30;
    else timingRiskScore = 5;
  }
  score += timingRiskScore * 0.1;
  factors.push({ name: 'Timing Risk', score: timingRiskScore, level: timingRiskScore >= 50 ? 'High' : timingRiskScore >= 30 ? 'Medium' : 'Normal', details: `Delivery in ${delivery ? Math.ceil((new Date(delivery.planned_date) - new Date()) / (1000*60*60*24)) : '?'} days` });
  
  // Capacity check
  let capacityRisk = 0;
  if (delivery && vehicle) {
    try {
      const items = typeof delivery.items === 'string' ? JSON.parse(delivery.items) : delivery.items;
      const totalQty = Object.values(items || {}).reduce((s, v) => s + v, 0);
      const utilization = totalQty / vehicle.capacity;
      if (utilization > 1) capacityRisk = 70;
      else if (utilization > 0.9) capacityRisk = 30;
      else capacityRisk = 5;
    } catch { capacityRisk = 20; }
  }
  score += capacityRisk * 0.15;
  factors.push({ name: 'Capacity Risk', score: capacityRisk, level: capacityRisk >= 50 ? 'High' : capacityRisk >= 30 ? 'Medium' : 'Normal', details: capacityRisk > 50 ? 'Over capacity' : 'Within capacity' });
  
  score = Math.min(100, Math.round(score));
  const level = score >= 70 ? 'Critical' : score >= 50 ? 'High' : score >= 30 ? 'Medium' : score >= 10 ? 'Low' : 'Normal';
  
  const delayProbability = Math.min(95, Math.round(score * 0.9 + (weatherRisk.score > 60 ? 20 : 0)));
  
  return { score, level, factors, delay_probability: delayProbability };
}

function calculateSupplyRisk(inventoryData, forecasts, weatherData, routeData, vehicleData, deliveryData, location) {
  const factors = [];
  let totalScore = 0;
  
  // 1. Inventory Risk
  let inventoryRisk = 0;
  if (inventoryData && inventoryData.length > 0) {
    for (const inv of inventoryData) {
      const daysRem = calculateDaysRemaining(inv.quantity, inv.daily_consumption);
      if (daysRem <= 1) inventoryRisk = Math.max(inventoryRisk, 90);
      else if (daysRem <= 2) inventoryRisk = Math.max(inventoryRisk, 70);
      else if (daysRem <= 3) inventoryRisk = Math.max(inventoryRisk, 50);
      else if (daysRem <= 5) inventoryRisk = Math.max(inventoryRisk, 30);
      if (inv.quantity <= inv.safety_stock) inventoryRisk = Math.max(inventoryRisk, 40);
    }
  }
  factors.push({ name: 'Inventory Risk', score: inventoryRisk, level: riskLevelFromScore(inventoryRisk), details: `Lowest days remaining: ${inventoryData ? Math.min(...inventoryData.map(i => calculateDaysRemaining(i.quantity, i.daily_consumption))).toFixed(1) : 'N/A'}` });
  totalScore += inventoryRisk * 0.25;
  
  // 2. Demand Risk
  let demandRisk = 0;
  if (forecasts && forecasts.length > 0) {
    const increasing = forecasts.filter(f => f.trend === 'increasing').length;
    demandRisk = Math.min(80, increasing * 20 + (forecasts.some(f => f.confidence === 'Low') ? 20 : 0));
  }
  factors.push({ name: 'Demand Risk', score: demandRisk, level: riskLevelFromScore(demandRisk), details: forecasts ? `${forecasts.filter(f => f.trend === 'increasing').length} items with increasing demand` : 'No forecast data' });
  totalScore += demandRisk * 0.15;
  
  // 3. Weather Risk
  const weatherRiskResult = calculateWeatherRisk(weatherData || []);
  factors.push({ name: 'Weather Risk', score: weatherRiskResult.score, level: weatherRiskResult.level, details: weatherRiskResult.details });
  totalScore += weatherRiskResult.score * 0.2;
  
  // 4. Route Risk
  let routeRiskScore = 0;
  if (routeData && routeData.length > 0) {
    for (const route of routeData) {
      const rr = calculateRouteRisk(route, weatherData || []);
      routeRiskScore = Math.max(routeRiskScore, rr.score);
    }
  }
  factors.push({ name: 'Route Risk', score: routeRiskScore, level: riskLevelFromScore(routeRiskScore), details: `${routeData ? routeData.length : 0} routes analyzed` });
  totalScore += routeRiskScore * 0.15;
  
  // 5. Transport Risk
  let transportRisk = 0;
  if (vehicleData) {
    const available = vehicleData.filter(v => v.status === 'Available').length;
    const total = vehicleData.length;
    if (total === 0) transportRisk = 80;
    else if (available === 0) transportRisk = 70;
    else if (available / total < 0.3) transportRisk = 50;
    else transportRisk = 10;
  }
  factors.push({ name: 'Transport Risk', score: transportRisk, level: riskLevelFromScore(transportRisk), details: `${vehicleData ? vehicleData.filter(v => v.status === 'Available').length : 0} vehicles available` });
  totalScore += transportRisk * 0.1;
  
  // 6. Delivery Risk
  let deliveryRisk = 0;
  if (deliveryData && deliveryData.length > 0) {
    const delayed = deliveryData.filter(d => d.status === 'Delayed').length;
    const planned = deliveryData.filter(d => d.status === 'Planned').length;
    if (delayed > 0) deliveryRisk = 60;
    else if (planned === 0 && inventoryRisk > 30) deliveryRisk = 50;
    else deliveryRisk = 10;
  } else if (inventoryRisk > 30) {
    deliveryRisk = 40;
  }
  factors.push({ name: 'Delivery Risk', score: deliveryRisk, level: riskLevelFromScore(deliveryRisk), details: `${deliveryData ? deliveryData.length : 0} deliveries tracked` });
  totalScore += deliveryRisk * 0.15;
  
  totalScore = Math.min(100, Math.round(totalScore));
  
  return {
    overall_risk: totalScore,
    risk_level: riskLevelFromScore(totalScore),
    factors,
    location_id: location ? location.id : null,
    location_name: location ? location.name : null,
    calculated_at: new Date().toISOString()
  };
}

function riskLevelFromScore(score) {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  if (score >= 20) return 'Low';
  return 'Normal';
}

function generateRecommendations(locationId, riskData, inventoryData, deliveries, routes, weatherData) {
  const recommendations = [];
  const now = new Date();
  
  if (!riskData || !inventoryData) return recommendations;
  
  // Check for low inventory + weather risk scenario
  const criticalItems = inventoryData.filter(inv => {
    const days = calculateDaysRemaining(inv.quantity, inv.daily_consumption);
    return days <= 3;
  });
  
  const hasWeatherRisk = riskData.factors && riskData.factors.some(f => f.name === 'Weather Risk' && f.score >= 40);
  const hasRouteRisk = riskData.factors && riskData.factors.some(f => f.name === 'Route Risk' && f.score >= 40);
  
  // Find relevant deliveries
  const locationDeliveries = deliveries ? deliveries.filter(d => d.destination_id === locationId && d.status !== 'Delivered' && d.status !== 'Cancelled') : [];
  
  if (criticalItems.length > 0 && hasWeatherRisk && locationDeliveries.length > 0) {
    for (const del of locationDeliveries) {
      const factors = [];
      
      for (const item of criticalItems) {
        const days = calculateDaysRemaining(item.quantity, item.daily_consumption);
        factors.push(`${item.item}: only ${days} days remaining`);
      }
      
      if (hasWeatherRisk) factors.push('Severe weather forecast during delivery window');
      if (hasRouteRisk) factors.push('Route conditions present elevated risk');
      factors.push('Current delivery may experience delay');
      factors.push('Safety stock levels may be breached');
      
      recommendations.push({
        type: 'ADVANCE_DELIVERY',
        location_id: locationId,
        delivery_id: del.id,
        title: `Advance Delivery ${del.id}`,
        explanation: `Advance delivery ${del.id} by 1-2 days before severe weather impacts the route. Current inventory at critical levels with ${criticalItems.length} item(s) below 3-day supply. Weather conditions expected to worsen, increasing delivery delay probability.`,
        factors: JSON.stringify(factors),
        action: 'ADVANCE',
        priority: 'High'
      });
      
      // Also suggest alternate route if available
      if (routes && routes.length > 1) {
        const currentRoute = routes.find(r => r.id === del.route_id);
        const alternates = routes.filter(r => r.id !== del.route_id && r.to_location_id === locationId);
        
        for (const alt of alternates) {
          const altFactors = [];
          if (currentRoute) altFactors.push(`${currentRoute.name} has severe weather on key segments`);
          altFactors.push(`${alt.name}: ${alt.distance}km, ~${alt.estimated_time}hrs`);
          altFactors.push('Moderate conditions - longer but safer');
          
          recommendations.push({
            type: 'ALTERNATE_ROUTE',
            location_id: locationId,
            delivery_id: del.id,
            title: `Use Alternate Route ${alt.id} for ${del.id}`,
            explanation: `Consider using ${alt.name} (${alt.id}) instead of the primary route. While ${alt.distance}km (longer), weather conditions are more favorable with lower delay probability.`,
            factors: JSON.stringify(altFactors),
            action: 'CHANGE_ROUTE',
            priority: 'High'
          });
        }
      }
    }
  } else if (criticalItems.length > 0 && locationDeliveries.length === 0) {
    recommendations.push({
      type: 'INCREASE_QUANTITY',
      location_id: locationId,
      delivery_id: null,
      title: 'Schedule Emergency Resupply',
      explanation: `${criticalItems.length} item(s) at critical levels with no planned deliveries. Immediate resupply recommended.`,
      factors: JSON.stringify(criticalItems.map(i => `${i.item}: ${calculateDaysRemaining(i.quantity, i.daily_consumption)} days remaining`)),
      action: 'CREATE_DELIVERY',
      priority: 'Critical'
    });
  }
  
  // Check if current plan is adequate
  if (criticalItems.length === 0 && !hasWeatherRisk && !hasRouteRisk) {
    recommendations.push({
      type: 'MAINTAIN_PLAN',
      location_id: locationId,
      delivery_id: locationDeliveries.length > 0 ? locationDeliveries[0].id : null,
      title: 'Maintain Current Plan',
      explanation: 'Current supply levels are adequate, weather conditions are favorable, and delivery plans are on track. No changes recommended at this time.',
      factors: JSON.stringify(['Inventory levels within acceptable range', 'Weather conditions normal', 'Routes operational', 'Deliveries on schedule']),
      action: 'MAINTAIN',
      priority: 'Low'
    });
  }
  
  return recommendations;
}

function runSimulation(params, currentData) {
  const { location_id, inventory_change, consumption_change, weather_severity, route_available, vehicle_available, delivery_date_offset, transport_capacity_change, travel_time_factor } = params;
  
  // Clone current data for simulation
  const simInventory = (currentData.inventory || []).map(inv => {
    const simInv = { ...inv };
    if (inventory_change !== undefined && inventory_change !== null) {
      simInv.quantity = Math.max(0, inv.quantity * (1 + inventory_change / 100));
    }
    if (consumption_change !== undefined && consumption_change !== null) {
      simInv.daily_consumption = Math.max(0, inv.daily_consumption * (1 + consumption_change / 100));
    }
    return simInv;
  });
  
  // Simulate weather
  const simWeather = (currentData.weather || []).map(w => {
    if (weather_severity && weather_severity !== 'current') {
      return { ...w, severity: weather_severity, condition: weather_severity === 'Severe' ? 'Storm' : weather_severity === 'High' ? 'Heavy Rain' : w.condition };
    }
    return { ...w };
  });
  
  // Calculate simulated risks
  const simForecasts = calculateDemandForecast(simInventory, simWeather, currentData.location);
  const simStockout = calculateStockoutPrediction(simInventory, simForecasts, currentData.deliveries || []);
  const simWeatherRisk = calculateWeatherRisk(simWeather);
  
  // Current state calculations
  const curForecasts = calculateDemandForecast(currentData.inventory || [], currentData.weather || [], currentData.location);
  const curStockout = calculateStockoutPrediction(currentData.inventory || [], curForecasts, currentData.deliveries || []);
  const curWeatherRisk = calculateWeatherRisk(currentData.weather || []);
  
  // Calculate overall risks
  const simOverallRisk = Math.min(100, Math.round(
    (simStockout.length > 0 ? Math.max(...simStockout.map(s => s.risk_level === 'Critical' ? 90 : s.risk_level === 'High' ? 70 : s.risk_level === 'Medium' ? 45 : 20)) : 0) * 0.4 +
    simWeatherRisk.score * 0.3 +
    (route_available === false ? 70 : 10) * 0.15 +
    (vehicle_available === false ? 60 : 10) * 0.15
  ));
  
  const curOverallRisk = Math.min(100, Math.round(
    (curStockout.length > 0 ? Math.max(...curStockout.map(s => s.risk_level === 'Critical' ? 90 : s.risk_level === 'High' ? 70 : s.risk_level === 'Medium' ? 45 : 20)) : 0) * 0.4 +
    curWeatherRisk.score * 0.3 +
    20 * 0.3
  ));
  
  // Determine recommended action
  let recommendedAction = 'Maintain current plan';
  if (simOverallRisk > curOverallRisk + 20) {
    if (weather_severity === 'Severe') recommendedAction = 'Advance delivery before weather deteriorates';
    else if (route_available === false) recommendedAction = 'Use alternate route';
    else if (consumption_change > 20) recommendedAction = 'Increase delivery quantity';
    else recommendedAction = 'Review and adjust delivery plan';
  } else if (simOverallRisk < curOverallRisk - 10) {
    recommendedAction = 'Simulated conditions improve outlook - consider applying changes';
  }
  
  return {
    current: {
      inventory: (currentData.inventory || []).map(i => ({ item: i.item, quantity: i.quantity, daily_consumption: i.daily_consumption, days_remaining: calculateDaysRemaining(i.quantity, i.daily_consumption) })),
      weather_risk: curWeatherRisk,
      stockout: curStockout,
      overall_risk: curOverallRisk,
      risk_level: riskLevelFromScore(curOverallRisk)
    },
    simulated: {
      inventory: simInventory.map(i => ({ item: i.item, quantity: Math.round(i.quantity), daily_consumption: Math.round(i.daily_consumption), days_remaining: calculateDaysRemaining(i.quantity, i.daily_consumption) })),
      weather_risk: simWeatherRisk,
      stockout: simStockout,
      overall_risk: simOverallRisk,
      risk_level: riskLevelFromScore(simOverallRisk)
    },
    comparison: {
      risk_change: simOverallRisk - curOverallRisk,
      risk_direction: simOverallRisk > curOverallRisk ? 'worse' : simOverallRisk < curOverallRisk ? 'better' : 'unchanged',
      recommended_action: recommendedAction
    },
    parameters: params,
    simulated_at: new Date().toISOString()
  };
}

module.exports = {
  calculateDaysRemaining,
  getInventoryStatus,
  calculateDemandForecast,
  calculateStockoutPrediction,
  calculateWeatherRisk,
  calculateRouteRisk,
  calculateDeliveryRisk,
  calculateSupplyRisk,
  generateRecommendations,
  runSimulation,
  riskLevelFromScore
};
