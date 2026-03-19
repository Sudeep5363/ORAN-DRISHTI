# Changelog

All notable changes to Oran-Drishti project will be documented in this file.

## [1.0.0] - 2025-03-19

### Added
- ✨ Initial Oran-Drishti release with full three-filter pipeline
- Interactive web dashboard with React 19 and Tailwind CSS
- Real-time satellite imagery integration via AWS STAC API
- Ritu-Chakra: Harmonic analysis for seasonal pattern modeling
- Shuddhi Model: LSTM-based anomaly detection
- Surya-Sakshi: Solar physics validator for false positive elimination
- Leaflet-based interactive mapping with satellite overlay
- Time-series visualization with Recharts
- TypeScript type safety across codebase
- Python backend implementations (POC and real-time variants)

### Features
- Multi-source satellite data support
- Automatic alerts for detected anomalies
- Customizable monitoring regions
- Historical analysis and trend detection
- Solar telemetry real-time display

### Technology
- Frontend: React 19, TypeScript, Vite
- Mapping: Leaflet + React-Leaflet
- Math: SunCalc, FFT.js, Custom algorithms
- Backend: Python with TensorFlow (optional)

### Documentation
- Comprehensive README with architecture details
- Contributing guidelines
- MIT License

---

## Future Roadmap

### [1.1.0] - Planned
- [ ] Advanced ML models (Graph Neural Networks for spatial correlation)
- [ ] Multi-region monitoring dashboard
- [ ] Email/SMS alert notifications
- [ ] API for third-party integrations
- [ ] Mobile-responsive UI improvements
- [ ] Historical data export (CSV, GeoJSON)

### [1.2.0] - Planned
- [ ] Integration with Indian forest department databases
- [ ] Community reporting system
- [ ] Machine learning model versioning
- [ ] Performance optimization for large datasets
- [ ] Kubernetes deployment support

### [2.0.0] - Vision
- [ ] Full cloud deployment infrastructure
- [ ] Automated model retraining pipeline
- [ ] Multi-satellite support (Landsat, MODIS, etc.)
- [ ] AI-powered legal document generation
- [ ] Blockchain-based evidence integrity

---

## Release Notes

### How to Update

```bash
# Pull latest changes
git pull origin main

# Reinstall dependencies (if needed)
npm install

# Start the latest version
npm run dev
```

---

## Support Version Matrix

| Version | Status | End of Life |
|---------|--------|------------|
| 1.0.0   | Active | 2026-03-19 |
| 0.x.x   | EOL    | 2025-01-01 |

---

For more details, see [CONTRIBUTING.md](CONTRIBUTING.md)
