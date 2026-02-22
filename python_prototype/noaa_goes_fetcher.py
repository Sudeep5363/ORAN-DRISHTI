import streamlit as st, requests, numpy as np, datetime
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
            arr = np.array(img)
            return {'success': True, 'image': arr, 'image_pil': img, 'timestamp': datetime.datetime.utcnow(), 'resolution': f'{arr.shape[1]}x{arr.shape[0]}', 'satellite': satellite, 'error': None}
        except requests.exceptions.Timeout: return {**ERROR_RESPONSE, 'error': 'Connection timeout', 'satellite': satellite}
        except requests.exceptions.ConnectionError: return {**ERROR_RESPONSE, 'error': 'Connection failed', 'satellite': satellite}
        except Exception as e: return {**ERROR_RESPONSE, 'error': str(e), 'satellite': satellite}

class ImageComparator:
    @staticmethod
    def calculate_difference_map(past, present):
        if past is None or present is None: return None
        if past.shape != present.shape:
            h = min(past.shape[0], present.shape[0])
            w = min(past.shape[1], present.shape[1])
            past = past[:h, :w]
            present = present[:h, :w]

        diff = np.abs(present.astype(np.int16) - past.astype(np.int16)).astype(np.uint8)
        if diff.ndim == 3:
            gray = np.mean(diff, axis=2)
        else:
            gray = diff
        return gray.astype(np.uint8)

    @staticmethod
    def generate_heatmap(diff_map):
        if diff_map is None:
            return None
        img = Image.fromarray(np.uint8(diff_map), mode='L')
        heat = Image.fromarray(np.array(img))
        return np.array(Image.merge('RGB', (
            heat,
            Image.eval(heat, lambda x: int(x * 0.4)),
            Image.eval(heat, lambda x: int(x * 0.1))
        )))

    @staticmethod
    def get_change_percentage(diff_map, threshold=30):
        changed_pixels = np.sum(diff_map > threshold)
        return (changed_pixels / diff_map.size) * 100

class AnomalyDetector:
    @staticmethod
    def detect_anomalies(diff_map, contamination=0.1):
        if diff_map is None:
            return {'has_anomaly': False, 'threshold': 30, 'pixel_count': 0, 'mean_diff': 0.0, 'max_diff': 0.0, 'change_percentage': 0.0}

        row_stride = max(1, diff_map.shape[0] // 256)
        col_stride = max(1, diff_map.shape[1] // 256)
        reduced = diff_map[::row_stride, ::col_stride]
        flat = reduced.flatten().astype(np.float32)

        max_points = 4096
        if flat.size > max_points:
            rng = np.random.default_rng(42)
            indices = rng.choice(flat.size, size=max_points, replace=False)
            sample = flat[indices].reshape(-1, 1)
        else:
            sample = flat.reshape(-1, 1)

        effective_contamination = max(0.001, min(float(contamination), 0.5))
        iso = IsolationForest(
            n_estimators=60,
            max_samples=min(sample.shape[0], 1024),
            contamination=effective_contamination,
            random_state=42,
            n_jobs=1
        )
        pred = iso.fit_predict(sample)
        has_anomaly = np.sum(pred == -1) > (len(pred) * 0.05)
        return {'has_anomaly': has_anomaly, 'threshold': 30, 'pixel_count': len(flat), 'mean_diff': np.mean(diff_map), 'max_diff': np.max(diff_map), 'change_percentage': ImageComparator.get_change_percentage(diff_map)}

    @staticmethod
    def generate_alert(detection):
        score = detection['change_percentage']
        return {'type': 'ALERT' if detection['has_anomaly'] else 'SAFE', 'message': 'Alert: Change detected' if detection['has_anomaly'] else 'No Change', 'icon': '🔴' if detection['has_anomaly'] else '🟢', 'description': f'System detected {score:.2f}% change in satellite imagery' if detection['has_anomaly'] else 'No significant changes detected', 'score': score, 'color': 'red' if detection['has_anomaly'] else 'green'}
