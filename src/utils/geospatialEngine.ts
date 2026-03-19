// ============================================================
// geospatialEngine.ts — Raster I/O, Drift Calculation,
// Anomaly Detection & Canvas Rendering
//
// Responsibilities:
//   • Parse GeoTIFF files in the browser (no server needed)
//   • Compute pixel-wise vegetation drift (Present − Past)
//   • Run an Isolation Forest to flag anomalous drift pixels
//   • Validate anomalies via solar altitude geometry
//   • Render raster data onto an HTML <canvas> element
// ============================================================

import { fromArrayBuffer } from 'geotiff';

// Normalised raster data returned after loading a GeoTIFF.
// `data` contains the raw pixel values of the first raster band.
export interface RasterData {
  width:  number;
  height: number;
  data:   Float32Array | Uint16Array | Uint8Array;
  min:    number; // Global minimum pixel value (used for normalisation)
  max:    number; // Global maximum pixel value (used for normalisation)
}

// ============================================================
// loadGeoTiff — Parse a single-band GeoTIFF from a File object
// ============================================================
// Reads the file into an ArrayBuffer, decodes it with the geotiff
// library, extracts the first raster band, and computes the
// pixel value range for later normalisation.
export const loadGeoTiff = async (file: File): Promise<RasterData> => {
  const arrayBuffer = await file.arrayBuffer();   // Read the file into memory
  const tiff  = await fromArrayBuffer(arrayBuffer); // Decode GeoTIFF container
  const image = await tiff.getImage();              // Access the first IFD (image)
  const width  = image.getWidth();
  const height = image.getHeight();
  const rasters = await image.readRasters();         // Read all bands as typed arrays
  
  // Use the first band only (NDVI-style single-band input).
  const data = rasters[0] as Float32Array | Uint16Array | Uint8Array;
  
  let min =  Infinity;
  let max = -Infinity;
  
  // Single pass to find the pixel value range for contrast normalisation.
  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    if (val < min) min = val;
    if (val > max) max = val;
  }

  return { width, height, data, min, max };
};

// ============================================================
// calculateDrift — Pixel-wise change detection (Present − Past)
// ============================================================
// Returns a Float32Array of the same length as the input images.
// Positive values: vegetation has improved.
// Negative values: vegetation has degraded (candidate mining signal).
export const calculateDrift = (past: RasterData, present: RasterData): Float32Array => {
  // Both images must cover exactly the same spatial grid.
  if (past.width !== present.width || past.height !== present.height) {
    throw new Error("Image dimensions do not match");
  }

  const length = past.data.length;
  const drift  = new Float32Array(length);

  // Subtraction in floating-point to preserve negative drift values.
  for (let i = 0; i < length; i++) {
    drift[i] = Number(present.data[i]) - Number(past.data[i]);
  }

  return drift;
};

// ============================================================
// detectAnomalies — Isolation Forest on the drift signal
// ============================================================
// Uses a simplified 1-D Isolation Forest to score each pixel
// without any labelled ground-truth data (fully unsupervised).
//
// Key idea: anomalous values are "isolated" early in a random
// partitioning tree (short path length → high score).  Normal
// values require more splits and have long path lengths (low score).
//
// Only pixels with BOTH a high anomaly score AND negative drift are
// flagged — this ensures we detect degradation, not just outliers.
export const detectAnomalies = (drift: Float32Array): { anomalies: Uint8Array, count: number, stats: any } => {

  const n             = drift.length;
  const numTrees      = 10;                        // Ensemble size (kept small for real-time JS)
  const subSampleSize = Math.min(n, 256);           // Subsample per tree (Isolation Forest paper: 256)
  const heightLimit   = Math.ceil(Math.log2(subSampleSize)); // Maximum tree depth

  // --- Helper: recursively build one isolation tree on a data subsample ---
  // At each node we pick a random split value within the data range.
  // Anomalies (extreme values) tend to be isolated near the root.
  const buildTree = (data: Float32Array, depth: number): any => {
    // Stop splitting if we've reached the depth limit or have ≤1 point.
    if (depth >= heightLimit || data.length <= 1) {
      return { type: 'leaf', size: data.length };
    }
    
    let min =  Infinity;
    let max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }

    // If all values are identical we cannot split further.
    if (min === max) return { type: 'leaf', size: data.length };

    // Uniform random split value within [min, max].
    const splitValue = min + Math.random() * (max - min);

    // Partition data into left (< splitValue) and right (≥ splitValue).
    const leftData  = new Float32Array(data.length);
    const rightData = new Float32Array(data.length);
    let l = 0, r = 0;

    for (let i = 0; i < data.length; i++) {
      if (data[i] < splitValue) leftData[l++]  = data[i];
      else                       rightData[r++] = data[i];
    }

    return {
      type: 'node',
      splitValue,
      left:  buildTree(leftData.subarray(0, l),  depth + 1),
      right: buildTree(rightData.subarray(0, r), depth + 1)
    };
  };

  // --- Helper: traverse the tree for a single value, returning path length ---
  // Shorter paths → value was isolated quickly → more anomalous.
  const pathLength = (val: number, node: any, depth: number): number => {
    if (node.type === 'leaf') {
      // At a leaf, add the expected path length for the remaining points
      // using the correction factor c(size) from the Isolation Forest paper.
      return depth + c(node.size);
    }
    // Route left or right based on the split value.
    if (val < node.splitValue) {
      return pathLength(val, node.left,  depth + 1);
    } else {
      return pathLength(val, node.right, depth + 1);
    }
  };

  // --- Helper: average path length correction c(n) (Liu et al., 2008) ---
  // Approximates the average path length of an unsuccessful BST search,
  // used to normalise path lengths across trees of different sizes.
  const c = (size: number): number => {
    if (size <= 1) return 0;
    // Euler–Mascheroni constant ≈ 0.5772156649
    return 2 * (Math.log(size - 1) + 0.5772156649) - (2 * (size - 1) / size);
  };

  // --- Build the Isolation Forest ensemble ---
  const forest: any[] = [];
  for (let i = 0; i < numTrees; i++) {
    // Draw a random subsample of drift values for this tree.
    const sample = new Float32Array(subSampleSize);
    for (let j = 0; j < subSampleSize; j++) {
      sample[j] = drift[Math.floor(Math.random() * n)];
    }
    forest.push(buildTree(sample, 0));
  }

  // --- Score every pixel ---
  // Anomaly score = 2^(-E[h(x)] / c(n)), where E[h(x)] is the average
  // path length across all trees.  Score → 1 means highly anomalous;
  // score → 0.5 means normal; score → 0 means very normal.
  const scores = new Float32Array(n);
  let minScore =  Infinity;
  let maxScore = -Infinity;

  for (let i = 0; i < n; i++) {
    let avgPathLen = 0;
    for (let j = 0; j < numTrees; j++) {
      avgPathLen += pathLength(drift[i], forest[j], 0);
    }
    avgPathLen /= numTrees;
    
    const score = Math.pow(2, -avgPathLen / c(subSampleSize));
    scores[i] = score;
    
    if (score < minScore) minScore = score;
    if (score > maxScore) maxScore = score;
  }

  // --- Threshold: flag pixels with high anomaly score AND negative drift ---
  // score > 0.65 → the Isolation Forest considers this pixel unusual.
  // drift < -0.05 → the pixel shows meaningful vegetation loss (not noise).
  // Both conditions must hold to raise an Adharma Alert for this pixel.
  const anomalyThreshold = 0.65; // Tunable — higher = stricter (fewer alerts)
  const anomalies = new Uint8Array(n); // 1 = anomalous, 0 = normal
  let count = 0;

  for (let i = 0; i < n; i++) {
    if (scores[i] > anomalyThreshold && drift[i] < -0.05) {
      anomalies[i] = 1;
      count++;
    }
  }

  console.log(`[Shuddhi AI] Isolation Forest — Max Score: ${maxScore.toFixed(3)}, Min Score: ${minScore.toFixed(3)}, Anomalies flagged: ${count}`);

  return { anomalies, count, stats: { maxScore, minScore, threshold: anomalyThreshold } };
};

// ============================================================
// calculateSunPosition — Approximate solar altitude (degrees)
// ============================================================
// Returns the solar elevation angle above the horizon for a given
// latitude, longitude, and UTC datetime.
// This browser-side implementation uses the standard declination /
// hour-angle formula.  For production accuracy, use the Python
// `pysolar` library (see oran_drishti_final/model_engine.py).
export const calculateSunPosition = (lat: number, lon: number, date: Date): number => {
  
  // Compute the day-of-year (1–365) from the date.
  const start   = new Date(date.getFullYear(), 0, 0);
  const diff    = date.getTime() - start.getTime();
  const oneDay  = 1000 * 60 * 60 * 24;
  const day     = Math.floor(diff / oneDay);
  
  // Solar declination (degrees): Earth's axial tilt relative to the ecliptic.
  // Peaks at +23.45° at summer solstice (day 172), −23.45° at winter solstice.
  const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (day - 81));
  
  // Hour angle: 0 at solar noon (maximum elevation), ±π at midnight.
  // We assume solar noon for the demo to maximise shadow contrast.
  const hourAngle = 0; // Solar noon
  
  const latRad = lat         * (Math.PI / 180); // Latitude in radians
  const decRad = declination * (Math.PI / 180); // Declination in radians
  
  // Standard solar elevation formula:
  //   sin(elevation) = sin(lat)·sin(dec) + cos(lat)·cos(dec)·cos(hourAngle)
  const elevation = Math.asin(
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle)
  );
                              
  return elevation * (180 / Math.PI); // Convert radians → degrees
};

// ============================================================
// validateShadowDepth — Surya-Sakshi confirmation logic
// ============================================================
// Returns true only when:
//   1. The sun is high enough (> 30°) that shadow artefacts are
//      unlikely to explain the observed dark region.
//   2. The anomaly score is strong enough (> 0.5) to be meaningful.
// This dual condition minimises false positives from hillside
// shadows and low-angle winter illumination.
export const validateShadowDepth = (sunAltitude: number, anomalyScore: number): boolean => {
  return sunAltitude > 30 && anomalyScore > 0.5;
};

// ============================================================
// renderToCanvas — Draw raster data onto an HTML <canvas>
// ============================================================
// Maps normalised pixel values to a green colour scale to
// represent vegetation health (NIR convention).  Optionally
// overlays anomalous pixels in red (the Adharma Alert layer).
export const renderToCanvas = (raster: RasterData, canvas: HTMLCanvasElement, overlay?: Uint8Array) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height, data, min, max } = raster;

  // Match canvas resolution to the raster dimensions so each canvas
  // pixel corresponds to exactly one raster cell.
  canvas.width  = width;
  canvas.height = height;

  // Nearest-neighbour interpolation preserves crisp pixel boundaries
  // on small rasters (e.g., 50×50 test images).
  ctx.imageSmoothingEnabled = false;

  const imageData = ctx.createImageData(width, height);
  const range = max - min || 1; // Avoid division by zero if all pixels equal

  for (let i = 0; i < data.length; i++) {
    const val        = data[i];
    const normalized = (val - min) / range; // Rescale to [0, 1]
    const pixelIdx   = i * 4;               // RGBA stride = 4 bytes per pixel

    // Encode brightness as the green channel to mimic a vegetation heatmap.
    const gray = Math.floor(normalized * 255);
    
    if (overlay && overlay[i] === 1) {
      // Anomaly pixel: pure red to signal Adharma (degradation/mining)
      imageData.data[pixelIdx]     = 255; // R
      imageData.data[pixelIdx + 1] = 0;   // G
      imageData.data[pixelIdx + 2] = 0;   // B
      imageData.data[pixelIdx + 3] = 255; // A (fully opaque)
    } else {
      // Healthy vegetation pixel: green scale (darker = lower NDVI)
      imageData.data[pixelIdx]     = 0;    // R
      imageData.data[pixelIdx + 1] = gray; // G (brightness encodes NDVI)
      imageData.data[pixelIdx + 2] = 0;    // B
      imageData.data[pixelIdx + 3] = 255;  // A
    }
  }

  // Flush the pixel buffer to the canvas in a single GPU call.
  ctx.putImageData(imageData, 0, 0);
};
