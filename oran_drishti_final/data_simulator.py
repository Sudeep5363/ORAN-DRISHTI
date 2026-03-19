"""
data_simulator.py — Synthetic GeoTIFF & Time-Series Generator
==============================================================
Generates the input data required by the Oran-Drishti Streamlit
application when real Sentinel-2 imagery is not available.

Outputs (written to the `data/` directory):
  past_forest.tif              — 50×50 GeoTIFF, healthy vegetation (2023)
  present_forest.tif           — 50×50 GeoTIFF, with injected mining pit (2025)
  synthetic_aravalli_data.npy  — 3-D NumPy cube (36 months × 50 × 50 pixels)

Run:
    python data_simulator.py
"""

import os
import numpy as np
import rasterio
from rasterio.transform import Affine


# ============================================================
# create_geotiff — Write a synthetic single-band GeoTIFF
# ============================================================
def create_geotiff(filename, base_value, add_anomaly=False):
    """
    Creates a small (50×50 pixel) single-band floating-point GeoTIFF
    representing NDVI-like vegetation density.

    Args:
        filename    (str):   Output file path (e.g., 'data/past_forest.tif').
        base_value  (float): Mean pixel value before noise (e.g., 0.8 = healthy).
        add_anomaly (bool):  If True, injects a 10×10 pixel "mining pit" in the
                             centre of the image (rows 20-29, cols 20-29) by
                             subtracting 0.6 from those pixels, simulating a
                             bare-soil / rock excavation site.
    """
    width, height = 50, 50  # Spatial resolution: 50×50 cells

    # Initialise the raster with a uniform baseline value
    data  = np.full((height, width), base_value, dtype=np.float32)

    # Add realistic sensor noise (Gaussian, σ = 0.1) to avoid a perfectly flat image
    noise = np.random.normal(0, 0.1, (height, width))
    data += noise
    
    if add_anomaly:
        # Inject an illegal mining pit (Adharma / Degradation event).
        # Subtracting 0.6 from NDVI drops the region from ~0.8 to ~0.2,
        # mimicking the spectral signature of exposed rock or bare soil.
        data[20:30, 20:30] -= 0.6
        
    # Georeference the raster to a small area in the Aravalli region.
    # Affine.translation sets the top-left corner; Affine.scale sets
    # the pixel size in degrees (negative y = north-up convention).
    transform = Affine.translation(72.0, 24.0) * Affine.scale(0.0001, -0.0001)

    # Write as a GeoTIFF with WGS-84 / geographic CRS
    with rasterio.open(
        filename,
        'w',
        driver='GTiff',
        height=height,
        width=width,
        count=1,           # Single band
        dtype=data.dtype,
        crs='+proj=latlong',
        transform=transform,
    ) as dst:
        dst.write(data, 1)  # Band index 1 (rasterio is 1-based)


# ============================================================
# generate_time_series_cube — Build a spatio-temporal NDVI cube
# ============================================================
def generate_time_series_cube():
    """
    Generates a 3-D NumPy array (timesteps × height × width) representing
    36 months of monthly NDVI observations over a 50×50 pixel grid.

    Simulation model per pixel:
        NDVI(t, y, x) = A · sin(2π·t/12 + φ(y,x))
                      + B · sin(4π·t/12)    ← second harmonic
                      + baseline(y,x)
                      + noise(t)

    A mining degradation event is injected into the central 10×10 patch
    starting at month 15, decaying linearly over 5 months to a flatline
    of ~0.1 (bare soil signature) for the remaining months.

    The cube is saved to `data/synthetic_aravalli_data.npy`.
    """
    timesteps, height, width = 36, 50, 50
    cube = np.zeros((timesteps, height, width), dtype=np.float32)
    
    time = np.arange(timesteps)  # [0, 1, 2, ..., 35]

    # ---- Base seasonality (applied uniformly before per-pixel shifts) ----
    # Primary term:  A=0.3, period=12 months, phase offset −π/2 (peak at month 7)
    # Secondary term: A=0.1, period=6 months (asymmetry — monsoon burst)
    # Constant offset 0.5 keeps NDVI in the healthy range [0.3, 0.8]
    base_seasonality = (0.3 * np.sin(2 * np.pi * time / 12 - np.pi / 2) +
                        0.1 * np.sin(4 * np.pi * time / 12) +
                        0.5)

    # ---- Per-pixel spatial heterogeneity ----
    # Each pixel gets its own slight baseline shift (soil/vegetation density)
    # and a small phase shift (local variation in monsoon onset).
    for y in range(height):
        for x in range(width):
            pixel_baseline = np.random.normal(0, 0.05)    # ±5 % soil variability
            pixel_phase    = np.random.normal(0, 0.2)     # ±0.2 month phase jitter

            # Apply per-pixel phase shift to both harmonics
            shifted_seasonality = (
                0.3 * np.sin(2 * np.pi * (time + pixel_phase) / 12 - np.pi / 2) +
                0.1 * np.sin(4 * np.pi * (time + pixel_phase) / 12) +
                0.5
            )

            # Final pixel time-series: seasonal + baseline + sensor noise
            cube[:, y, x] = (shifted_seasonality +
                             pixel_baseline +
                             np.random.normal(0, 0.03, timesteps))

    # ---- Inject gradual mining degradation ----
    # Target: central 10×10 patch (rows 20-29, cols 20-29).
    # The degradation does NOT appear instantly — it decays linearly
    # over `mining_duration` months to simulate realistic land clearing.
    mining_start    = 15   # Degradation begins at month 15
    mining_duration = 5    # Full degradation reached by month 20

    for y in range(20, 30):
        for x in range(20, 30):
            for t in range(mining_start, timesteps):
                if t < mining_start + mining_duration:
                    # Linear interpolation between healthy value and flatline
                    decay_factor = (t - mining_start) / mining_duration  # 0→1
                    target_val   = 0.1 + np.random.normal(0, 0.02)       # Bare soil
                    current_val  = cube[t, y, x]
                    cube[t, y, x] = (current_val * (1 - decay_factor) +
                                     target_val  *      decay_factor)
                else:
                    # After full degradation: flatline at ~0.1 with small noise
                    cube[t, y, x] = 0.1 + np.random.normal(0, 0.02)

    # Save the complete 3-D data cube to disk
    np.save('data/synthetic_aravalli_data.npy', cube)


# ============================================================
# Entry point — generate all three synthetic datasets
# ============================================================
if __name__ == "__main__":
    os.makedirs('data', exist_ok=True)  # Create the output directory if needed

    # 2023 baseline — clean healthy forest, no anomaly
    create_geotiff('data/past_forest.tif', base_value=0.8, add_anomaly=False)

    # 2025 present — same baseline with injected mining pit
    create_geotiff('data/present_forest.tif', base_value=0.8, add_anomaly=True)

    # 36-month NDVI cube for the LSTM autoencoder
    generate_time_series_cube()

    print("✅ Successfully generated 'past_forest.tif', 'present_forest.tif', "
          "and 'synthetic_aravalli_data.npy' in the data/ folder.")

