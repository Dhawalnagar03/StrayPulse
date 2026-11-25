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
import { formatDateIST, formatDateTimeIST, formatTimeIST } from '../lib/date';
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
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <button onClick={() => navigate('/animals')} className="btn-ghost -ml-2 mb-4 text-slate-600">
          <ArrowLeft className="h-4 w-4" />Back to Animals
        </button>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e8dfd7] bg-[#f7f2ee] text-5xl shadow-[0_10px_25px_rgba(8,26,26,0.06)]">
            {animal.primary_photo && !imgError ? (
              <img
                src={animal.primary_photo}
                alt={animal.animal_id}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              animal.animal_type === 'Dog' ? '🐕' : animal.animal_type === 'Cat' ? '🐈' : '🐾'
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-2xl font-bold text-[#081A1A]">{animal.animal_id}</h1>
                <span className={animal.status === 'Active' ? 'badge-green' : 'badge-gray'}>
                  {animal.status === 'Active' ? '🟢' : '⚫'} {animal.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-edit-animal"
                  onClick={() => setIsEditOpen(true)}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  id="btn-delete-animal"
                  onClick={() => setIsDeleteOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
            <p className="mt-1 text-slate-600">{animal.name_label || 'Unknown'} • {animal.animal_type} • {animal.sex}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
              <span><Eye className="mr-1 inline h-4 w-4" />{animal.total_sightings} sightings</span>
              {animal.last_seen_at && (
                <span>
                  <Clock className="mr-1 inline h-4 w-4" />
                  Last: {formatDateTimeIST(animal.last_seen_at)}
                </span>
              )}
              {animal.color && <span>🎨 {animal.color}</span>}
              {animal.breed && <span>🐾 {animal.breed}</span>}
              {animal.approximate_age && <span>📅 {animal.approximate_age}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
        <div className="space-y-5">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#dc2101]" />
              <h2 className="text-lg font-semibold text-[#081A1A]">AI Prediction</h2>
              <span className="badge-purple ml-auto text-[10px]">
                {prediction?.model_name || 'AI'}
              </span>
            </div>

            {predLoading && (
              <div className="py-6 text-center">
                <div className="spinner mx-auto mb-2 h-6 w-6" />
                <p className="text-sm text-slate-500">Generating prediction…</p>
              </div>
            )}

            {prediction && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Likely Location Tomorrow</p>
                  <p className="mt-1 flex items-center gap-2 text-lg font-bold text-[#081A1A]">
                    <MapPin className="h-4 w-4 text-[#dc2101]" />
                    {prediction.predicted_zone}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#fffaf5] p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Expected Time</p>
                    <p className="mt-1 text-sm font-semibold text-[#081A1A]">{prediction.time_start} – {prediction.time_end}</p>
                  </div>
                  <div className="rounded-xl bg-[#fffaf5] p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Confidence</p>
                    <p className={`mt-1 text-xl font-bold ${confidenceColor(prediction.confidence)}`}>
                      {prediction.confidence_percent}%
                    </p>
                  </div>
                </div>
                <div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${confidenceBg(prediction.confidence)}`}
                      style={{ width: `${prediction.confidence_percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{prediction.confidence_label} confidence</p>
                </div>

                {prediction.factors.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Why this location?</p>
                    <div className="space-y-1.5">
                      {prediction.factors.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#dc2101]" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="mt-2 text-[10px] text-slate-500">
                  Based on {prediction.training_sightings_used} sightings • {formatTimeIST(prediction.generated_at)}
                </p>
                <p className="text-[10px] italic text-amber-700">
                  ⚠ Predictions are estimates. Actual location may vary.
                </p>
              </div>
            )}

            {predInsufficient && (
              <div className="py-4 text-center">
                <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-amber-500" />
                <p className="text-sm font-medium text-[#081A1A]">Insufficient Data</p>
                <p className="mt-1 text-xs text-slate-500">{predInsufficient.sightings_count} / {predInsufficient.minimum_required} sightings</p>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${(predInsufficient.sightings_count / predInsufficient.minimum_required) * 100}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{predInsufficient.suggestion}</p>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-[#081A1A]">Activity Pattern</h3>
            {['Morning', 'Afternoon', 'Evening', 'Night'].map((tod) => {
              const count = timeBreakdown[tod] || 0;
              const pct = sightings.length ? (count / sightings.length) * 100 : 0;
              const icons: Record<string, string> = { Morning: '🌅', Afternoon: '☀️', Evening: '🌆', Night: '🌙' };
              return (
                <div key={tod} className="mb-2 flex items-center gap-3">
                  <span className="w-4 text-sm">{icons[tod]}</span>
                  <p className="w-20 text-xs text-slate-500">{tod}</p>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#dc2101]" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="w-8 text-right text-xs text-slate-500">{count}</p>
                </div>
              );
            })}
          </div>

          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-[#081A1A]">Details</h3>
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
                ['Registered On', animal.created_at ? formatDateIST(animal.created_at) : null],
              ].filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5">
                  <span className="text-sm text-slate-500">{k}</span>
                  <span className="text-right text-sm font-semibold text-[#081A1A]">{String(v)}</span>
                </div>
              ))}
            </div>
            {animal.notes && (
              <div className="mt-4 border-t border-[#efe7df] pt-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Notes</p>
                <p className="rounded-xl bg-[#fffaf5] p-3 text-xs leading-relaxed text-slate-700">{animal.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-[#efe7df] p-4">
              <h3 className="text-sm font-semibold text-[#081A1A]">Movement Map</h3>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-blue-500" />Historical</span>
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-[#dc2101]" />Latest</span>
                {prediction && <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-violet-500" />Predicted</span>}
              </div>
            </div>
            <div className="min-h-[320px]">
              <Suspense fallback={<div className="flex h-full min-h-[320px] items-center justify-center"><div className="spinner" /></div>}>
                <MapComponent
                  sightings={sightings}
                  prediction={prediction || undefined}
                  animalId={animalId!}
                />
              </Suspense>
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="border-b border-[#efe7df] p-4">
              <h3 className="text-sm font-semibold text-[#081A1A]">Sighting History ({sightings.length})</h3>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-[#f7f2ee] text-left">
                  <tr>
                    {['Date & Time', 'Location', 'Time of Day', 'Weather', 'Status'].map((h) => (
                      <th key={h} className="border-b border-[#efe7df] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sightings.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-[#fffaf5]">
                      <td className="border-b border-[#f1e9e3] px-4 py-3 text-sm text-[#081A1A] whitespace-nowrap">{formatDateTimeIST(s.timestamp)}</td>
                      <td className="border-b border-[#f1e9e3] px-4 py-3 text-xs font-mono text-slate-700">{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</td>
                      <td className="border-b border-[#f1e9e3] px-4 py-3 text-sm text-slate-700">{s.time_of_day}</td>
                      <td className="border-b border-[#f1e9e3] px-4 py-3 text-sm text-slate-700">{s.weather_condition || '—'}</td>
                      <td className="border-b border-[#f1e9e3] px-4 py-3">
                        <span className={
                          s.verification_status === 'Verified' ? 'badge-green' :
                          s.verification_status === 'Rejected' ? 'badge-red' : 'badge-gray'
                        }>{s.verification_status}</span>
                      </td>
                    </tr>
                  ))}
                  {sightings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No sightings recorded yet</td>
                    </tr>
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
