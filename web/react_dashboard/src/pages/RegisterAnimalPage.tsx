import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  PawPrint, MapPin, Camera, CheckCircle2, ArrowLeft,
  AlertCircle, Upload, Info
} from 'lucide-react';
import { animalsApi } from '../lib/api';
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
      toast.error('Geolocation is not supported by your browser.');
      setGpsStatus('Geolocation not supported');
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
        toast.success('GPS location captured successfully!');
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
        toast.error(msg);
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
    <div className="p-6 max-w-3xl mx-auto animate-fade-in space-y-6">
      {/* Top Header */}
      <div>
        <button onClick={() => navigate('/animals')} className="btn-ghost text-gray-400 mb-3 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Animals
        </button>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <PawPrint className="w-7 h-7 text-primary-400" />
          Register New Animal
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Add a new stray animal to StrayPulse to begin tracking sightings and predicting movement.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <PawPrint className="w-4 h-4 text-primary-400" />
            Basic Information
          </h2>

          {/* Animal Type Selection */}
          <div>
            <label className="label">Animal Type *</label>
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
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                    form.animal_type === type
                      ? 'bg-primary-500/15 border-primary-500 text-primary-300 shadow-glow-green'
                      : 'bg-dark-700/50 border-white/[0.08] text-gray-300 hover:border-white/20'
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Animal Name / Label (Optional)</label>
              <input
                name="name_label"
                value={form.name_label}
                onChange={handleChange}
                className="input"
                placeholder="e.g. Bruno, Whitey, Spot"
              />
              <p className="text-[11px] text-gray-500 mt-1">Name used by local feeders or volunteers</p>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              className="input resize-none"
              placeholder="e.g. White patch on chest, notched right ear, limps slightly"
            />
          </div>
        </div>

        {/* Photo Upload Card */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Camera className="w-4 h-4 text-primary-400" />
            Animal Photo *
          </h2>

          <label className="block cursor-pointer">
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                photoPreview
                  ? 'border-primary-500/50 bg-primary-500/[0.02]'
                  : 'border-white/[0.1] hover:border-primary-500/40 bg-dark-700/30'
              }`}
            >
              {photoPreview ? (
                <div className="space-y-3">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="max-h-56 mx-auto rounded-xl object-contain border border-white/10 shadow-lg"
                  />
                  <p className="text-xs text-primary-400 font-medium">Click or drag to replace photo</p>
                </div>
              ) : (
                <div className="py-4">
                  <Upload className="w-10 h-10 text-primary-400 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-medium text-white">Click to upload photo</p>
                  <p className="text-xs text-gray-500 mt-1">Supported formats: JPG, PNG, WEBP (Max {MAX_FILE_SIZE_MB}MB)</p>
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

          {photoError && <p className="text-xs text-red-400">{photoError}</p>}
        </div>

        {/* Initial Location Card */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-400" />
              Initial / Current Location
            </h2>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Optional / Recommended
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
              <span className="spinner w-4 h-4" />
            ) : (
              <MapPin className="w-4 h-4 text-primary-400" />
            )}
            {gpsLoading ? 'Acquiring GPS Signal…' : 'Capture GPS Location'}
          </button>

          {gpsStatus && (
            <div
              className={`text-xs p-3 rounded-xl flex items-center gap-2 ${
                gpsStatus.includes('✓')
                  ? 'bg-primary-500/10 border border-primary-500/30 text-primary-300'
                  : 'bg-orange-500/10 border border-orange-500/30 text-orange-400'
              }`}
            >
              {gpsStatus.includes('✓') ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {gpsStatus}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Additional Notes Card */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-white border-b border-white/[0.06] pb-3">
            Notes & Remarks
          </h2>
          <div>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="input resize-none"
              placeholder="Enter any additional observations, feeding routines, vaccination status..."
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex gap-4">
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
              <span className="spinner w-4 h-4 border border-white/30 border-t-white" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {loading ? 'Saving animal...' : 'Register Animal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterAnimalPage;
