import { type FC, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Sighting, Prediction } from '../types';
import { format, parseISO } from 'date-fns';

interface Props {
  sightings: Sighting[];
  prediction?: Prediction;
  animalId: string;
  centerLat?: number;
  centerLng?: number;
}

// Custom icons
const createIcon = (color: string, size = 10) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.7);box-shadow:0 0 6px ${color}aa"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const latestIcon = createIcon('#22c55e', 14);
const histIcon = createIcon('#3b82f6', 10);
const predIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#8b5cf6;border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 12px #8b5cf6aa;animation:pulse 2s infinite"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [positions.length]);
  return null;
}

const AnimalMap: FC<Props> = ({ sightings, prediction, animalId, centerLat, centerLng }) => {
  const defaultCenter: [number, number] = [
    centerLat || sightings[0]?.latitude || 12.9716,
    centerLng || sightings[0]?.longitude || 77.5946,
  ];

  // Build polyline path (last 20 sightings in chronological order)
  const pathPoints: [number, number][] = [...sightings]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-20)
    .map((s) => [s.latitude, s.longitude]);

  const allPositions: [number, number][] = sightings.map((s) => [s.latitude, s.longitude]);
  if (prediction) allPositions.push([prediction.latitude, prediction.longitude]);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {allPositions.length > 0 && <FitBounds positions={allPositions} />}

      {/* Movement path */}
      {pathPoints.length > 1 && (
        <Polyline positions={pathPoints} color="#3b82f6" weight={2} opacity={0.5} dashArray="6 4" />
      )}

      {/* Historical sightings */}
      {sightings.slice(1).map((s, i) => (
        <Marker key={s.id} position={[s.latitude, s.longitude]} icon={histIcon}>
          <Popup>
            <div className="text-xs">
              <strong>{animalId}</strong><br />
              {format(parseISO(s.timestamp), 'MMM d, h:mm a')}<br />
              {s.time_of_day} · {s.weather_condition || 'N/A'}
              {s.verification_status === 'Verified' && <span className="text-green-400 ml-1">✓</span>}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Latest sighting */}
      {sightings[0] && (
        <Marker position={[sightings[0].latitude, sightings[0].longitude]} icon={latestIcon}>
          <Popup>
            <div className="text-xs">
              <strong>Latest Sighting</strong><br />
              {format(parseISO(sightings[0].timestamp), 'MMM d, h:mm a')}
            </div>
          </Popup>
        </Marker>
      )}

      {/* Prediction area */}
      {prediction && (
        <>
          <Circle
            center={[prediction.latitude, prediction.longitude]}
            radius={prediction.prediction_radius_meters}
            pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.1, weight: 2, dashArray: '8 4' }}
          />
          <Marker position={[prediction.latitude, prediction.longitude]} icon={predIcon}>
            <Popup>
              <div className="text-xs">
                <strong>🧠 AI Prediction</strong><br />
                Zone: {prediction.predicted_zone}<br />
                Time: {prediction.time_start}–{prediction.time_end}<br />
                Confidence: <strong>{prediction.confidence_percent}%</strong>
              </div>
            </Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
};

export default AnimalMap;
