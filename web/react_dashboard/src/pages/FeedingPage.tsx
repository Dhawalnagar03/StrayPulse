import { useState, type FC, Suspense, lazy } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Utensils, MapPin, Plus, Clock, Search, Navigation, AlertCircle, Calendar, Tag, Info, CheckCircle2 } from 'lucide-react';
import { feedingApi } from '../lib/api';
import type { FeedingLocation } from '../types';
import toast from 'react-hot-toast';

const MapComponent = lazy(() => import('../components/GlobalMap'));

const FeedingPage: FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<FeedingLocation | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);

  // Form state for creating new feeding location
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
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to create feeding location');
    },
  });

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setFetchingGps(false);
        toast.success('GPS coordinates retrieved!');
      },
      () => {
        toast.error('Unable to retrieve location');
        setFetchingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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

    const animalIdsArray = form.animal_ids
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    createMutation.mutate({
      name: form.name.trim(),
      latitude: lat,
      longitude: lng,
      feeding_time: form.feeding_time.trim(),
      feeding_frequency: form.feeding_frequency,
      animal_ids: animalIdsArray,
      notes: form.notes.trim() || undefined,
    });
  };

  const filteredLocations = feedingList.filter(
    (loc) =>
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      (loc.notes && loc.notes.toLowerCase().includes(search.toLowerCase())) ||
      loc.animal_ids.some((id) => id.toLowerCase().includes(search.toLowerCase()))
  );

  const totalAnimalsLinked = Array.from(
    new Set(feedingList.flatMap((loc) => loc.animal_ids))
  ).length;

  const mapCenter: [number, number] = selectedLocation
    ? [selectedLocation.latitude, selectedLocation.longitude]
    : [12.9716, 77.5946];

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Utensils className="w-7 h-7 text-orange-400" />
            Feeding Locations & Points
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Community stray animal feeding points, daily schedules & animal coverage in Bangalore
          </p>
        </div>

        <button
          id="btn-add-feeding-point"
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary inline-flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Feeding Point
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center flex-shrink-0">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Feeding Points</p>
            <p className="text-2xl font-bold text-white mt-0.5">{feedingList.length}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Daily Schedules</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              {feedingList.filter((f) => f.feeding_frequency === 'Daily' || !f.feeding_frequency).length}
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Animals Covered</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalAnimalsLinked}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Zone</p>
            <p className="text-2xl font-bold text-white mt-0.5">Bangalore</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Map & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Explorer Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-0 overflow-hidden border border-white/[0.08] shadow-2xl">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-dark-800">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-400" />
                <h2 className="font-semibold text-white text-sm">Feeding Map Explorer</h2>
              </div>
              <span className="text-xs text-gray-400">
                Showing {filteredLocations.length} active locations
              </span>
            </div>

            <div className="h-[420px] relative">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full bg-dark-900">
                    <div className="spinner" />
                  </div>
                }
              >
                <MapComponent
                  sightings={[]}
                  predictions={[]}
                  feeding={filteredLocations}
                  center={mapCenter}
                />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Feeding Locations List Column */}
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, animal ID or notes..."
              className="input pl-10"
            />
          </div>

          {isLoading ? (
            <div className="card text-center py-12">
              <div className="spinner mx-auto mb-2 w-6 h-6" />
              <p className="text-gray-400 text-sm">Loading feeding locations...</p>
            </div>
          ) : isError ? (
            <div className="card text-center py-8 text-red-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-medium">Failed to load feeding locations</p>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="card text-center py-12">
              <Utensils className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-white text-sm font-semibold">No feeding locations found</p>
              <p className="text-gray-500 text-xs mt-1">Try adjusting your search or add a new point.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {filteredLocations.map((loc) => {
                const isSelected = selectedLocation?.id === loc.id;
                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedLocation(loc)}
                    className={`card p-4 transition-all cursor-pointer border ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/5 shadow-glow-orange'
                        : 'border-white/[0.06] hover:border-white/[0.15] bg-dark-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                          🍽 {loc.name}
                          {loc.is_demo && <span className="badge-orange text-[10px]">Demo</span>}
                        </h3>
                        <p className="text-xs font-mono text-gray-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-orange-400" />
                          {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                        </p>
                      </div>

                      <span className="badge-green text-xs flex-shrink-0">
                        {loc.feeding_frequency || 'Daily'}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary-400" />
                        {loc.feeding_time || '08:00 AM'}
                      </span>

                      {loc.animal_ids && loc.animal_ids.length > 0 ? (
                        <span className="flex items-center gap-1 text-purple-300">
                          <Tag className="w-3.5 h-3.5" />
                          {loc.animal_ids.length} Animals
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">No animals linked</span>
                      )}
                    </div>

                    {loc.notes && (
                      <p className="text-xs text-gray-400 bg-dark-900/60 p-2 rounded-lg mt-2.5 leading-relaxed">
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

      {/* Add Feeding Location Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-white/[0.1] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-dark-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Utensils className="w-5 h-5 text-orange-400" />
                Add New Feeding Location
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-dark-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Location Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Park Gate Community Feeder"
                  className="input"
                />
              </div>

              {/* Coordinates + GPS button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="label mb-0">GPS Coordinates *</label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={fetchingGps}
                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 font-medium"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    {fetchingGps ? 'Fetching GPS...' : 'Use My Location'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-gray-500">Latitude</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={form.latitude}
                      onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                      className="input font-mono text-xs"
                      placeholder="12.9716"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500">Longitude</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={form.longitude}
                      onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                      className="input font-mono text-xs"
                      placeholder="77.5946"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Feeding Time</label>
                  <input
                    type="text"
                    value={form.feeding_time}
                    onChange={(e) => setForm((f) => ({ ...f, feeding_time: e.target.value }))}
                    placeholder="e.g. 08:00 AM"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Frequency</label>
                  <select
                    value={form.feeding_frequency}
                    onChange={(e) => setForm((f) => ({ ...f, feeding_frequency: e.target.value }))}
                    className="input"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Twice Daily">Twice Daily</option>
                    <option value="Alternate Days">Alternate Days</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Associated Animal IDs (Comma Separated)</label>
                <input
                  type="text"
                  value={form.animal_ids}
                  onChange={(e) => setForm((f) => ({ ...f, animal_ids: e.target.value }))}
                  placeholder="e.g. DOG-00001, CAT-00002"
                  className="input font-mono text-xs"
                />
              </div>

              <div>
                <label className="label">Notes & Instructions</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Near the big Banyan tree, water bowl placed beside yellow gate"
                  className="input resize-none h-20 text-xs"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-ghost flex-1 justify-center"
                  disabled={createMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-feeding-location"
                  className="btn-primary flex-1 justify-center bg-orange-600 hover:bg-orange-500"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? <span className="spinner w-4 h-4" /> : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedingPage;
