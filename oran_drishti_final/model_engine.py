import numpy as np
from scipy.fft import fft, fftfreq
import datetime
from pysolar.solar import get_altitude
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, RepeatVector, TimeDistributed, Dense

def extract_harmonics(time_series, sample_spacing=1.0):
    """
    Prong 1: Ritu-Chakra (Harmonic Analysis)
    Uses Fast Fourier Transform (FFT) to decompose the time-series into constituent frequencies.
    This helps isolate the natural seasonal 'heartbeat' (Ritu) from chaotic noise or flatline drift.
    
    Args:
        time_series (array-like): The temporal vegetation data (NDVI).
        sample_spacing (float): The time interval between samples (default 1.0 month).
        
    Returns:
        xf (array): Frequencies.
        amplitudes (array): The magnitude of each frequency component.
    """
    # Ensure input is a numpy array
    ts = np.array(time_series)
    N = len(ts)
    
    # Apply Fast Fourier Transform
    yf = fft(ts)
    
    # Get frequencies (x-axis)
    xf = fftfreq(N, sample_spacing)[:N//2]
    
    # Calculate amplitudes (y-axis), normalized by signal length
    # We take the absolute value and multiply by 2/N to get true magnitude
    amplitudes = 2.0/N * np.abs(yf[0:N//2])
    
    return xf, amplitudes

def build_lstm_autoencoder(timesteps, features):
    """
    Prong 2: Shuddhi Model (Unsupervised Deep Learning)
    Builds an LSTM Autoencoder to learn the 'Natural Order' of the forest.
    
    Architecture:
    - Encoder: Compresses the time-series into a latent representation (context vector).
    - RepeatVector: Broadcasts the context vector across time steps.
    - Decoder: Reconstructs the original time-series from the latent context.
    
    The model is trained on 'healthy' data. High reconstruction error (MSE) on new data 
    indicates an anomaly (Adharma/Drift) that deviates from the learned natural pattern.
    
    Args:
        timesteps (int): Number of time steps in the series (e.g., 12 months).
        features (int): Number of features per time step (e.g., 1 for NDVI).
        
    Returns:
        model (Sequential): Compiled Keras model ready for training.
    """
    model = Sequential()
    
    # Encoder: Learn the temporal dependencies
    model.add(LSTM(16, activation='relu', input_shape=(timesteps, features), return_sequences=False))
    
    # Bottleneck: The latent space representation
    model.add(RepeatVector(timesteps))
    
    # Decoder: Reconstruct the sequence
    model.add(LSTM(16, activation='relu', return_sequences=True))
    
    # Output Layer: Reconstruct the features for each time step
    model.add(TimeDistributed(Dense(features)))
    
    model.compile(optimizer='adam', loss='mse')
    return model

def calculate_sun_angle(lat, lon, date=None):
    """Prong 3: Surya-Sakshi - Validates depth using solar physics."""
    # Arbitrary daytime timestamp for the Aravallis if not provided
    if date is None:
        date = datetime.datetime(2025, 5, 15, 12, 0, 0, tzinfo=datetime.timezone.utc)
    return get_altitude(lat, lon, date)
