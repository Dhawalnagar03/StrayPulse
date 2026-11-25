import { useState, type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PawPrint, Search, Plus, MapPin, Clock } from 'lucide-react';
import { animalsApi } from '../lib/api';
import type { Animal } from '../types';
import { formatDateTimeIST } from '../lib/date';

const statusColor = (status: string) => {
  switch (status) {
    case 'Active': return 'badge-green';
    case 'Missing from recent sightings': return 'badge-orange';
    case 'Adopted': return 'badge-blue';
    case 'Deceased': return 'badge-red';
    default: return 'badge-gray';
  }
};

const typeIcon = (type: string) => {
  const map: Record<string, string> = { Dog: '🐕', Cat: '🐈', Other: '🐾', Unknown: '❓' };
  return map[type] || '🐾';
};

const AnimalsPage: FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const { data: countData } = useQuery({
    queryKey: ['animals-count'],
    queryFn: () => animalsApi.count().then((r) => r.data),
    staleTime: 10000,
  });

  const { data: animals = [], isLoading } = useQuery<Animal[]>({
    queryKey: ['animals', search, typeFilter, statusFilter],
    queryFn: () =>
      animalsApi.list({
        search: search || undefined,
        animal_type: typeFilter || undefined,
        status: statusFilter || undefined,
        limit: 100,
      }).then((r) => r.data),
    staleTime: 10000,
  });

  const totalCount = countData?.count !== undefined ? countData.count : animals.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#dc2101]">Registry</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Animals</h1>
          <p className="mt-1 text-sm text-slate-500">
            {totalCount} registered {totalCount === 1 ? 'animal' : 'animals'}
          </p>
        </div>

        <button id="btn-add-animal" onClick={() => navigate('/animals/new')} className="btn-primary">
          <Plus className="h-4 w-4" />
          Register Animal
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="animal-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
            placeholder="Search by ID or name…"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input w-36">
          <option value="">All Types</option>
          <option value="Dog">Dog</option>
          <option value="Cat">Cat</option>
          <option value="Other">Other</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-44">
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Missing from recent sightings">Missing</option>
          <option value="Adopted">Adopted</option>
          <option value="Deceased">Deceased</option>
        </select>
      </div>

      {isLoading ? (
        <div className="card flex min-h-[240px] items-center justify-center">
          <div className="spinner" />
        </div>
      ) : animals.length === 0 ? (
        <div className="card py-20 text-center">
          <PawPrint className="mx-auto mb-3 h-12 w-12 text-slate-400" />
          <p className="text-lg font-medium text-slate-900">No animals found</p>
          <p className="mt-1 text-sm text-slate-500">Try adjusting your search or register a new animal</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {animals.map((animal) => (
            <div
              key={animal.animal_id}
              onClick={() => navigate(`/animals/${animal.animal_id}`)}
              className="card-hover p-4"
            >
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-[#fff7f2] text-3xl shadow-sm">
                  {animal.primary_photo && !imgErrors[animal.animal_id] ? (
                    <img
                      src={animal.primary_photo}
                      alt={animal.animal_id}
                      className="h-full w-full object-cover"
                      onError={() => setImgErrors((prev) => ({ ...prev, [animal.animal_id]: true }))}
                    />
                  ) : (
                    typeIcon(animal.animal_type)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 font-mono">{animal.animal_id}</p>
                    {animal.is_demo && <span className="badge-orange text-[10px]">Demo</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{animal.name_label || animal.animal_type}</p>
                  <div className="mt-2">
                    <span className={statusColor(animal.status)}>
                      {animal.status === 'Active' ? '🟢' : '⚫'} {animal.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-50 p-2 text-center">
                  <p className="text-[11px] text-slate-500">Sightings</p>
                  <p className="text-sm font-bold text-slate-900">{animal.total_sightings}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 text-center">
                  <p className="text-[11px] text-slate-500">Type</p>
                  <p className="text-sm font-bold text-slate-900">{animal.animal_type}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 text-center">
                  <p className="text-[11px] text-slate-500">Sex</p>
                  <p className="text-sm font-bold text-slate-900">{animal.sex}</p>
                </div>
              </div>

              {animal.last_seen_at && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  Last seen {formatDateTimeIST(animal.last_seen_at)}
                </div>
              )}
              {animal.most_common_area && (
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  Common: {animal.most_common_area}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnimalsPage;
