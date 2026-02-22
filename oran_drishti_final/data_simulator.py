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
    
    # Generate healthy Ritu-Chakra (Sine wave seasonality) for all pixels
    time = np.arange(timesteps)
    seasonality = 0.5 * np.sin(2 * np.pi * time / 12) + 0.5 
    
    for y in range(height):
        for x in range(width):
            cube[:, y, x] = seasonality + np.random.normal(0, 0.05, timesteps)
            
    # Inject "flatline" drift (mining) starting at month 15 in the center patch
    for t in range(15, timesteps):
        cube[t, 20:30, 20:30] = 0.1 + np.random.normal(0, 0.02)
        
    np.save('data/synthetic_aravalli_data.npy', cube)

if __name__ == "__main__":
    os.makedirs('data', exist_ok=True)
    create_geotiff('data/past_forest.tif', base_value=0.8, add_anomaly=False)
    create_geotiff('data/present_forest.tif', base_value=0.8, add_anomaly=True)
    generate_time_series_cube()
    print("✅ Successfully generated 'past_forest.tif', 'present_forest.tif', and 'synthetic_aravalli_data.npy' in the data/ folder.")
