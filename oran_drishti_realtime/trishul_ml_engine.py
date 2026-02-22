import numpy as np
from scipy.fft import fft, fftfreq
import datetime
from pysolar.solar import get_altitude
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, RepeatVector, TimeDistributed, Dense
import pandas as pd

# --- PRONG 1: RITU-CHAKRA (Harmonic Analysis) ---
def apply_ritu_chakra_fft(ndvi_time_series, sample_spacing=1.0):
    """
    Applies Fast Fourier Transform to extract the dominant seasonal frequencies.
    Healthy vegetation has a strong annual/semi-annual signal.
    Degraded land (mining) has a 'flatline' or chaotic spectrum.
    """
    # Normalize
    ts = np.array(ndvi_time_series)
    N = len(ts)
    
    # FFT
    yf = fft(ts)
    xf = fftfreq(N, sample_spacing)[:N//2]
    amplitudes = 2.0/N * np.abs(yf[0:N//2])
    
    return xf, amplitudes

# --- PRONG 2: SHUDDHI MODEL (LSTM Autoencoder) ---
def build_and_train_shuddhi_lstm(healthy_baseline_data, timesteps=12, features=1):
    """
    Builds and trains an LSTM Autoencoder on the 'Healthy' baseline data.
    The model learns to reconstruct the 'Natural Order' (Ritu).
    """
    # Reshape for LSTM [samples, timesteps, features]
    # Assuming healthy_baseline_data is a list of time-series pixels
    X_train = np.array(healthy_baseline_data)
    if len(X_train.shape) == 1:
        X_train = X_train.reshape(1, timesteps, features)
    else:
        X_train = X_train.reshape(-1, timesteps, features)

    model = Sequential([
        LSTM(32, activation='relu', input_shape=(timesteps, features), return_sequences=False),
        RepeatVector(timesteps),
        LSTM(32, activation='relu', return_sequences=True),
        TimeDistributed(Dense(features))
    ])
    
    model.compile(optimizer='adam', loss='mse')
    
    # Fast training for demo (epochs=10)
    print("🧠 Training Shuddhi Autoencoder on Healthy Baseline...")
    history = model.fit(X_train, X_train, epochs=10, batch_size=32, verbose=0)
    print("✅ Training Complete.")
    
    return model

def calculate_adharma_score(model, current_data, timesteps=12):
    """
    Predicts on current data and calculates Mean Squared Error (Reconstruction Loss).
    High MSE = High Adharma Score (Anomaly).
    """
    X_pred = np.array(current_data).reshape(-1, timesteps, 1)
    reconstructions = model.predict(X_pred, verbose=0)
    
    # Calculate MSE per pixel
    mse = np.mean(np.power(X_pred - reconstructions, 2), axis=1)
    return mse.flatten() # Returns 1D array of scores

# --- PRONG 3: SURYA-SAKSHI (Solar Validator) ---
def validate_with_surya(lat, lon, timestamp_str):
    """
    Calculates solar altitude to validate shadow depth.
    """
    try:
        # Parse timestamp (handling 'Z' or other formats)
        if isinstance(timestamp_str, str):
            date = pd.to_datetime(timestamp_str).to_pydatetime()
            # Ensure timezone aware (UTC)
            if date.tzinfo is None:
                date = date.replace(tzinfo=datetime.timezone.utc)
        else:
            date = timestamp_str

        altitude = get_altitude(lat, lon, date)
        return altitude
    except Exception as e:
        print(f"Solar calc error: {e}")
        return 45.0 # Fallback average angle
