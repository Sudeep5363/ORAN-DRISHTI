"""
realtime_stac_fetcher.py — Live Sentinel-2 Data via STAC API
=============================================================
Connects to the AWS Earth Search STAC API to fetch the latest
cloud-free Sentinel-2 L2A imagery for a given bounding box.

Cloud-Optimised GeoTIFF (COG) technology is used to perform
windowed HTTP Range reads directly from AWS S3, downloading
only the subset of pixels that fall within the target bounding
box — avoiding the need to download the full 800 MB+ scene.

Falls back gracefully to a synthetic NDVI array if network
access or S3 read permissions are unavailable (demo mode).
"""

import pystac_client
import rioxarray
import numpy as np
from shapely.geometry import box
import os


class SentinelRealTimeAPI:
    """
    STAC API client for real-time Sentinel-2 NDVI retrieval.

    Attributes:
        api_url    (str): STAC endpoint (AWS Earth Search, version 1).
        collection (str): Sentinel-2 Level-2A collection identifier.
        client          : Open pystac_client connection to the endpoint.
    """

    def __init__(self):
        self.api_url    = "https://earth-search.aws.element84.com/v1"
        self.collection = "sentinel-2-l2a"
        # Open a persistent STAC client connection (no credentials required)
        self.client     = pystac_client.Client.open(self.api_url)

    def get_sentinel2_data(self, bbox, date_range, max_cloud_cover=10):
        """
        Search for the best cloud-free Sentinel-2 image and compute NDVI.

        Strategy:
        1. Query the STAC API for scenes covering `bbox` in `date_range`
           with cloud cover below `max_cloud_cover` percent.
        2. Select the most recent qualifying scene.
        3. Open the Red (B04) and NIR (B08) COG bands via rioxarray,
           clipping to the bounding box to avoid full-scene downloads.
        4. Compute NDVI = (NIR − Red) / (NIR + Red) per pixel.
        5. Fall back to a synthetic array on any failure.

        Args:
            bbox (list):           [min_lon, min_lat, max_lon, max_lat] in WGS-84.
            date_range (str):      ISO 8601 interval, e.g. "2023-01-01/2023-03-30".
            max_cloud_cover (int): Cloud cover percentage threshold (default: 10 %).

        Returns:
            ndvi  (ndarray): 2-D float32 NDVI values in range [−1, 1].
            date  (str):     ISO 8601 acquisition datetime of the selected scene.
        """
        print(f"📡 Connecting to AWS Earth Search STAC API...")
        print(f"🔍 Searching for: {self.collection} | BBox: {bbox} | Date: {date_range}")

        # --- Step 1: Query the STAC catalogue ---
        search = self.client.search(
            collections=[self.collection],
            bbox=bbox,
            datetime=date_range,
            # Only return scenes with < max_cloud_cover % cloud coverage
            query={"eo:cloud_cover": {"lt": max_cloud_cover}},
            # Sort descending by acquisition date → items[0] is the most recent
            sort_by=[{"field": "properties.datetime", "direction": "desc"}]
        )

        items = search.item_collection()

        if len(items) == 0:
            raise ValueError(
                f"No images found for date range {date_range} "
                f"with < {max_cloud_cover}% clouds."
            )

        # --- Step 2: Select the best (most recent) item ---
        best_item = items[0]
        print(
            f"✅ Found Image: {best_item.id} | "
            f"Date: {best_item.properties['datetime']} | "
            f"Clouds: {best_item.properties['eo:cloud_cover']}%"
        )

        try:
            # --- Step 3: Load spectral bands via COG windowed read ---
            # Each asset URL points to a Cloud-Optimised GeoTIFF on AWS S3.
            # rioxarray sends HTTP Range requests to fetch only the tiles
            # that overlap the bounding box — NOT the entire 800 MB file.
            red_uri = best_item.assets["red"].href   # Sentinel-2 Band 4 (Red)
            nir_uri = best_item.assets["nir"].href   # Sentinel-2 Band 8 (NIR)

            # clip_box() restricts the spatial extent to our target area
            red_da = rioxarray.open_rasterio(red_uri).rio.clip_box(*bbox)
            nir_da = rioxarray.open_rasterio(nir_uri).rio.clip_box(*bbox)

            # Extract the first (and only) band as a NumPy float32 array
            red = red_da.values[0].astype(np.float32)
            nir = nir_da.values[0].astype(np.float32)

            # --- Step 4: Compute NDVI ---
            # NDVI = (NIR − Red) / (NIR + Red)
            # Values near +1 indicate dense healthy vegetation;
            # values near 0 indicate bare soil / rock;
            # negative values indicate water or built-up surfaces.
            denom = nir + red
            denom[denom == 0] = 0.0001  # Guard against division by zero

            ndvi = (nir - red) / denom

            return ndvi, best_item.properties['datetime']

        except Exception as e:
            print(f"⚠️ Error fetching/processing COGs: {e}")
            # --- Step 5: Graceful fallback for demo mode ---
            print("🔄 Switching to Synthetic Fallback for Demo Continuity...")
            return self._generate_synthetic_fallback(bbox), "2025-02-21T10:00:00Z (Simulated)"

    def _generate_synthetic_fallback(self, bbox):
        """
        Generates a plausible synthetic NDVI array when live data is unavailable.

        The output is a smooth 100×100 pixel pattern based on sine/cosine waves
        to mimic the spatial texture of real NDVI imagery, ensuring the rest of
        the ML pipeline has meaningful input even in offline / demo mode.

        Args:
            bbox (list): [min_lon, min_lat, max_lon, max_lat] (unused here,
                         but kept as a parameter for API consistency).

        Returns:
            ndvi (ndarray): Synthetic 100×100 float32 NDVI array.
        """
        width, height = 100, 100  # Small patch for fast rendering

        # Create a 2-D grid of coordinates
        x = np.linspace(0, 10, width)
        y = np.linspace(0, 10, height)
        X, Y = np.meshgrid(x, y)

        # Smooth undulating pattern: base 0.6 ± 0.2 amplitude
        ndvi = 0.6 + 0.2 * np.sin(X) * np.cos(Y)

        return ndvi.astype(np.float32)


# Usage example (commented out — not executed on import):
# api = SentinelRealTimeAPI()
# ndvi, date = api.get_sentinel2_data([72.5, 24.5, 72.55, 24.55], "2023-01-01/2023-12-31")

