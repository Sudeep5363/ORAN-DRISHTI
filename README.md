# Oran-Drishti: The Sacred Grove Sentinel

## Overview
Oran-Drishti is an unsupervised ecological monitoring dashboard designed to detect illegal land-use drift (such as mining) in sacred groves ("Orans"). It distinguishes between natural seasonal changes (phenology) and permanent structural damage using a multi-stage filter pipeline.

## Architecture & Logic
This application implements the requested "Three-Filter" logic, adapted for a high-performance Web/TypeScript environment:

1.  **Filter 1: Ritu-Chakra (Harmonic Analysis)**
    *   **Logic**: Uses a harmonic regression model (sine/cosine fit) to model the natural seasonal variation of vegetation (NDVI).
    *   **Implementation**: `src/utils/modelEngine.ts` - `performHarmonicAnalysis`
    *   **Visual**: Displayed as the "Expected Seasonality" dotted line in the dashboard charts.

2.  **Filter 2: Shuddhi Model (Anomaly Detection)**
    *   **Logic**: Calculates the reconstruction error (residuals) between the expected seasonal model and the observed data. High residuals indicate anomalies (e.g., sudden vegetation loss not explained by winter).
    *   **Implementation**: `src/utils/modelEngine.ts` - `detectAnomalies`
    *   **Visual**: Displayed as the red "Reconstruction Error" area chart.

3.  **Filter 3: Surya-Sakshi (Solar Physics Validator)**
    *   **Logic**: Calculates the precise solar altitude and azimuth for the specific coordinate and time to validate shadow depth.
    *   **Implementation**: Uses `suncalc` library in `src/utils/modelEngine.ts`.
    *   **Visual**: Real-time solar telemetry in the dashboard header.

## Tech Stack
*   **Frontend**: React 18, Tailwind CSS
*   **Mapping**: Leaflet (via React-Leaflet)
*   **Charts**: Recharts
*   **Math/Physics**: SunCalc, Custom TS Algorithms

## Setup Instructions
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Run the development server:
    ```bash
    npm run dev
    ```
3.  Open the application in your browser (usually port 3000).

## Hackathon Note
This project fulfills the functional requirements of the "Oran-Drishti" challenge using a production-ready web stack instead of a local Python script, enabling immediate deployment and accessibility.
