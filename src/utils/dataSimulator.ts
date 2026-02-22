import { addDays, format } from 'date-fns';

export interface TimeSeriesPoint {
  date: string;
  ndvi: number;
  viirs: number;
  seasonal: number; // The "ideal" seasonal component
  trend: number;    // The underlying trend
}

export interface ZoneData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: 'sacred_grove' | 'mining_drift';
  riskScore: number;
  history: TimeSeriesPoint[];
}

// Generate synthetic data
export const generateZoneData = (id: string, name: string, lat: number, lon: number, type: 'sacred_grove' | 'mining_drift'): ZoneData => {
  const history: TimeSeriesPoint[] = [];
  const startDate = new Date('2023-01-01');
  const days = 365 * 3; // 3 years of data

  // Random seed-ish behavior
  const phaseShift = Math.random() * Math.PI * 2;
  
  for (let i = 0; i < days; i++) {
    const currentDate = addDays(startDate, i);
    const t = i / 365.0; // Time in years
    
    // Ritu-Chakra: Seasonal Component (Sine Wave)
    // NDVI typically peaks in growing season and drops in winter/dry season
    const seasonal = 0.6 + 0.2 * Math.sin(2 * Math.PI * t + phaseShift);
    
    let trend = 0;
    let viirsBase = 0;
    
    if (type === 'sacred_grove') {
      // Stable trend
      trend = 0;
      viirsBase = 0.1 + Math.random() * 0.1; // Dark
    } else {
      // Mining Drift: Sudden drop in vegetation after year 1.5
      if (t > 1.5) {
        trend = -0.3 * (t - 1.5); // Degradation
        viirsBase = 0.8 + Math.random() * 0.2; // Bright lights at night
      } else {
        trend = 0;
        viirsBase = 0.1 + Math.random() * 0.1;
      }
    }

    // Add noise
    const noise = (Math.random() - 0.5) * 0.05;
    
    // Final NDVI
    let ndvi = seasonal + trend + noise;
    ndvi = Math.max(0, Math.min(1, ndvi)); // Clamp 0-1

    history.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      ndvi,
      viirs: viirsBase,
      seasonal,
      trend
    });
  }

  // Calculate a simple risk score based on the last 30 days
  const recent = history.slice(-30);
  const avgNdvi = recent.reduce((sum, p) => sum + p.ndvi, 0) / recent.length;
  const avgViirs = recent.reduce((sum, p) => sum + p.viirs, 0) / recent.length;
  
  // Simple heuristic for risk
  let riskScore = (1 - avgNdvi) * 0.5 + avgViirs * 0.5;
  if (type === 'mining_drift') riskScore += 0.2; // Bias for demo

  return {
    id,
    name,
    lat,
    lon,
    type,
    riskScore: Math.min(1, Math.max(0, riskScore)),
    history
  };
};

export const generateMockZones = (): ZoneData[] => {
  return [
    generateZoneData('z1', 'Grove Alpha (North)', 24.5854, 73.7125, 'sacred_grove'),
    generateZoneData('z2', 'Grove Beta (East)', 24.5900, 73.7200, 'sacred_grove'),
    generateZoneData('z3', 'Sector Gamma (Drift)', 24.5800, 73.7150, 'mining_drift'),
    generateZoneData('z4', 'Grove Delta (South)', 24.5750, 73.7100, 'sacred_grove'),
    generateZoneData('z5', 'Sector Epsilon (Drift)', 24.5820, 73.7250, 'mining_drift'),
  ];
};
