# 🌿 Oran-Drishti: The Sacred Grove Sentinel

> **Unsupervised AI-powered ecological monitoring dashboard detecting illegal land-use drift in sacred groves using satellite imagery and advanced signal processing.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue)](https://react.dev/)

---

## 🎯 Problem Statement

Sacred groves ("Orans") in the Aravalli mountains face severe threats from illegal mining, deforestation, and land-use conversion. Current monitoring relies on manual surveys and reactive reporting, often too late to prevent ecological damage. **Oran-Drishti** provides **real-time, continuous, unsupervised monitoring** to detect illegal activity through satellite data analysis.

---

## ✨ Key Features

✅ **Real-Time Satellite Monitoring** – Processes live Sentinel-2 imagery from AWS STAC API  
✅ **Three-Stage Anomaly Detection** – Distinguishes natural seasonal changes from illegal activity  
✅ **Solar Physics Validation** – Validates damage signatures using precise solar angle calculations  
✅ **Interactive Web Dashboard** – Responsive, production-grade UI with maps and time-series charts  
✅ **ML-Powered Insights** – Harmonic analysis + LSTM autoencoders for pattern recognition  
✅ **Geospatial Analytics** – Fine-grained satellite analysis with interactive mapping  

---

## 🏗️ Architecture

### The Three-Filter Pipeline

**1. Ritu-Chakra (Harmonic Analysis)**
- Models natural seasonal vegetation patterns using harmonic regression (sine/cosine fits)
- Extracts the underlying "heartbeat" of forest health
- Creates expected seasonality baseline for comparison

**2. Shuddhi Model (Anomaly Detection)**
- Calculates reconstruction error between observed NDVI and expected seasonal model
- Uses LSTM autoencoders (in Python backend) for dynamic anomaly learning
- Flags high-error anomalies as potential illegal activity ("Adharma")

**3. Surya-Sakshi (Solar Physics Validator)**
- Calculates precise solar altitude and azimuth for the given coordinates and timestamp
- Validates shadow depth and surface damage signatures
- Eliminates false positives from natural shadows or temporal artifacts

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Tailwind CSS, Motion.dev |
| **Mapping** | Leaflet, React-Leaflet |
| **Charts** | Recharts |
| **Math/Physics** | SunCalc, custom TS algorithms, FFT.js |
| **Backend (Optional)** | Python, TensorFlow, Streamlit |
| **Satellite Data** | AWS STAC API, Sentinel-2 |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Modern web browser

### Installation & Running

```bash
# Clone the repository
git clone https://github.com/yourusername/ORAN-DRISHTI.git
cd ORAN-DRISHTI

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
ORAN-DRISHTI/
├── src/
│   ├── components/          # React components (Map, Charts, UI)
│   ├── utils/
│   │   ├── modelEngine.ts   # Core ML algorithms (harmonic analysis, anomaly detection)
│   │   ├── geospatialEngine.ts
│   │   └── dataSimulator.ts
│   ├── App.tsx              # Main React app
│   └── main.tsx
├── oran_drishti_final/      # Python backend (POC with LSTM autoencoders)
├── oran_drishti_realtime/   # Python backend (Live STAC API integration)
├── python_prototype/        # Experimental algorithms
├── package.json
├── vite.config.ts
└── README.md
```

---

## 💡 How It Works

1. **Data Ingestion**: Fetches satellite imagery from AWS STAC or uses simulated data
2. **Feature Extraction**: Computes NDVI (Normalized Difference Vegetation Index)
3. **Harmonic Modeling**: Fits harmonic regression to extract seasonal patterns (Ritu-Chakra)
4. **Anomaly Detection**: Calculates residuals; flags high error as potential damage (Shuddhi Model)
5. **Validation**: Cross-validates using solar physics (Surya-Sakshi)
6. **Visualization**: Displays results on interactive map with time-series charts
7. **Alerting**: Generates alerts for human experts to investigate

---

## 🔧 Development

### Linting & Type Checking
```bash
npm run lint  # TypeScript type checking
```

### Environment Variables
Create a `.env` file if using API keys:
```env
VITE_API_KEY=your_key_here
```

---

## 📊 Use Case: Deployed Scenarios

- **Real-Time Monitoring** → Detects mining activity within hours
- **Seasonal Analysis** → Tracks forest health across years
- **Alert Generation** → Notifies authorities of suspicious changes
- **Evidence Compilation** → Provides satellite data for legal proceedings

---

## 🤝 Team & Contributing

This project was developed as a conservation-tech initiative to protect sacred groves. Contributions welcome!

**Key Contributors:**
- Model Architecture: [Your Name]
- Frontend Development: [Your Name]
- Data Integration: [Your Name]

---

## 📜 License

This project is licensed under the **MIT License** – see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Aravalli Ecology Forum** for domain expertise
- **AWS Earth Search** for satellite STAC API access
- **Open Source Community** – SunCalc, TensorFlow, React, Leaflet

---

## 📞 Support & Contact

For questions, suggestions, or partnership opportunities:
- Email: your.email@example.com
- GitHub Issues: [Create an issue](https://github.com/yourusername/ORAN-DRISHTI/issues)

---

**Built with 💚 for environmental conservation**
