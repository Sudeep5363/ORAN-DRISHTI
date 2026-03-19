// ============================================================
// dataSimulator.ts — Synthetic NDVI Time-Series Generator
//
// Produces realistic mock data for sacred grove zones in the
// Aravalli mountain range.  Used when real satellite imagery
// is not available (demo / testing mode).
//
// Simulation model per pixel:
//   NDVI(t) = seasonal(t) + trend(t) + noise
//
// • seasonal(t) = 0.6 + 0.2·sin(2πt + φ)
//   — natural monsoon-driven annual cycle
// • trend(t) — 0 for healthy zones; negative ramp for mining zones
// • noise    — small Gaussian perturbation
// ============================================================

import { addDays, format } from 'date-fns';

// A single observation in the NDVI time-series for one zone.
export interface TimeSeriesPoint {
  date:     string; // ISO date string (YYYY-MM-DD)
  ndvi:     number; // Observed Normalised Difference Vegetation Index [0, 1]
  viirs:    number; // VIIRS night-lights intensity [0, 1] — proxy for mining activity
  seasonal: number; // Expected seasonal component (written by FFT filter later)
  trend:    number; // Underlying long-term trend extracted by the simulator
}

// Complete data package for one monitoring zone.
export interface ZoneData {
  id:        string;
  name:      string;
  lat:       number; // WGS-84 latitude (decimal degrees)
  lon:       number; // WGS-84 longitude (decimal degrees)
  type:      'sacred_grove' | 'mining_drift';
  riskScore: number; // Composite risk index [0, 1]; > 0.5 triggers alert colour
  history:   TimeSeriesPoint[];
}

// ============================================================
// generateZoneData — Build a 3-year synthetic time-series
// ============================================================
export const generateZoneData = (
  id:   string,
  name: string,
  lat:  number,
  lon:  number,
  type: 'sacred_grove' | 'mining_drift'
): ZoneData => {
  const history:   TimeSeriesPoint[] = [];
  const startDate = new Date('2023-01-01');
  const days       = 365 * 3; // Three years of daily observations

  // Random phase offset so different zones peak at slightly different times,
  // mimicking real spatial heterogeneity in monsoon onset.
  const phaseShift = Math.random() * Math.PI * 2;
  
  for (let i = 0; i < days; i++) {
    const currentDate = addDays(startDate, i);
    const t = i / 365.0; // Fractional year (0.0 = Jan 1 2023, 3.0 = Jan 1 2026)
    
    // --- Ritu-Chakra component ---
    // Annual sine wave peaking in the monsoon growing season.
    // Baseline 0.6 (healthy forest) + amplitude 0.2.
    const seasonal = 0.6 + 0.2 * Math.sin(2 * Math.PI * t + phaseShift);
    
    let trend    = 0;   // No long-term change for healthy groves
    let viirsBase = 0;
    
    if (type === 'sacred_grove') {
      // Protected grove: stable vegetation, low night-light activity.
      trend     = 0;
      viirsBase = 0.1 + Math.random() * 0.1; // Low VIIRS = dark (no industrial lights)
    } else {
      // Mining drift zone: gradual degradation starting at year 1.5 (mid-2024).
      if (t > 1.5) {
        // Linear degradation: the longer mining continues, the lower the NDVI.
        trend    = -0.3 * (t - 1.5); // −0.3 per year after onset
        viirsBase = 0.8 + Math.random() * 0.2; // High VIIRS = bright (mine floodlights)
      } else {
        // Before mining starts, the zone looks healthy.
        trend    = 0;
        viirsBase = 0.1 + Math.random() * 0.1;
      }
    }

    // Small random noise (sensor calibration error, atmospheric variation).
    const noise = (Math.random() - 0.5) * 0.05;
    
    // Combine components and clamp to the valid NDVI range [0, 1].
    let ndvi = seasonal + trend + noise;
    ndvi = Math.max(0, Math.min(1, ndvi));

    history.push({
      date:     format(currentDate, 'yyyy-MM-dd'),
      ndvi,
      viirs:    viirsBase,
      seasonal, // Store the ideal seasonal value for chart comparison
      trend     // Store the trend for debugging / analysis
    });
  }

  // --- Compute a simple composite risk score from the last 30 days ---
  // Low NDVI + high VIIRS → high risk of illegal mining activity.
  const recent   = history.slice(-30);
  const avgNdvi  = recent.reduce((sum, p) => sum + p.ndvi,  0) / recent.length;
  const avgViirs = recent.reduce((sum, p) => sum + p.viirs, 0) / recent.length;
  
  // Weighted heuristic: 50% weight on vegetation health, 50% on night-lights.
  let riskScore = (1 - avgNdvi) * 0.5 + avgViirs * 0.5;
  
  // Bump risk slightly for known mining zones to ensure demo separation.
  if (type === 'mining_drift') riskScore += 0.2;

  return {
    id,
    name,
    lat,
    lon,
    type,
    riskScore: Math.min(1, Math.max(0, riskScore)), // Clamp to [0, 1]
    history
  };
};

// ============================================================
// generateMockZones — Create the five demo monitoring zones
// ============================================================
// Three sacred groves (healthy) and two mining drift zones are
// scattered across the Aravalli range near 24.58°N, 73.71°E.
export const generateMockZones = (): ZoneData[] => {
  return [
    generateZoneData('z1', 'Grove Alpha (North)',      24.5854, 73.7125, 'sacred_grove'),
    generateZoneData('z2', 'Grove Beta (East)',        24.5900, 73.7200, 'sacred_grove'),
    generateZoneData('z3', 'Sector Gamma (Drift)',     24.5800, 73.7150, 'mining_drift'),
    generateZoneData('z4', 'Grove Delta (South)',      24.5750, 73.7100, 'sacred_grove'),
    generateZoneData('z5', 'Sector Epsilon (Drift)',   24.5820, 73.7250, 'mining_drift'),
  ];
};
