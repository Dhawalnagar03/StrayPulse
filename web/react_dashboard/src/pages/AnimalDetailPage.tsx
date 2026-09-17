import { useState, type FC, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PawPrint, MapPin, Clock, Eye, Brain, CheckCircle2,
  XCircle, AlertTriangle, TrendingUp, ArrowLeft,
  Edit3, Trash2, X
} from 'lucide-react';
import { animalsApi, sightingsApi, predictionsApi } from '../lib/api';
import type { Animal, Sighting, Prediction, PredictionInsufficientData } from '../types';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const MapComponent = lazy(() => import('../components/AnimalMap'));

const confidenceColor = (c: number) =>
  c >= 0.75 ? 'text-primary-400' : c >= 0.50 ? 'text-orange-400' : 'text-red-400';
const confidenceBg = (c: number) =>
  c >= 0.75 ? 'bg-primary-500' : c >= 0.50 ? 'bg-orange-500' : 'bg-red-500';

const AnimalDetailPage: FC = () => {
  const { animalId } = useParams<{ animalId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    name_label: '',
    sex: 'Male',
    approximate_age: '',
    color: '',
    breed: '',
    distinctive_features: '',
    status: 'Active',
    notes: '',
  });

  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imgError, setImgError] = useState(false);

  const { data: animal, isLoading: animalLoading, refetch: refetchAnimal } = useQuery<Animal>({
    queryKey: ['animal', animalId],
    queryFn: () =>
      animalsApi.get(animalId!).then((r) => {
        const d = r.data;
        setEditForm({
          name_label: d.name_label || '',
          sex: d.sex || 'Unknown',
          approximate_age: d.approximate_age || '',
          color: d.color || '',
          breed: d.breed || '',
          distinctive_features: d.distinctive_features || '',
          status: d.status || 'Active',
          notes: d.notes || '',
        });
        return d;
      }),
    enabled: !!animalId,
  });

  const { data: sightings = [] } = useQuery<Sighting[]>({
    queryKey: ['sightings', animalId],
    queryFn: () => sightingsApi.getForAnimal(animalId!, { limit: 100 }).then((r) => r.data),
    enabled: !!animalId,
  });

  const { data: predictionData, isLoading: predLoading } = useQuery({
    queryKey: ['prediction', animalId],
    queryFn: () => predictionsApi.get(animalId!, 8).then((r) => r.data),
    enabled: !!animalId,
    retry: false,
  });

  const prediction = predictionData && 'confidence' in predictionData ? predictionData as Prediction : null;
  const predInsufficient = predictionData && 'minimum_required' in predictionData ? predictionData as PredictionInsufficientData : null;

  if (animalLoading) {
    return <div className="flex items-center justify-center h-full"><div className="spinner" /></div>;
  }
  if (!animal) {
    return <div className="p-6 text-red-400">Animal not found: {animalId}</div>;
  }

  // Time-of-day breakdown
  const timeBreakdown = sightings.reduce((acc: Record<string, number>, s) => {
    acc[s.time_of_day] = (acc[s.time_of_day] || 0) + 1;
    return acc;
  }, {});

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await animalsApi.update(animalId!, editForm);
      toast.success('Animal details updated!');
      setIsEditOpen(false);
      refetchAnimal();
      qc.invalidateQueries({ queryKey: ['animals'] });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update animal');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await animalsApi.delete(animalId!);
      toast.success(res.data.message || 'Animal deleted successfully');
      setIsDeleteOpen(false);
      qc.invalidateQueries({ queryKey: ['animals'] });
      qc.invalidateQueries({ queryKey: ['animals-count'] });
      navigate('/animals');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete animal');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Back + Header */}
      <div>
        <button onClick={() => navigate('/animals')} className="btn-ghost text-gray-400 mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4" />Back to Animals
        </button>
        <div className="flex items-start gap-5">
          {/* Photo */}
          <div className="w-24 h-24 rounded-2xl bg-dark-700 border border-white/[0.08] flex items-center justify-center text-5xl flex-shrink-0 overflow-hidden shadow-glow-green">
            {animal.primary_photo && !imgError ? (
              <img
                src={animal.primary_photo}
                alt={animal.animal_id}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              animal.animal_type === 'Dog' ? '🐕' : animal.animal_type === 'Cat' ? '🐈' : '🐾'
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-white font-mono">{animal.animal_id}</h1>
                {animal.is_demo && <span className="badge-orange">Demo Data</span>}
                <span className={animal.status === 'Active' ? 'badge-green' : 'badge-gray'}>
                  {animal.status === 'Active' ? '🟢' : '⚫'} {animal.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-edit-animal"
                  onClick={() => setIsEditOpen(true)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  id="btn-delete-animal"
                  onClick={() => setIsDeleteOpen(true)}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-medium px-3 py-1.5 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
            <p className="text-gray-300 mt-1">{animal.name_label || 'Unknown'} • {animal.animal_type} • {animal.sex}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-400">
              <span><Eye className="w-4 h-4 inline mr-1" />{animal.total_sightings} sightings</span>
              {animal.last_seen_at && (
                <span><Clock className="w-4 h-4 inline mr-1" />
                  Last: {format(parseISO(animal.last_seen_at), 'MMM d, h:mm a')}
                </span>
              )}
              {animal.color && <span>🎨 {animal.color}</span>}
              {animal.breed && <span>🐾 {animal.breed}</span>}
              {animal.approximate_age && <span>📅 {animal.approximate_age}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: prediction + analytics */}
        <div className="space-y-5">
          {/* AI Prediction Card */}
          <div className="prediction-card">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-primary-400" />
              <h2 className="font-semibold text-white">AI Prediction</h2>
              <span className="badge-purple text-[10px] ml-auto">
                {prediction?.model_name || 'AI'}
              </span>
            </div>

            {predLoading && (
              <div className="text-center py-6">
                <div className="spinner mx-auto mb-2 w-6 h-6" />
                <p className="text-gray-400 text-sm">Generating prediction…</p>
              </div>
            )}

            {prediction && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Likely Location Tomorrow</p>
                  <p className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-400" />
                    {prediction.predicted_zone}
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 bg-dark-700/50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Expected Time</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{prediction.time_start} – {prediction.time_end}</p>
                  </div>
                  <div className="flex-1 bg-dark-700/50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Confidence</p>
                    <p className={`text-xl font-bold mt-0.5 ${confidenceColor(prediction.confidence)}`}>
                      {prediction.confidence_percent}%
                    </p>
                  </div>
                </div>
                {/* Confidence bar */}
                <div>
                  <div className="confidence-bar">
                    <div
                      className={`confidence-fill ${confidenceBg(prediction.confidence)}`}
                      style={{ width: `${prediction.confidence_percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{prediction.confidence_label} confidence</p>
                </div>

                {/* Factors */}
                {prediction.factors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Why this location?</p>
                    <div className="space-y-1.5">
                      {prediction.factors.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary-400 flex-shrink-0 mt-0.5" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-gray-600 mt-2">
                  Based on {prediction.training_sightings_used} sightings • {format(new Date(prediction.generated_at), 'h:mm a')}
                </p>
                <p className="text-[10px] text-yellow-600 italic">
                  ⚠ Predictions are estimates. Actual location may vary.
                </p>
              </div>
            )}

            {predInsufficient && (
              <div className="text-center py-4">
                <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <p className="text-white text-sm font-medium">Insufficient Data</p>
                <p className="text-gray-400 text-xs mt-1">{predInsufficient.sightings_count} / {predInsufficient.minimum_required} sightings</p>
                <div className="confidence-bar mt-3">
                  <div className="confidence-fill bg-orange-500"
                    style={{ width: `${(predInsufficient.sightings_count / predInsufficient.minimum_required) * 100}%` }} />
                </div>
                <p className="text-gray-500 text-xs mt-2">{predInsufficient.suggestion}</p>
              </div>
            )}
          </div>

          {/* Time-of-day breakdown */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Activity Pattern</h3>
            {['Morning', 'Afternoon', 'Evening', 'Night'].map((tod) => {
              const count = timeBreakdown[tod] || 0;
              const pct = sightings.length ? (count / sightings.length) * 100 : 0;
              const icons: Record<string, string> = { Morning: '🌅', Afternoon: '☀️', Evening: '🌆', Night: '🌙' };
              return (
                <div key={tod} className="flex items-center gap-3 mb-2">
                  <span className="text-sm w-4">{icons[tod]}</span>
                  <p className="text-xs text-gray-400 w-20">{tod}</p>
                  <div className="flex-1 confidence-bar">
                    <div className="confidence-fill bg-primary-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 w-8 text-right">{count}</p>
                </div>
              );
            })}
          </div>

          {/* Animal details */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Type', animal.animal_type],
                ['Breed', animal.breed],
                ['Color', animal.color],
                ['Age', animal.approximate_age],
                ['Sex', animal.sex],
                ['Distinctive', animal.distinctive_features],
                ['Initial Lat', animal.initial_lat !== undefined && animal.initial_lat !== null ? animal.initial_lat.toFixed(4) : null],
                ['Initial Lng', animal.initial_lng !== undefined && animal.initial_lng !== null ? animal.initial_lng.toFixed(4) : null],
                ['Registered On', animal.created_at ? format(parseISO(animal.created_at), 'MMM d, yyyy') : null],
              ].filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-500">{k}</span>
                  <span className="text-gray-200 font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
            {animal.notes && (
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <p className="text-xs font-medium text-gray-400 mb-1">Notes</p>
                <p className="text-xs text-gray-300 bg-dark-700/50 p-2.5 rounded-lg leading-relaxed">{animal.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: map + sightings */}
        <div className="lg:col-span-2 space-y-5">
          {/* Map */}
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Movement Map</h3>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />Historical</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary-500 inline-block" />Latest</span>
                {prediction && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />Predicted</span>}
              </div>
            </div>
            <div className="h-72">
              <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="spinner" /></div>}>
                <MapComponent
                  sightings={sightings}
                  prediction={prediction || undefined}
                  animalId={animalId!}
                />
              </Suspense>
            </div>
          </div>

          {/* Sightings table */}
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">Sighting History ({sightings.length})</h3>
            </div>
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-dark-800">
                  <tr>
                    {['Date & Time', 'Location', 'Time of Day', 'Weather', 'Status'].map((h) => (
                      <th key={h} className="table-header text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sightings.map((s) => (
                    <tr key={s.id} className="table-row">
                      <td className="table-cell whitespace-nowrap">{format(parseISO(s.timestamp), 'MMM d, h:mm a')}</td>
                      <td className="table-cell text-xs font-mono">{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</td>
                      <td className="table-cell">{s.time_of_day}</td>
                      <td className="table-cell">{s.weather_condition || '—'}</td>
                      <td className="table-cell">
                        <span className={
                          s.verification_status === 'Verified' ? 'badge-green' :
                          s.verification_status === 'Rejected' ? 'badge-red' : 'badge-gray'
                        }>{s.verification_status}</span>
                      </td>
                    </tr>
                  ))}
                  {sightings.length === 0 && (
                    <tr><td colSpan={5} className="table-cell text-center text-gray-500 py-8">No sightings recorded yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Animal Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-white/[0.1] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-primary-400" />
                Edit Animal ({animal.animal_id})
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="label">Animal ID (Read-only)</label>
                <input value={animal.animal_id} disabled className="input font-mono opacity-60 bg-dark-900 cursor-not-allowed" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Name / Label</label>
                  <input
                    value={editForm.name_label}
                    onChange={(e) => setEditForm((f) => ({ ...f, name_label: e.target.value }))}
                    className="input"
                    placeholder="e.g. Bruno"
                  />
                </div>
                <div>
                  <label className="label">Sex</label>
                  <select
                    value={editForm.sex}
                    onChange={(e) => setEditForm((f) => ({ ...f, sex: e.target.value }))}
                    className="input"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Age</label>
                  <input
                    value={editForm.approximate_age}
                    onChange={(e) => setEditForm((f) => ({ ...f, approximate_age: e.target.value }))}
                    className="input"
                    placeholder="e.g. 3 years"
                  />
                </div>
                <div>
                  <label className="label">Color</label>
                  <input
                    value={editForm.color}
                    onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                    className="input"
                    placeholder="e.g. Brown & White"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Breed</label>
                  <input
                    value={editForm.breed}
                    onChange={(e) => setEditForm((f) => ({ ...f, breed: e.target.value }))}
                    className="input"
                    placeholder="e.g. Indie / Mixed"
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                    className="input"
                  >
                    <option value="Active">Active</option>
                    <option value="Missing from recent sightings">Missing</option>
                    <option value="Adopted">Adopted</option>
                    <option value="Relocated">Relocated</option>
                    <option value="Deceased">Deceased</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Distinctive Features</label>
                <textarea
                  value={editForm.distinctive_features}
                  onChange={(e) => setEditForm((f) => ({ ...f, distinctive_features: e.target.value }))}
                  className="input resize-none h-16"
                />
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input resize-none h-16"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn-ghost flex-1 justify-center"
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-edit-animal"
                  className="btn-primary flex-1 justify-center"
                  disabled={savingEdit}
                >
                  {savingEdit ? <span className="spinner w-4 h-4" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Delete Animal</h3>
              <p className="text-sm text-gray-400 mt-1">
                Are you sure you want to delete <span className="text-white font-bold">{animal.animal_id} ({animal.name_label || animal.animal_type})</span>?
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {animal.total_sightings > 0
                  ? 'This animal has historical sightings and will be archived instead of permanently deleted.'
                  : 'This action cannot be undone.'}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="btn-ghost flex-1 justify-center"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-animal"
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium py-2.5 flex-1 justify-center transition-colors"
                disabled={deleting}
              >
                {deleting ? <span className="spinner w-4 h-4" /> : 'Delete Animal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimalDetailPage;
