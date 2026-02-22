import ee, numpy as np, datetime
from sklearn.ensemble import IsolationForest

FOREST_LOCS = [{'name': 'Western Ghats', 'lat': 13.3673, 'lon': 74.4865, 'bbox': (13.0, 74.0, 13.7, 75.0)}, {'name': 'Aravalli', 'lat': 25.2048, 'lon': 75.8721, 'bbox': (24.5, 75.0, 26.0, 77.0)}, {'name': 'Amazon', 'lat': -3.4653, 'lon': -62.2159, 'bbox': (-5.0, -65.0, -2.0, -60.0)}]

class GEEForestMonitor:
    def __init__(self): self.ee_initialized = False
    
    def initialize_gee(self):
        try:
            ee.Initialize()
            self.ee_initialized = True
            return True
        except: return False
    
    def create_aoi_geometry(self, bbox):
        return ee.Geometry.Rectangle([bbox[1], bbox[0], bbox[3], bbox[2]])
    
    def fetch_sentinel2_images(self, bbox, days_back=30):
        aoi = self.create_aoi_geometry(bbox)
        end_date = ee.Date(datetime.datetime.now())
        start_date = end_date.advance(-days_back, 'day')
        s2 = ee.ImageCollection('COPERNICUS/S2_SR').filterBounds(aoi).filterDate(start_date, end_date).filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)).sort('system:time_start')
        if s2.size().getInfo() == 0: return None, None
        img = s2.first()
        return img.select(['B4', 'B8']).sampleRectangle(aoi, 100), img.get('system:time_start').getInfo()

class DeforestationDetector:
    @staticmethod
    def calculate_ndvi_difference(past, present):
        return past - present
    
    @staticmethod
    def detect_anomalies(ndvi_diff):
        flat = ndvi_diff.flatten().reshape(-1, 1)
        iso = IsolationForest(contamination=0.1, random_state=42)
        pred = iso.fit_predict(flat)
        return (pred == -1) & (ndvi_diff.flatten() < -0.1)
    
    @staticmethod
    def generate_alert(detection):
        loss_pct = np.sum(detection) / len(detection) * 100
        return {'type': 'ALERT' if loss_pct > 5 else 'SAFE', 'message': f'Forest Loss: {loss_pct:.2f}%' if loss_pct > 5 else 'No Loss', 'icon': '🔴' if loss_pct > 5 else '🟢', 'description': f'Detected forest loss in {loss_pct:.2f}% of area', 'score': loss_pct}
