import os
import numpy as np
import rasterio
from rasterio.transform import Affine

def create_synthetic_geotiff(filename, base_value, add_anomaly=False):
    # Image dimensions
    width, height = 500, 500
    
    # Create base forest data (e.g., NDVI-like values scaled up)
    data = np.full((height, width), base_value, dtype=np.float32)
    
    # Add natural "seasonal" noise to represent normal forest variance
    noise = np.random.normal(0, 500, (height, width))
    data += noise
    
    # Inject the "Illegal Mining / Land Drift" anomaly
    if add_anomaly:
        # Simulate a massive drop in vegetation in a specific region
        for y in range(200, 300):
            for x in range(250, 350):
                data[y, x] = base_value - 4000 # Artificial destruction
                
    # Define arbitrary spatial coordinates for the Aravalli region
    transform = Affine.translation(72.0, 24.0) * Affine.scale(0.0001, -0.0001)
    
    # Write the GeoTIFF file
    with rasterio.open(
        filename,
        'w',
        driver='GTiff',
        height=height,
        width=width,
        count=1,
        dtype=data.dtype,
        crs='+proj=latlong',
        transform=transform,
    ) as dst:
        dst.write(data, 1)

if __name__ == "__main__":
    # Ensure data directory exists
    os.makedirs('data', exist_ok=True)
    
    print("Generating synthetic Aravalli GeoTIFFs...")
    create_synthetic_geotiff('data/forest_2023_NIR.tif', base_value=7000, add_anomaly=False)
    create_synthetic_geotiff('data/forest_2025_NIR.tif', base_value=7000, add_anomaly=True)
    print("✅ Success! 'forest_2023_NIR.tif' and 'forest_2025_NIR.tif' created in the 'data/' folder.")
