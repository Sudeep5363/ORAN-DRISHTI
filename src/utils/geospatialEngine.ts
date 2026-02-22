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
  // Robust Anomaly Detection using Median / MAD
  // Implemented manually to avoid dependencies and ensure control

  // 1. Sampling for speed if image is large (>1M pixels)
  // For hackathon sizes (500x500), we can just use all data
  let sample = drift;
  if (drift.length > 1000000) {
    const sampleSize = 100000;
    sample = new Float32Array(sampleSize);
    for(let i=0; i<sampleSize; i++) {
      sample[i] = drift[Math.floor(Math.random() * drift.length)];
    }
  }

  // 2. Calculate Median
  // We copy to sort to not mutate original if it was the ref
  const sorted = Float32Array.from(sample).sort();
  const mid = Math.floor(sorted.length / 2);
  const median = sorted[mid];

  // 3. Calculate MAD (Median Absolute Deviation)
  const deviations = new Float32Array(sorted.length);
  for(let i=0; i<sorted.length; i++) {
    deviations[i] = Math.abs(sorted[i] - median);
  }
  deviations.sort();
  const mad = deviations[mid];

  // 4. Threshold
  // If MAD is very small (synthetic data), default to a small epsilon to avoid flagging everything
  const robustMad = mad === 0 ? 0.01 : mad;
  const threshold = 3 * robustMad;
  const limit = median - threshold;

  console.log(`[Shuddhi AI] Median: ${median}, MAD: ${mad}, Limit: ${limit}`);

  const anomalies = new Uint8Array(drift.length);
  let count = 0;

  for (let i = 0; i < drift.length; i++) {
    // Flag negative drift (degradation) that is an outlier
    if (drift[i] < limit) {
      anomalies[i] = 1;
      count++;
    }
  }

  return { anomalies, count, stats: { median, mad, limit } };
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

