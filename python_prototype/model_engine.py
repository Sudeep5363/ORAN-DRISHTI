import rasterio
import numpy as np
from sklearn.ensemble import IsolationForest

def load_raster(file_path):
    """Loads a GeoTIFF and returns the array and metadata."""
    with rasterio.open(file_path) as src:
        array = src.read(1).astype('float32')
        meta = src.meta
    return array, meta

def calculate_drift(past_array, present_array):
    """Calculates the temporal drift (change) between two periods."""
    # Handle zero division issues dynamically
    np.seterr(divide='ignore', invalid='ignore')
    
    # Calculate difference (Drift)
    drift = present_array - past_array
    
    # Clean up NaNs and Infs for Machine Learning
    drift = np.where(np.isnan(drift), 0, drift)
    drift = np.where(np.isinf(drift), 0, drift)
    return drift

def detect_anomalies_unsupervised(drift_array):
    """
    Uses Unsupervised Isolation Forest to detect anomalous land degradation (Adharma).
    This proves we don't need labeled mining data.
    """
    # Flatten array for sklearn
    shape = drift_array.shape
    flat_drift = drift_array.flatten().reshape(-1, 1)
    
    # Initialize the Unsupervised ML Model
    # Contamination is the estimated percentage of illegal mining/drift
    iso_forest = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    
    # Predict anomalies (-1 for anomaly, 1 for normal)
    predictions = iso_forest.fit_predict(flat_drift)
    
    # Reshape back to image dimensions
    anomaly_map = predictions.reshape(shape)
    
    # Filter to only show negative anomalies (degradation/mining, not growth)
    degradation_mask = (anomaly_map == -1) & (drift_array < -0.1)
    
    return degradation_mask
