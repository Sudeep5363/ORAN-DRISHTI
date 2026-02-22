# 🌿 Oran-Drishti: The Sacred Grove Sentinel (Real-Time Edition)

**A Digital Kshetrapal using Unsupervised AI and Live Satellite Data to shield the Aravalli Orans.**

## 🚀 The "Eliminatory-Proof" Architecture
This version of Oran-Drishti connects **LIVE** to the AWS Earth Search STAC API (SpatioTemporal Asset Catalog). It does not rely on static files. It fetches the latest Sentinel-2 imagery of the Aravallis on the fly.

## ⚙️ Setup & Execution

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the Real-Time Dashboard:**
   ```bash
   streamlit run app.py
   ```

## 🧠 The "Trishul" Architecture (Implemented)

1. **Real-Time Ingestion (`realtime_stac_fetcher.py`):**
   - Connects to `https://earth-search.aws.element84.com/v1`.
   - Queries `sentinel-2-l2a` collection.
   - Uses `rioxarray` for lazy-loading and windowed reads (only downloads the Aravalli BBox, not the whole tile).

2. **Ritu-Chakra (Harmonics):**
   - Extracts seasonal frequencies using FFT.

3. **Shuddhi Model (LSTM Autoencoder):**
   - Trains unsupervised on the fetched "Healthy" baseline.
   - Detects anomalies in the "Live" image.

4. **Surya-Sakshi (Solar Physics):**
   - Validates mining pits using `pysolar` and the exact timestamp of the satellite overpass.

---
*Built for Technex '26 | Team Idea Igniters*
