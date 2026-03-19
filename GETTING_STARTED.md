# Oran-Drishti - Getting Started Guide

## 🎯 Overview

This guide will help you understand, set up, and run **Oran-Drishti** for the first time.

---

## 📋 Prerequisites

- **Node.js** 18 or higher
- **npm** 9 or higher
- A modern web browser (Chrome, Firefox, Edge, Safari)
- (Optional) **Python 3.8+** if running backend services

Check your versions:

```bash
node --version    # Should be v18.0.0 or higher
npm --version     # Should be 9.0.0 or higher
```

---

## 🚀 Installation Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/ORAN-DRISHTI.git
cd ORAN-DRISHTI
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages listed in `package.json`.

### Step 3: Set Up Environment (Optional)

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- API keys
- Satellite data sources
- Default coordinates

### Step 4: Start Development Server

```bash
npm run dev
```

You should see:
```
VITE v5.2.13 ready in 234 ms
➜  Local:   http://localhost:3000/
➜  Network: http://0.0.0.0:3000/
```

### Step 5: Open in Browser

Navigate to: **http://localhost:3000**

---

## 🎨 Using the Dashboard

### Map Navigation
- **Click** to select regions
- **Scroll** to zoom in/out
- **Drag** to pan

### Time Series Analysis
- Select date ranges to see historical trends
- Hover over charts for detailed values
- Red areas indicate anomalies

### Solar Data
- Check real-time solar altitude and azimuth
- Validate shadow calculations

---

## 🐍 Running Python Backend (Optional)

### For Final POC Version

```bash
cd oran_drishti_final
pip install -r requirements.txt
python data_simulator.py
streamlit run app.py
```

### For Real-Time STAC Version

```bash
cd oran_drishti_realtime
pip install -r requirements.txt
streamlit run app.py
```

---

## 📂 Project Structure Quick Reference

```
src/
├── App.tsx                 # Main React component
├── components/
│   ├── Map.tsx            # Interactive map
│   └── ChartPanel.tsx     # Time-series visualizations
└── utils/
    ├── modelEngine.ts     # ML algorithms (Ritu-Chakra, Shuddhi, Surya-Sakshi)
    ├── geospatialEngine.ts
    └── dataSimulator.ts
```

---

## 🔧 Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Type check with TypeScript |
| `npm run clean` | Remove build artifacts |

---

## 🐛 Troubleshooting

### Port 3000 Already in Use

```bash
# Use a different port
npm run dev -- --port 3001
```

### Dependencies Not Installing

```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Satellite Data Not Loading

- Check internet connection
- Verify AWS STAC API is accessible
- Check `.env` configuration for correct API key
- Try using data simulator mode

---

## 📚 Next Steps

1. **Read the [README.md](README.md)** – Understand the full architecture
2. **Check [CONTRIBUTING.md](CONTRIBUTING.md)** – Learn how to contribute
3. **Explore the code** – Deep dive into `src/utils/modelEngine.ts`
4. **Run the Python backend** – Experiment with ML algorithms
5. **Modify demo data** – Edit `src/utils/dataSimulator.ts`

---

## 🆘 Need Help?

- **GitHub Issues**: [Create an issue](https://github.com/yourusername/ORAN-DRISHTI/issues)
- **Discussions**: [Start a discussion](https://github.com/yourusername/ORAN-DRISHTI/discussions)
- **Email**: your.email@example.com

---

## 🎓 Learning Resources

- [React Documentation](https://react.dev/)
- [Leaflet Maps](https://leafletjs.com/)
- [SunCalc Library](https://github.com/mourner/suncalc)
- [Satellite Imagery Basics](https://sentinel.esa.int/)

---

**Ready to protect sacred groves? Happy coding!** 🌿
