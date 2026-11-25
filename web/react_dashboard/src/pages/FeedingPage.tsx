import { useEffect, useState, type FC, Suspense, lazy } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Utensils, MapPin, Plus, Clock, Search, Navigation, AlertCircle, Tag, X, CheckCircle2 } from 'lucide-react';
import { animalsApi, feedingApi } from '../lib/api';
import { addNotification } from '../lib/notifications';
import type { Animal, FeedingLocation } from '../types';
import toast from 'react-hot-toast';

const MapComponent = lazy(() => import('../components/GlobalMap'));

const locationPinIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #dc2101;
      border: 2px solid rgba(255,255,255,0.9);
      box-shadow: 0 0 12px rgba(220, 33, 1, 0.45);
    " />
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const MapPreview: FC<{ latitude: number; longitude: number }> = ({ latitude, longitude }) => {
  const center: [number, number] = [latitude, longitude];

  const MapViewUpdater: FC<{ latitude: number; longitude: number }> = ({ latitude: lat, longitude: lng }) => {
    const map = useMap();

    useEffect(() => {
      map.setView([lat, lng], Math.max(map.getZoom(), 13));
      requestAnimationFrame(() => map.invalidateSize());
    }, [lat, lng, map]);

    return null;
  };

  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-xl border border-[#efe3d8] bg-[#f8fafc] md:h-[260px]">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        className="z-0 h-full w-full"
        style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0 }}
      >
        <MapViewUpdater latitude={latitude} longitude={longitude} />
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center} icon={locationPinIcon} />
      </MapContainer>
    </div>
  );
};

const FeedingPage: FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<FeedingLocation | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [animalOptions, setAnimalOptions] = useState<Animal[]>([]);
  const [animalSearch, setAnimalSearch] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [animalDropdownOpen, setAnimalDropdownOpen] = useState(false);
  const [animalsLoading, setAnimalsLoading] = useState(false);
  const [animalsError, setAnimalsError] = useState('');
  const [gpsStatus, setGpsStatus] = useState('');

  const [form, setForm] = useState({
    name: '',
    latitude: '12.9716',
    longitude: '77.5946',
    feeding_time: '08:00 AM',
    feeding_frequency: 'Daily',
    animal_ids: '',
    notes: '',
  });

  const { data: feedingList = [], isLoading, isError } = useQuery<FeedingLocation[]>({
    queryKey: ['feeding'],
    queryFn: () => feedingApi.list().then((r) => r.data),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => feedingApi.create(data),
    onSuccess: () => {
      toast.success('Feeding location created successfully!');
      qc.invalidateQueries({ queryKey: ['feeding'] });
      setIsAddModalOpen(false);
      setForm({
        name: '',
        latitude: '12.9716',
        longitude: '77.5946',
        feeding_time: '08:00 AM',
        feeding_frequency: 'Daily',
        animal_ids: '',
        notes: '',
      });
      setSelectedAnimalId('');
      setAnimalSearch('');
      setAnimalDropdownOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to create feeding location');
    },
  });

  const fetchAnimals = async () => {
    setAnimalsLoading(true);
    setAnimalsError('');

    try {
      let loaded: Animal[] = [];
      let skip = 0;
      const pageSize = 500;

      while (true) {
        const res = await animalsApi.list({ skip, limit: pageSize });
        const animals = Array.isArray(res.data) ? res.data : [];
        if (!animals.length) break;

        loaded = [...loaded, ...animals];
        if (animals.length < pageSize) break;
        skip += animals.length;
      }

      setAnimalOptions(loaded);
    } catch (err: any) {
      console.error('Failed to fetch animals for dropdown', err);
      setAnimalsError(err.response?.data?.detail || 'Unable to load animals right now.');
      setAnimalOptions([]);
    } finally {
      setAnimalsLoading(false);
    }
  };

  useEffect(() => {
    if (isAddModalOpen) {
      fetchAnimals();
    }
  }, [isAddModalOpen]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser';
      setGpsStatus(msg);
      addNotification({
        title: 'GPS unavailable',
        text: msg,
        category: 'GPS',
        dedupeKey: 'gps-unsupported',
      });
      toast.error(msg);
      return;
    }
    setFetchingGps(true);
    setGpsStatus('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const accuracy = pos.coords.accuracy ? pos.coords.accuracy.toFixed(1) : '0';

        setForm((f) => ({
          ...f,
          latitude: lat,
          longitude: lng,
        }));
        setFetchingGps(false);
        setGpsStatus(`Location captured ✓ (Accuracy: ±${accuracy}m)`);
        addNotification({
          title: 'GPS captured',
          text: `Coordinates saved: ${lat}, ${lng} (±${accuracy}m)`,
          category: 'GPS',
          dedupeKey: `gps-capture-success:${lat}:${lng}`,
          dedupeWindowMs: 60_000,
        });
      },
      () => {
        const msg = 'Unable to retrieve location';
        setGpsStatus(msg);
        setFetchingGps(false);
        addNotification({
          title: 'GPS capture warning',
          text: msg,
          category: 'GPS',
          dedupeKey: 'gps-capture-warning',
        });
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const filteredAnimals = animalOptions.filter((animal) => {
    const searchText = animalSearch.trim().toLowerCase();
    if (!searchText) return true;

    return (
      animal.animal_id.toLowerCase().includes(searchText) ||
      (animal.name_label || '').toLowerCase().includes(searchText) ||
      animal.animal_type.toLowerCase().includes(searchText)
    );
  });

  const selectedAnimal = animalOptions.find((animal) => animal.animal_id === selectedAnimalId) ?? null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter a location name');
      return;
    }
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Please enter valid latitude and longitude');
      return;
    }

    const finalAnimalIds = selectedAnimalId ? [selectedAnimalId] : [];

    createMutation.mutate({
      name: form.name.trim(),
      latitude: lat,
      longitude: lng,
      feeding_time: form.feeding_time.trim(),
      feeding_frequency: form.feeding_frequency,
      animal_ids: finalAnimalIds,
      notes: form.notes.trim() || undefined,
    });
  };

  const filteredLocations = feedingList.filter(
    (loc) =>
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      (loc.notes && loc.notes.toLowerCase().includes(search.toLowerCase())) ||
      loc.animal_ids.some((id) => id.toLowerCase().includes(search.toLowerCase()))
  );

  const totalAnimalsLinked = Array.from(new Set(feedingList.flatMap((loc) => loc.animal_ids))).length;

  const mapCenter: [number, number] = selectedLocation
    ? [selectedLocation.latitude, selectedLocation.longitude]
    : [12.9716, 77.5946];

  const modalLatitude = Number.parseFloat(form.latitude) || 12.9716;
  const modalLongitude = Number.parseFloat(form.longitude) || 77.5946;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#dc2101]">Operations</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold text-slate-900">
            <Utensils className="h-7 w-7 text-[#dc2101]" />
            Feeding Points
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Community feeding locations, schedules, and animal coverage in Bangalore
          </p>
        </div>

        <button
          id="btn-add-feeding-point"
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Feeding Point
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1ec] text-[#dc2101]">
            <Utensils className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Points</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{feedingList.length}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff7ef] text-[#e14a05]">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Daily</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {feedingList.filter((f) => f.feeding_frequency === 'Daily' || !f.feeding_frequency).length}
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f0ff] text-violet-600">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Covered</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalAnimalsLinked}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ebfaf5] text-[#126b5a]">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Zone</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">Bangalore</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-[#efe7e0] bg-[#fffaf6] p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#dc2101]" />
                <h2 className="text-sm font-semibold text-slate-900">Feeding map explorer</h2>
              </div>
              <span className="text-xs text-slate-500">Showing {filteredLocations.length} active locations</span>
            </div>

            {!isAddModalOpen && (
              <div className="relative h-[420px]">
                <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="spinner" /></div>}>
                  <MapComponent
                    sightings={[]}
                    predictions={[]}
                    feeding={filteredLocations}
                    center={mapCenter}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, animal ID or notes..."
              className="input pl-10"
            />
          </div>

          {isLoading ? (
            <div className="card py-12 text-center">
              <div className="spinner mx-auto mb-2 h-6 w-6" />
              <p className="text-sm text-slate-500">Loading feeding locations...</p>
            </div>
          ) : isError ? (
            <div className="card py-8 text-center text-red-500">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-80" />
              <p className="text-sm font-medium">Failed to load feeding locations</p>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="card py-12 text-center">
              <Utensils className="mx-auto mb-3 h-10 w-10 text-slate-400" />
              <p className="text-sm font-semibold text-slate-900">No feeding locations found</p>
              <p className="mt-1 text-xs text-slate-500">Try adjusting your search or add a new point.</p>
            </div>
          ) : (
            <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
              {filteredLocations.map((loc) => {
                const isSelected = selectedLocation?.id === loc.id;
                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedLocation(loc)}
                    className={`card cursor-pointer p-4 transition-all ${
                      isSelected ? 'border-[#f4c6af] bg-[#fff7f2]' : 'hover:border-[#f1d7c7]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          🍽 {loc.name}
                          {loc.is_demo && <span className="badge-orange text-[10px]">Demo</span>}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3 text-[#dc2101]" />
                          {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                        </p>
                      </div>

                      <span className="badge-green text-[10px]">{loc.feeding_frequency || 'Daily'}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-[#f0e8e2] pt-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-[#dc2101]" />
                        {loc.feeding_time || '08:00 AM'}
                      </span>

                      {loc.animal_ids && loc.animal_ids.length > 0 ? (
                        <span className="flex items-center gap-1 text-violet-600">
                          <Tag className="h-3.5 w-3.5" />
                          {loc.animal_ids.length} Animals
                        </span>
                      ) : (
                        <span className="italic text-slate-400">No animals linked</span>
                      )}
                    </div>

                    {loc.notes && (
                      <p className="mt-2.5 rounded-lg bg-slate-50 p-2 text-xs leading-relaxed text-slate-600">
                        {loc.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsAddModalOpen(false);
            }
          }}
        >
          <div className="relative flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#efe3d8] bg-white shadow-[0_22px_50px_rgba(8,26,26,0.10)]">
            <div className="flex shrink-0 items-center justify-between border-b border-[#f0e5dc] bg-[#fffaf6] p-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Utensils className="h-5 w-5 text-[#dc2101]" />
                Add New Feeding Location
              </h3>
              <button
                type="button"
                aria-label="Close add feeding location modal"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <div>
                  <label className="label">Location Name *</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Park Gate Community Feeder" className="input" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="label mb-0">GPS Coordinates *</label>
                    <button type="button" onClick={handleGetCurrentLocation} disabled={fetchingGps} className="flex items-center gap-1 text-xs font-medium text-[#dc2101] hover:text-[#b51d00] disabled:cursor-not-allowed disabled:opacity-60">
                      <Navigation className="h-3.5 w-3.5" />
                      {fetchingGps ? 'Fetching GPS...' : 'Use My Location'}
                    </button>
                  </div>
                  {gpsStatus && (
                    <div
                      className={`mt-3 flex items-center gap-2 rounded-xl border p-2.5 text-[11px] ${
                        gpsStatus.includes('✓')
                          ? 'border-[#9ad3b6] bg-[#edf8f2] text-[#0f5d3a]'
                          : 'border-[#f2c18d] bg-[#fff7ef] text-[#9d5a21]'
                      }`}
                    >
                      {gpsStatus.includes('✓') ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                      {gpsStatus}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500">Latitude</span>
                      <input type="number" step="any" required value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} className="input font-mono text-xs" placeholder="12.9716" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500">Longitude</span>
                      <input type="number" step="any" required value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} className="input font-mono text-xs" placeholder="77.5946" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Map Preview</label>
                  <div className="overflow-hidden rounded-xl border border-[#efe3d8] bg-[#fffaf6] p-1">
                    <MapPreview latitude={modalLatitude} longitude={modalLongitude} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Feeding Time</label>
                    <input type="text" value={form.feeding_time} onChange={(e) => setForm((f) => ({ ...f, feeding_time: e.target.value }))} placeholder="e.g. 08:00 AM" className="input" />
                  </div>
                  <div>
                    <label className="label">Frequency</label>
                    <select value={form.feeding_frequency} onChange={(e) => setForm((f) => ({ ...f, feeding_frequency: e.target.value }))} className="input">
                      <option value="Daily">Daily</option>
                      <option value="Twice Daily">Twice Daily</option>
                      <option value="Alternate Days">Alternate Days</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Associated Animal</label>
                  <div className="relative">
                    <div
                      onClick={() => setAnimalDropdownOpen((current) => !current)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setAnimalDropdownOpen((current) => !current);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-[#eaded2] bg-white px-4 py-2.5 text-left text-sm text-slate-900 transition-all focus:border-[#dc2101] focus:outline-none focus:ring-2 focus:ring-[#f8d6c8]"
                    >
                      {selectedAnimal ? (
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#2d8a6a]" />
                          <span className="min-w-0 truncate">
                            <span className="block truncate font-medium text-slate-900">{selectedAnimal.name_label || selectedAnimal.animal_type}</span>
                            <span className="block truncate text-[11px] text-slate-500 font-mono">{selectedAnimal.animal_id}</span>
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Select an animal (optional)</span>
                      )}

                      <span className="ml-3 flex items-center gap-2">
                        {selectedAnimal && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedAnimalId('');
                              setAnimalSearch('');
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Clear selected animal"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <span className="text-xs text-slate-400">▾</span>
                      </span>
                    </div>

                    {animalDropdownOpen && (
                      <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-[#eaded2] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                        <div className="border-b border-[#f0e7df] p-2">
                          <input
                            type="text"
                            value={animalSearch}
                            onChange={(e) => setAnimalSearch(e.target.value)}
                            placeholder="Search by name, animal ID or type"
                            className="w-full rounded-lg border border-[#eaded2] bg-[#fffaf6] px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#dc2101] focus:outline-none focus:ring-2 focus:ring-[#f8d6c8]"
                          />
                        </div>

                        {animalsLoading ? (
                          <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
                            <span className="spinner h-4 w-4" /> Loading animals...
                          </div>
                        ) : animalsError ? (
                          <div className="px-3 py-4 text-sm text-red-600">{animalsError}</div>
                        ) : filteredAnimals.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-slate-500">No animals match your search.</div>
                        ) : (
                          <div className="max-h-64 overflow-y-auto">
                            {filteredAnimals.map((animal) => {
                              const isSelected = animal.animal_id === selectedAnimalId;
                              return (
                                <button
                                  key={animal.animal_id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedAnimalId(animal.animal_id);
                                    setAnimalSearch('');
                                    setAnimalDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between gap-3 border-b border-[#f5efe9] px-3 py-3 text-left transition-colors last:border-b-0 ${
                                    isSelected ? 'bg-[#edf8f2]' : 'hover:bg-[#fff8f3]'
                                  }`}
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-slate-800">
                                      {animal.name_label || animal.animal_type}
                                    </span>
                                    <span className="mt-0.5 block truncate font-mono text-[11px] text-slate-500">{animal.animal_id}</span>
                                  </span>
                                  <span className="shrink-0 rounded-full border border-[#dfeae2] bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">
                                    {animal.animal_type}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="label">Notes & Instructions</label>
                  <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. Near the big Banyan tree, water bowl placed beside yellow gate" className="input h-20 resize-none text-xs" />
                </div>
              </div>

              <div className="shrink-0 border-t border-[#f3e8dd] bg-white p-4 pt-3">
                <div className="flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-ghost flex-1 justify-center" disabled={createMutation.isPending}>Cancel</button>
                  <button type="submit" id="btn-save-feeding-location" className="btn-primary flex-1 justify-center" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <span className="spinner h-4 w-4" /> : 'Save Location'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedingPage;
