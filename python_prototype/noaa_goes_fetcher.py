import streamlit as st, requests, cv2, numpy as np, datetime
from PIL import Image
from sklearn.ensemble import IsolationForest
from io import BytesIO

ERROR_RESPONSE = {'success': False, 'image': None, 'image_pil': None, 'timestamp': None, 'resolution': None, 'error': '', 'satellite': ''}
URLs = {'GOES16': 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/FD/GEOCOLOR/latest.jpg', 'GOES17': 'https://cdn.star.nesdis.noaa.gov/GOES17/ABI/FD/GEOCOLOR/latest.jpg'}

class NOAAGOESFetcher:
    @staticmethod
    @st.cache_resource
    def get_session():
        session = requests.Session()
        session.headers.update({'User-Agent': 'Mozilla/5.0 (Satellite Monitor)'})
        return session

    @staticmethod
    def fetch_satellite_image(satellite):
        try:
            if satellite not in URLs: return {**ERROR_RESPONSE, 'error': 'Invalid satellite'}
            session = NOAAGOESFetcher.get_session()
            r = session.get(URLs[satellite], timeout=10)
            r.raise_for_status()
            img = Image.open(BytesIO(r.content)).convert('RGB')
            arr = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
            return {'success': True, 'image': arr, 'image_pil': img, 'timestamp': datetime.datetime.utcnow(), 'resolution': f'{arr.shape[1]}x{arr.shape[0]}', 'satellite': satellite, 'error': None}
        except requests.exceptions.Timeout: return {**ERROR_RESPONSE, 'error': 'Connection timeout', 'satellite': satellite}
        except requests.exceptions.ConnectionError: return {**ERROR_RESPONSE, 'error': 'Connection failed', 'satellite': satellite}
        except Exception as e: return {**ERROR_RESPONSE, 'error': str(e), 'satellite': satellite}

class ImageComparator:
    @staticmethod
    def calculate_difference_map(past, present):
        if past is None or present is None: return None
        diff = cv2.absdiff(past, present)
        gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        return clahe.apply(gray)

    @staticmethod
    def generate_heatmap(diff_map):
        return cv2.applyColorMap(np.uint8(diff_map), cv2.COLORMAP_HOT)

    @staticmethod
    def get_change_percentage(diff_map, threshold=30):
        changed_pixels = np.sum(diff_map > threshold)
        return (changed_pixels / diff_map.size) * 100

class AnomalyDetector:
    @staticmethod
    def detect_anomalies(diff_map, contamination=0.1):
        flat = diff_map.flatten().reshape(-1, 1)
        iso = IsolationForest(contamination=min(contamination, 0.5), random_state=42)
        pred = iso.fit_predict(flat)
        has_anomaly = np.sum(pred == -1) > (len(pred) * 0.05)
        return {'has_anomaly': has_anomaly, 'threshold': 30, 'pixel_count': len(flat), 'mean_diff': np.mean(diff_map), 'max_diff': np.max(diff_map), 'change_percentage': ImageComparator.get_change_percentage(diff_map)}

    @staticmethod
    def generate_alert(detection):
        score = detection['change_percentage']
        return {'type': 'ALERT' if detection['has_anomaly'] else 'SAFE', 'message': 'Alert: Change detected' if detection['has_anomaly'] else 'No Change', 'icon': '🔴' if detection['has_anomaly'] else '🟢', 'description': f'System detected {score:.2f}% change in satellite imagery' if detection['has_anomaly'] else 'No significant changes detected', 'score': score, 'color': 'red' if detection['has_anomaly'] else 'green'}
