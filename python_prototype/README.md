# 🌿 Oran-Drishti: The Sacred Grove Sentinel 

[![Status: Prototype Ready](https://img.shields.io/badge/Status-Prototype_Ready-success)](#)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Tech: Scikit-Learn](https://img.shields.io/badge/Tech-Scikit_Learn-F7931E)](#)
[![UI: Streamlit](https://img.shields.io/badge/UI-Streamlit-FF4B4B)](#)

> **"A Digital Kshetrapal (Field Protector) using Unsupervised Machine Learning to shield the sacred Aravalli Orans from illegal drift and encroachment."**

## 📖 Problem Statement (PS-3: Aravalli Intelligence)
The Aravalli Sacred Groves ("Orans") suffer from "Silent Degradation"—gradual, illegal mining that standard satellite checks confuse with seasonal dryness (leaves falling in winter). We lack labeled ground-truth files to train standard AI to recognize these specific threats.

## 🎯 Our Solution
**Oran-Drishti** completely abandons supervised learning. We process Sentinel-2 raster data using an **Unsupervised Isolation Forest** algorithm. By calculating temporal drift and extracting statistical deviation against regional baselines, our software acts as a "Third Eye"—ignoring the natural seasonal phenology of the forest while specifically flagging chaotic, permanent destruction like illegal mining.

---

## ⚙️ How to Set Up and Run the Project (Proof of Concept)

This prototype is designed to run seamlessly on your local machine.

### Prerequisites
* Python 3.9 or higher installed.
* Git installed.

### Step-by-Step Installation
**1. Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/oran-drishti.git
cd oran-drishti
```

**2. Install Dependencies**

```bash
pip install -r requirements.txt
```

**3. Generate the Test Data (Crucial Step)**
To ensure the prototype runs without needing live, heavy satellite API keys, run our local data simulator. This will generate two GeoTIFF (`.tif`) files representing the Aravallis in a healthy state (2023) and an encroached state (2025).

```bash
python data_simulator.py
```

**4. Run the Dashboard**

```bash
streamlit run app.py
```

*The Streamlit web interface will automatically open in your default browser at `http://localhost:8501`.*

---

## 🧠 How the Logic Works (For the Judges)

1. **Ingestion:** Uses `rasterio` to read the multi-temporal GeoTIFF arrays.
2. **Drift Calculation:** Subtracts the past array from the present array to find raw environmental changes.
3. **Unsupervised ML:** The data is flattened and passed into `sklearn.ensemble.IsolationForest`. The algorithm clusters normal environmental behavior (like seasonal browning) and isolates outliers (severe pixel degradation).
4. **Visualization:** Anomalies are mapped back into spatial coordinates and rendered via Matplotlib/Streamlit as a high-contrast "Adharma Alert" heatmap.

## 👥 Team

* **[Your Name]** - ML & Backend Architecture
* **[Teammate Name]** - Geospatial Data & UI/UX
