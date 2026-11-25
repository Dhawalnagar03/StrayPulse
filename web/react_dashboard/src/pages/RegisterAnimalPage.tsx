import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  PawPrint, MapPin, Camera, CheckCircle2, ArrowLeft,
  AlertCircle, Upload, Info
} from 'lucide-react';
import { animalsApi } from '../lib/api';
import { addNotification } from '../lib/notifications';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const RegisterAnimalPage: FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    animal_type: 'Dog',
    name_label: '',
    sex: 'Male',
    approximate_age: '',
    color: '',
    breed: '',
    distinctive_features: '',
    latitude: '',
    longitude: '',
    location_accuracy: '',
    notes: '',
  });

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string>('');

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setPhotoError('Please select a valid image (JPG or PNG).');
      toast.error('Invalid file type. Only JPG and PNG allowed.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setPhotoError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
      toast.error(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser.';
      setGpsStatus('Geolocation not supported');
      addNotification({
        title: 'GPS unavailable',
        text: msg,
        category: 'GPS',
        dedupeKey: 'gps-unsupported',
      });
      return;
    }

    setGpsLoading(true);
    setGpsStatus('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const acc = pos.coords.accuracy ? pos.coords.accuracy.toFixed(1) : '';

        setForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          location_accuracy: acc,
        }));
        setGpsLoading(false);
        setGpsStatus(`Location captured ✓ (Accuracy: ±${acc || '10'}m)`);
        addNotification({
          title: 'GPS captured',
          text: `Coordinates saved: ${lat}, ${lng}${acc ? ` (±${acc}m)` : ''}`,
          category: 'GPS',
          dedupeKey: `gps-capture-success:${lat}:${lng}`,
          dedupeWindowMs: 60_000,
        });
      },
      (err) => {
        setGpsLoading(false);
        let msg = 'Unable to capture GPS location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Unable to capture GPS location. Please enable location permission.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS signal unavailable. Please enter coordinates manually.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'GPS request timed out. Please enter coordinates manually.';
        }
        setGpsStatus(msg);
        addNotification({
          title: 'GPS capture warning',
          text: msg,
          category: 'GPS',
          dedupeKey: 'gps-capture-warning',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.animal_type) {
      setError('Animal type is required.');
      toast.error('Please select an animal type.');
      return;
    }

    if (!photo) {
      setError('Animal photo is required.');
      toast.error('Please upload an animal photo.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create Animal Document
      const payload: Record<string, any> = {
        animal_type: form.animal_type,
        name_label: form.name_label || undefined,
        sex: form.sex,
        approximate_age: form.approximate_age || undefined,
        color: form.color || undefined,
        breed: form.breed || undefined,
        distinctive_features: form.distinctive_features || undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        location_accuracy: form.location_accuracy ? parseFloat(form.location_accuracy) : undefined,
        notes: form.notes || undefined,
      };

      const res = await animalsApi.create(payload);
      const createdAnimal = res.data;

      // Step 2: Upload Photo if selected
      if (photo && createdAnimal?.animal_id) {
        try {
          await animalsApi.uploadPhoto(createdAnimal.animal_id, photo);
        } catch (photoErr) {
          console.error('Photo upload failed:', photoErr);
          toast.error('Animal created, but photo upload failed.');
        }
      }

      toast.success('Animal registered successfully!');

      // Invalidate relevant React Query caches
      await qc.invalidateQueries({ queryKey: ['animals'] });
      await qc.invalidateQueries({ queryKey: ['animals-dashboard'] });
      await qc.invalidateQueries({ queryKey: ['analytics'] });

      // Navigate back to Animals List
      navigate('/animals');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Unable to register animal. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button onClick={() => navigate('/animals')} className="btn-ghost mb-3 -ml-2 text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to Animals
        </button>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-[#081A1A]">
          <PawPrint className="h-7 w-7 text-[#2d8a6a]" />
          Register New Animal
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Add a new stray animal to StrayPulse to begin tracking sightings and predicting movement.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 overflow-x-hidden">
        <div className="card space-y-5 p-5 sm:p-6">
          <h2 className="border-b border-[#efe5dc] pb-3 text-base font-semibold text-[#081A1A]">
            Basic Information
          </h2>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Animal Type *</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: 'Dog', icon: '🐕' },
                { type: 'Cat', icon: '🐈' },
                { type: 'Other', icon: '🐾' },
              ].map(({ type, icon }) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setForm((prev) => ({ ...prev, animal_type: type }))}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all duration-200 ${
                    form.animal_type === type
                      ? 'border-[#86c9a2] bg-[#edf8f2] text-[#0f5d3a] shadow-[0_8px_18px_rgba(63,130,98,0.12)]'
                      : 'border-[#e7dfd8] bg-[#f8faf8] text-slate-700 hover:border-[#d6dfe1] hover:bg-[#f3f6f5]'
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label">Animal Name / Label (Optional)</label>
              <input
                name="name_label"
                value={form.name_label}
                onChange={handleChange}
                className="input"
                placeholder="e.g. Bruno, Whitey, Spot"
              />
              <p className="mt-1 text-[11px] text-slate-500">Name used by local feeders or volunteers</p>
            </div>

            <div>
              <label className="label">Sex</label>
              <select name="sex" value={form.sex} onChange={handleChange} className="input">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="label">Approximate Age</label>
              <input
                name="approximate_age"
                value={form.approximate_age}
                onChange={handleChange}
                className="input"
                placeholder="e.g. 3 years, Puppy, Adult"
              />
            </div>
            <div>
              <label className="label">Color</label>
              <input
                name="color"
                value={form.color}
                onChange={handleChange}
                className="input"
                placeholder="e.g. Brown & White, Black"
              />
            </div>
            <div>
              <label className="label">Breed</label>
              <input
                name="breed"
                value={form.breed}
                onChange={handleChange}
                className="input"
                placeholder="e.g. Mixed / Indie, Persian"
              />
            </div>
          </div>

          <div>
            <label className="label">Distinctive Features</label>
            <textarea
              name="distinctive_features"
              value={form.distinctive_features}
              onChange={handleChange}
              rows={2}
              className="input min-h-[88px] resize-none"
              placeholder="e.g. White patch on chest, notched right ear, limps slightly"
            />
          </div>
        </div>

        <div className="card space-y-5 overflow-hidden p-5 sm:p-6">
          <h2 className="flex items-center gap-2 border-b border-[#efe5dc] pb-3 text-base font-semibold text-[#081A1A]">
            <Camera className="h-4 w-4 text-[#2d8a6a]" />
            Animal Photo *
          </h2>

          <label className="block w-full cursor-pointer">
            <div
              className={`w-full overflow-hidden rounded-xl border-2 border-dashed p-4 text-center transition-all sm:p-6 ${
                photoPreview
                  ? 'border-[#86c9a2] bg-[#f3fbf6]'
                  : 'border-[#e7dfd8] bg-[#f8faf8] hover:border-[#b9d9c4]'
              }`}
            >
              {photoPreview ? (
                <div className="space-y-3">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="mx-auto max-h-56 max-w-full rounded-xl border border-[#e7dfd8] object-contain shadow-sm"
                  />
                  <p className="text-xs font-medium text-[#0f5d3a]">Click or tap to replace photo</p>
                </div>
              ) : (
                <div className="py-4">
                  <Upload className="mx-auto mb-2 h-10 w-10 text-[#2d8a6a] opacity-80" />
                  <p className="text-sm font-medium text-slate-800">Click to upload photo</p>
                  <p className="mt-1 text-xs text-slate-500">Supported formats: JPG, PNG, WEBP (Max {MAX_FILE_SIZE_MB}MB)</p>
                </div>
              )}
            </div>
            <input
              id="animal-photo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </label>

          {photoError && <p className="text-xs text-red-600">{photoError}</p>}
        </div>

        <div className="card space-y-5 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-[#efe5dc] pb-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[#081A1A]">
              <MapPin className="h-4 w-4 text-[#2d8a6a]" />
              Initial / Current Location
            </h2>
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Info className="h-3.5 w-3.5" /> Optional / Recommended
            </span>
          </div>

          <button
            type="button"
            id="btn-capture-gps"
            onClick={captureGPS}
            disabled={gpsLoading}
            className="btn-secondary w-full justify-center py-2.5"
          >
            {gpsLoading ? (
              <span className="spinner h-4 w-4" />
            ) : (
              <MapPin className="h-4 w-4 text-[#2d8a6a]" />
            )}
            {gpsLoading ? 'Acquiring GPS Signal…' : 'Capture GPS Location'}
          </button>

          {gpsStatus && (
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
                gpsStatus.includes('✓')
                  ? 'border border-[#9ad3b6] bg-[#edf8f2] text-[#0f5d3a]'
                  : 'border border-[#f2c18d] bg-[#fff7ef] text-[#9d5a21]'
              }`}
            >
              {gpsStatus.includes('✓') ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {gpsStatus}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label">Latitude</label>
              <input
                name="latitude"
                value={form.latitude}
                onChange={handleChange}
                className="input"
                placeholder="e.g. 12.9716"
              />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input
                name="longitude"
                value={form.longitude}
                onChange={handleChange}
                className="input"
                placeholder="e.g. 77.5946"
              />
            </div>
          </div>
        </div>

        <div className="card space-y-5 p-5 sm:p-6">
          <h2 className="border-b border-[#efe5dc] pb-3 text-base font-semibold text-[#081A1A]">
            Notes & Remarks
          </h2>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            className="input min-h-[110px] resize-none"
            placeholder="Enter any additional observations, feeding routines, vaccination status..."
          />
        </div>

        <div className="flex gap-4 pb-2">
          <button
            type="button"
            onClick={() => navigate('/animals')}
            className="btn-ghost flex-1 justify-center py-3"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            id="btn-register-animal-submit"
            disabled={loading}
            className="btn-primary flex-1 justify-center py-3 text-base"
          >
            {loading ? (
              <span className="spinner h-4 w-4 border border-white/30 border-t-white" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {loading ? 'Saving animal...' : 'Register Animal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterAnimalPage;
