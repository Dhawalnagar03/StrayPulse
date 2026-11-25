import { useState, type FC, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
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
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[#e6ddd3] bg-white shadow-[0_10px_25px_rgba(8,26,26,0.04)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#ece3dc] bg-[#fffaf6] p-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#dc2101]" />
          <h1 className="text-sm font-semibold text-slate-900">Map Explorer</h1>
        </div>
        <div className="flex-1" />
        <div className="flex gap-2">
          {(['all', 'sightings', 'feeding', 'predictions'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f ? 'bg-[#081a1a] text-white' : 'border border-[#eaded2] bg-white text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="ml-2 flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" /> Sightings ({nearby.length})</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" /> Feeding ({feeding.length})</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-500" /> Predictions ({predictions.length})</span>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="flex h-full items-center justify-center bg-[#f8f5f2]">
            <div className="text-center">
              <div className="spinner mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading map…</p>
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
