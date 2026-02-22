import os
import numpy as np
import rasterio
from rasterio.transform import Affine

def create_geotiff(filename, base_value, add_anomaly=False):
    width, height = 50, 50
    data = np.full((height, width), base_value, dtype=np.float32)
    noise = np.random.normal(0, 0.1, (height, width))
    data += noise
    
    if add_anomaly:
        # Inject an illegal mining pit (Adharma)
        data[20:30, 20:30] -= 0.6 
        
    transform = Affine.translation(72.0, 24.0) * Affine.scale(0.0001, -0.0001)
    with rasterio.open(
        filename, 'w', driver='GTiff', height=height, width=width,
        count=1, dtype=data.dtype, crs='+proj=latlong', transform=transform,
    ) as dst:
        dst.write(data, 1)

def generate_time_series_cube():
    # 36 months, 50x50 spatial grid
    timesteps, height, width = 36, 50, 50
    cube = np.zeros((timesteps, height, width), dtype=np.float32)
    
    time = np.arange(timesteps)
    
    # Simulate realistic phenology (Asymmetric Sine Wave + Baseline Variance)
    # Peak in Monsoon (Month 7-9), Trough in Summer (Month 4-6)
    # Formula: A * sin(wt + phi) + B
    # We add a second harmonic to make it asymmetric (more realistic)
    
    base_seasonality = 0.3 * np.sin(2 * np.pi * time / 12 - np.pi/2) + \
                       0.1 * np.sin(4 * np.pi * time / 12) + 0.5
                       
    # Generate spatial heterogeneity
    for y in range(height):
        for x in range(width):
            # Each pixel has a slightly different baseline (soil type, vegetation density)
            pixel_baseline = np.random.normal(0, 0.05)
            pixel_phase = np.random.normal(0, 0.2) # Slight shift in season start
            
            # Apply phase shift
            shifted_seasonality = 0.3 * np.sin(2 * np.pi * (time + pixel_phase) / 12 - np.pi/2) + \
                                  0.1 * np.sin(4 * np.pi * (time + pixel_phase) / 12) + 0.5
            
            cube[:, y, x] = shifted_seasonality + pixel_baseline + np.random.normal(0, 0.03, timesteps)
            
    # Inject "Gradual Degradation" (Mining) starting at month 15 in the center patch
    # Instead of instant flatline, it decays over 3-4 months
    
    mining_start = 15
    mining_duration = 5
    
    for y in range(20, 30):
        for x in range(20, 30):
            for t in range(mining_start, timesteps):
                if t < mining_start + mining_duration:
                    # Linear decay
                    decay_factor = (t - mining_start) / mining_duration
                    target_val = 0.1 + np.random.normal(0, 0.02)
                    current_val = cube[t, y, x]
                    cube[t, y, x] = current_val * (1 - decay_factor) + target_val * decay_factor
                else:
                    # Flatline after full degradation
                    cube[t, y, x] = 0.1 + np.random.normal(0, 0.02)
        
    np.save('data/synthetic_aravalli_data.npy', cube)

if __name__ == "__main__":
    os.makedirs('data', exist_ok=True)
    create_geotiff('data/past_forest.tif', base_value=0.8, add_anomaly=False)
    create_geotiff('data/present_forest.tif', base_value=0.8, add_anomaly=True)
    generate_time_series_cube()
    print("✅ Successfully generated 'past_forest.tif', 'present_forest.tif', and 'synthetic_aravalli_data.npy' in the data/ folder.")
