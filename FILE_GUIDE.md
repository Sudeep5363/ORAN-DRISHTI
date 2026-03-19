# Repository Structure & File Guide

## 📁 Overview

A clean, professional repository structure for campus placement showcase:

```
ORAN-DRISHTI/
├── 📄 Core Documentation
│   ├── README.md                 # Main project overview (comprehensive)
│   ├── GETTING_STARTED.md        # Quick start guide for new developers
│   ├── ARCHITECTURE.md           # Deep dive into algorithms & design
│   ├── DEPLOYMENT.md             # Production deployment guide
│   ├── CHANGELOG.md              # Version history & roadmap
│   ├── CONTRIBUTING.md           # Contribution guidelines
│   ├── LICENSE                   # MIT License
│   └── metadata.json             # Project metadata
│
├── 📦 Configuration
│   ├── package.json              # Node dependencies & scripts
│   ├── tsconfig.json             # TypeScript configuration
│   ├── vite.config.ts            # Vite bundler config
│   ├── .gitignore                # Git ignore patterns
│   └── .env.example              # Environment template
│
├── 💻 Frontend Source Code
│   └── src/
│       ├── App.tsx               # Main React component
│       ├── main.tsx              # Entry point
│       ├── index.css             # Global styles
│       ├── components/
│       │   ├── Map.tsx           # Interactive satellite map
│       │   └── ChartPanel.tsx    # Time-series visualizations
│       ├── utils/
│       │   ├── modelEngine.ts    # ⭐ ML algorithms (Ritu-Chakra, Shuddhi, Surya-Sakshi)
│       │   ├── geospatialEngine.ts
│       │   └── dataSimulator.ts
│       └── lib/
│           └── utils.ts
│
├── 🐍 Python Backends (Reference Implementations)
│   ├── oran_drishti_final/
│   │   ├── app.py                # Streamlit dashboard (POC)
│   │   ├── model_engine.py       # LSTM autoencoder algorithms
│   │   ├── data_simulator.py     # Generate test GeoTIFF data
│   │   ├── requirements.txt      # Python dependencies
│   │   └── README.md
│   │
│   ├── oran_drishti_realtime/
│   │   ├── app.py                # Real-time STAC API integration
│   │   ├── realtime_stac_fetcher.py
│   │   ├── trishul_ml_engine.py
│   │   ├── requirements.txt
│   │   └── README.md
│   │
│   └── python_prototype/
│       ├── app.py
│       ├── model_engine.py
│       ├── satellite_simulator.py
│       └── [other experimental files]
│
└── 📦 Build Outputs (Not in git)
    └── dist/                     # Production build (created by `npm run build`)
```

---

## 🎯 Key Files to Know

### For Campus Placement

**Start with these files:**

1. **[README.md](README.md)** – Read first! Explains the entire project, problem, solution, tech stack
2. **[GETTING_STARTED.md](GETTING_STARTED.md)** – Installation and first-time setup
3. **[src/utils/modelEngine.ts](src/utils/modelEngine.ts)** – **Most important code!** Contains core ML algorithms

### For Deeper Understanding

4. **[ARCHITECTURE.md](ARCHITECTURE.md)** – Algorithm details, diagrams, mathematical formulas
5. **[package.json](package.json)** – Project metadata, dependencies, scripts
6. **src/components/[Map.tsx, ChartPanel.tsx]** – Frontend implementation

### For Deployment

7. **[DEPLOYMENT.md](DEPLOYMENT.md)** – How to deploy to production
8. **[CONTRIBUTING.md](CONTRIBUTING.md)** – How others can contribute

---

## 📊 File Purposes at a Glance

| Category | Files | Purpose |
|----------|-------|---------|
| **Documentation** | README, GETTING_STARTED, ARCHITECTURE, DEPLOYMENT | Explain project to recruiters & developers |
| **Configuration** | package.json, tsconfig.json, vite.config.ts | Build & environment setup |
| **Frontend Code** | src/** | React UI, mapping, visualization |
| **Backend Code** | oran_drishti_*/** | Python ML algorithms (reference) |
| **Meta** | metadata.json, LICENSE | Project information |
| **Git** | .gitignore, .env.example | Version control setup |

---

## 🚀 Development Workflow

```bash
# 1. Set up environment
npm install

# 2. Start development server
npm run dev

# 3. Make changes to files in src/
# (Auto-reload on save)

# 4. Type checking
npm run lint

# 5. Build for production
npm run build

# 6. Preview production build
npm run preview
```

---

## 🔍 Finding Specific Features

**Want to find...?**

- 🎨 **UI Components** → Look in `src/components/`
- 🧠 **ML Algorithms** → Look in `src/utils/modelEngine.ts`
- 🗺️ **Mapping Logic** → Look in `src/components/Map.tsx`
- 📊 **Charts & Visualization** → Look in `src/components/ChartPanel.tsx`
- 🛰️ **Satellite data handling** → Look in `src/utils/geospatialEngine.ts`
- ⚙️ **Configuration** → Look in `package.json`, `.env.example`
- 📚 **Documentation** → Look in root `.md` files
- 🐍 **Python backend** → Look in `oran_drishti_*` folders

---

## 📝 Code Quality

All files support:
- ✅ **TypeScript** – Full type safety in frontend
- ✅ **Linting** – `npm run lint` validates code
- ✅ **Modular design** – Components are reusable
- ✅ **Documentation** – Comments explain complex logic
- ✅ **Best practices** – Follows React & web standards

---

## 🎓 Learning Path for Recruiters/Interviewers

**5-minute overview:**
- Read: README.md (Overview & Architecture sections)

**15-minute deep dive:**
- Read: GETTING_STARTED.md
- Skim: src/utils/modelEngine.ts
- Look at: ARCHITECTURE.md with diagrams

**30-minute technical deep dive:**
- Read: ARCHITECTURE.md completely
- Study: src/utils/modelEngine.ts code
- Review: package.json dependencies
- Check: src/components/ implementation

**Full project understanding:**
- Run the app locally: `npm run dev`
- Play with the dashboard
- Read all documentation files
- Explore backend: Python implementations
- Study DEPLOYMENT.md

---

## 📦 Dependencies Summary

**Frontend critical packages:**
- `react@19` – UI framework
- `leaflet` + `react-leaflet` – Mapping
- `recharts` – Charts
- `suncalc` – Solar calculations
- `tailwindcss` – Styling
- `typescript` – Type safety

**Build tools:**
- `vite` – Fast bundler
- `vitejs/plugin-react` – React support

**Optional backend:**
- `python 3.8+` – Data science
- `tensorflow` – Deep learning
- `streamlit` – Data dashboards

---

## ✨ Clean Repository Checklist

Your repository now includes:

- ✅ Professional README with full architecture
- ✅ Quick start guide
- ✅ Detailed algorithm documentation
- ✅ Deployment guides for multiple platforms
- ✅ Contributing guidelines
- ✅ MIT License
- ✅ Changelog & roadmap
- ✅ Proper .gitignore
- ✅ Environment template (.env.example)
- ✅ Updated package.json metadata
- ✅ This file guide

**👉 Ready for campus placements! Push to GitHub and share with recruiters.**

---

## 🔗 Quick Links

- GitHub Issues: `yourusername/ORAN-DRISHTI/issues`
- GitHub Discussions: `yourusername/ORAN-DRISHTI/discussions`
- Deployment: See [DEPLOYMENT.md](DEPLOYMENT.md)
- Contributing: See [CONTRIBUTING.md](CONTRIBUTING.md)
- Getting Help: See [GETTING_STARTED.md](GETTING_STARTED.md#-need-help)
