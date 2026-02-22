# app_noaa.py - NOAA GOES-16 Real-Time Monitor

import streamlit as st
from datetime import datetime
import numpy as np
import cv2
import warnings
warnings.filterwarnings('ignore')

try:
    from noaa_goes_fetcher import NOAAGOESFetcher, ImageComparator, AnomalyDetector
    NOAA_AVAILABLE = True
except ImportError as e:
    NOAA_AVAILABLE = False
    NOAA_ERROR = str(e)

st.set_page_config(page_title="NOAA GOES-16 Monitor", page_icon="🛰️", layout="wide")

CSS = """<style>
.stApp { background: linear-gradient(135deg, #0a1428 0%, #1a2847 50%, #0d1b2a 100%); color: #e0e0e0; }
.header-title { text-align: center; background: linear-gradient(90deg, #00d4ff 0%, #0099ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 3em; font-weight: bold; }
.subtitle { text-align: center; color: #00d4ff; font-size: 1.3em; }
.status-line { text-align: center; color: #90ee90; font-size: 0.95em; font-family: 'Courier New', monospace; }
.alert-box { border-radius: 10px; padding: 20px; margin: 15px 0; border-left: 5px solid; font-weight: bold; }
.alert-active { background: rgba(255, 68, 68, 0.15); border-left-color: #ff4444; color: #ff6666; }
.alert-safe { background: rgba(68, 255, 68, 0.15); border-left-color: #44ff44; color: #66ff66; }
.section-header { color: #00d4ff; font-size: 1.3em; font-weight: bold; margin: 25px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid rgba(0, 212, 255, 0.3); text-transform: uppercase; }
.metric-container { background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 153, 255, 0.05) 100%); border: 2px solid #00d4ff; border-radius: 8px; padding: 15px; margin: 10px 0; box-shadow: 0 0 15px rgba(0, 212, 255, 0.2); }
.metric-value { color: #00ff00; font-size: 1.8em; font-weight: bold; font-family: 'Courier New', monospace; }
@keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.7; } }
.live-indicator { display: inline-block; animation: blink 1s infinite; }
</style>"""
st.markdown(CSS, unsafe_allow_html=True)

if "noaa_initialized" not in st.session_state:
    st.session_state.noaa_initialized = True
    st.session_state.previous_image = None
    st.session_state.current_image = None
    st.session_state.last_fetch_time = None
    st.session_state.last_refresh = datetime.now()
    st.session_state.live_monitoring = True
    st.session_state.monitoring_history = []
    st.session_state.detection_results = None
    st.session_state.alert_data = None

col1, col2, col3 = st.columns([1, 2, 1])

with col2:
    st.markdown('<div class="header-title">🛰️ NOAA GOES-16</div>', unsafe_allow_html=True)
    st.markdown('<div class="subtitle">REAL-TIME SATELLITE MONITOR</div>', unsafe_allow_html=True)

status_html = '<div class="status-line"><span class="live-indicator">🔴</span> LIVE MONITORING ACTIVE | GEOCOLOR CHANNEL | AUTO-REFRESH: 10s</div>'
st.markdown(status_html, unsafe_allow_html=True)

with st.sidebar:
    st.markdown("### ⚙️ SYSTEM SETTINGS")
    
    satellite = st.radio(
        "Select Satellite:",
        ["GOES-16 (East)", "GOES-17 (West)"],
        help="Choose satellite region"
    )
    satellite_key = "GOES16" if "GOES-16" in satellite else "GOES17"
    
    st.markdown("### 🔍 DETECTION SETTINGS")
    sensitivity = st.slider(
        "Anomaly Sensitivity",
        0.0, 1.0, 0.6,
        help="Higher = more sensitive to changes"
    )
    
    st.markdown("### ⏱️ REFRESH SETTINGS")
    auto_refresh_enabled = st.checkbox(
        "Enable Auto-Refresh",
        value=True,
        help="Auto-refresh every 10 seconds"
    )
    
    if auto_refresh_enabled:
        st.info("🟢 Auto-refresh ENABLED (10 seconds)")
    
    st.markdown("---")
    st.markdown("### 📊 SESSION STATS")
    st.metric("Total Reads", len(st.session_state.monitoring_history))
    st.metric("Last Update", st.session_state.last_fetch_time.strftime("%H:%M:%S") if st.session_state.last_fetch_time else "N/A")

if not NOAA_AVAILABLE:
    st.error(f"NOAA module not available: {NOAA_ERROR}")
    st.stop()

st.markdown('<div class="section-header">🌍 LIVE SATELLITE IMAGERY</div>', unsafe_allow_html=True)

fetch_col1, fetch_col2 = st.columns([1, 1])

with fetch_col1:
    fetch_button = st.button("🔄 Fetch Latest Image", width="stretch", key="fetch_btn")

with fetch_col2:
    status_placeholder = st.empty()

if fetch_button or auto_refresh_enabled:
    with st.spinner("⏳ Fetching latest satellite image..."):
        result = NOAAGOESFetcher.fetch_satellite_image(satellite_key)
        
        if result['success']:
            st.session_state.previous_image = st.session_state.current_image
            st.session_state.current_image = result['image']
            st.session_state.last_fetch_time = result['timestamp']
            
            status_placeholder.success(f"✓ {result['satellite']} | {result['resolution']} | {result['timestamp'].strftime('%H:%M:%S UTC')}")
        else:
            status_placeholder.error(f"✗ {result['error']}")

if st.session_state.current_image is not None:
    st.image(
        cv2.cvtColor(st.session_state.current_image, cv2.COLOR_BGR2RGB),
        caption=f"Current Satellite Image ({st.session_state.last_fetch_time.strftime('%H:%M:%S UTC')})",
        width="stretch"
    )
else:
    st.info("💡 Click 'Fetch Latest Image' to load satellite data")

if st.session_state.current_image is not None and st.session_state.previous_image is not None:
    st.markdown('<div class="section-header">📊 CHANGE ANALYSIS</div>', unsafe_allow_html=True)
    
    with st.spinner("🔍 Analyzing changes..."):
        difference_map = ImageComparator.calculate_difference_map(
            st.session_state.previous_image,
            st.session_state.current_image
        )
        
        if difference_map is not None:
            detection_results = AnomalyDetector.detect_anomalies(difference_map, sensitivity)
            st.session_state.detection_results = detection_results
            
            alert = AnomalyDetector.generate_alert(detection_results)
            st.session_state.alert_data = alert
            
            monitoring_entry = {
                'timestamp': datetime.now(),
                'has_change': alert['type'] == 'ALERT',
                'score': alert['score'],
                'change_pct': detection_results['change_percentage']
            }
            st.session_state.monitoring_history.append(monitoring_entry)
            if len(st.session_state.monitoring_history) > 60:
                st.session_state.monitoring_history = st.session_state.monitoring_history[-60:]
            
            alert_class = "alert-active" if alert['type'] == 'ALERT' else "alert-safe"
            alert_html = f'''
            <div class="alert-box {alert_class}">
                <div style="font-size: 1.5em; margin-bottom: 10px;">{alert['icon']} {alert['message']}</div>
                <div>{alert['description']}</div>
                <div style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;">Score: {alert['score']:.1f}/100</div>
            </div>
            '''
            st.markdown(alert_html, unsafe_allow_html=True)
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.markdown('<div class="metric-container"><div class="metric-label">Change %</div><div class="metric-value">{:.2f}%</div></div>'.format(detection_results['change_percentage']), unsafe_allow_html=True)
            
            with col2:
                st.markdown('<div class="metric-container"><div class="metric-label">Anomaly Score</div><div class="metric-value">{:.1f}</div></div>'.format(alert['score']), unsafe_allow_html=True)
            
            with col3:
                st.markdown('<div class="metric-container"><div class="metric-label">Mean Diff</div><div class="metric-value">{:.1f}</div></div>'.format(detection_results['mean_diff']), unsafe_allow_html=True)
            
            with col4:
                st.markdown('<div class="metric-container"><div class="metric-label">Max Diff</div><div class="metric-value">{:.1f}</div></div>'.format(detection_results['max_diff']), unsafe_allow_html=True)
            
            st.markdown('<div class="section-header">📈 DETAILED ANALYSIS</div>', unsafe_allow_html=True)
            
            vis_col1, vis_col2 = st.columns(2)
            
            with vis_col1:
                diff_bgr = cv2.cvtColor(difference_map, cv2.COLOR_GRAY2BGR)
                st.image(
                    cv2.cvtColor(diff_bgr, cv2.COLOR_BGR2RGB),
                    caption="Difference Map (White = Change)",
                    width="stretch"
                )
            
            with vis_col2:
                heatmap = ImageComparator.generate_heatmap(difference_map)
                if heatmap is not None:
                    st.image(
                        cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB),
                        caption="Heat Map (Red = High Change)",
                        width="stretch"
                    )
            
            with st.expander("🔬 Technical Details"):
                st.write(f"""
                **Detection Results:**
                - Has Anomaly: {detection_results['has_anomaly']}
                - Threshold: {detection_results['threshold']} pixels
                - Total Pixels: {detection_results['pixel_count']}
                - Mean Difference: {detection_results['mean_diff']:.2f}
                - Max Difference: {detection_results['max_diff']:.2f}
                - Change Percentage: {detection_results['change_percentage']:.3f}%
                
                **Alert Status:**
                - Type: {alert['type']}
                - Message: {alert['message']}
                - Score: {alert['score']:.1f}/100
                """)

if auto_refresh_enabled:
    current_time = datetime.now()
    time_since_refresh = (current_time - st.session_state.last_refresh).total_seconds()
    
    refresh_col1, refresh_col2, refresh_col3 = st.columns(3)
    
    with refresh_col1:
        st.metric("Status", "🟢 LIVE", delta="Active")
    with refresh_col2:
        st.metric("Last Update", current_time.strftime("%H:%M:%S"))
    with refresh_col3:
        st.metric("Refresh", "10s")
    
    if time_since_refresh < 10:
        remaining = 10 - int(time_since_refresh)
        progress = st.progress(1 - (remaining / 10))
        st.info(f"⏱️ Next refresh in {remaining} seconds...")

if st.session_state.monitoring_history:
    st.markdown('<div class="section-header">📋 MONITORING HISTORY</div>', unsafe_allow_html=True)
    
    hist_col1, hist_col2, hist_col3 = st.columns(3)
    
    with hist_col1:
        alerts_count = sum(1 for h in st.session_state.monitoring_history if h['has_change'])
        st.metric("Total Alerts", alerts_count)
    
    with hist_col2:
        avg_score = np.mean([h['score'] for h in st.session_state.monitoring_history])
        st.metric("Avg Score", f"{avg_score:.1f}")
    
    with hist_col3:
        max_score = max([h['score'] for h in st.session_state.monitoring_history])
        st.metric("Peak Score", f"{max_score:.1f}")

st.markdown("---")
st.markdown("""
<div style='text-align: center; color: #666; font-size: 0.9em; padding: 20px;'>
    <p style='color: #00d4ff; font-weight: bold;'>🛰️ NOAA GOES-16 Real-Time Monitor</p>
    <p style='color: #a0a0a0;'>Live Satellite Imagery with Isolation Forest Anomaly Detection</p>
    <p style='color: #666; font-size: 0.85em;'>Auto-Refresh: 10 seconds | Powered by Streamlit & Scikit-learn</p>
</div>
""", unsafe_allow_html=True)
