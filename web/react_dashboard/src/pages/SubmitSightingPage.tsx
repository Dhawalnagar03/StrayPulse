import { useState, type FC } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PawPrint, MapPin, Camera, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
import { sightingsApi, animalsApi } from '../lib/api';
import { addNotification } from '../lib/notifications';
import type { Animal } from '../types';
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
  const [gpsStatus, setGpsStatus] = useState('');
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
    setGpsStatus('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const accuracy = pos.coords.accuracy.toFixed(1);

        setForm((f) => ({
          ...f,
          latitude: lat,
          longitude: lng,
          gps_accuracy_meters: accuracy,
        }));
        setGpsLoading(false);
        setGpsStatus(`Location captured ✓ (Accuracy: ±${accuracy}m)`);
        addNotification({
          title: 'GPS captured',
          text: `Coordinates saved: ${lat}, ${lng} (±${accuracy}m)`,
          category: 'GPS',
          dedupeKey: `gps-capture-success:${lat}:${lng}`,
          dedupeWindowMs: 60_000,
        });
      },
      (error) => {
        setGpsLoading(false);
        const msg = error.code === error.PERMISSION_DENIED
          ? 'Location permission denied. Please enter coordinates manually.'
          : 'GPS unavailable. Please enter coordinates manually.';
        setGpsStatus(msg);
        addNotification({
          title: 'GPS capture warning',
          text: msg,
          category: 'GPS',
          dedupeKey: 'gps-capture-warning',
        });
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
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-2 -ml-2 text-slate-600">
        <ArrowLeft className="h-4 w-4" />Back
      </button>

      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#dc2101]">Report</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Report a Sighting</h1>
        <p className="mt-1 text-sm text-slate-500">Help track stray animals with location and photo evidence</p>
      </div>

      <div className="space-y-5">
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <PawPrint className="h-4 w-4 text-[#dc2101]" />Select Registered Animal *
          </h2>
          <div>
            <label className="label">Animal *</label>
            {animalsLoading ? (
              <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
                <span className="spinner h-4 w-4" /> Loading animals...
              </div>
            ) : registeredAnimals.length === 0 ? (
              <div className="rounded-xl border border-[#f0e5dc] bg-[#fffaf6] p-3 text-sm text-slate-500">
                No registered animals found.{' '}
                <button type="button" onClick={() => navigate('/animals/new')} className="font-medium text-[#dc2101] hover:text-[#b51d00]">
                  Register an animal first →
                </button>
              </div>
            ) : (
              <select id="sighting-animal-id" name="animal_id" value={form.animal_id} onChange={handleChange} className="input font-mono" required>
                <option value="">-- Select an Animal --</option>
                {registeredAnimals.map((animal) => (
                  <option key={animal.animal_id} value={animal.animal_id}>
                    {animal.animal_id} — {animal.name_label || animal.animal_type} ({animal.sex} • {animal.color || 'No color'})
                  </option>
                ))}
              </select>
            )}

            {selectedAnimal && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#f1d4c3] bg-[#fff8f3] p-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-2xl ring-1 ring-slate-200">
                  {selectedAnimal.primary_photo ? (
                    <img src={selectedAnimal.primary_photo} alt={selectedAnimal.animal_id} className="h-full w-full object-cover" />
                  ) : (
                    selectedAnimal.animal_type === 'Dog' ? '🐕' : selectedAnimal.animal_type === 'Cat' ? '🐈' : '🐾'
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 font-mono">{selectedAnimal.animal_id}</p>
                  <p className="text-xs text-[#dc2101]">
                    {selectedAnimal.name_label || 'Unnamed'} • {selectedAnimal.animal_type} • {selectedAnimal.sex}
                  </p>
                  {selectedAnimal.distinctive_features && (
                    <p className="mt-0.5 text-[11px] text-slate-500">{selectedAnimal.distinctive_features}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Camera className="h-4 w-4 text-[#dc2101]" />Photo
          </h2>
          <label className="block cursor-pointer">
            <div className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${photoPreview ? 'border-[#dc2101]/50 bg-[#fff7f2]' : 'border-[#e7dfd8] bg-[#fffaf6] hover:border-[#e7b39b]'}`}>
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="mx-auto max-h-48 rounded-lg object-contain" />
              ) : (
                <div>
                  <Camera className="mx-auto mb-2 h-10 w-10 text-slate-400" />
                  <p className="text-sm text-slate-600">Click to upload or take photo</p>
                  <p className="mt-1 text-xs text-slate-500">JPEG, PNG up to 10MB</p>
                </div>
              )}
            </div>
            <input id="sighting-photo" type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          </label>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MapPin className="h-4 w-4 text-[#dc2101]" />Location
          </h2>
          <button type="button" id="btn-capture-gps" onClick={captureGPS} disabled={gpsLoading} className="btn-secondary mb-4 w-full justify-center">
            {gpsLoading ? <span className="spinner h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            {gpsLoading ? 'Acquiring GPS…' : 'Capture GPS Location'}
          </button>

          {gpsStatus && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-xl border p-3 text-xs ${
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
              <label className="label">Latitude *</label>
              <input name="latitude" value={form.latitude} onChange={handleChange} className="input" placeholder="12.9716" required />
            </div>
            <div>
              <label className="label">Longitude *</label>
              <input name="longitude" value={form.longitude} onChange={handleChange} className="input" placeholder="77.5946" required />
            </div>
          </div>
          {form.gps_accuracy_meters && (
            <p className="mt-2 flex items-center gap-1 text-xs text-[#dc2101]">
              <CheckCircle2 className="h-3.5 w-3.5" />GPS Accuracy: ±{form.gps_accuracy_meters} meters
            </p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Additional Info</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} className="input h-24 resize-none" placeholder="Any observations about the animal's condition, behavior…" />
            </div>
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" name="is_feeding_point" checked={form.is_feeding_point} onChange={handleChange} className="h-4 w-4 rounded accent-[#dc2101]" />
              <span className="text-sm text-slate-700">This is a feeding point location</span>
            </label>
          </div>
        </div>

        <button id="btn-submit-sighting" onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.animal_id || !form.latitude || !form.longitude} className="btn-primary w-full justify-center py-3 text-base">
          {mutation.isPending ? <span className="spinner h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {mutation.isPending ? 'Submitting…' : 'Submit Sighting'}
        </button>
      </div>
    </div>
  );
};

export default SubmitSightingPage;
