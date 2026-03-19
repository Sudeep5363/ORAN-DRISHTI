"""
model_engine.py — Trishul AI Core: Three Independent Filters
=============================================================
Implements the three scientific filters that together form the
Oran-Drishti anomaly detection pipeline.  All three must agree
before an "Adharma Alert" (illegal mining alert) is raised.

Filter 1 — Ritu-Chakra    : FFT seasonal decomposition
Filter 2 — Shuddhi Model  : LSTM autoencoder anomaly scoring
Filter 3 — Surya-Sakshi   : Solar-physics shadow depth check
"""

import numpy as np
from scipy.fft import fft, fftfreq
import datetime
from pysolar.solar import get_altitude
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, RepeatVector, TimeDistributed, Dense


# ============================================================
# FILTER 1: Ritu-Chakra — Harmonic Analysis via FFT
# ============================================================
def extract_harmonics(time_series, sample_spacing=1.0):
    """
    Prong 1: Ritu-Chakra (Harmonic Analysis)

    Uses Fast Fourier Transform (FFT) to decompose the time-series
    into its constituent frequencies.  This isolates the natural
    seasonal 'heartbeat' (Ritu / Seasonal Cycle) from chaotic noise
    or a structurally broken flatline caused by mining degradation.

    A healthy forest exhibits a strong annual/semi-annual harmonic.
    A mined plot shows a near-zero amplitude across all frequencies
    (flatline in time domain → no dominant seasonal peak in frequency
    domain).

    Args:
        time_series (array-like): Temporal NDVI values (one per month).
        sample_spacing (float):   Time interval between samples in
                                  consistent units (default: 1 month).

    Returns:
        xf (ndarray):         Positive frequency bins (cycles / sample).
        amplitudes (ndarray): Magnitude of each frequency component,
                              normalised so that amplitudes sum to the
                              RMS of the original signal.
    """
    # Ensure the input is a contiguous NumPy array for SciPy FFT
    ts = np.array(time_series)
    N  = len(ts)

    # Compute the full FFT (complex result)
    yf = fft(ts)

    # Retain only the positive half of the spectrum (Nyquist theorem):
    # frequencies range from 0 to (N/2 - 1) / (N * sample_spacing)
    xf = fftfreq(N, sample_spacing)[:N // 2]

    # Normalise amplitudes by 2/N so that the peak height matches
    # the true sinusoidal amplitude in the original signal.
    amplitudes = 2.0 / N * np.abs(yf[0:N // 2])

    return xf, amplitudes


# ============================================================
# FILTER 2: Shuddhi Model — LSTM Autoencoder (Unsupervised)
# ============================================================
def build_lstm_autoencoder(timesteps, features):
    """
    Prong 2: Shuddhi Model (Unsupervised Deep Learning)

    Builds a Sequence-to-Sequence LSTM Autoencoder to learn the
    'Natural Order' (Dharma) of a healthy forest pixel's time-series.

    Architecture (Encoder → Bottleneck → Decoder):
    ┌──────────────────┐
    │  Input           │  shape: (timesteps, features)
    │  LSTM Encoder    │  units=16, compresses to a latent vector
    │  RepeatVector    │  broadcasts latent vector across time steps
    │  LSTM Decoder    │  units=16, reconstructs the sequence
    │  TimeDistributed │  Dense(features) — per-step reconstruction
    └──────────────────┘

    Training strategy (unsupervised / self-supervised):
    - Train ONLY on "healthy" pixels (first 5×5 corner of the spatial
      grid, assumed to be undisturbed baseline forest).
    - The autoencoder learns to reconstruct normal seasonal patterns.
    - At inference, a degraded/mining pixel produces high MSE because
      its flatline pattern was never seen during training.

    Args:
        timesteps (int): Number of time steps per sample (e.g., 36 months).
        features  (int): Feature dimension per step (e.g., 1 for NDVI).

    Returns:
        model (Sequential): Compiled Keras model ready for `.fit()`.
    """
    model = Sequential()

    # ---- Encoder ----
    # LSTM with return_sequences=False collapses the temporal dimension
    # into a single fixed-size latent vector of shape (batch, units).
    model.add(LSTM(
        16,
        activation='relu',
        input_shape=(timesteps, features),
        return_sequences=False  # Compress entire sequence to one vector
    ))

    # ---- Bottleneck ----
    # RepeatVector repeats the latent vector `timesteps` times to give
    # the decoder one copy per time step: shape → (batch, timesteps, 16)
    model.add(RepeatVector(timesteps))

    # ---- Decoder ----
    # LSTM with return_sequences=True outputs a hidden state at each step,
    # enabling per-step reconstruction: shape → (batch, timesteps, 16)
    model.add(LSTM(16, activation='relu', return_sequences=True))

    # ---- Output ----
    # TimeDistributed wraps Dense so the same linear layer is applied
    # independently to each time step: shape → (batch, timesteps, features)
    model.add(TimeDistributed(Dense(features)))

    # MSE loss = reconstruction error; Adam converges quickly for demo
    model.compile(optimizer='adam', loss='mse')
    return model


# ============================================================
# FILTER 3: Surya-Sakshi — Solar Physics Validator
# ============================================================
def calculate_sun_angle(lat, lon, date=None):
    """
    Prong 3: Surya-Sakshi — Shadow Depth Validation

    Calculates the solar altitude angle (degrees above the horizon)
    for a given geographic location and UTC datetime using the
    high-precision `pysolar` library.

    Purpose:
    If the sun is high (> 30°) at the time of image acquisition and
    the model still detects a deep dark anomaly, the shadow cannot
    originate from a hillside or a low-angle illumination artefact.
    It must be caused by volumetric depth — i.e., an open-cast
    mining pit.  This is the Surya-Sakshi (Sun Witness) validation.

    Args:
        lat  (float):            Target latitude in decimal degrees.
        lon  (float):            Target longitude in decimal degrees.
        date (datetime, optional): UTC-aware datetime of acquisition.
                                   Defaults to 2025-05-15 12:00 UTC
                                   (representative Aravalli dry-season
                                   acquisition timestamp).

    Returns:
        altitude (float): Solar elevation angle in degrees.
                          > 0  → daytime;  ≤ 0 → night / below horizon.
    """
    # Default to a fixed demo timestamp if no date is provided
    if date is None:
        date = datetime.datetime(2025, 5, 15, 12, 0, 0,
                                 tzinfo=datetime.timezone.utc)

    # pysolar.get_altitude() returns degrees; positive = above horizon
    return get_altitude(lat, lon, date)

