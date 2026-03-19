// ============================================================
// modelEngine.ts — Oran-Drishti Three-Filter ML Pipeline
//
// Implements the three independent validation filters that
// together form the "Trishul AI" anomaly detection system:
//
//   Filter 1 — Ritu-Chakra   : FFT harmonic analysis (seasonality)
//   Filter 2 — Shuddhi Model : LSTM autoencoder (anomaly scoring)
//   Filter 3 — Surya-Sakshi  : Solar physics (shadow depth check)
//
// All three filters must agree before an "Adharma Alert" is raised,
// greatly reducing false positives from natural phenology changes.
// ============================================================

import SunCalc from 'suncalc';
import { TimeSeriesPoint } from './dataSimulator';
import * as tf from '@tensorflow/tfjs';
import FFT from 'fft.js';

// ============================================================
// FILTER 1: Ritu-Chakra — FFT Harmonic Analysis
// ============================================================
// Decomposes the NDVI time-series into its constituent frequencies
// using a Fast Fourier Transform, then reconstructs only the
// low-frequency (seasonal) components.  The returned "seasonal"
// field on each point represents the expected natural cycle;
// anything the model cannot explain with those harmonics is a
// candidate anomaly for Filter 2 to evaluate.
export const performHarmonicAnalysis = (history: TimeSeriesPoint[]): TimeSeriesPoint[] => {
  const n = history.length;

  // FFT.js requires the input length to be an exact power of 2.
  // We find the next power of 2 >= n and zero-pad the signal.
  const nextPow2 = Math.max(2, Math.pow(2, Math.ceil(Math.log2(n))));
  
  // Allocate interleaved real/imaginary arrays (fft.js convention:
  // even indices = real parts, odd indices = imaginary parts).
  const f = new FFT(nextPow2);
  const input = f.createComplexArray();   // Will hold the time-domain signal
  const output = f.createComplexArray();  // Will hold the frequency-domain result

  // Populate the real component with NDVI values; imaginary part stays 0.
  for (let i = 0; i < nextPow2; i++) {
    if (i < n) {
      input[2 * i]     = history[i].ndvi; // Real part: actual NDVI value
      input[2 * i + 1] = 0;               // Imaginary part: zero (real signal)
    } else {
      // Zero-padding: extends the array to the next power-of-2 length
      input[2 * i]     = 0;
      input[2 * i + 1] = 0;
    }
  }

  // --- Forward FFT: time domain → frequency domain ---
  f.transform(output, input);

  // --- Low-pass filter: zero out all high-frequency bins ---
  // Bins 0..cutoff correspond to the DC offset and the lowest annual/
  // bi-annual harmonics that capture natural phenology.
  // Bins beyond `cutoff` (and their mirrored counterparts) are noise or
  // sudden structural changes — we remove them to reconstruct only the
  // expected seasonal baseline.
  const cutoff = 10; // Keep DC + first 10 harmonics
  for (let i = cutoff; i < nextPow2 - cutoff; i++) {
    output[2 * i]     = 0; // Zero real component of high-frequency bin
    output[2 * i + 1] = 0; // Zero imaginary component of high-frequency bin
  }

  // --- Inverse FFT: filtered frequency domain → smoothed time domain ---
  f.inverseTransform(input, output);

  // fft.js inverse transform is unscaled, so divide by the FFT size to
  // recover values in the original NDVI magnitude range (roughly 0–1).
  const smoothed = history.map((point, i) => {
    return { ...point, seasonal: input[2 * i] / nextPow2 }; 
  });

  return smoothed; // Each point now has a `seasonal` field = expected NDVI
};

// ============================================================
// FILTER 2: Shuddhi Model — LSTM Autoencoder (TensorFlow.js)
// ============================================================
// Trains an LSTM autoencoder entirely in the browser on the first
// 50 % of the NDVI time-series (the "healthy" baseline period).
// After training, it tries to reconstruct the full series.
// Pixels/timesteps where reconstruction error exceeds the threshold
// are flagged as anomalies — they represent patterns the model has
// "never seen" during healthy training, implying structural change.
//
// This function is async because TensorFlow.js model training is
// asynchronous (WebGL/WASM kernels).
export const trainAndPredictAnomalies = async (history: TimeSeriesPoint[], onProgress?: (epoch: number, loss: number) => void) => {
  
  // --- Step 1: Build sliding-window input tensors ---
  // Each training sample is a sequence of `windowSize` consecutive NDVI
  // readings.  We slide this window one step at a time across the series.
  const windowSize = 30; // 30-day context window
  const inputs: number[][] = [];
  
  const values = history.map(p => p.ndvi); // Extract raw NDVI numbers
  
  for (let i = 0; i < values.length - windowSize; i++) {
    inputs.push(values.slice(i, i + windowSize)); // One window per sample
  }

  // Shape: [numWindows, windowSize, 1] — last dim is the single NDVI feature
  const xs = tf.tensor3d(inputs, [inputs.length, windowSize, 1]);
  
  // Use only the first 50 % of windows as the "healthy" training set.
  // This assumes the earlier part of the time-series was undisturbed.
  const trainSize = Math.floor(inputs.length * 0.5);
  const trainXs = xs.slice([0, 0, 0], [trainSize, windowSize, 1]);

  // --- Step 2: Define the LSTM Autoencoder architecture ---
  // Encoder compresses the sequence to a latent vector;
  // Decoder reconstructs the sequence from that vector.
  const model = tf.sequential();
  
  // Encoder: single LSTM layer that returns only the final hidden state
  // (returnSequences: false), producing a fixed-size latent vector.
  model.add(tf.layers.lstm({
    units: 32,
    inputShape: [windowSize, 1],
    returnSequences: false // Output shape: [batch, 32]
  }));
  
  // Bottleneck: repeat the latent vector `windowSize` times so the
  // decoder receives one copy per time step.
  model.add(tf.layers.repeatVector({ n: windowSize })); // Output: [batch, windowSize, 32]
  
  // Decoder: LSTM that reconstructs the sequence step by step.
  model.add(tf.layers.lstm({
    units: 32,
    returnSequences: true // Output shape: [batch, windowSize, 32]
  }));
  
  // Project decoder output back to a single feature (NDVI) per step.
  model.add(tf.layers.timeDistributed({ layer: tf.layers.dense({ units: 1 }) }));

  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

  // --- Step 3: Train on the healthy baseline (first 50 % of data) ---
  await model.fit(trainXs, trainXs, {  // Autoencoder target = input
    epochs: 15,    // 15 epochs is fast enough for a browser demo
    batchSize: 32,
    shuffle: true,
    callbacks: {
      // Report per-epoch loss to the UI so users can see training progress
      onEpochEnd: (epoch, logs) => {
        if (onProgress && logs) onProgress(epoch, logs.loss);
      }
    }
  });

  // --- Step 4: Reconstruct ALL windows (not just the training half) ---
  // The model will have low error on healthy data and high error on the
  // anomalous (degraded) portion it was never trained on.
  const preds = model.predict(xs) as tf.Tensor;
  const reconstructed = await preds.array() as number[][][]; // [numWindows, windowSize, 1]
  
  // --- Step 5: Score each time-series point by reconstruction error ---
  const anomalies = history.map((point, i) => {
    // The first `windowSize` points have no complete preceding window,
    // so we cannot score them — mark as non-anomalous.
    if (i < windowSize) return { ...point, reconstructionError: 0, isAnomaly: false };
    
    const windowIndex = i - windowSize;
    if (windowIndex >= reconstructed.length) return { ...point, reconstructionError: 0, isAnomaly: false };

    // Compare the reconstruction of the LAST step in the sliding window
    // (which corresponds to time step `i`) against the true observed value.
    const predVal  = reconstructed[windowIndex][windowSize - 1][0];
    const actualVal = values[i];
    const error = Math.abs(predVal - actualVal); // Mean Absolute Error

    return {
      ...point,
      reconstructionError: error,
      isAnomaly: error > 0.15 // Anomaly threshold (tunable; 0.15 ~ 15 % NDVI deviation)
    };
  });

  // --- Step 6: Dispose all TF.js tensors to free GPU/WASM memory ---
  xs.dispose();
  trainXs.dispose();
  preds.dispose();
  model.dispose();

  return anomalies;
};

// ============================================================
// FILTER 3: Surya-Sakshi — Solar Physics Validator
// ============================================================
// Uses the SunCalc library to compute the precise solar altitude
// and azimuth for a given location and timestamp.  Shadow length
// is derived from the sun's elevation angle.
//
// This filter is used as a final confirmation step: if the sun is
// high in the sky (> 30°) and the anomaly score is still elevated,
// the dark region is likely volumetric (i.e., a mining pit casting
// a deep shadow) rather than a surface artefact like a cloud shadow.
export const validateSolarShadows = (lat: number, lon: number, dateStr: string) => {
  const date = new Date(dateStr);

  // SunCalc.getPosition returns altitude and azimuth in radians;
  // we convert to degrees for human-readable display.
  const sunPos = SunCalc.getPosition(date, lat, lon);
  const altitude = sunPos.altitude * (180 / Math.PI); // Elevation above horizon (°)
  const azimuth  = sunPos.azimuth  * (180 / Math.PI); // Compass bearing (°)
  
  return {
    altitude: altitude.toFixed(2),
    azimuth:  azimuth.toFixed(2),
    isDaytime: altitude > 0, // Sun is above the horizon
    // Shadow length relative to object height: length = 1 / tan(altitude)
    // Returns 'Infinite' at night (altitude ≤ 0) to indicate no shadow analysis.
    shadowLengthFactor: altitude > 0 ? (1 / Math.tan(sunPos.altitude)).toFixed(2) : 'Infinite'
  };
};
