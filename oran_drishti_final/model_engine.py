import numpy as np
from scipy.fft import fft, fftfreq
import datetime
from pysolar.solar import get_altitude
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, RepeatVector, TimeDistributed, Dense

def extract_harmonics(time_series, sample_spacing=1.0):
    """Prong 1: Ritu-Chakra - Uses Fast Fourier Transform to extract seasonal beat."""
    N = len(time_series)
    yf = fft(time_series)
    xf = fftfreq(N, sample_spacing)[:N//2]
    amplitudes = 2.0/N * np.abs(yf[0:N//2])
    return xf, amplitudes

def build_lstm_autoencoder(timesteps, features):
    """Prong 2: Shuddhi Model - Unsupervised deep learning anomaly detector."""
    model = Sequential()
    model.add(LSTM(16, activation='relu', input_shape=(timesteps, features), return_sequences=False))
    model.add(RepeatVector(timesteps))
    model.add(LSTM(16, activation='relu', return_sequences=True))
    model.add(TimeDistributed(Dense(features)))
    model.compile(optimizer='adam', loss='mse')
    return model

def calculate_sun_angle(lat, lon):
    """Prong 3: Surya-Sakshi - Validates depth using solar physics."""
    # Arbitrary daytime timestamp for the Aravallis
    date = datetime.datetime(2025, 5, 15, 12, 0, 0, tzinfo=datetime.timezone.utc)
    return get_altitude(lat, lon, date)
