# 🌿 Oran-Drishti: The Sacred Grove Sentinel

> **Unsupervised AI system for detecting illegal land-use drift (mining) inside protected sacred groves ("Orans") of the Aravalli mountain range, Rajasthan, India.**

Oran-Drishti distinguishes between **natural seasonal vegetation change** (phenology) and **permanent structural damage** caused by illegal mining — without requiring any labelled ground-truth data.

---

## Table of Contents

- [Overview](#overview)
- [How It Works — The Three-Filter Pipeline](#how-it-works--the-three-filter-pipeline)
- [System Architecture](#system-architecture)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
  - [Web Dashboard (TypeScript / React)](#1-web-dashboard-typescript--react)
  - [Python Proof-of-Concept](#2-python-proof-of-concept-oran_drishti_final)
  - [Real-Time Satellite Feed](#3-real-time-satellite-feed-oran_drishti_realtime)
- [Environment Variables](#environment-variables)
- [Key Concepts Glossary](#key-concepts-glossary)
- [Contributing](#contributing)

---

## Overview

**Orans** are sacred community forests traditionally protected in Rajasthan. They serve as biodiversity hotspots and community water-recharge zones. Illegal quarrying and open-cast mining threaten these groves and are difficult to detect with visual inspection alone because seasonal leaf-fall can mimic the vegetation loss signature of real deforestation.

**Oran-Drishti** solves this by layering three independent validation filters on top of satellite NDVI (Normalised Difference Vegetation Index) time-series data:

| Filter | Sanskrit Name | Purpose |
|--------|---------------|---------|
| 1 | **Ritu-Chakra** | Model expected seasonal cycle (FFT harmonic analysis) |
| 2 | **Shuddhi** | Detect anomalies that deviate from that model (LSTM autoencoder) |
| 3 | **Surya-Sakshi** | Confirm mining pits via solar shadow physics |

Only zones flagged by **all three filters** raise an "Adharma Alert", minimising false positives.

---

## How It Works — The Three-Filter Pipeline

```
Satellite Imagery (GeoTIFF / Sentinel-2)
            │
            ▼
  ┌─────────────────────┐
  │  Drift Calculation  │  Present − Past (pixel-by-pixel)
  └─────────┬───────────┘
            │
            ▼
  ┌─────────────────────┐
  │  Filter 1           │  Ritu-Chakra — Harmonic Analysis (FFT)
  │  (Seasonality)      │  Extracts natural annual/biannual cycles
  │                     │  and produces an "expected NDVI" baseline
  └─────────┬───────────┘
            │  Residual signal (observed − expected)
            ▼
  ┌─────────────────────┐
  │  Filter 2           │  Shuddhi Model — LSTM Autoencoder
  │  (Anomaly Score)    │  Trained on the "healthy" first half of the
  │                     │  time-series; high reconstruction error = anomaly
  └─────────┬───────────┘
            │  Candidate anomalous pixels
            ▼
  ┌─────────────────────┐
  │  Filter 3           │  Surya-Sakshi — Solar Physics Validator
  │  (Shadow Depth)     │  Confirms mining pits by checking whether
  │                     │  shadow geometry matches known pit depths
  └─────────┬───────────┘
            │
            ▼
     🚨 Adharma Alert
   (Red zones on output map)
```

### Filter 1 — Ritu-Chakra (Harmonic Analysis)

Vegetation follows an annual cycle driven by monsoon and temperature. Oran-Drishti models this cycle using **Fast Fourier Transform (FFT)**:

1. The full NDVI time-series is transformed into the frequency domain.
2. The DC component plus the **10 lowest-frequency harmonics** are kept; all others are zeroed out (low-pass filter).
3. An inverse FFT reconstructs the "expected seasonality" curve.

Any deviation **beyond** this expected curve is a candidate anomaly — it cannot be explained by normal phenology.

**Implementation:** `src/utils/modelEngine.ts → performHarmonicAnalysis()` (TypeScript/FFT.js) and `oran_drishti_final/model_engine.py → extract_harmonics()` (Python/SciPy).

---

### Filter 2 — Shuddhi Model (LSTM Autoencoder)

An **LSTM (Long Short-Term Memory) autoencoder** is trained **unsupervised** on the first 50% of the time-series (assumed to be the healthy/baseline period):

```
Input sequence ──► LSTM Encoder (32 units) ──► Latent vector
                                                      │
                                                      ▼
Output sequence ◄── LSTM Decoder (32 units) ◄── Latent vector
```

- **Training loss** minimises reconstruction error on healthy data.
- At inference, the model reconstructs the **full** series, including the suspected anomaly period.
- Where reconstruction error is high (> 0.15 threshold), the model has "seen something it has never seen before" — a structural change.

**Implementation:** `src/utils/modelEngine.ts → trainAndPredictAnomalies()` (TensorFlow.js, runs in browser) and `oran_drishti_final/model_engine.py → build_lstm_autoencoder()` (Keras/TensorFlow).

---

### Filter 3 — Surya-Sakshi (Solar Physics Validator)

Mining pits have a characteristic **shadow depth**. Given:
- The precise geographic coordinates of the pixel
- The exact date and time of the satellite pass
- The solar altitude angle calculated with **SunCalc** / **pysolar**

Oran-Drishti estimates whether the observed dark region is consistent with an open-cast mine at the target location. The anomaly is confirmed only if:
- Solar altitude > 30°, **AND**
- Anomaly score > 0.5

This rules out false positives caused by cloud shadows or long winter shadows on hillslopes.

**Implementation:** `src/utils/modelEngine.ts → calculateSunPosition() / validateShadowDepth()` (TypeScript/SunCalc) and `oran_drishti_final/model_engine.py → calculate_sun_angle()` (Python/pysolar).

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      ORAN-DRISHTI ECOSYSTEM                      │
├────────────────────┬─────────────────────┬───────────────────────┤
│   Web Frontend     │  Python POC          │  Real-Time Backend    │
│  (TypeScript/React)│  (oran_drishti_final)│ (oran_drishti_realtime│
│                    │                      │                       │
│  App.tsx           │  app.py              │  app.py               │
│  ├─ Map.tsx        │  model_engine.py     │  trishul_ml_engine.py │
│  ├─ ChartPanel.tsx │  data_simulator.py   │  realtime_stac_fetcher│
│  └─ modelEngine.ts │                      │                       │
│     geospatial     │  Streamlit UI        │  AWS STAC API         │
│     Engine.ts      │  Matplotlib charts   │  Sentinel-2 COGs      │
│                    │                      │  rioxarray lazy reads  │
├────────────────────┴─────────────────────┴───────────────────────┤
│                      Data Layer                                   │
│  • GeoTIFF rasters (user-uploaded or generated by data_simulator) │
│  • AWS Earth Search STAC (sentinel-2-l2a collection)             │
│  • Synthetic NDVI time-series (for demo/testing)                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
ORAN-DRISHTI/
│
├── src/                          # React/TypeScript web frontend
│   ├── App.tsx                   # Main app — GeoTIFF upload, analysis UI
│   ├── components/
│   │   ├── Map.tsx               # Leaflet map with sacred grove zones
│   │   └── ChartPanel.tsx        # Recharts visualisations (NDVI, FFT, LSTM)
│   ├── utils/
│   │   ├── modelEngine.ts        # FFT harmonics + LSTM autoencoder + Solar
│   │   ├── geospatialEngine.ts   # GeoTIFF I/O, drift calc, Isolation Forest
│   │   └── dataSimulator.ts      # Synthetic NDVI time-series generator
│   ├── lib/utils.ts              # Shared helper utilities
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Global styles
│
├── oran_drishti_final/           # Python proof-of-concept (static GeoTIFFs)
│   ├── app.py                    # Streamlit dashboard
│   ├── model_engine.py           # FFT, LSTM autoencoder, Solar (Python)
│   ├── data_simulator.py         # Generate synthetic past/present .tif files
│   ├── requirements.txt          # Python dependencies
│   └── README.md                 # Setup guide
│
├── oran_drishti_realtime/        # Real-time satellite variant (AWS STAC)
│   ├── app.py                    # Streamlit real-time dashboard
│   ├── realtime_stac_fetcher.py  # AWS Earth Search STAC API client
│   ├── trishul_ml_engine.py      # Online ML pipeline
│   ├── requirements.txt          # Python dependencies (includes STAC libs)
│   └── README.md                 # Setup guide
│
├── python_prototype/             # Original prototype (also includes GEE/NOAA)
│   ├── app.py                    # Original Streamlit app
│   ├── model_engine.py           # Core algorithms (original)
│   ├── data_simulator.py         # Data generation
│   ├── satellite_simulator.py    # Satellite orbit simulation
│   ├── gee_sentinel2_forest.py   # Google Earth Engine integration
│   ├── app_noaa.py               # NOAA GOES-16 variant
│   ├── noaa_goes_fetcher.py      # NOAA satellite data fetcher
│   ├── requirements.txt
│   └── README.md
│
├── index.html                    # HTML entry point for the web app
├── package.json                  # Node.js / npm configuration
├── vite.config.ts                # Vite bundler configuration
├── tsconfig.json                 # TypeScript configuration
├── metadata.json                 # Project metadata
├── .env.example                  # Template for environment variables
└── .gitignore                    # Git ignore rules
```

---

## Tech Stack

### Web Frontend (TypeScript / React)

| Technology | Version | Role |
|---|---|---|
| React | 19.0.0 | UI framework |
| TypeScript | 5.8 | Type-safe JavaScript |
| Vite | 6.2 | Dev server & bundler |
| TailwindCSS | 4.1 | Utility-first CSS |
| Recharts | 3.7 | NDVI / FFT / LSTM charts |
| React-Leaflet | 5.0 | Interactive sacred grove map |
| TensorFlow.js | 4.22 | LSTM autoencoder (in-browser ML) |
| FFT.js | 4.0 | Fast Fourier Transform |
| GeoTIFF | 3.0 | Parse raster satellite imagery |
| SunCalc | 1.9 | Solar altitude / azimuth calculation |

### Python Backends

| Technology | Role |
|---|---|
| Streamlit | Interactive dashboard UI |
| TensorFlow / Keras | LSTM autoencoder training |
| SciPy | FFT harmonic analysis |
| Rasterio / rioxarray | GeoTIFF and COG raster I/O |
| pysolar | Precise solar angle calculation |
| pystac-client | AWS Earth Search STAC API |
| scikit-learn | Isolation Forest, preprocessing |
| NumPy / Pandas | Numerical and tabular data |
| Matplotlib | Raster visualisation |

---

## Quick Start

### 1. Web Dashboard (TypeScript / React)

The web frontend runs entirely in the browser — no server or Python needed.

**Prerequisites:** Node.js ≥ 18

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Type-check without building
npm run lint
```

**Using the dashboard:**

1. Upload a **Past GeoTIFF** (e.g., `forest_2023.tif`) using the left panel.
2. Upload a **Present GeoTIFF** (e.g., `forest_2025.tif`) using the right panel.
3. Click **"Run Shuddhi AI (Analyse Drift)"** — the three-filter pipeline runs in your browser.
4. Inspect the output map — **red zones** indicate Adharma Alerts (likely mining).
5. Click any pixel on the result map to see its NDVI trend over time.

> **No GeoTIFFs?** Use the Python `data_simulator.py` to generate synthetic test files (see below).

---

### 2. Python Proof-of-Concept (`oran_drishti_final`)

A self-contained Streamlit dashboard using local GeoTIFF files.

**Prerequisites:** Python ≥ 3.10

```bash
cd oran_drishti_final

# Create and activate a virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Generate synthetic test GeoTIFFs (creates past_forest.tif & present_forest.tif)
python data_simulator.py

# Launch the Streamlit dashboard (http://localhost:8501)
streamlit run app.py
```

**What you will see:**

- Side-by-side visualisation of past and present raster imagery
- Drift calculation heatmap (Present − Past)
- FFT harmonic curve overlaid on the raw NDVI time-series
- LSTM reconstruction error chart with anomaly threshold
- Solar altitude gauge (Surya-Sakshi validator)
- Final Adharma Alert map

---

### 3. Real-Time Satellite Feed (`oran_drishti_realtime`)

Downloads **live Sentinel-2 imagery** directly from AWS Earth Search (no account needed) and runs the full pipeline on the latest data.

**Prerequisites:** Python ≥ 3.10

```bash
cd oran_drishti_realtime

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

streamlit run app.py
```

The app will:
1. Query the **AWS Earth Search STAC API** for Sentinel-2 scenes over the Aravalli region (BBox: 72.5°E–72.6°E, 24.5°N–24.6°N).
2. Lazily download only the relevant spatial window (avoiding full 800 MB+ tile downloads).
3. Run the same three-filter pipeline on live data.
4. Fall back to synthetic data if the AWS API is unreachable.

> **Note:** First run may take 1–2 minutes while Sentinel-2 Cloud Optimised GeoTIFFs are fetched.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values as required:

```bash
cp .env.example .env
```

| Variable | Purpose | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini AI API key (optional AI features) | No |
| `APP_URL` | Self-referential URL for OAuth callbacks | No |

The web app runs fully without any API keys. The `.env` variables are used only if optional AI narration features are enabled.

---

## Key Concepts Glossary

| Term | Meaning |
|------|---------|
| **Oran** | Sacred community grove in Rajasthan; legally protected forest |
| **NDVI** | Normalised Difference Vegetation Index — satellite measure of vegetation health; ranges −1 to +1 |
| **GeoTIFF** | Georeferenced raster image format used for satellite data |
| **Phenology** | Natural seasonal lifecycle of vegetation (spring growth, winter dormancy) |
| **Adharma Alert** | An alert raised by all three filters — indicates likely illegal activity |
| **Ritu-Chakra** | Sanskrit for "seasonal cycle"; the FFT harmonic filter |
| **Shuddhi** | Sanskrit for "purification"; the LSTM anomaly detection model |
| **Surya-Sakshi** | Sanskrit for "sun witness"; the solar physics validator |
| **STAC** | SpatioTemporal Asset Catalog — open standard API for satellite imagery |
| **COG** | Cloud-Optimised GeoTIFF — raster format that supports HTTP range requests |
| **Isolation Forest** | Unsupervised ML algorithm for outlier detection |

---

## Contributing

1. Fork the repository and create a feature branch.
2. Make your changes (frontend in `src/`, Python in the appropriate sub-directory).
3. For TypeScript changes, run `npm run lint` to check for type errors.
4. For Python changes, ensure existing Streamlit apps still launch correctly.
5. Open a Pull Request describing what you changed and why.

---

*Built for the Technex '26 Hackathon — Aravalli Intelligence Challenge.*
