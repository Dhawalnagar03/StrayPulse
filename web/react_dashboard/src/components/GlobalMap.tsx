import { type FC } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { Sighting, FeedingLocation, Prediction } from '../types';
import { formatDateTimeIST } from '../lib/date';

interface Props {
  sightings: Sighting[];
  feeding: FeedingLocation[];
  predictions: Prediction[];
  center: [number, number];
}

// Fix map sizing when the component becomes visible
const MapResizeFix: FC = () => {
  const map = useMap();

  setTimeout(() => {
    map.invalidateSize();
  }, 100);

  return null;
};

const sightingIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width:10px;
      height:10px;
      border-radius:50%;
      background:#3b82f6;
      border:2px solid rgba(255,255,255,0.8);
      box-shadow:0 0 8px #3b82f6aa;
    "></div>
  `,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const feedingIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width:12px;
      height:12px;
      border-radius:3px;
      background:#f97316;
      border:2px solid rgba(255,255,255,0.8);
      box-shadow:0 0 8px #f97316aa;
      transform:rotate(45deg);
    "></div>
  `,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const predIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width:14px;
      height:14px;
      border-radius:50%;
      background:#8b5cf6;
      border:2px solid rgba(255,255,255,0.9);
      box-shadow:0 0 12px #8b5cf6bb;
    "></div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const GlobalMap: FC<Props> = ({
  sightings,
  feeding,
  predictions,
  center,
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '500px',
        position: 'relative',
      }}
    >
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '500px',
        }}
      >
        <MapResizeFix />

        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Sightings */}
        {sightings.map((s) => (
          <Marker
            key={s.id}
            position={[s.latitude, s.longitude]}
            icon={sightingIcon}
          >
            <Popup>
              <div className="text-xs">
                <strong>{s.animal_id}</strong>
                <br />

                {s.timestamp && (
                  <>
                    {formatDateTimeIST(s.timestamp)}
                    <br />
                  </>
                )}

                {s.time_of_day} · {s.weather_condition || 'N/A'}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Feeding locations */}
        {feeding.map((f) => (
          <Marker
            key={f.id}
            position={[f.latitude, f.longitude]}
            icon={feedingIcon}
          >
            <Popup>
              <div className="text-xs">
                <strong>🍽 {f.name}</strong>
                <br />

                {f.feeding_time && (
                  <>
                    Time: {f.feeding_time}
                    <br />
                  </>
                )}

                {f.feeding_frequency && (
                  <>
                    Frequency: {f.feeding_frequency}
                    <br />
                  </>
                )}

                {f.animal_ids?.length > 0 && (
                  <>
                    Animals: {f.animal_ids.join(', ')}
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* AI Predictions */}
        {predictions.map((p) => (
          <div key={`${p.animal_id}-${p.generated_at}`}>
            <Circle
              center={[p.latitude, p.longitude]}
              radius={p.prediction_radius_meters}
              pathOptions={{
                color: '#8b5cf6',
                fillColor: '#8b5cf6',
                fillOpacity: 0.08,
                weight: 2,
                dashArray: '6 4',
              }}
            />

            <Marker
              position={[p.latitude, p.longitude]}
              icon={predIcon}
            >
              <Popup>
                <div className="text-xs">
                  <strong>🧠 {p.animal_id}</strong>
                  <br />
                  Zone: {p.predicted_zone}
                  <br />
                  Time: {p.time_start}–{p.time_end}
                  <br />
                  Confidence:{' '}
                  <strong>{p.confidence_percent}%</strong>
                </div>
              </Popup>
            </Marker>
          </div>
        ))}
      </MapContainer>
    </div>
  );
};

export default GlobalMap;