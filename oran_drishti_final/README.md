# 🌿 Oran-Drishti: The Sacred Grove Sentinel 

**A Digital Kshetrapal using Unsupervised AI to shield the Aravalli Orans.**

## How to Run (Local Proof of Concept)
1. Install requirements: `pip install -r requirements.txt`
2. Generate the local test data (Creates the GeoTIFFs and temporal data cube): `python data_simulator.py`
3. Launch the App: `streamlit run app.py`

## Architecture
1. **Ritu-Chakra:** Uses `scipy.fft` to extract natural seasonal heartbeat.
2. **Shuddhi Model:** Uses a `TensorFlow` LSTM-Autoencoder to dynamically learn forest health and flag high reconstruction errors as "Adharma" (illegal drift).
3. **Surya-Sakshi:** Uses `pysolar` to validate physical pit depth via sun angle.
