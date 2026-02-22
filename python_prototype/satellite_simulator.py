import numpy as np, cv2, datetime
from sklearn.ensemble import IsolationForest

SCENE_COLORS = {'forest': (34, 89, 34), 'urban': (128, 128, 128), 'water': (0, 100, 200), 'desert': (200, 180, 100), 'snow': (255, 255, 255), 'clouds': (200, 200, 200)}

class SatelliteSimulator:
    def __init__(self, width=512, height=512): self.width, self.height = width, height
    
    def generate_satellite_image(self, scene_type='forest'):
        img = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        color = SCENE_COLORS.get(scene_type, (100, 100, 100))
        img[:] = color
        noise = np.random.randint(-20, 20, img.shape)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        return img
    
    def add_anomaly(self, img, anomaly_type='mining', intensity=50):
        h, w = img.shape[:2]
        y1, y2 = h // 3, 2 * h // 3
        x1, x2 = w // 3, 2 * w // 3
        if anomaly_type == 'mining': img[y1:y2, x1:x2] = np.clip(img[y1:y2, x1:x2].astype(np.int16) - intensity, 0, 255).astype(np.uint8)
        return img
    
    def fetch_satellite_pair(self, anomaly=False):
        past = self.generate_satellite_image('forest')
        present = self.generate_satellite_image('forest')
        if anomaly: present = self.add_anomaly(present, 'mining', 60)
        return past, present

class AnomalyDetectionSimulator:
    def __init__(self): self.severity_map = {(70, 100): ('CRITICAL', '🔴'), (40, 70): ('WARNING', '🟠'), (0, 40): ('SAFE', '🟢')}
    
    def detect_anomalies(self, img_pair, score=None):
        past, present = img_pair
        diff = cv2.absdiff(past, present)
        score = np.mean(diff) if score is None else score
        severity, icon = next((v for (low, high), v in self.severity_map.items() if low <= score < high), ('SAFE', '🟢'))
        return {'score': score, 'severity': severity, 'icon': icon, 'timestamp': datetime.datetime.now()}
    
    def batch_detect(self, img_pairs):
        return [self.detect_anomalies(pair) for pair in img_pairs]
