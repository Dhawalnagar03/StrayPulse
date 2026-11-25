import { type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowUpRight, CalendarRange, Eye, MapPinned, PawPrint, Sparkles, TrendingUp, Users } from 'lucide-react';
import { adminApi, animalsApi, predictionsApi, sightingsApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import type { Analytics, Animal, Prediction, Sighting } from '../types';
import { formatDateTimeIST, formatDayOnlyIST, getGreetingByIst } from '../lib/date';
import GlobalMap from '../components/GlobalMap';

const statAccent = {
  blue: 'bg-blue-50 text-blue-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  violet: 'bg-violet-50 text-violet-700',
  amber: 'bg-amber-50 text-amber-700',
};

const DashboardPage: FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ['analytics'],
    queryFn: () => adminApi.analytics().then((r) => r.data),
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const { data: animals = [] } = useQuery<Animal[]>({
    queryKey: ['animals-dashboard'],
    queryFn: () => animalsApi.list({ limit: 5 }).then((r) => r.data),
  });

  const { data: nearbySightings = [] } = useQuery<Sighting[]>({
    queryKey: ['nearby-dashboard'],
    queryFn: () => sightingsApi.getNearby(12.9716, 77.5946, 8).then((r) => r.data),
  });

  const { data: predictions = [] } = useQuery<Prediction[]>({
    queryKey: ['predictions-dashboard'],
    queryFn: () => predictionsApi.list(0.6).then((r) => r.data),
  });

  const metrics = analytics
    ? [
        { label: 'Registered animals', value: analytics.total_animals, icon: PawPrint, tone: 'blue' },
        { label: 'Active animals', value: analytics.active_animals, icon: Activity, tone: 'emerald' },
        { label: "Today's sightings", value: analytics.todays_sightings, icon: CalendarRange, tone: 'amber' },
        { label: 'Predictions', value: analytics.predictions_generated, icon: Sparkles, tone: 'violet' },
      ]
    : [
        { label: 'Registered animals', value: animals.length, icon: PawPrint, tone: 'blue' },
        { label: 'AI predictions', value: predictions.length, icon: Sparkles, tone: 'violet' },
        { label: 'Today', value: formatDayOnlyIST(new Date()), icon: CalendarRange, tone: 'amber' },
        { label: 'Reports', value: nearbySightings.length, icon: Eye, tone: 'emerald' },
      ];

  const mapCenter: [number, number] = nearbySightings[0]
    ? [nearbySightings[0].latitude, nearbySightings[0].longitude]
    : [12.9716, 77.5946];

  const recentSightings = nearbySightings.slice(0, 4);
  const recentAnimals = animals.slice(0, 4);

  if (analyticsLoading && isAdmin) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">Operations</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Good {getGreetingByIst(new Date())}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live system active
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${statAccent[tone as keyof typeof statAccent]}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Map preview</h2>
              <p className="text-sm text-slate-500">Current sightings and predicted zones</p>
            </div>
            <a href="/map" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
              Open explorer <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
          <div className="h-[330px] w-full">
            <GlobalMap
              sightings={nearbySightings}
              feeding={[]}
              predictions={predictions.slice(0, 6)}
              center={mapCenter}
            />
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent sightings</h2>
            <a href="/sightings" className="text-sm font-medium text-blue-600 hover:text-blue-700">View all</a>
          </div>
          <div className="space-y-3">
            {recentSightings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No sightings reported in the recent radius.</div>
            ) : (
              recentSightings.map((sighting) => (
                <div key={sighting.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                    {sighting.photo_url ? (
                      <img src={sighting.photo_url} alt={sighting.animal_id} className="h-full w-full object-cover" />
                    ) : (
                      <PawPrint className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-slate-900">{sighting.animal_id}</p>
                      <span className={sighting.verification_status === 'Verified' ? 'badge-green' : sighting.verification_status === 'Pending' ? 'badge-orange' : 'badge-gray'}>
                        {sighting.verification_status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{sighting.zone_name || 'Urban zone'} • {formatDateTimeIST(sighting.timestamp)}</p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                      <MapPinned className="h-3.5 w-3.5" />
                      {sighting.latitude.toFixed(4)}, {sighting.longitude.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Animal type distribution</h2>
            <span className="text-sm text-slate-500">Live data</span>
          </div>
          {analytics ? (
            <div className="h-[220px]">
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col gap-3 w-full max-w-md">
                  {Object.entries(analytics.animal_distribution).map(([label, value], index) => (
                    <div key={label}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{label}</span>
                        <span className="text-slate-500">{value}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max((value / (Object.values(analytics.animal_distribution).reduce((sum, item) => sum + item, 0) || 1)) * 100, 10)}%`,
                            background: ['#2563eb', '#14b8a6', '#7c3aed', '#f59e0b', '#f472b6'][index % 5],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">Distribution will appear once analytics data is available.</div>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recently added animals</h2>
            <a href="/animals" className="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>
          </div>
          <div className="space-y-3">
            {recentAnimals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No animals have been registered yet.</div>
            ) : (
              recentAnimals.map((animal) => (
                <a key={animal.animal_id} href={`/animals/${animal.animal_id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/40">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                    {animal.primary_photo ? (
                      <img src={animal.primary_photo} alt={animal.animal_id} className="h-full w-full object-cover" />
                    ) : (
                      <PawPrint className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{animal.name_label || animal.animal_id}</p>
                    <p className="text-xs text-slate-500">{animal.animal_type} • {animal.sex}</p>
                  </div>
                  <span className={animal.status === 'Active' ? 'badge-green' : 'badge-gray'}>{animal.status}</span>
                </a>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
          <TrendingUp className="h-5 w-5 text-blue-600" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <a href="/sightings/new" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 transition-colors hover:bg-blue-100/80">
            <p className="text-sm font-semibold text-blue-800">Report sighting</p>
            <p className="mt-1 text-sm text-blue-700">Capture location and photo of a live animal.</p>
          </a>
          <a href="/map" className="rounded-2xl border border-violet-200 bg-violet-50 p-4 transition-colors hover:bg-violet-100/80">
            <p className="text-sm font-semibold text-violet-800">Explore map</p>
            <p className="mt-1 text-sm text-violet-700">Review nearby sightings, feeding points, and prediction zones.</p>
          </a>
          <a href="/animals" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 transition-colors hover:bg-emerald-100/80">
            <p className="text-sm font-semibold text-emerald-800">Manage animals</p>
            <p className="mt-1 text-sm text-emerald-700">Review health, movement history, and recent updates.</p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
