import React, { useState } from 'react';
import { 
  CloudRain, Shield, AlertTriangle, CheckCircle, Navigation, 
  Truck, ArrowRight, Layers, ZoomIn, ZoomOut, RotateCcw, 
  Maximize2, Eye, Compass, Info, Building2, Wind, GitBranch
} from 'lucide-react';

// Configuration for all 5 forward posts with unique coordinates, hazards, and corridors
const POST_CONFIGS = {
  'LOC-FWC': {
    id: 'LOC-FWC',
    name: 'Post Bravo',
    sector: 'Mountain Sector',
    priority: 'Critical (2.0d)',
    priorityLevel: 'Critical',
    pos: { x: 340, y: 320 },
    recommendedRouteId: 'R-03',
    hazard: {
      type: 'storm',
      title: 'MOUNTAIN PASS STORM (45mm/h)',
      x: 175,
      y: 55,
      radius: 46,
      color: '#ef4444'
    },
    recommendedDepot: 'LOC-ALPHA',
    depotAlphaSuggestion: 'Depot Alpha is recommended (Stock: 45,000 units, Route C clear)',
    depotBravoSuggestion: 'Depot Bravo has route alternatives but passes closer to storm perimeter',
    routes: (isBravo) => ({
      'R-01': {
        id: 'R-01',
        name: 'Route A',
        label: 'Route A (High Risk)',
        distance: isBravo ? '390 km' : '420 km',
        eta: isBravo ? '7h 45m' : '8h 20m',
        weatherRisk: 'High',
        weatherColor: 'text-red-500 font-extrabold',
        terrainRisk: 'High',
        terrainColor: 'text-red-500 font-extrabold',
        transportAvail: '2/3',
        color: '#ef4444',
        glowColor: 'rgba(239, 68, 68, 0.5)',
        recommended: false,
        delayProbability: '78%',
        description: 'Passes directly through Mountain Pass Storm Zone. Severe rainfall, low visibility, high landslide risk.',
        pathD: isBravo
          ? 'M 65 200 L 95 180 L 155 180 L 175 125 L 205 130 L 225 185 L 275 240 L 315 285 L 340 320'
          : 'M 70 310 L 80 250 L 110 230 L 155 180 L 175 125 L 205 130 L 225 185 L 275 240 L 315 285 L 340 320',
        waypoints: [
          { name: 'Gateway Checkpoint', x: 80, y: isBravo ? 190 : 250, condition: 'Clear' },
          { name: 'Valley Incline', x: 110, y: 230, condition: 'Overcast' },
          { name: 'Pass Approach', x: 155, y: 180, condition: 'Moderate Rain' },
          { name: 'Mountain Pass (Storm)', x: 175, y: 125, condition: 'Severe Storm 45mm/h' },
          { name: 'Descent Ridge', x: 225, y: 185, condition: 'Heavy Rain' },
          { name: 'Eastern Foothills', x: 275, y: 240, condition: 'Rain Shower' },
          { name: 'Forward Approach', x: 315, y: 285, condition: 'Damp Surface' }
        ]
      },
      'R-02': {
        id: 'R-02',
        name: 'Route B',
        label: 'Route B (Medium)',
        distance: isBravo ? '480 km' : '510 km',
        eta: isBravo ? '10h 15m' : '10h 45m',
        weatherRisk: 'Medium',
        weatherColor: 'text-amber-400 font-extrabold',
        terrainRisk: 'Medium',
        terrainColor: 'text-amber-400 font-extrabold',
        transportAvail: '3/3',
        color: '#eab308',
        glowColor: 'rgba(234, 179, 8, 0.5)',
        recommended: false,
        delayProbability: '35%',
        description: 'Desert Southern Bypass. Loops south away from the mountains. Rough unpaved surface, longer travel time.',
        pathD: isBravo
          ? 'M 65 200 Q 110 270 170 305 T 260 325 T 340 320'
          : 'M 70 310 Q 140 300 190 315 T 260 325 T 340 320',
        waypoints: [
          { name: 'South Gate Corridor', x: 130, y: 305, condition: 'Clear / Dry' },
          { name: 'Desert Crossing', x: 190, y: 315, condition: 'High Winds 40km/h' },
          { name: 'Southern Bypass', x: 250, y: 322, condition: 'Loose Gravel' },
          { name: 'Perimeter Road', x: 300, y: 322, condition: 'Dry' }
        ]
      },
      'R-03': {
        id: 'R-03',
        name: 'Route C',
        label: 'Route C (Safe)',
        distance: isBravo ? '430 km' : '460 km',
        eta: isBravo ? '8h 50m' : '9h 30m',
        weatherRisk: 'Low',
        weatherColor: 'text-emerald-400 font-extrabold',
        terrainRisk: 'Low',
        terrainColor: 'text-emerald-400 font-extrabold',
        transportAvail: '2/3',
        color: '#10b981',
        glowColor: 'rgba(16, 185, 129, 0.6)',
        recommended: true,
        delayProbability: '0%',
        description: 'Highland Safe Corridor. Paved arterial highway bypassing the storm center north-east. 0% storm delays.',
        pathD: isBravo
          ? 'M 65 200 L 95 150 L 140 120 L 180 115 L 235 150 L 265 195 L 320 235 L 340 275 L 340 320'
          : 'M 70 310 L 70 230 L 115 135 L 180 115 L 235 150 L 265 195 L 320 235 L 340 275 L 340 320',
        waypoints: [
          { name: 'Northern Arterial', x: 70, y: 230, condition: 'Clear / Paved' },
          { name: 'Highland Junction', x: 115, y: 135, condition: 'Partly Cloudy' },
          { name: 'Ridge Overpass (Storm Bypass)', x: 180, y: 115, condition: 'Dry / Good Vis' },
          { name: 'Plateau Link', x: 235, y: 150, condition: 'Clear' },
          { name: 'Valley Descent', x: 265, y: 195, condition: 'Dry Pavement' },
          { name: 'North Approach', x: 320, y: 235, condition: 'Clear' },
          { name: 'Bravo Perimeter', x: 340, y: 275, condition: 'Good' }
        ]
      }
    })
  },

  'LOC-FWE': {
    id: 'LOC-FWE',
    name: 'Post Delta',
    sector: 'Eastern Pass',
    priority: 'High Risk (2.8d)',
    priorityLevel: 'Warning',
    pos: { x: 380, y: 140 },
    recommendedRouteId: 'R-01',
    hazard: {
      type: 'gale',
      title: 'GALE WIND GORGE (65km/h)',
      x: 235,
      y: 125,
      radius: 42,
      color: '#f97316'
    },
    recommendedDepot: 'LOC-ALPHA',
    depotAlphaSuggestion: 'Depot Alpha has direct access to Northern Ridge Expressway',
    depotBravoSuggestion: 'Depot Bravo has shorter mileage but crosses high-wind gust corridor',
    routes: (isBravo) => ({
      'R-01': {
        id: 'R-01',
        name: 'Route A',
        label: 'Route A (Safe)',
        distance: isBravo ? '470 km' : '520 km',
        eta: isBravo ? '7h 10m' : '7h 55m',
        weatherRisk: 'Low',
        weatherColor: 'text-emerald-400 font-extrabold',
        terrainRisk: 'Low',
        terrainColor: 'text-emerald-400 font-extrabold',
        transportAvail: '3/3',
        color: '#10b981',
        glowColor: 'rgba(16, 185, 129, 0.6)',
        recommended: true,
        delayProbability: '0%',
        description: 'Northern Ridge Expressway. Fully paved with wind deflector barriers. Bypasses the gale gorge completely.',
        pathD: isBravo
          ? 'M 65 200 L 105 140 L 165 105 L 250 90 L 325 105 L 380 140'
          : 'M 70 310 L 105 180 L 165 110 L 250 90 L 325 105 L 380 140',
        waypoints: [
          { name: 'Ridge Interchange', x: 105, y: isBravo ? 140 : 180, condition: 'Paved / Clear' },
          { name: 'North Arterial Link', x: 165, y: 105, condition: 'Calm' },
          { name: 'Overpass Tunnel', x: 250, y: 90, condition: 'Clear' },
          { name: 'Eastern Highway', x: 325, y: 105, condition: 'Paved / Dry' },
          { name: 'Delta Entrance', x: 380, y: 140, condition: 'Secure' }
        ]
      },
      'R-02': {
        id: 'R-02',
        name: 'Route B',
        label: 'Route B (Medium)',
        distance: isBravo ? '500 km' : '540 km',
        eta: isBravo ? '9h 50m' : '10h 40m',
        weatherRisk: 'Medium',
        weatherColor: 'text-amber-400 font-extrabold',
        terrainRisk: 'Medium',
        terrainColor: 'text-amber-400 font-extrabold',
        transportAvail: '3/3',
        color: '#eab308',
        glowColor: 'rgba(234, 179, 8, 0.5)',
        recommended: false,
        delayProbability: '30%',
        description: 'South Plateau Bypass. Avoids gorge winds but contains 80km of unpaved gravel.',
        pathD: isBravo
          ? 'M 65 200 L 140 240 L 220 250 L 300 210 L 355 170 L 380 140'
          : 'M 70 310 L 150 290 L 240 260 L 310 220 L 360 170 L 380 140',
        waypoints: [
          { name: 'Plateau Gate', x: 150, y: isBravo ? 240 : 290, condition: 'Clear' },
          { name: 'South Plateau Track', x: 230, y: 255, condition: 'Brisk Wind' },
          { name: 'East Ascent', x: 310, y: 215, condition: 'Gravel Surface' },
          { name: 'Delta South Gate', x: 360, y: 170, condition: 'Dry' }
        ]
      },
      'R-03': {
        id: 'R-03',
        name: 'Route C',
        label: 'Route C (High Risk)',
        distance: isBravo ? '450 km' : '490 km',
        eta: isBravo ? '8h 40m' : '9h 30m',
        weatherRisk: 'High',
        weatherColor: 'text-red-500 font-extrabold',
        terrainRisk: 'High',
        terrainColor: 'text-red-500 font-extrabold',
        transportAvail: '1/3',
        color: '#ef4444',
        glowColor: 'rgba(239, 68, 68, 0.5)',
        recommended: false,
        delayProbability: '80%',
        description: 'Direct cut through Eastern Gorge. Crosswinds reach 65 km/h with acute danger of rockfalls.',
        pathD: isBravo
          ? 'M 65 200 L 130 180 L 210 160 L 260 150 L 320 145 L 380 140'
          : 'M 70 310 L 130 240 L 210 180 L 260 150 L 320 145 L 380 140',
        waypoints: [
          { name: 'Depot Gate', x: isBravo ? 65 : 70, y: isBravo ? 200 : 310, condition: 'Clear' },
          { name: 'Midland Way', x: 130, y: isBravo ? 180 : 240, condition: 'Overcast' },
          { name: 'Gorge Mouth', x: 210, y: isBravo ? 160 : 180, condition: 'Gusting 45km/h' },
          { name: 'Gorge Apex', x: 260, y: 150, condition: 'Gale 65km/h & Rockfall' },
          { name: 'East Descent', x: 320, y: 145, condition: 'Turbulent Winds' },
          { name: 'Delta Perimeter', x: 380, y: 140, condition: 'Breezy' }
        ]
      }
    })
  },

  'LOC-FWA': {
    id: 'LOC-FWA',
    name: 'Post Alpha',
    sector: 'North Ridge',
    priority: 'Warning (3.5d)',
    priorityLevel: 'Warning',
    pos: { x: 230, y: 60 },
    recommendedRouteId: 'R-02',
    hazard: {
      type: 'blizzard',
      title: 'ALPINE BLIZZARD & ICE (-18°C)',
      x: 135,
      y: 95,
      radius: 44,
      color: '#38bdf8'
    },
    recommendedDepot: 'LOC-BRAVO',
    depotAlphaSuggestion: 'Depot Alpha route requires longer climb along western ridge',
    depotBravoSuggestion: 'Depot Bravo has quicker junction to Eastern Ridge Highway',
    routes: (isBravo) => ({
      'R-01': {
        id: 'R-01',
        name: 'Route A',
        label: 'Route A (High Risk)',
        distance: isBravo ? '340 km' : '380 km',
        eta: isBravo ? '7h 45m' : '8h 30m',
        weatherRisk: 'High',
        weatherColor: 'text-red-500 font-extrabold',
        terrainRisk: 'High',
        terrainColor: 'text-red-500 font-extrabold',
        transportAvail: '1/3',
        color: '#ef4444',
        glowColor: 'rgba(239, 68, 68, 0.5)',
        recommended: false,
        delayProbability: '85%',
        description: 'Direct Alpine Climb. Traverses active sub-zero blizzard zone with black ice and whiteout visibility.',
        pathD: isBravo
          ? 'M 65 200 L 95 160 L 130 145 L 160 105 L 195 80 L 230 60'
          : 'M 70 310 L 95 220 L 130 145 L 160 105 L 195 80 L 230 60',
        waypoints: [
          { name: 'Base Gate', x: 95, y: isBravo ? 160 : 220, condition: 'Cold / Clear' },
          { name: 'Foothill Step', x: 130, y: 145, condition: 'Freezing Fog' },
          { name: 'Blizzard Core', x: 160, y: 105, condition: 'Whiteout Blizzard -18°C' },
          { name: 'Ice Crest', x: 195, y: 80, condition: 'Black Ice on Road' },
          { name: 'Alpha Gate', x: 230, y: 60, condition: 'Snow Pack' }
        ]
      },
      'R-02': {
        id: 'R-02',
        name: 'Route B',
        label: 'Route B (Safe)',
        distance: isBravo ? '430 km' : '470 km',
        eta: isBravo ? '7h 40m' : '8h 20m',
        weatherRisk: 'Low',
        weatherColor: 'text-emerald-400 font-extrabold',
        terrainRisk: 'Low',
        terrainColor: 'text-emerald-400 font-extrabold',
        transportAvail: '3/3',
        color: '#10b981',
        glowColor: 'rgba(16, 185, 129, 0.6)',
        recommended: true,
        delayProbability: '0%',
        description: 'Eastern Ridge Heated Highway. Snowplows operating continuously, gritted surface, 0% delay.',
        pathD: isBravo
          ? 'M 65 200 L 120 180 L 190 155 L 250 120 L 255 80 L 230 60'
          : 'M 70 310 L 130 250 L 205 190 L 255 135 L 260 85 L 230 60',
        waypoints: [
          { name: 'Main Arterial Exit', x: 125, y: isBravo ? 180 : 250, condition: 'Clear' },
          { name: 'Eastern Ridge Base', x: 200, y: 170, condition: 'Dry Pavement' },
          { name: 'Heated Highway Section', x: 255, y: 110, condition: 'Snowplow Active' },
          { name: 'North Approach Ridge', x: 255, y: 80, condition: 'Gritted Road' },
          { name: 'Post Alpha Main Gate', x: 230, y: 60, condition: 'Open' }
        ]
      },
      'R-03': {
        id: 'R-03',
        name: 'Route C',
        label: 'Route C (Medium)',
        distance: isBravo ? '400 km' : '440 km',
        eta: isBravo ? '8h 55m' : '9h 50m',
        weatherRisk: 'Medium',
        weatherColor: 'text-amber-400 font-extrabold',
        terrainRisk: 'Medium',
        terrainColor: 'text-amber-400 font-extrabold',
        transportAvail: '2/3',
        color: '#eab308',
        glowColor: 'rgba(234, 179, 8, 0.5)',
        recommended: false,
        delayProbability: '30%',
        description: 'Western Foothills Track. Avoids deepest snow drifts but features steep serpentine gradients.',
        pathD: isBravo
          ? 'M 65 200 L 45 150 L 50 100 L 95 75 L 160 65 L 230 60'
          : 'M 70 310 L 45 230 L 50 140 L 85 90 L 150 65 L 230 60',
        waypoints: [
          { name: 'West Valley Track', x: 48, y: isBravo ? 130 : 180, condition: 'Cold Rain' },
          { name: 'Serpentine Turn', x: 90, y: 80, condition: 'Slush' },
          { name: 'Lower Ridge', x: 155, y: 65, condition: 'Light Snow' },
          { name: 'Alpha West Post', x: 230, y: 60, condition: 'Packed Snow' }
        ]
      }
    })
  },

  'LOC-FWD': {
    id: 'LOC-FWD',
    name: 'Post Charlie',
    sector: 'Valley Sector',
    priority: 'Normal (7.1d)',
    priorityLevel: 'Normal',
    pos: { x: 370, y: 220 },
    recommendedRouteId: 'R-01',
    hazard: {
      type: 'flood',
      title: 'RIVER VALLEY FLASH FLOOD',
      x: 215,
      y: 230,
      radius: 42,
      color: '#38bdf8'
    },
    recommendedDepot: 'LOC-ALPHA',
    depotAlphaSuggestion: 'Depot Alpha connects directly to the North Valley Elevated Viaduct',
    depotBravoSuggestion: 'Depot Bravo route is shorter but requires crossing lower bridge points',
    routes: (isBravo) => ({
      'R-01': {
        id: 'R-01',
        name: 'Route A',
        label: 'Route A (Safe)',
        distance: isBravo ? '310 km' : '350 km',
        eta: isBravo ? '5h 45m' : '6h 20m',
        weatherRisk: 'Low',
        weatherColor: 'text-emerald-400 font-extrabold',
        terrainRisk: 'Low',
        terrainColor: 'text-emerald-400 font-extrabold',
        transportAvail: '3/3',
        color: '#10b981',
        glowColor: 'rgba(16, 185, 129, 0.6)',
        recommended: true,
        delayProbability: '0%',
        description: 'North Valley Elevated Viaduct. Modern concrete expressway built 15m above river level. 100% flood-proof.',
        pathD: isBravo
          ? 'M 65 200 L 115 170 L 185 160 L 275 170 L 335 195 L 370 220'
          : 'M 70 310 L 110 210 L 175 165 L 265 170 L 335 195 L 370 220',
        waypoints: [
          { name: 'Viaduct On-Ramp', x: 110, y: isBravo ? 170 : 210, condition: 'Paved' },
          { name: 'North Bridge Span', x: 180, y: 162, condition: 'Clear Viaduct' },
          { name: 'Central Overpass', x: 270, y: 170, condition: 'Dry Pavement' },
          { name: 'Valley Terminal', x: 335, y: 195, condition: 'Clear' },
          { name: 'Charlie Command Post', x: 370, y: 220, condition: 'Good' }
        ]
      },
      'R-02': {
        id: 'R-02',
        name: 'Route B',
        label: 'Route B (High Risk)',
        distance: isBravo ? '280 km' : '310 km',
        eta: isBravo ? '6h 05m' : '6h 45m',
        weatherRisk: 'High',
        weatherColor: 'text-red-500 font-extrabold',
        terrainRisk: 'High',
        terrainColor: 'text-red-500 font-extrabold',
        transportAvail: '1/3',
        color: '#ef4444',
        glowColor: 'rgba(239, 68, 68, 0.5)',
        recommended: false,
        delayProbability: '70%',
        description: 'River Basin Road. Runs through low-lying valley floor prone to rapid flood surge and roadbed erosion.',
        pathD: isBravo
          ? 'M 65 200 L 125 210 L 205 245 L 285 240 L 370 220'
          : 'M 70 310 L 135 285 L 205 255 L 275 240 L 370 220',
        waypoints: [
          { name: 'Valley Access', x: 130, y: 250, condition: 'Damp' },
          { name: 'River Basin Ford', x: 205, y: 250, condition: 'Flash Flood 0.6m Depth' },
          { name: 'Low Causeway', x: 280, y: 240, condition: 'Mud / Erosion' },
          { name: 'Charlie Valley Gate', x: 370, y: 220, condition: 'Standing Water' }
        ]
      },
      'R-03': {
        id: 'R-03',
        name: 'Route C',
        label: 'Route C (Medium)',
        distance: isBravo ? '370 km' : '410 km',
        eta: isBravo ? '7h 40m' : '8h 20m',
        weatherRisk: 'Medium',
        weatherColor: 'text-amber-400 font-extrabold',
        terrainRisk: 'Medium',
        terrainColor: 'text-amber-400 font-extrabold',
        transportAvail: '3/3',
        color: '#eab308',
        glowColor: 'rgba(234, 179, 8, 0.5)',
        recommended: false,
        delayProbability: '25%',
        description: 'Southern Hill Crest Track. Sits on high ground above water line. Narrow road with slow heavy truck limits.',
        pathD: isBravo
          ? 'M 65 200 L 115 275 L 185 315 L 275 295 L 370 220'
          : 'M 70 310 L 145 335 L 235 325 L 315 285 L 370 220',
        waypoints: [
          { name: 'South Slope Route', x: 130, y: 300, condition: 'Clear' },
          { name: 'Hill Crest Trail', x: 210, y: 320, condition: 'Loose Surface' },
          { name: 'East Valley Drop', x: 295, y: 290, condition: 'Dry' },
          { name: 'Charlie South Approach', x: 370, y: 220, condition: 'Good' }
        ]
      }
    })
  },

  'LOC-FWF': {
    id: 'LOC-FWF',
    name: 'Post Echo',
    sector: 'Desert Border',
    priority: 'Safe (12.0d)',
    priorityLevel: 'Normal',
    pos: { x: 310, y: 350 },
    recommendedRouteId: 'R-02',
    hazard: {
      type: 'sandstorm',
      title: 'SANDSTORM & DUST DRIFTS',
      x: 195,
      y: 340,
      radius: 40,
      color: '#facc15'
    },
    recommendedDepot: 'LOC-ALPHA',
    depotAlphaSuggestion: 'Depot Alpha provides immediate access to the northern perimeter highway',
    depotBravoSuggestion: 'Depot Bravo requires transit through central plains',
    routes: (isBravo) => ({
      'R-01': {
        id: 'R-01',
        name: 'Route A',
        label: 'Route A (High Risk)',
        distance: isBravo ? '330 km' : '290 km',
        eta: isBravo ? '6h 30m' : '5h 50m',
        weatherRisk: 'High',
        weatherColor: 'text-red-500 font-extrabold',
        terrainRisk: 'High',
        terrainColor: 'text-red-500 font-extrabold',
        transportAvail: '1/3',
        color: '#ef4444',
        glowColor: 'rgba(239, 68, 68, 0.5)',
        recommended: false,
        delayProbability: '75%',
        description: 'Direct Desert Basin. Swirling sand dunes with shifting drifts and zero visibility conditions.',
        pathD: isBravo
          ? 'M 65 200 L 110 260 L 175 320 L 245 345 L 310 350'
          : 'M 70 310 L 130 330 L 190 345 L 250 350 L 310 350',
        waypoints: [
          { name: 'Desert Outpost', x: 130, y: 330, condition: 'Dry / Hot' },
          { name: 'Dune Basin (Storm)', x: 190, y: 345, condition: 'Blowing Sand <50m Vis' },
          { name: 'Ridge Cut', x: 250, y: 350, condition: 'Sand Drifts on Road' },
          { name: 'Echo Border Post', x: 310, y: 350, condition: 'Dry' }
        ]
      },
      'R-02': {
        id: 'R-02',
        name: 'Route B',
        label: 'Route B (Safe)',
        distance: isBravo ? '360 km' : '330 km',
        eta: isBravo ? '6h 15m' : '6h 40m',
        weatherRisk: 'Low',
        weatherColor: 'text-emerald-400 font-extrabold',
        terrainRisk: 'Low',
        terrainColor: 'text-emerald-400 font-extrabold',
        transportAvail: '3/3',
        color: '#10b981',
        glowColor: 'rgba(16, 185, 129, 0.6)',
        recommended: true,
        delayProbability: '0%',
        description: 'Northern Foothill Edge. Sealed pavement with dust break screens avoiding sand beds.',
        pathD: isBravo
          ? 'M 65 200 L 125 220 L 195 260 L 255 300 L 310 350'
          : 'M 70 310 L 120 270 L 185 270 L 255 300 L 310 350',
        waypoints: [
          { name: 'Foothill Cut', x: 120, y: 270, condition: 'Clear' },
          { name: 'Rocky Plateau', x: 185, y: 270, condition: 'Wind Protected' },
          { name: 'South Slope', x: 255, y: 300, condition: 'Clear Road' },
          { name: 'Echo Station', x: 310, y: 350, condition: 'Secure' }
        ]
      },
      'R-03': {
        id: 'R-03',
        name: 'Route C',
        label: 'Route C (Medium)',
        distance: isBravo ? '390 km' : '370 km',
        eta: isBravo ? '7h 20m' : '6h 55m',
        weatherRisk: 'Medium',
        weatherColor: 'text-amber-400 font-extrabold',
        terrainRisk: 'Medium',
        terrainColor: 'text-amber-400 font-extrabold',
        transportAvail: '3/3',
        color: '#eab308',
        glowColor: 'rgba(234, 179, 8, 0.5)',
        recommended: false,
        delayProbability: '20%',
        description: 'South Border Perimeter. Gravel service road with moderate wind gusts.',
        pathD: isBravo
          ? 'M 65 200 L 95 180 L 165 200 L 235 230 L 295 290 L 310 350'
          : 'M 70 310 L 80 230 L 145 210 L 235 230 L 295 290 L 310 350',
        waypoints: [
          { name: 'Perimeter Highway', x: 80, y: 230, condition: 'Paved' },
          { name: 'Central Bypass', x: 145, y: 210, condition: 'Dusty' },
          { name: 'South East Artery', x: 235, y: 230, condition: 'Dry' },
          { name: 'Echo Access Road', x: 295, y: 290, condition: 'Clear' },
          { name: 'Echo Command Gate', x: 310, y: 350, condition: 'Secure' }
        ]
      }
    })
  }
};

export default function MapRoutePlanning({
  selectedRouteId = null,
  onSelectRoute,
  singleRouteMode = false,
  depotName = 'Depot Alpha',
  postName = 'Post Bravo',
  selectedPostId = 'LOC-FWC',
  assignedVehicle = null,
  payloadWeight = null,
  items = null,
  deliveryStatus = null,
  onDispatchConvoy = null,
  onCompleteDelivery = null,
  isExecuting = false,
  isCombinedRoute = false,
  secondaryPostId = null,
  secondaryPostName = null,
  routeTerrainType = null,
  terrainCertification = null,
  postDays = undefined,
  postPriority = undefined
}) {
  const [zoom, setZoom] = useState(1);
  const [showTerrainDetails, setShowTerrainDetails] = useState(true);
  const [hoveredRoute, setHoveredRoute] = useState(null);
  const [hoveredWaypoint, setHoveredWaypoint] = useState(null);

  const isBravoDepot = (depotName || '').includes('Bravo');

  // Match the active post configuration with defensive fallbacks
  const basePost = POST_CONFIGS[selectedPostId] || 
    Object.values(POST_CONFIGS).find(p => (postName || '').includes(p.name)) || 
    POST_CONFIGS['LOC-FWC'];

  const activePriorityLevel = postPriority || basePost?.priorityLevel || 'Critical';
  const activePriorityText = (postDays !== undefined && postPriority)
    ? `${postPriority} (${postDays}d)`
    : (basePost?.priority || 'Critical (2.0d)');

  const postConfig = {
    ...basePost,
    priority: activePriorityText,
    priorityLevel: activePriorityLevel,
    pos: basePost?.pos || { x: 340, y: 320 },
    recommendedRouteId: basePost?.recommendedRouteId || 'R-03',
    hazard: basePost?.hazard || {
      type: 'storm',
      title: 'MOUNTAIN PASS STORM (45mm/h)',
      x: 175,
      y: 55,
      radius: 46,
      color: '#ef4444'
    }
  };

  const rawRoutesData = (postConfig && typeof postConfig.routes === 'function')
    ? postConfig.routes(isBravoDepot)
    : {};

  const route01 = rawRoutesData['R-01'] || {
    id: 'R-01',
    name: 'Route A',
    label: 'Route A',
    distance: isBravoDepot ? '390 km' : '420 km',
    eta: isBravoDepot ? '7h 45m' : '8h 20m',
    weatherRisk: 'High',
    weatherColor: 'text-red-500 font-extrabold',
    terrainRisk: 'High',
    terrainColor: 'text-red-500 font-extrabold',
    transportAvail: '2/3',
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.5)',
    recommended: false,
    delayProbability: '78%',
    description: 'Corridor traversing active weather disruption zone.',
    pathD: isBravoDepot ? 'M 65 200 L 155 180 L 275 240 L 340 320' : 'M 70 310 L 155 180 L 275 240 L 340 320',
    waypoints: [
      { name: 'Gateway Checkpoint', x: 80, y: isBravoDepot ? 190 : 250, condition: 'Clear' },
      { name: 'Pass Approach', x: 155, y: 180, condition: 'Severe Weather' },
      { name: 'Forward Approach', x: 315, y: 285, condition: 'Damp Surface' }
    ]
  };

  const route02 = rawRoutesData['R-02'] || {
    id: 'R-02',
    name: 'Route B',
    label: 'Route B',
    distance: isBravoDepot ? '480 km' : '510 km',
    eta: isBravoDepot ? '10h 15m' : '10h 45m',
    weatherRisk: 'Medium',
    weatherColor: 'text-amber-400 font-extrabold',
    terrainRisk: 'Medium',
    terrainColor: 'text-amber-400 font-extrabold',
    transportAvail: '3/3',
    color: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.5)',
    recommended: false,
    delayProbability: '35%',
    description: 'Alternative bypass corridor.',
    pathD: isBravoDepot ? 'M 65 200 Q 110 270 170 305 T 340 320' : 'M 70 310 Q 140 300 190 315 T 340 320',
    waypoints: [
      { name: 'South Gate Corridor', x: 130, y: 305, condition: 'Clear / Dry' },
      { name: 'Southern Bypass', x: 250, y: 322, condition: 'Loose Gravel' }
    ]
  };

  const route03 = rawRoutesData['R-03'] || {
    id: 'R-03',
    name: 'Route C',
    label: 'Route C',
    distance: isBravoDepot ? '430 km' : '460 km',
    eta: isBravoDepot ? '8h 50m' : '9h 30m',
    weatherRisk: 'Low',
    weatherColor: 'text-emerald-400 font-extrabold',
    terrainRisk: 'Low',
    terrainColor: 'text-emerald-400 font-extrabold',
    transportAvail: '3/3',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    recommended: true,
    delayProbability: '0%',
    description: 'Safe corridor bypassing active hazards.',
    pathD: isBravoDepot ? 'M 65 200 L 140 120 L 235 150 L 340 320' : 'M 70 310 L 115 135 L 235 150 L 340 320',
    waypoints: [
      { name: 'Northern Arterial', x: 70, y: 230, condition: 'Clear / Paved' },
      { name: 'Highland Junction', x: 115, y: 135, condition: 'Clear' },
      { name: 'North Approach', x: 320, y: 235, condition: 'Clear' }
    ]
  };

  const routesData = {
    ...rawRoutesData,
    'R-01': { ...route01, waypoints: route01.waypoints || [] },
    'R-02': { ...route02, waypoints: route02.waypoints || [] },
    'R-03': { ...route03, waypoints: route03.waypoints || [] }
  };

  const recRouteKey = postConfig.recommendedRouteId || 'R-03';
  const activeRouteKey = (selectedRouteId && routesData[selectedRouteId]) ? selectedRouteId : recRouteKey;
  const activeRoute = routesData[activeRouteKey] || routesData[recRouteKey] || routesData['R-01'];

  const handleRouteClick = (id) => {
    if (onSelectRoute) {
      onSelectRoute(id);
    }
  };

  return (
    <div className="bg-[#0b1323] border border-[#1e3450] rounded-2xl overflow-hidden shadow-2xl text-slate-200">
      {/* Component Header matching uploaded UI */}
      <div className="px-5 py-3.5 bg-[#0e192c] border-b border-[#1e3450] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/40 text-teal-400 flex items-center justify-center shadow-inner">
            <Compass size={18} className="animate-spin-slow" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white flex items-center gap-2">
              Tactical Route Map Canvas
              {singleRouteMode ? (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Assigned Route Corridor (Single View)
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Multi-Route Weather Corridors
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              {singleRouteMode 
                ? `Transport View: Displaying ONLY the single suggested route (${activeRoute.name}) from ${depotName} to ${postConfig.name}`
                : `Active Destination: ${postConfig.name} (${postConfig.sector}) • Origin: ${depotName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowTerrainDetails(!showTerrainDetails)}
            title="Toggle Terrain Overlay"
            className={`p-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
              showTerrainDetails 
                ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={14} />
          </button>
          <div className="text-slate-500 text-xs px-1">|</div>
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            GRID 34.3°N 71.5°E • {postConfig.sector}
          </span>
        </div>
      </div>

      {/* Main Grid: Left is Tactical Map, Right is Route Comparison or Mission Control */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        
        {/* LEFT PANEL: Tactical Map Canvas */}
        <div className="lg:col-span-7 relative bg-[#070d18] border-b lg:border-b-0 lg:border-r border-[#1e3450] min-h-[420px] flex items-center justify-center p-3 select-none overflow-hidden">
          
          {/* Tactical Background: Topographical Terrain Pattern */}
          <div 
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 50% 30%, #17362a 0%, #070e17 75%),
                                repeating-radial-gradient(circle at 50% 35%, transparent 0, transparent 20px, rgba(30, 70, 50, 0.25) 21px, transparent 22px)`
            }}
          />

          {/* Topographic Contour Lines Texture */}
          <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(45, 110, 85, 0.3)" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gridPattern)" />
            {/* Mountain Ridge Shading */}
            <path d="M 120 70 Q 180 40 240 70 T 320 120" fill="none" stroke="rgba(90, 160, 120, 0.4)" strokeWidth="2" strokeDasharray="3,3" />
            <path d="M 140 100 Q 180 80 230 110" fill="none" stroke="rgba(90, 160, 120, 0.3)" strokeWidth="1.5" />
            <path d="M 80 180 Q 160 140 250 200" fill="none" stroke="rgba(90, 160, 120, 0.2)" strokeWidth="1" />
          </svg>

          {/* SVG Tactical Route Overlay */}
          <svg 
            viewBox="0 0 420 380" 
            className="relative z-10 w-full h-[380px] sm:h-[420px] transition-transform duration-300"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Filter Defs for Path Glows */}
            <defs>
              <filter id="glow-green-high" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" />
              </filter>
              <filter id="glow-yellow-high" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#eab308" />
              </filter>
              <filter id="glow-red-high" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ef4444" />
              </filter>
              <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#475569" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#1e293b" stopOpacity="0.98" />
              </linearGradient>
            </defs>

            {/* SECTOR HAZARD ZONE (Dynamically rendered based on active post) */}
            <g transform={`translate(${postConfig.hazard.x}, ${postConfig.hazard.y})`} className="cursor-pointer">
              {/* Alert Ring */}
              <circle 
                cx="28" 
                cy="22" 
                r={postConfig.hazard.radius} 
                fill="rgba(239, 68, 68, 0.12)" 
                stroke={postConfig.hazard.color} 
                strokeWidth="1.2" 
                strokeDasharray="4,4" 
                className="animate-pulse" 
              />
              <circle cx="28" cy="22" r="26" fill="rgba(239, 68, 68, 0.18)" />
              
              {/* Storm Cloud / Hazard Shape */}
              <path 
                d="M 12 28 A 12 12 0 0 1 24 16 A 16 16 0 0 1 44 18 A 12 12 0 0 1 50 28 A 8 8 0 0 1 46 38 L 14 38 A 8 8 0 0 1 12 28 Z" 
                fill="url(#cloudGrad)" 
                stroke="#cbd5e1" 
                strokeWidth="1.5"
                filter="drop-shadow(0 4px 6px rgba(0,0,0,0.6))"
              />

              {/* Rain Drops & Lightning or Wind lines */}
              {postConfig.hazard.type === 'storm' && (
                <>
                  <path d="M 18 42 L 16 48 M 26 42 L 24 49 M 34 42 L 32 48 M 42 42 L 40 49" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 28 25 L 23 33 L 30 33 L 25 41" stroke="#facc15" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}
              {postConfig.hazard.type === 'blizzard' && (
                <>
                  <circle cx="20" cy="44" r="2" fill="#38bdf8" />
                  <circle cx="28" cy="47" r="2" fill="#ffffff" />
                  <circle cx="36" cy="44" r="2" fill="#38bdf8" />
                  <path d="M 28 24 L 28 34 M 23 29 L 33 29" stroke="#38bdf8" strokeWidth="1.5" />
                </>
              )}
              {(postConfig.hazard.type === 'gale' || postConfig.hazard.type === 'sandstorm') && (
                <>
                  <path d="M 16 43 Q 26 40 36 44 M 12 47 Q 24 44 38 48" stroke="#facc15" strokeWidth="2" strokeLinecap="round" fill="none" />
                </>
              )}
              {postConfig.hazard.type === 'flood' && (
                <>
                  <path d="M 14 44 Q 22 39 30 44 T 46 44" stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M 12 49 Q 22 45 32 49 T 48 49" stroke="#0284c7" strokeWidth="2" fill="none" strokeLinecap="round" />
                </>
              )}

              {/* Hazard Warning Label */}
              <rect x="-18" y="-12" width="96" height="17" rx="4" fill="#000000" stroke={postConfig.hazard.color} strokeWidth="1" opacity="0.95" />
              <text x="30" y="0" fill="#ffffff" fontSize="8" fontWeight="extrabold" textAnchor="middle">
                {postConfig.hazard.title}
              </text>
            </g>

            {/* ROUTE LINES RENDERING */}
            {singleRouteMode ? (
              /* SINGLE ROUTE TRANSPORT MODE: Displays ONLY ONE ROUTE */
              <g key={activeRoute.id}>
                {/* Outer Glow */}
                <path 
                  d={activeRoute.pathD} 
                  fill="none" 
                  stroke={activeRoute.color} 
                  strokeWidth="7" 
                  strokeOpacity="0.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Main colored track */}
                <path 
                  d={activeRoute.pathD} 
                  fill="none" 
                  stroke={activeRoute.color} 
                  strokeWidth="4" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Animated dash convoy progression */}
                <path 
                  d={activeRoute.pathD} 
                  fill="none" 
                  stroke="#ffffff" 
                  strokeWidth="2" 
                  strokeDasharray="8,12"
                  className="animate-pulse"
                />

                {/* Waypoints */}
                {(activeRoute?.waypoints || []).map((wp, i) => (
                  <g key={i}>
                    <circle 
                      cx={wp.x} 
                      cy={wp.y} 
                      r="5" 
                      fill="#0b1323" 
                      stroke={activeRoute.color} 
                      strokeWidth="2.5" 
                    />
                  </g>
                ))}
              </g>
            ) : (
              /* MULTI-ROUTE LOGISTICS MODE: Show all 3 routes with interactive selection */
              <>
                {['R-01', 'R-02', 'R-03'].map(rKey => {
                  const r = routesData[rKey];
                  if (!r) return null;
                  const isSelected = activeRouteKey === rKey;
                  const glowFilter = r.color === '#10b981' ? "url(#glow-green-high)" : r.color === '#eab308' ? "url(#glow-yellow-high)" : "url(#glow-red-high)";
                  return (
                    <g 
                      key={rKey}
                      onClick={() => handleRouteClick(rKey)}
                      onMouseEnter={() => setHoveredRoute(rKey)}
                      onMouseLeave={() => setHoveredRoute(null)}
                      className="cursor-pointer transition-all"
                    >
                      <path 
                        d={r.pathD} 
                        fill="none" 
                        stroke={r.color} 
                        strokeWidth={isSelected ? "6.5" : "4"} 
                        strokeOpacity={isSelected ? "1" : "0.55"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter={isSelected ? glowFilter : undefined}
                      />
                      {isSelected && (
                        <path 
                          d={r.pathD} 
                          fill="none" 
                          stroke="#ffffff" 
                          strokeWidth="2.2" 
                          strokeDasharray="6,12"
                          className="animate-pulse"
                        />
                      )}
                      {(r.waypoints || []).map((wp, i) => (
                        <circle 
                          key={i} 
                          cx={wp.x} 
                          cy={wp.y} 
                          r={isSelected ? "6" : "4"} 
                          fill="#0b1323" 
                          stroke={r.color} 
                          strokeWidth="2.5" 
                          onMouseEnter={() => setHoveredWaypoint({ ...wp, route: r.name })}
                          onMouseLeave={() => setHoveredWaypoint(null)}
                        />
                      ))}
                    </g>
                  );
                })}
              </>
            )}

            {/* DEPOT ALPHA MARKER (Bottom Left: 70, 310) */}
            <g transform="translate(48, 288)" className="cursor-pointer">
              <circle cx="22" cy="22" r="22" fill={!isBravoDepot ? "rgba(37, 99, 235, 0.3)" : "rgba(37, 99, 235, 0.1)"} />
              <circle cx="22" cy="22" r="16" fill="#2563eb" stroke="#93c5fd" strokeWidth={!isBravoDepot ? "2.5" : "1.5"} filter="drop-shadow(0 2px 6px rgba(0,0,0,0.7))" />
              {/* Warehouse Icon */}
              <path d="M 16 26 L 16 19 L 22 15 L 28 19 L 28 26 Z" fill="#ffffff" />
              <rect x="19" y="21" width="6" height="5" fill="#2563eb" />
              {/* Badge */}
              <rect x="-14" y="40" width="72" height="18" rx="4" fill="#0f172a" stroke={!isBravoDepot ? "#3b82f6" : "#475569"} strokeWidth="1.2" />
              <text x="22" y="52" fill="#93c5fd" fontSize="9.5" fontWeight="extrabold" textAnchor="middle">
                Depot Alpha
              </text>
            </g>

            {/* DEPOT BRAVO MARKER (Mid Left: 65, 200) */}
            <g transform="translate(43, 178)" className="cursor-pointer">
              <circle cx="22" cy="22" r="18" fill={isBravoDepot ? "rgba(14, 165, 233, 0.3)" : "rgba(14, 165, 233, 0.1)"} />
              <circle cx="22" cy="22" r="14" fill="#0284c7" stroke="#7dd3fc" strokeWidth={isBravoDepot ? "2.5" : "1.5"} filter="drop-shadow(0 2px 5px rgba(0,0,0,0.6))" />
              <path d="M 16 25 L 16 19 L 22 15 L 28 19 L 28 25 Z" fill="#ffffff" />
              <rect x="-14" y="38" width="72" height="18" rx="4" fill="#0f172a" stroke={isBravoDepot ? "#0284c7" : "#475569"} strokeWidth="1.2" />
              <text x="22" y="50" fill="#7dd3fc" fontSize="9" fontWeight="bold" textAnchor="middle">
                Depot Bravo
              </text>
            </g>

            {/* DESTINATION FORWARD POST MARKER (Dynamically located at postConfig.pos) */}
            <g transform={`translate(${postConfig.pos.x - 22}, ${postConfig.pos.y - 22})`}>
              <circle 
                cx="22" 
                cy="22" 
                r="24" 
                fill={postConfig.priorityLevel === 'Critical' ? "rgba(239, 68, 68, 0.25)" : postConfig.priorityLevel === 'Warning' ? "rgba(245, 158, 11, 0.25)" : "rgba(16, 185, 129, 0.25)"} 
                className="animate-ping" 
                style={{ animationDuration: '3s' }} 
              />
              <circle 
                cx="22" 
                cy="22" 
                r="17" 
                fill={postConfig.priorityLevel === 'Critical' ? "#dc2626" : postConfig.priorityLevel === 'Warning' ? "#d97706" : "#059669"} 
                stroke="#ffffff" 
                strokeWidth="2.5" 
                filter="drop-shadow(0 2px 7px rgba(0,0,0,0.7))" 
              />
              {/* Fortress Icon */}
              <path d="M 16 27 L 16 20 L 19 20 L 19 17 L 25 17 L 25 20 L 28 20 L 28 27 Z" fill="#ffffff" />
              {/* Label Badge */}
              <rect x="-16" y="38" width="76" height="18" rx="4" fill="#000000" stroke="#64748b" strokeWidth="1.5" />
              <text x="22" y="50" fill="#ffffff" fontSize="9" fontWeight="900" textAnchor="middle">
                {isCombinedRoute ? `Stop 1: ${postConfig.name}` : postConfig.name}
              </text>
            </g>

            {/* MULTI-STOP CONNECTOR & SECONDARY POST (If combined route is active) */}
            {isCombinedRoute && secondaryPostId && (() => {
              const secPost = POST_CONFIGS[secondaryPostId] || POST_CONFIGS['LOC-FWE'];
              const p1 = postConfig.pos;
              const p2 = secPost.pos;
              const midX = (p1.x + p2.x) / 2 + 15;
              const midY = (p1.y + p2.y) / 2 - 15;

              return (
                <g key="multi-stop-segment">
                  {/* Dashed connector path between Stop 1 and Stop 2 */}
                  <path
                    d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`}
                    stroke="#06b6d4"
                    strokeWidth="3"
                    strokeDasharray="6,4"
                    fill="none"
                    filter="drop-shadow(0 0 6px rgba(6, 182, 212, 0.7))"
                  />
                  {/* Waypoint on connector */}
                  <circle cx={midX} cy={midY} r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
                  <rect x={midX - 35} y={midY - 18} width="70" height="14" rx="3" fill="#0f172a" stroke="#06b6d4" strokeWidth="1" />
                  <text x={midX} y={midY - 8} fill="#38bdf8" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                    Ridge Link (+48 km)
                  </text>

                  {/* Stop 2 Marker */}
                  <g transform={`translate(${p2.x - 22}, ${p2.y - 22})`}>
                    <circle cx="22" cy="22" r="22" fill="rgba(6, 182, 212, 0.25)" className="animate-ping" style={{ animationDuration: '3s' }} />
                    <circle cx="22" cy="22" r="16" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" filter="drop-shadow(0 2px 7px rgba(0,0,0,0.7))" />
                    <path d="M 16 27 L 16 20 L 19 20 L 19 17 L 25 17 L 25 20 L 28 20 L 28 27 Z" fill="#ffffff" />
                    <rect x="-18" y="38" width="80" height="18" rx="4" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" />
                    <text x="22" y="50" fill="#ffffff" fontSize="8.5" fontWeight="900" textAnchor="middle">
                      Stop 2: {secondaryPostName || secPost.name}
                    </text>
                  </g>
                </g>
              );
            })()}

            {/* WAYPOINT HOVER TOOLTIP */}
            {hoveredWaypoint && (
              <g transform={`translate(${Math.min(hoveredWaypoint.x - 40, 310)}, ${hoveredWaypoint.y - 35})`}>
                <rect width="125" height="28" rx="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.8))" />
                <text x="8" y="12" fill="#ffffff" fontSize="8" fontWeight="bold">
                  {hoveredWaypoint.name}
                </text>
                <text x="8" y="22" fill="#38bdf8" fontSize="7.5" fontWeight="semibold">
                  {hoveredWaypoint.condition}
                </text>
              </g>
            )}

            {/* CONVOY TRUCK ICON (If En Route or In Transit) */}
            {(deliveryStatus === 'En Route' || deliveryStatus === 'In Transit') && (
              <g transform={`translate(${Math.round((postConfig.pos.x + 70)/2)}, ${Math.round((postConfig.pos.y + 310)/2)})`} className="animate-bounce">
                <circle cx="12" cy="12" r="14" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
                <path d="M 6 14 L 6 9 L 13 9 L 15 11 L 18 11 L 18 14 Z" fill="#ffffff" />
                <circle cx="9" cy="15" r="2" fill="#0f172a" />
                <circle cx="16" cy="15" r="2" fill="#0f172a" />
              </g>
            )}
          </svg>

          {/* FLOATING LEGEND (Bottom-Left) */}
          {!singleRouteMode && (
            <div className="absolute bottom-3 left-3 bg-[#0a101d]/95 backdrop-blur-md border border-[#1e3450] rounded-xl px-3 py-2 text-[10px] space-y-1.5 shadow-xl z-20">
              {['R-01', 'R-02', 'R-03'].map(rKey => {
                const r = routesData[rKey];
                if (!r) return null;
                const isSelected = activeRouteKey === rKey;
                return (
                  <div 
                    key={rKey}
                    onClick={() => handleRouteClick(rKey)}
                    className={`flex items-center gap-2 cursor-pointer p-0.5 rounded transition-colors ${isSelected ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <div 
                      className="w-4 h-1.5 rounded-full" 
                      style={{ backgroundColor: r.color, boxShadow: `0 0 8px ${r.color}` }} 
                    />
                    <span className={r.recommended ? 'text-emerald-400 font-bold' : ''}>
                      {r.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* FLOATING MAP CONTROLS (Right Edge) */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-20">
            <button 
              onClick={() => setZoom(prev => Math.min(prev + 0.15, 1.4))}
              className="w-8 h-8 rounded-lg bg-[#0e192c]/90 hover:bg-[#1a2d4c] border border-[#1e3450] text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm shadow-md transition-all cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            <button 
              onClick={() => setZoom(prev => Math.max(prev - 0.15, 0.85))}
              className="w-8 h-8 rounded-lg bg-[#0e192c]/90 hover:bg-[#1a2d4c] border border-[#1e3450] text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm shadow-md transition-all cursor-pointer"
              title="Zoom Out"
            >
              -
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Route Comparison Table (or Single Route Mission Control) */}
        <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between bg-[#0b1323]">
          {singleRouteMode ? (
            /* SINGLE ROUTE TRANSPORT VIEW */
            <div className="space-y-4">
              <div className="border-b border-[#1e3450] pb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400 bg-teal-950/60 border border-teal-800/40 px-2 py-0.5 rounded">
                  Logistics Officer Suggested Corridor
                </span>
                <h4 className="text-base font-extrabold text-white mt-1.5 flex items-center gap-2">
                  {activeRoute.name} — {activeRoute.label}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeRoute.description}
                </p>
              </div>

              {/* Corridor Metrics */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#0e192c] p-3 rounded-xl border border-[#1e3450]">
                  <div className="text-[11px] text-slate-400">Total Distance</div>
                  <div className="text-base font-extrabold text-white mt-0.5 font-mono">{activeRoute.distance}</div>
                </div>
                <div className="bg-[#0e192c] p-3 rounded-xl border border-[#1e3450]">
                  <div className="text-[11px] text-slate-400">Estimated Travel Time</div>
                  <div className="text-base font-extrabold text-white mt-0.5 font-mono">{activeRoute.eta}</div>
                </div>
                <div className="bg-[#0e192c] p-3 rounded-xl border border-[#1e3450]">
                  <div className="text-[11px] text-slate-400">Weather Risk</div>
                  <div className={`text-sm font-extrabold mt-0.5 ${activeRoute.weatherColor}`}>
                    {activeRoute.weatherRisk} (Clear Bypass)
                  </div>
                </div>
                <div className="bg-[#0e192c] p-3 rounded-xl border border-[#1e3450]">
                  <div className="text-[11px] text-slate-400">Assigned Transport</div>
                  <div className="text-sm font-bold text-sky-400 mt-0.5 truncate">
                    {assignedVehicle?.name || 'Medium Transport (8t)'}
                  </div>
                </div>
              </div>

              {/* Route Terrain Profile & Vehicle Certification Match */}
              <div className="bg-[#0e192c] p-3 rounded-xl border border-[#1e3450] space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Navigation size={13} className="text-teal-400" />
                    Corridor Terrain:
                  </span>
                  <span className="font-extrabold text-amber-300">
                    {routeTerrainType || activeRoute?.description || 'Mountain Pass All-Terrain'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-[#1e3450]/60">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Truck size={13} className="text-sky-400" />
                    Vehicle Terrain Match:
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {terrainCertification || '✓ Terrain Certified'}
                  </span>
                </div>
              </div>

              {/* Combined Multi-Stop Mission Notice */}
              {isCombinedRoute && (
                <div className="p-3 bg-sky-950/40 border border-sky-600/40 rounded-xl text-sky-200 text-xs flex items-center gap-2.5">
                  <GitBranch size={16} className="text-sky-400 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-sky-100">Combined Multi-Stop Mission Active</div>
                    <div className="text-[11px] text-sky-300/80">
                      Sequential Corridor: Stop 1 ({postConfig.name}) ➔ Stop 2 ({secondaryPostName || 'Adjacent Outpost'}) via +48km ridge connector.
                    </div>
                  </div>
                </div>
              )}

              {/* Allotted Cargo Manifest from Supply Officer */}
              {items && typeof items === 'object' && Object.keys(items).length > 0 && (
                <div className="bg-[#0e192c] p-3 rounded-xl border border-[#1e3450] space-y-2">
                  <div className="flex justify-between items-center text-xs border-b border-[#1e3450] pb-1.5">
                    <span className="font-bold text-slate-300">Allotted Cargo Manifest (Supply Coordinator)</span>
                    <span className="text-[11px] font-mono text-emerald-400 font-extrabold">
                      {(payloadWeight || 0).toLocaleString()} kg total
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#0a101d] p-2 rounded-lg border border-[#1e3450]/60">
                      <span className="text-slate-400 block text-[10px]">Food Rations:</span>
                      <span className="font-mono font-bold text-white text-xs">{items['Food Rations'] ?? items.food ?? items.Food ?? 0} units</span>
                    </div>
                    <div className="bg-[#0a101d] p-2 rounded-lg border border-[#1e3450]/60">
                      <span className="text-slate-400 block text-[10px]">Potable Water:</span>
                      <span className="font-mono font-bold text-sky-400 text-xs">{items['Potable Water'] ?? items.water ?? items.Water ?? 0} L</span>
                    </div>
                    <div className="bg-[#0a101d] p-2 rounded-lg border border-[#1e3450]/60">
                      <span className="text-slate-400 block text-[10px]">Medical Supplies:</span>
                      <span className="font-mono font-bold text-emerald-400 text-xs">{items['Medical Supplies'] ?? items.medical ?? items.Medical ?? 0} units</span>
                    </div>
                    <div className="bg-[#0a101d] p-2 rounded-lg border border-[#1e3450]/60">
                      <span className="text-slate-400 block text-[10px]">Diesel Fuel:</span>
                      <span className="font-mono font-bold text-amber-400 text-xs">{items['Diesel Fuel'] ?? items.fuel ?? items.Fuel ?? 0} L</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payload & Vehicle Capacity info */}
              {payloadWeight && (
                <div className="bg-[#0e192c] p-3 rounded-xl border border-[#1e3450] space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Assigned Cargo Payload:</span>
                    <span className="font-extrabold font-mono text-emerald-400">{payloadWeight.toLocaleString()} kg</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round((payloadWeight / (assignedVehicle?.capacity || 8000)) * 100))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Vehicle Cap: {(assignedVehicle?.capacity || 8000).toLocaleString()} kg</span>
                    <span>Status: <span className="text-white font-semibold">{deliveryStatus || 'Ready'}</span></span>
                  </div>
                </div>
              )}

              {/* Action Buttons for Transport Coordinator */}
              <div className="pt-2 space-y-2">
                {deliveryStatus !== 'Delivered' && (
                  <>
                    {deliveryStatus !== 'En Route' ? (
                      <button
                        onClick={onDispatchConvoy}
                        disabled={isExecuting}
                        className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-sky-900/30 transition-all cursor-pointer"
                      >
                        <Truck size={16} />
                        {isExecuting ? 'Dispatching...' : 'Dispatch Convoy on Selected Route'}
                      </button>
                    ) : (
                      <div className="p-3 bg-amber-950/40 border border-amber-600/40 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                        <Truck size={18} className="animate-pulse flex-shrink-0" />
                        <div>
                          <div className="font-bold">Convoy En Route</div>
                          <div className="text-[11px] text-amber-200/80">Currently traversing {activeRoute.name}. Tracking active.</div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={onCompleteDelivery}
                      disabled={isExecuting}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                    >
                      <CheckCircle size={16} />
                      {isExecuting ? 'Updating All Portals...' : 'Confirm Delivery Completed (Mark Delivered)'}
                    </button>
                  </>
                )}

                {deliveryStatus === 'Delivered' && (
                  <div className="p-3.5 bg-emerald-950/50 border border-emerald-600/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2.5">
                    <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="font-extrabold text-sm text-emerald-200">Delivery Completed Successfully</div>
                      <div className="text-[11px] text-emerald-300/80 mt-0.5">
                        Supplies added to {postConfig.name} inventory. Food days replenished to 10+ days. All shortage alerts cleared.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* MULTI-ROUTE COMPARISON TABLE matching uploaded screenshot */
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <h4 className="text-base font-extrabold text-white tracking-tight">
                    Route Corridors to {postConfig.name}
                  </h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    postConfig.priorityLevel === 'Critical' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                    postConfig.priorityLevel === 'Warning' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {postConfig.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any route to select. Safest green line ({routesData[postConfig.recommendedRouteId]?.name || 'Recommended'}) bypasses {postConfig.hazard.title}.
                </p>
              </div>

              {/* Dynamic Table reflecting exact post risks */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#1e3450] text-slate-400">
                      <th className="py-2.5 pr-2 font-medium"></th>
                      {['R-01', 'R-02', 'R-03'].map(rKey => {
                        const r = routesData[rKey];
                        const isSelected = activeRouteKey === rKey;
                        return (
                          <th 
                            key={rKey} 
                            className={`py-2.5 px-2 text-center font-bold ${
                              isSelected ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            <span style={{ color: r.color }}>{r.name}</span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#17263c]">
                    <tr>
                      <td className="py-2.5 pr-2 text-slate-400 font-medium">Distance</td>
                      {['R-01', 'R-02', 'R-03'].map(rKey => (
                        <td key={rKey} className={`py-2.5 px-2 text-center font-mono font-semibold ${routesData[rKey].recommended ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                          {routesData[rKey].distance}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-2 text-slate-400 font-medium">ETA</td>
                      {['R-01', 'R-02', 'R-03'].map(rKey => (
                        <td key={rKey} className={`py-2.5 px-2 text-center font-mono font-semibold ${routesData[rKey].recommended ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                          {routesData[rKey].eta}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-2 text-slate-400 font-medium">Weather Risk</td>
                      {['R-01', 'R-02', 'R-03'].map(rKey => {
                        const r = routesData[rKey];
                        return (
                          <td key={rKey} className={`py-2.5 px-2 text-center ${r.weatherColor}`}>
                            {r.weatherRisk}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-2 text-slate-400 font-medium">Terrain Risk</td>
                      {['R-01', 'R-02', 'R-03'].map(rKey => {
                        const r = routesData[rKey];
                        return (
                          <td key={rKey} className={`py-2.5 px-2 text-center ${r.terrainColor}`}>
                            {r.terrainRisk}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-2 text-slate-400 font-medium">Delay Risk</td>
                      {['R-01', 'R-02', 'R-03'].map(rKey => {
                        const r = routesData[rKey];
                        return (
                          <td key={rKey} className="py-2.5 px-2 text-center font-mono font-bold" style={{ color: r.color }}>
                            {r.delayProbability}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="py-3 pr-2 text-slate-400 font-medium">Select Route</td>
                      {['R-01', 'R-02', 'R-03'].map(rKey => {
                        const r = routesData[rKey];
                        const isSelected = activeRouteKey === rKey;
                        const isRec = r.recommended || rKey === postConfig.recommendedRouteId;

                        if (isRec) {
                          return (
                            <td key={rKey} className="py-3 px-2 text-center">
                              <button
                                onClick={() => handleRouteClick(rKey)}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-all cursor-pointer shadow-md ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border border-emerald-400 ring-2 ring-emerald-500/40'
                                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 hover:bg-emerald-800 hover:text-white'
                                }`}
                              >
                                {isSelected ? '✓ Recommended (Active)' : 'Recommended'}
                              </button>
                            </td>
                          );
                        }

                        return (
                          <td key={rKey} className="py-3 px-2 text-center">
                            <button
                              onClick={() => handleRouteClick(rKey)}
                              style={isSelected ? { backgroundColor: r.color, color: '#ffffff' } : {}}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'shadow-xs ring-2 ring-slate-300'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Recommendation Note */}
              <div className="p-3 bg-[#0e192c] border border-teal-500/30 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-teal-300 text-xs">
                  <Shield size={14} className="text-teal-400" /> Operational Suggestion:
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Send from <strong className="text-sky-300">{postConfig.recommendedDepot === 'LOC-ALPHA' ? 'Depot Alpha' : 'Depot Bravo'}</strong> via <strong className="text-emerald-400">{routesData[postConfig.recommendedRouteId]?.name || 'Safest Route'} ({routesData[postConfig.recommendedRouteId]?.label || 'Safest Green Line'})</strong>. 
                  Bypasses the {postConfig.hazard.title}, 0% weather delay risk, ensuring guaranteed arrival at {postConfig.name}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
