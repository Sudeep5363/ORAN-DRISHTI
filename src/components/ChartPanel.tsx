// ============================================================
// ChartPanel.tsx — Per-Zone Analytics Dashboard
//
// Displays three panels for the selected Aravalli monitoring zone:
//
//   1. Header stats  — risk score, solar altitude, NDVI, VIIRS
//   2. Ritu-Chakra   — FFT harmonic overlay chart (Filter 1)
//   3. Shuddhi Model — LSTM reconstruction error chart (Filter 2)
//
// When a zone is selected (or changed), the component kicks off
// the full ML pipeline asynchronously:
//   performHarmonicAnalysis → trainAndPredictAnomalies → render
//
// During training a loading screen is shown with live epoch loss.
// ============================================================

import React, { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import { ZoneData } from '../utils/dataSimulator';
import { performHarmonicAnalysis, trainAndPredictAnomalies, validateSolarShadows } from '../utils/modelEngine';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface ChartPanelProps {
  zone: ZoneData; // The monitoring zone whose analytics to display
}

const ChartPanel: React.FC<ChartPanelProps> = ({ zone }) => {
  // isTraining: true while the LSTM autoencoder is training in the background
  const [isTraining,    setIsTraining]    = useState(false);
  // trainingLoss: live loss value relayed from each epoch callback
  const [trainingLoss,  setTrainingLoss]  = useState<number | null>(null);
  // processedData: downsampled anomaly-annotated time-series ready for charts
  const [processedData, setProcessedData] = useState<any[]>([]);

  // Re-run the full pipeline whenever the selected zone changes.
  useEffect(() => {
    let isMounted = true; // Guard against stale state updates after unmount

    const runPipeline = async () => {
      setIsTraining(true);
      setTrainingLoss(null);
      
      // --- Step 1: Harmonic Analysis (Filter 1) ---
      // Fast synchronous FFT; augments each point with a `seasonal` field.
      const harmonic = performHarmonicAnalysis(zone.history);
      
      // --- Step 2: LSTM Autoencoder (Filter 2) ---
      // Async — trains on the first 50 % of data, then scores the full series.
      try {
        const anomalies = await trainAndPredictAnomalies(harmonic, (epoch, loss) => {
          // Relay training progress to the UI so users can see convergence
          if (isMounted) setTrainingLoss(loss);
        });
        
        if (isMounted) {
          // Downsample to every 5th point to keep chart rendering fast.
          // At 3 years × 365 days = 1095 points, this gives ~219 chart points.
          setProcessedData(anomalies.filter((_, i) => i % 5 === 0));
        }
      } catch (err) {
        console.error("Model training failed", err);
      } finally {
        if (isMounted) setIsTraining(false);
      }
    };

    runPipeline();

    // Cleanup: prevent state updates if the component unmounts mid-training
    return () => { isMounted = false; };
  }, [zone.id]); // Dependency: re-run when the selected zone changes

  // Compute solar telemetry once processing is done, using the last data point's date.
  const latestPoint = processedData.length > 0 ? processedData[processedData.length - 1] : null;
  const solarInfo   = latestPoint ? validateSolarShadows(zone.lat, zone.lon, latestPoint.date) : null;

  // --- Loading screen (shown while LSTM is training) ---
  if (isTraining || !latestPoint || !solarInfo) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-stone-50 text-stone-500 space-y-4">
        <Loader2 className="animate-spin text-orange-500" size={48} />
        <div className="text-center">
          <h3 className="font-serif text-lg font-bold text-stone-700">Training Shuddhi Model...</h3>
          <p className="text-sm">Running LSTM Autoencoder on browser GPU</p>
          {/* Display live training loss so users know the model is progressing */}
          {trainingLoss !== null && (
            <p className="text-xs font-mono mt-2 text-stone-400">Current Loss: {trainingLoss.toFixed(4)}</p>
          )}
        </div>
      </div>
    );
  }

  // --- Main dashboard (shown after training completes) ---
  return (
    <div className="space-y-6 p-4 bg-stone-50 rounded-xl border border-stone-200 h-full overflow-y-auto">
      
      {/* ---- Header Stats Row ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* Risk Score: composite danger index derived from NDVI + VIIRS */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider">Risk Score</p>
          <p className={`text-2xl font-bold ${zone.riskScore > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
            {(zone.riskScore * 100).toFixed(0)}%
          </p>
        </div>

        {/* Solar Altitude: from Surya-Sakshi (Filter 3) */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider">Solar Altitude</p>
          <p className="text-2xl font-bold text-amber-600">{solarInfo.altitude}°</p>
          {/* Shadow length factor = 1/tan(altitude); lower altitude = longer shadow */}
          <p className="text-xs text-stone-400">Shadow Factor: {solarInfo.shadowLengthFactor}</p>
        </div>

        {/* Current NDVI: last observed vegetation health value */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider">Current NDVI</p>
          <p className="text-2xl font-bold text-emerald-600">{latestPoint.ndvi.toFixed(2)}</p>
        </div>

        {/* VIIRS night-lights: bright = active mining machinery at night */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider">VIIRS (Night Lights)</p>
          <p className={`text-2xl font-bold ${latestPoint.viirs > 0.5 ? 'text-red-500' : 'text-stone-600'}`}>
            {latestPoint.viirs.toFixed(2)}
          </p>
        </div>
      </div>

      {/* ---- Chart 1: Ritu-Chakra (FFT Harmonic Analysis) ---- */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-stone-100">
        <div className="mb-4">
          <h3 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
            <span className="text-amber-600">✦</span> Ritu-Chakra: Harmonic Analysis (FFT)
          </h3>
          <p className="text-sm text-stone-500">
            Real-time Fast Fourier Transform extracting seasonal components.
            Dashed line shows the filtered low-frequency signal.
          </p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis 
                dataKey="date" 
                // Format timestamps as 'Jan 23', 'Feb 23', etc.
                tickFormatter={(str) => format(new Date(str), 'MMM yy')}
                stroke="#a8a29e"
                fontSize={12}
              />
              <YAxis domain={[0, 1]} stroke="#a8a29e" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e5e5' }}
                labelStyle={{ color: '#78716c' }}
              />
              <Legend />

              {/* Expected seasonal baseline reconstructed by the FFT low-pass filter */}
              <Line 
                type="monotone" 
                dataKey="seasonal" 
                stroke="#d6d3d1" 
                strokeDasharray="5 5"      // Dashed = "expected / model"
                name="FFT Seasonality" 
                dot={false}
                strokeWidth={2}
              />
              {/* Actual observed NDVI — divergence from the dashed line = anomaly */}
              <Line 
                type="monotone" 
                dataKey="ndvi" 
                stroke="#16a34a" 
                name="Observed NDVI" 
                dot={false} 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ---- Chart 2: Shuddhi Model (LSTM Reconstruction Error) ---- */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-stone-100">
        <div className="mb-4">
          <h3 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
            <span className="text-red-500">⚠</span> Shuddhi: LSTM Autoencoder
          </h3>
          <p className="text-sm text-stone-500">
            Reconstruction Error from TensorFlow.js LSTM model. 
            The model was trained live on the first 50% of this zone's data.
          </p>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(str) => format(new Date(str), 'MMM yy')}
                stroke="#a8a29e"
                fontSize={12}
              />
              <YAxis stroke="#a8a29e" fontSize={12} />
              <Tooltip />
              {/* Horizontal threshold line — error above this triggers isAnomaly=true */}
              <ReferenceLine y={0.15} label="Threshold" stroke="red" strokeDasharray="3 3" />
              {/* Filled area shows reconstruction error magnitude over time */}
              <Area 
                type="monotone" 
                dataKey="reconstructionError" 
                stroke="#ef4444" 
                fill="#fee2e2" 
                name="LSTM Error" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default ChartPanel;
