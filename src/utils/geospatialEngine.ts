import { fromArrayBuffer } from 'geotiff';

export interface RasterData {
  width: number;
  height: number;
  data: Float32Array | Uint16Array | Uint8Array;
  min: number;
  max: number;
}

export const loadGeoTiff = async (file: File): Promise<RasterData> => {
  const arrayBuffer = await file.arrayBuffer();
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const rasters = await image.readRasters();
  
  // Assume single band for simplicity or take the first band
  const data = rasters[0] as Float32Array | Uint16Array | Uint8Array;
  
  let min = Infinity;
  let max = -Infinity;
  
  // Calculate min/max for normalization
  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    if (val < min) min = val;
    if (val > max) max = val;
  }

  return { width, height, data, min, max };
};

export const calculateDrift = (past: RasterData, present: RasterData): Float32Array => {
  if (past.width !== present.width || past.height !== present.height) {
    throw new Error("Image dimensions do not match");
  }

  const length = past.data.length;
  const drift = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    drift[i] = Number(present.data[i]) - Number(past.data[i]);
  }

  return drift;
};

export const detectAnomalies = (drift: Float32Array): { anomalies: Uint8Array, count: number, stats: any } => {
  // Refined Anomaly Detection using a simplified Isolation Forest approach for 1D data.
  // This is more robust than simple thresholding as it isolates anomalies based on path length in random trees.

  const n = drift.length;
  const numTrees = 10; // Number of trees (kept low for real-time performance in JS)
  const subSampleSize = Math.min(n, 256); // Subsample size
  const heightLimit = Math.ceil(Math.log2(subSampleSize));

  // Helper to build a random tree on a subsample
  const buildTree = (data: Float32Array, depth: number): any => {
    if (depth >= heightLimit || data.length <= 1) {
      return { type: 'leaf', size: data.length };
    }
    
    let min = Infinity;
    let max = -Infinity;
    for(let i=0; i<data.length; i++) {
        if(data[i] < min) min = data[i];
        if(data[i] > max) max = data[i];
    }

    if (min === max) return { type: 'leaf', size: data.length };

    const splitValue = min + Math.random() * (max - min);
    const leftData = new Float32Array(data.length); // Max possible size
    const rightData = new Float32Array(data.length);
    let l = 0, r = 0;

    for(let i=0; i<data.length; i++) {
        if (data[i] < splitValue) leftData[l++] = data[i];
        else rightData[r++] = data[i];
    }

    return {
      type: 'node',
      splitValue,
      left: buildTree(leftData.subarray(0, l), depth + 1),
      right: buildTree(rightData.subarray(0, r), depth + 1)
    };
  };

  // Helper to calculate path length
  const pathLength = (val: number, node: any, depth: number): number => {
    if (node.type === 'leaf') {
      return depth + c(node.size);
    }
    if (val < node.splitValue) {
      return pathLength(val, node.left, depth + 1);
    } else {
      return pathLength(val, node.right, depth + 1);
    }
  };

  const c = (size: number): number => {
    if (size <= 1) return 0;
    return 2 * (Math.log(size - 1) + 0.5772156649) - (2 * (size - 1) / size);
  };

  // Build Forest
  const forest: any[] = [];
  for (let i = 0; i < numTrees; i++) {
    // Create random subsample
    const sample = new Float32Array(subSampleSize);
    for (let j = 0; j < subSampleSize; j++) {
      sample[j] = drift[Math.floor(Math.random() * n)];
    }
    forest.push(buildTree(sample, 0));
  }

  // Score all points
  const scores = new Float32Array(n);
  let minScore = Infinity;
  let maxScore = -Infinity;

  for (let i = 0; i < n; i++) {
    let avgPathLen = 0;
    for (let j = 0; j < numTrees; j++) {
      avgPathLen += pathLength(drift[i], forest[j], 0);
    }
    avgPathLen /= numTrees;
    
    // Anomaly Score formula: 2^(-E(h(x)) / c(n))
    const score = Math.pow(2, -avgPathLen / c(subSampleSize));
    scores[i] = score;
    
    if (score < minScore) minScore = score;
    if (score > maxScore) maxScore = score;
  }

  // Thresholding
  // We are looking for high anomaly scores AND negative drift (degradation)
  // Isolation Forest assigns high scores (close to 1) to anomalies.
  // Normal points have scores around 0.5 or lower.
  
  const anomalyThreshold = 0.65; // Tunable parameter
  const anomalies = new Uint8Array(n);
  let count = 0;

  for (let i = 0; i < n; i++) {
    if (scores[i] > anomalyThreshold && drift[i] < -0.05) { // Check for negative drift
      anomalies[i] = 1;
      count++;
    }
  }

  console.log(`[Shuddhi AI] Isolation Forest - Max Score: ${maxScore}, Min Score: ${minScore}, Anomalies: ${count}`);

  return { anomalies, count, stats: { maxScore, minScore, threshold: anomalyThreshold } };
};

export const calculateSunPosition = (lat: number, lon: number, date: Date): number => {
  // Simplified solar altitude calculation for the web prototype
  // In the Python version, we use 'pysolar' for high precision.
  // Here we use a simplified approximation for the Aravalli latitude (approx 24.5N)
  
  // Day of year
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  
  // Approximate declination
  const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (day - 81));
  
  // Hour angle (assuming noon for max shadow contrast in demo)
  const hourAngle = 0; 
  
  // Latitude in radians
  const latRad = lat * (Math.PI / 180);
  const decRad = declination * (Math.PI / 180);
  
  // Elevation formula
  const elevation = Math.asin(Math.sin(latRad) * Math.sin(decRad) + 
                              Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle));
                              
  return elevation * (180 / Math.PI);
};

export const validateShadowDepth = (sunAltitude: number, anomalyScore: number): boolean => {
  // Prong 3: Surya-Sakshi Logic
  // If sun is high (>30 deg) and we still see deep dark anomalies (high score),
  // it implies volumetric depth (mining pit) rather than just surface discoloration.
  return sunAltitude > 30 && anomalyScore > 0.5;
};

export const renderToCanvas = (raster: RasterData, canvas: HTMLCanvasElement, overlay?: Uint8Array) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height, data, min, max } = raster;
  canvas.width = width;
  canvas.height = height;

  // Use nearest neighbor for crisp pixels on small images (like 50x50)
  ctx.imageSmoothingEnabled = false;

  const imageData = ctx.createImageData(width, height);
  const range = max - min || 1;

  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    const normalized = (val - min) / range;
    const pixelIdx = i * 4;

    // Render grayscale base
    const gray = Math.floor(normalized * 255);
    
    if (overlay && overlay[i] === 1) {
      // Red overlay for anomalies
      imageData.data[pixelIdx] = 255;     // R
      imageData.data[pixelIdx + 1] = 0;   // G
      imageData.data[pixelIdx + 2] = 0;   // B
      imageData.data[pixelIdx + 3] = 255; // A
    } else {
      // Green scale for vegetation (NIR)
      // Darker green for higher values
      imageData.data[pixelIdx] = 0;       // R
      imageData.data[pixelIdx + 1] = gray;// G
      imageData.data[pixelIdx + 2] = 0;   // B
      imageData.data[pixelIdx + 3] = 255; // A
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

