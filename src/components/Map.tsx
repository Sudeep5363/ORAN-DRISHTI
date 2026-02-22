import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ZoneData } from '../utils/dataSimulator';

// Fix for default marker icons in Leaflet with Webpack/Vite
// (Though we are using CircleMarkers, good to have if we add markers later)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  zones: ZoneData[];
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
}

const RecenterMap = ({ lat, lon }: { lat: number; lon: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], 14);
  }, [lat, lon, map]);
  return null;
};

const MapComponent: React.FC<MapProps> = ({ zones, selectedZoneId, onSelectZone }) => {
  const selectedZone = zones.find(z => z.id === selectedZoneId);
  const centerLat = selectedZone ? selectedZone.lat : 24.5854;
  const centerLon = selectedZone ? selectedZone.lon : 73.7125;

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-lg border border-stone-200">
      <MapContainer 
        center={[centerLat, centerLon]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {selectedZone && <RecenterMap lat={selectedZone.lat} lon={selectedZone.lon} />}

        {zones.map((zone) => (
          <CircleMarker
            key={zone.id}
            center={[zone.lat, zone.lon]}
            pathOptions={{
              color: zone.type === 'sacred_grove' ? '#22c55e' : '#ef4444', // Green vs Red
              fillColor: zone.type === 'sacred_grove' ? '#4ade80' : '#f87171',
              fillOpacity: 0.6,
              weight: selectedZoneId === zone.id ? 4 : 1
            }}
            radius={selectedZoneId === zone.id ? 20 : 12}
            eventHandlers={{
              click: () => onSelectZone(zone.id),
            }}
          >
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-stone-800">{zone.name}</h3>
                <p className="text-sm text-stone-600">
                  Status: <span className={zone.type === 'sacred_grove' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
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
