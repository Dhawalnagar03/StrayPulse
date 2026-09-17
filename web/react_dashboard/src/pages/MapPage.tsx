import { useState, type FC, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Filter, Layers } from 'lucide-react';
import { sightingsApi, feedingApi, predictionsApi } from '../lib/api';
import type { Sighting, FeedingLocation, Prediction } from '../types';

const MapComponent = lazy(() => import('../components/GlobalMap'));

const MapPage: FC = () => {
  const [filter, setFilter] = useState<'all' | 'sightings' | 'feeding' | 'predictions'>('all');
  const [lat] = useState(12.9716);
  const [lng] = useState(77.5946);

  const { data: nearby = [] } = useQuery<Sighting[]>({
    queryKey: ['nearby', lat, lng],
    queryFn: () => sightingsApi.getNearby(lat, lng, 5).then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: feeding = [] } = useQuery<FeedingLocation[]>({
    queryKey: ['feeding'],
    queryFn: () => feedingApi.list().then((r) => r.data),
  });

  const { data: predictions = [] } = useQuery<Prediction[]>({
    queryKey: ['predictions-map'],
    queryFn: () => predictionsApi.list(0.5).then((r) => r.data),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="p-4 bg-dark-800 border-b border-white/[0.06] flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary-400" />
          <h1 className="font-semibold text-white text-sm">Map Explorer</h1>
        </div>
        <div className="flex-1" />
        <div className="flex gap-2">
          {(['all', 'sightings', 'feeding', 'predictions'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f ? 'bg-primary-600 text-white' : 'bg-dark-700 text-gray-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 ml-2">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Sightings ({nearby.length})</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Feeding ({feeding.length})</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Predictions ({predictions.length})</span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full bg-dark-900">
            <div className="text-center">
              <div className="spinner mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading map…</p>
            </div>
          </div>
        }>
          <MapComponent
            sightings={filter === 'feeding' || filter === 'predictions' ? [] : nearby}
            feeding={filter === 'sightings' || filter === 'predictions' ? [] : feeding}
            predictions={filter === 'sightings' || filter === 'feeding' ? [] : predictions}
            center={[lat, lng]}
          />
        </Suspense>
      </div>
    </div>
  );
};

export default MapPage;
