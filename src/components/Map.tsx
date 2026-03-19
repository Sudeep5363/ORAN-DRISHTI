// ============================================================
// Map.tsx — Leaflet Interactive Map Component
//
// Renders the five Aravalli monitoring zones as colour-coded
// circle markers on an OpenStreetMap base layer:
//   • Green  → Sacred grove (healthy / protected)
//   • Red    → Mining drift zone (Adharma alert)
//
// Clicking a marker selects the zone; the map smoothly flies to
// its coordinates and the parent component updates the chart panel.
// ============================================================

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ZoneData } from '../utils/dataSimulator';

// Fix for Leaflet's default marker icon URL resolution breaking under
// Vite/Webpack bundlers (icon images are not re-exported via the bundle).
// We override the icon URLs to use the CDN copies instead.
// Note: we use CircleMarkers in this component, but keeping this patch
// here prevents subtle breakage if regular Markers are added later.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  zones:          ZoneData[];           // All monitoring zones to display
  selectedZoneId: string | null;        // ID of the currently active zone
  onSelectZone:   (id: string) => void; // Callback when user clicks a zone
}

// ============================================================
// RecenterMap — internal helper component
// ============================================================
// Leaflet's imperative `flyTo` API must be called inside a
// component that has access to the map instance via `useMap()`.
// This tiny component re-triggers the animation whenever the
// target coordinates change (i.e., when a new zone is selected).
const RecenterMap = ({ lat, lon }: { lat: number; lon: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], 14); // Zoom level 14 ≈ neighbourhood scale
  }, [lat, lon, map]);
  return null; // Renders nothing; purely a side-effect component
};

// ============================================================
// MapComponent — main export
// ============================================================
const MapComponent: React.FC<MapProps> = ({ zones, selectedZoneId, onSelectZone }) => {
  // Centre the initial view on the selected zone, or on Grove Alpha
  // as the default when nothing is selected yet.
  const selectedZone = zones.find(z => z.id === selectedZoneId);
  const centerLat    = selectedZone ? selectedZone.lat : 24.5854;
  const centerLon    = selectedZone ? selectedZone.lon : 73.7125;

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-lg border border-stone-200">
      <MapContainer 
        center={[centerLat, centerLon]} 
        zoom={13}                          // Zoom 13 shows ~2 km radius
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}             // Allow mouse-wheel zoom
      >
        {/* OpenStreetMap tiles — free, no API key required */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Smoothly pan/zoom to the selected zone whenever it changes */}
        {selectedZone && <RecenterMap lat={selectedZone.lat} lon={selectedZone.lon} />}

        {/* Render one CircleMarker per monitoring zone */}
        {zones.map((zone) => (
          <CircleMarker
            key={zone.id}
            center={[zone.lat, zone.lon]}
            pathOptions={{
              // Green for sacred groves, red for mining drift zones
              color:       zone.type === 'sacred_grove' ? '#22c55e' : '#ef4444',
              fillColor:   zone.type === 'sacred_grove' ? '#4ade80' : '#f87171',
              fillOpacity: 0.6,
              // Thicker border on the selected zone to highlight it
              weight:      selectedZoneId === zone.id ? 4 : 1
            }}
            // Selected zone appears larger than inactive zones
            radius={selectedZoneId === zone.id ? 20 : 12}
            eventHandlers={{
              click: () => onSelectZone(zone.id), // Notify parent of selection
            }}
          >
            {/* Popup shown on marker click with zone summary */}
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-stone-800">{zone.name}</h3>
                <p className="text-sm text-stone-600">
                  Status:{' '}
                  <span className={zone.type === 'sacred_grove' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {zone.type === 'sacred_grove' ? 'Protected' : 'Drift Detected'}
                  </span>
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Risk Score: {(zone.riskScore * 100).toFixed(1)}%
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
