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
  zone: ZoneData;
}

const ChartPanel: React.FC<ChartPanelProps> = ({ zone }) => {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingLoss, setTrainingLoss] = useState<number | null>(null);
  const [processedData, setProcessedData] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const runPipeline = async () => {
      setIsTraining(true);
      setTrainingLoss(null);
      
      // 1. Harmonic Analysis (Real FFT)
      // This is fast, synchronous
      const harmonic = performHarmonicAnalysis(zone.history);
      
      // 2. Anomaly Detection (Real TF.js LSTM)
      // This is slow, async
      try {
        const anomalies = await trainAndPredictAnomalies(harmonic, (epoch, loss) => {
          if (isMounted) setTrainingLoss(loss);
        });
        
        if (isMounted) {
          // Downsample for chart performance (every 5th point)
          setProcessedData(anomalies.filter((_, i) => i % 5 === 0));
        }
      } catch (err) {
        console.error("Model training failed", err);
      } finally {
        if (isMounted) setIsTraining(false);
      }
    };

    runPipeline();

    return () => { isMounted = false; };
  }, [zone.id]); // Re-run when zone changes

  const latestPoint = processedData.length > 0 ? processedData[processedData.length - 1] : null;
  const solarInfo = latestPoint ? validateSolarShadows(zone.lat, zone.lon, latestPoint.date) : null;

  if (isTraining || !latestPoint || !solarInfo) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-stone-50 text-stone-500 space-y-4">
        <Loader2 className="animate-spin text-orange-500" size={48} />
        <div className="text-center">
          <h3 className="font-serif text-lg font-bold text-stone-700">Training Shuddhi Model...</h3>
          <p className="text-sm">Running LSTM Autoencoder on browser GPU</p>
          {trainingLoss !== null && (
            <p className="text-xs font-mono mt-2 text-stone-400">Current Loss: {trainingLoss.toFixed(4)}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-stone-50 rounded-xl border border-stone-200 h-full overflow-y-auto">
      
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-3 rounded-lg shadow-sm border border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider">Risk Score</p>
          <p className={`text-2xl font-bold ${zone.riskScore > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
            {(zone.riskScore * 100).toFixed(0)}%
          </p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider">Solar Altitude</p>
          <p className="text-2xl font-bold text-amber-600">{solarInfo.altitude}°</p>
          <p className="text-xs text-stone-400">Shadow Factor: {solarInfo.shadowLengthFactor}</p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider">Current NDVI</p>
          <p className="text-2xl font-bold text-emerald-600">{latestPoint.ndvi.toFixed(2)}</p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border border-stone-100">
          <p className="text-xs text-stone-500 uppercase tracking-wider">VIIRS (Night Lights)</p>
          <p className={`text-2xl font-bold ${latestPoint.viirs > 0.5 ? 'text-red-500' : 'text-stone-600'}`}>
            {latestPoint.viirs.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Chart 1: Ritu-Chakra (Harmonic Analysis) */}
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
              {/* Expected Seasonal Baseline */}
              <Line 
                type="monotone" 
                dataKey="seasonal" 
                stroke="#d6d3d1" 
                strokeDasharray="5 5" 
                name="FFT Seasonality" 
                dot={false}
                strokeWidth={2}
              />
              {/* Actual Observed NDVI */}
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

      {/* Chart 2: Shuddhi Model (Anomaly Detection) */}
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
              <ReferenceLine y={0.15} label="Threshold" stroke="red" strokeDasharray="3 3" />
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
