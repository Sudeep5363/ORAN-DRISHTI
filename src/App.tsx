import React, { useState, useRef, useEffect } from 'react';
import { loadGeoTiff, calculateDrift, detectAnomalies, renderToCanvas, calculateSunPosition, validateShadowDepth, RasterData } from './utils/geospatialEngine';
import { Upload, Play, AlertTriangle, Download, FileCode, MousePointerClick, Sun } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  const [pastFile, setPastFile] = useState<File | null>(null);
  const [presentFile, setPresentFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [selectedPixel, setSelectedPixel] = useState<{x: number, y: number} | null>(null);
  const [solarData, setSolarData] = useState<{altitude: number, isConfirmed: boolean} | null>(null);
  
  const canvasPastRef = useRef<HTMLCanvasElement>(null);
  const canvasPresentRef = useRef<HTMLCanvasElement>(null);
  const canvasResultRef = useRef<HTMLCanvasElement>(null);

  const pastRasterRef = useRef<RasterData | null>(null);
  const presentRasterRef = useRef<RasterData | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'past' | 'present') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === 'past') setPastFile(file);
      else setPresentFile(file);

      // Load and preview immediately
      try {
        const raster = await loadGeoTiff(file);
        if (type === 'past') {
          pastRasterRef.current = raster;
          if (canvasPastRef.current) renderToCanvas(raster, canvasPastRef.current);
        } else {
          presentRasterRef.current = raster;
          if (canvasPresentRef.current) renderToCanvas(raster, canvasPresentRef.current);
        }
      } catch (err) {
        console.error("Failed to load GeoTIFF", err);
        alert("Error loading GeoTIFF. Ensure it is a valid single-band raster.");
      }
    }
  };

  const runAnalysis = async () => {
    if (!pastRasterRef.current || !presentRasterRef.current) {
      alert("Please upload both Past and Present GeoTIFF files.");
      return;
    }

    setIsProcessing(true);
    setResultReady(false);
    setSolarData(null);
    
    // Allow UI to update
    setTimeout(() => {
      try {
        const drift = calculateDrift(pastRasterRef.current!, presentRasterRef.current!);
        const { anomalies, count, stats } = detectAnomalies(drift);
        
        console.log("Analysis Result:", { count, stats });

        if (canvasResultRef.current) {
          renderToCanvas(presentRasterRef.current!, canvasResultRef.current, anomalies);
        }
        
        // Run Surya-Sakshi (Solar Validation)
        // Simulate date (May 15th) and location (Aravallis)
        const simDate = new Date('2025-05-15T12:00:00Z');
        const altitude = calculateSunPosition(24.5, 73.0, simDate);
        const isConfirmed = validateShadowDepth(altitude, stats.maxScore || 0.8);
        setSolarData({ altitude, isConfirmed });

        setResultReady(true);
        
        if (count === 0) {
          alert("No significant anomalies detected. Try adjusting the data or ensuring there is negative drift.");
        }

      } catch (err) {
        console.error(err);
        alert("Analysis failed. Ensure images have matching dimensions.");
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!resultReady || !canvasResultRef.current || !pastRasterRef.current || !presentRasterRef.current) return;

    const rect = canvasResultRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvasResultRef.current.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvasResultRef.current.height / rect.height));

    if (x >= 0 && x < pastRasterRef.current.width && y >= 0 && y < pastRasterRef.current.height) {
      setSelectedPixel({ x, y });
    }
  };

  const getChartData = () => {
    if (!selectedPixel || !pastRasterRef.current || !presentRasterRef.current) return [];
    
    const idx = selectedPixel.y * pastRasterRef.current.width + selectedPixel.x;
    const pastVal = pastRasterRef.current.data[idx];
    const presentVal = presentRasterRef.current.data[idx];

    // Simulate a time series for the chart since we only have two points
    // We'll interpolate a simple trend
    return [
      { name: '2023 (Past)', ndvi: pastVal },
      { name: '2024 (Inter)', ndvi: (pastVal + presentVal) / 2 }, // Interpolated
      { name: '2025 (Present)', ndvi: presentVal },
    ];
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 font-sans p-6">
      
      {/* Header */}
      <header className="mb-8 border-b border-stone-700 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-emerald-500 tracking-tight flex items-center gap-3">
            <span className="text-4xl">🌿</span> Oran-Drishti: The Sacred Grove Sentinel
          </h1>
          <p className="text-stone-400 mt-1">Unsupervised Aravalli Intelligence System (Local Processing Mode)</p>
        </div>
        <div className="flex gap-4">
           <a 
            href="/oran_drishti_final/app.py" 
            download 
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg border border-stone-600 text-sm transition-colors"
          >
            <FileCode size={16} /> Final App.py
          </a>
           <a 
            href="/oran_drishti_final/data_simulator.py" 
            download 
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg border border-stone-600 text-sm transition-colors"
          >
            <FileCode size={16} /> Final Data Gen
          </a>
           <a 
            href="/oran_drishti_final/model_engine.py" 
            download 
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg border border-stone-600 text-sm transition-colors"
          >
            <FileCode size={16} /> Final Model Engine
          </a>
           <a 
            href="/oran_drishti_realtime/app.py" 
            download 
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg border border-stone-600 text-sm transition-colors"
          >
            <FileCode size={16} /> Realtime App
          </a>
           <a 
            href="/oran_drishti_realtime/realtime_stac_fetcher.py" 
            download 
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg border border-stone-600 text-sm transition-colors"
          >
            <FileCode size={16} /> STAC Fetcher
          </a>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Input Section */}
        <div className="space-y-6">
          <div className="bg-stone-800 p-6 rounded-xl border border-stone-700">
            <h2 className="text-xl font-bold text-stone-300 mb-4 flex items-center gap-2">
              <Upload size={20} /> Data Injection
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Past Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-400">Past GeoTIFF (e.g., 2023)</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept=".tif,.tiff" 
                    onChange={(e) => handleFileUpload(e, 'past')}
                    className="block w-full text-sm text-stone-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-emerald-900 file:text-emerald-300
                      hover:file:bg-emerald-800
                      cursor-pointer"
                  />
                </div>
                <div className="aspect-square bg-black rounded-lg overflow-hidden border border-stone-700 relative">
                  <canvas ref={canvasPastRef} className="w-full h-full object-contain" />
                  {!pastFile && <div className="absolute inset-0 flex items-center justify-center text-stone-600">No Image</div>}
                </div>
              </div>

              {/* Present Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-400">Present GeoTIFF (e.g., 2025)</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept=".tif,.tiff" 
                    onChange={(e) => handleFileUpload(e, 'present')}
                    className="block w-full text-sm text-stone-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-emerald-900 file:text-emerald-300
                      hover:file:bg-emerald-800
                      cursor-pointer"
                  />
                </div>
                <div className="aspect-square bg-black rounded-lg overflow-hidden border border-stone-700 relative">
                  <canvas ref={canvasPresentRef} className="w-full h-full object-contain" />
                  {!presentFile && <div className="absolute inset-0 flex items-center justify-center text-stone-600">No Image</div>}
                </div>
              </div>
            </div>

            <button
              onClick={runAnalysis}
              disabled={!pastFile || !presentFile || isProcessing}
              className={`mt-6 w-full py-3 px-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all
                ${!pastFile || !presentFile 
                  ? 'bg-stone-700 text-stone-500 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-900/20'
                }`}
            >
              {isProcessing ? (
                <span className="animate-pulse">Processing Spectral Harmonics...</span>
              ) : (
                <>
                  <Play size={20} /> Run Shuddhi AI (Analyze Drift)
                </>
              )}
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-stone-800/50 p-4 rounded-lg border border-stone-700 text-sm text-stone-400">
            <h3 className="font-bold text-stone-300 mb-2">Hackathon Mode Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>Download the Python code using the button above.</li>
              <li>Place your <code>forest_2023.tif</code> and <code>forest_2025.tif</code> in the <code>data/</code> folder.</li>
              <li>Run <code>streamlit run app.py</code> locally.</li>
              <li><strong>Or use this live web prototype</strong> by uploading your TIFFs directly here. It runs the same logic (Drift + Statistical Anomaly Detection) in your browser!</li>
            </ol>
          </div>
        </div>

        {/* Output Section */}
        <div className="bg-stone-800 p-6 rounded-xl border border-stone-700 flex flex-col space-y-6">
          
          {/* Map */}
          <div>
            <h2 className="text-xl font-bold text-stone-300 mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-500" /> Adharma Alert: Degradation Map
            </h2>
            
            <div className="bg-black rounded-lg overflow-hidden border border-stone-700 relative min-h-[400px]">
              <canvas 
                ref={canvasResultRef} 
                onClick={handleCanvasClick}
                className={`w-full h-full object-contain ${resultReady ? 'cursor-crosshair' : ''}`} 
              />
              
              {!resultReady && !isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-600">
                  <p>Waiting for analysis...</p>
                </div>
              )}
              
              {resultReady && (
                <div className="absolute bottom-4 left-4 bg-stone-900/90 p-3 rounded border border-stone-600 pointer-events-none">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
                    <span className="text-xs text-stone-300">Anomalous Drift (Mining)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-900 rounded-full"></span>
                    <span className="text-xs text-stone-300">Healthy Vegetation</span>
                  </div>
                  <div className="mt-2 text-[10px] text-stone-400 flex items-center gap-1">
                    <MousePointerClick size={10} /> Click map to inspect pixel
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pixel Analysis Chart */}
          {resultReady && selectedPixel && (
            <div className="bg-stone-900/50 p-4 rounded-lg border border-stone-600">
              <h3 className="text-sm font-bold text-stone-300 mb-2 flex items-center gap-2">
                Pixel Analysis (X: {selectedPixel.x}, Y: {selectedPixel.y})
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
                    <XAxis dataKey="name" stroke="#a8a29e" fontSize={12} />
                    <YAxis stroke="#a8a29e" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c', color: '#fff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="ndvi" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {resultReady && (
            <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg">
              <h4 className="font-bold text-red-400 mb-1">Analysis Complete</h4>
              <p className="text-sm text-red-200">
                The highlighted red zones indicate statistical deviation in structural integrity, 
                suggesting illegal land-use drift that bypasses natural seasonal phenology.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;
