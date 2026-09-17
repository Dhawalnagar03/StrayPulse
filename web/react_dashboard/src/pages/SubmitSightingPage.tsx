import { useState, type FC } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PawPrint, MapPin, Camera, CheckCircle2, ArrowLeft } from 'lucide-react';
import { sightingsApi, animalsApi } from '../lib/api';
import type { Animal } from '../types';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

const SubmitSightingPage: FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: registeredAnimals = [], isLoading: animalsLoading } = useQuery<Animal[]>({
    queryKey: ['animals-select'],
    queryFn: () => animalsApi.list({ limit: 100 }).then((r) => r.data),
  });

  const [form, setForm] = useState({
    animal_id: '',
    latitude: '',
    longitude: '',
    notes: '',
    is_feeding_point: false,
    gps_accuracy_meters: '',
  });

  const selectedAnimal = registeredAnimals.find((a) => a.animal_id === form.animal_id);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const captureGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
          gps_accuracy_meters: pos.coords.accuracy.toFixed(1),
        }));
        setGpsLoading(false);
        toast.success('GPS captured!');
      },
      (err) => {
        setGpsLoading(false);
        toast.error('GPS unavailable. Please enter coordinates manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        animal_id: form.animal_id,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        notes: form.notes || undefined,
        is_feeding_point: form.is_feeding_point,
        gps_accuracy_meters: form.gps_accuracy_meters ? parseFloat(form.gps_accuracy_meters) : undefined,
      };
      const res = await sightingsApi.submit(payload);
      const sightingId = res.data.id;
      if (photo && sightingId) {
        await sightingsApi.uploadPhoto(sightingId, photo);
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success('Sighting submitted successfully!');
      qc.invalidateQueries({ queryKey: ['animals'] });
      navigate('/animals');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to submit sighting');
    },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <button onClick={() => navigate(-1)} className="btn-ghost text-gray-400 mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4" />Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Report a Sighting</h1>
        <p className="text-gray-400 text-sm mt-1">Help track stray animals with your GPS location and photo</p>
      </div>

      <div className="space-y-5">
        {/* Animal Selection */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <PawPrint className="w-4 h-4 text-primary-400" />Select Registered Animal *
          </h2>
          <div>
            <label className="label">Animal *</label>
            {animalsLoading ? (
              <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
                <span className="spinner w-4 h-4" /> Loading animals...
              </div>
            ) : registeredAnimals.length === 0 ? (
              <div className="p-3 bg-dark-700/50 rounded-xl text-sm text-gray-400 border border-white/[0.06]">
                No registered animals found.{' '}
                <button
                  type="button"
                  onClick={() => navigate('/animals/new')}
                  className="text-primary-400 hover:underline font-medium"
                >
                  Register an animal first →
                </button>
              </div>
            ) : (
              <select
                id="sighting-animal-id"
                name="animal_id"
                value={form.animal_id}
                onChange={handleChange}
                className="input font-mono"
                required
              >
                <option value="">-- Select an Animal --</option>
                {registeredAnimals.map((animal) => (
                  <option key={animal.animal_id} value={animal.animal_id}>
                    {animal.animal_id} — {animal.name_label || animal.animal_type} ({animal.sex} • {animal.color || 'No color'})
                  </option>
                ))}
              </select>
            )}

            {/* Selected Animal Preview Card */}
            {selectedAnimal && (
              <div className="mt-3 p-3 bg-primary-500/10 border border-primary-500/30 rounded-xl flex items-center gap-3 animate-fade-in">
                <div className="w-12 h-12 rounded-lg bg-dark-700 overflow-hidden flex items-center justify-center text-2xl border border-white/10 flex-shrink-0">
                  {selectedAnimal.primary_photo ? (
                    <img src={selectedAnimal.primary_photo} alt={selectedAnimal.animal_id} className="w-full h-full object-cover" />
                  ) : (
                    selectedAnimal.animal_type === 'Dog' ? '🐕' : selectedAnimal.animal_type === 'Cat' ? '🐈' : '🐾'
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white font-mono">{selectedAnimal.animal_id}</p>
                  <p className="text-xs text-primary-300">
                    {selectedAnimal.name_label || 'Unnamed'} • {selectedAnimal.animal_type} • {selectedAnimal.sex}
                  </p>
                  {selectedAnimal.distinctive_features && (
                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                      {selectedAnimal.distinctive_features}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Photo */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary-400" />Photo
          </h2>
          <label className="block cursor-pointer">
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${photoPreview ? 'border-primary-500/50' : 'border-white/[0.1] hover:border-primary-500/40'}`}>
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
              ) : (
                <div>
                  <Camera className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Click to upload or take photo</p>
                  <p className="text-xs text-gray-600 mt-1">JPEG, PNG up to 10MB</p>
                </div>
              )}
            </div>
            <input id="sighting-photo" type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          </label>
        </div>

        {/* Location */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-400" />Location
          </h2>
          <button type="button" id="btn-capture-gps" onClick={captureGPS} disabled={gpsLoading} className="btn-secondary w-full justify-center mb-4">
            {gpsLoading ? <span className="spinner w-4 h-4" /> : <MapPin className="w-4 h-4" />}
            {gpsLoading ? 'Acquiring GPS…' : 'Capture GPS Location'}
          </button>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Latitude *</label>
              <input name="latitude" value={form.latitude} onChange={handleChange} className="input" placeholder="12.9716" required />
            </div>
            <div>
              <label className="label">Longitude *</label>
              <input name="longitude" value={form.longitude} onChange={handleChange} className="input" placeholder="77.5946" required />
            </div>
          </div>
          {form.gps_accuracy_meters && (
            <p className="text-xs text-primary-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />GPS Accuracy: ±{form.gps_accuracy_meters} meters
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Additional Info</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                className="input resize-none h-24"
                placeholder="Any observations about the animal's condition, behavior…"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_feeding_point"
                checked={form.is_feeding_point}
                onChange={handleChange}
                className="w-4 h-4 rounded accent-primary-500"
              />
              <span className="text-sm text-gray-300">This is a feeding point location</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <button
          id="btn-submit-sighting"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.animal_id || !form.latitude || !form.longitude}
          className="btn-primary w-full justify-center py-3 text-base"
        >
          {mutation.isPending ? <span className="spinner w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {mutation.isPending ? 'Submitting…' : 'Submit Sighting'}
        </button>
      </div>
    </div>
  );
};

export default SubmitSightingPage;
