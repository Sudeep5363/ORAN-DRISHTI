import streamlit as st
import matplotlib.pyplot as plt
import numpy as np
from model_engine import load_raster, calculate_drift, detect_anomalies_unsupervised

# --- UI Configuration ---
st.set_page_config(page_title="Oran-Drishti", layout="wide")
st.title("🌿 Oran-Drishti: The Sacred Grove Sentinel")
st.markdown("### Unsupervised Aravalli Intelligence System")
st.caption("Detecting Land-Use Drift without ground-truth labels using Isolation Forests.")

# --- Sidebar Controls ---
st.sidebar.header("System Controls")
analyze_btn = st.sidebar.button("Run Shuddhi AI (Analyze Drift)")

# --- Main Logic ---
# In a real scenario, these files exist in your 'data' folder
path_past = "data/forest_2023_NIR.tif"
path_present = "data/forest_2025_NIR.tif"

col1, col2 = st.columns(2)

try:
    past_img, meta = load_raster(path_past)
    present_img, _ = load_raster(path_present)
    
    with col1:
        st.subheader("Temporal Data (Past)")
        fig, ax = plt.subplots()
        im = ax.imshow(past_img, cmap='Greens')
        plt.axis('off')
        st.pyplot(fig)

    with col2:
        st.subheader("Temporal Data (Present)")
        fig2, ax2 = plt.subplots()
        im2 = ax2.imshow(present_img, cmap='Greens')
        plt.axis('off')
        st.pyplot(fig2)

    if analyze_btn:
        with st.spinner("Processing Spectral Harmonics & Unsupervised ML..."):
            # 1. Calculate Drift
            drift = calculate_drift(past_img, present_img)
            
            # 2. Run Unsupervised ML
            anomalies = detect_anomalies_unsupervised(drift)
            
            st.success("Analysis Complete! Anomalous Drift Detected.")
            
            st.markdown("---")
            st.subheader("🚨 Adharma Alert: Anomalous Degradation Map")
            
            # 3. Visualize the Anomalies (Red over the present image)
            fig3, ax3 = plt.subplots(figsize=(10, 6))
            ax3.imshow(present_img, cmap='gray') # Background
            
            # Overlay anomalies in pure red
            anomaly_overlay = np.ma.masked_where(anomalies == 0, anomalies)
            ax3.imshow(anomaly_overlay, cmap='hsv', alpha=0.7)
            
            plt.axis('off')
            st.pyplot(fig3)
            
            st.error("**Explanation:** The highlighted zones show statistical deviation in structural integrity (mining/encroachment), completely bypassing seasonal phenology.")

except FileNotFoundError:
    st.warning("⚠️ Waiting for satellite GeoTIFF files. Please place 'forest_2023_NIR.tif' and 'forest_2025_NIR.tif' in the 'data/' folder to begin.")
