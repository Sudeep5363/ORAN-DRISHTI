import SunCalc from 'suncalc';
import { TimeSeriesPoint } from './dataSimulator';
import * as tf from '@tensorflow/tfjs';
import FFT from 'fft.js';

// Filter 1: Ritu-Chakra (Real Harmonic Analysis via FFT)
export const performHarmonicAnalysis = (history: TimeSeriesPoint[]): TimeSeriesPoint[] => {
  const n = history.length;
  // FFT requires power of 2. We zero-pad to the next power of 2.
  const nextPow2 = Math.max(2, Math.pow(2, Math.ceil(Math.log2(n))));
  
  const f = new FFT(nextPow2);
  const input = f.createComplexArray();
  const output = f.createComplexArray();

  // Fill input
  for (let i = 0; i < nextPow2; i++) {
    if (i < n) {
      input[2 * i] = history[i].ndvi;
      input[2 * i + 1] = 0;
    } else {
      // Zero padding
      input[2 * i] = 0;
      input[2 * i + 1] = 0;
    }
  }

  // Forward FFT
  f.transform(output, input);

  // Filter: Keep only low frequencies (Seasonality)
  // The first few bins correspond to the trend and annual cycles.
  // We keep the DC component (0) and the first ~10 harmonics.
  const cutoff = 10; 
  for (let i = cutoff; i < nextPow2 - cutoff; i++) {
    output[2 * i] = 0;
    output[2 * i + 1] = 0;
  }

  // Inverse FFT
  f.inverseTransform(input, output);

  // Extract real part and normalize
  // fft.js inverse is unscaled, so we divide by the FFT size (nextPow2).
  
  const smoothed = history.map((point, i) => {
    return { ...point, seasonal: input[2 * i] / nextPow2 }; 
  });

  return smoothed;
};

// Filter 2: Shuddhi Model (Real TensorFlow.js LSTM Autoencoder)
// This is an async function because training takes time.
export const trainAndPredictAnomalies = async (history: TimeSeriesPoint[], onProgress?: (epoch: number, loss: number) => void) => {
  // 1. Prepare Data
  // We use a sliding window approach for LSTM
  const windowSize = 30;
  const inputs: number[][] = [];
  
  // Normalize data (0-1 is already roughly true for NDVI, but let's be safe)
  const values = history.map(p => p.ndvi);
  
  for (let i = 0; i < values.length - windowSize; i++) {
    inputs.push(values.slice(i, i + windowSize));
  }

  const xs = tf.tensor3d(inputs, [inputs.length, windowSize, 1]);
  
  // Autoencoder: Input -> Encoder -> Latent -> Decoder -> Output (Same as Input)
  // We want the model to learn the "normal" patterns.
  // We'll assume the first 50% of data is "normal" (training set).
  const trainSize = Math.floor(inputs.length * 0.5);
  const trainXs = xs.slice([0, 0, 0], [trainSize, windowSize, 1]);

  // Define Model
  const model = tf.sequential();
  
  // Encoder (LSTM)
  model.add(tf.layers.lstm({
    units: 32,
    inputShape: [windowSize, 1],
    returnSequences: false // Compress to latent vector
  }));
  
  // Bottleneck (Latent Space)
  model.add(tf.layers.repeatVector({ n: windowSize }));
  
  // Decoder (LSTM)
  model.add(tf.layers.lstm({
    units: 32,
    returnSequences: true
  }));
  
  // Output Layer
  model.add(tf.layers.timeDistributed({ layer: tf.layers.dense({ units: 1 }) }));

  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

  // Train
  await model.fit(trainXs, trainXs, {
    epochs: 15, // Quick training for demo
    batchSize: 32,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (onProgress && logs) onProgress(epoch, logs.loss);
      }
    }
  });

  // Predict (Reconstruct) on ALL data
  const preds = model.predict(xs) as tf.Tensor;
  const reconstructed = await preds.array() as number[][][];
  
  // Calculate MAE (Mean Absolute Error) for each window
  const anomalies = history.map((point, i) => {
    if (i < windowSize) return { ...point, reconstructionError: 0, isAnomaly: false };
    
    const windowIndex = i - windowSize;
    if (windowIndex >= reconstructed.length) return { ...point, reconstructionError: 0, isAnomaly: false };

    // Compare the last point of the window (current point)
    // Or average error across the window. Let's use the error of the current point reconstruction.
    // The reconstruction is [windowSize, 1]. We look at the last step.
    const predVal = reconstructed[windowIndex][windowSize - 1][0];
    const actualVal = values[i];
    const error = Math.abs(predVal - actualVal);

    return {
      ...point,
      reconstructionError: error,
      isAnomaly: error > 0.15 // Threshold
    };
  });

  // Cleanup
  xs.dispose();
  trainXs.dispose();
  preds.dispose();
  model.dispose();

  return anomalies;
};

// Filter 3: Surya-Sakshi (Solar Physics Validator)
export const validateSolarShadows = (lat: number, lon: number, dateStr: string) => {
  const date = new Date(dateStr);
  const sunPos = SunCalc.getPosition(date, lat, lon);
  const altitude = sunPos.altitude * (180 / Math.PI);
  const azimuth = sunPos.azimuth * (180 / Math.PI);
  
  return {
    altitude: altitude.toFixed(2),
    azimuth: azimuth.toFixed(2),
    isDaytime: altitude > 0,
    shadowLengthFactor: altitude > 0 ? (1 / Math.tan(sunPos.altitude)).toFixed(2) : 'Infinite'
  };
};
