import { useState, type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PawPrint, Search, Filter, Plus, Eye, MapPin, Clock } from 'lucide-react';
import { animalsApi } from '../lib/api';
import type { Animal } from '../types';
import { format, parseISO } from 'date-fns';

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
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Animals</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {totalCount} registered {totalCount === 1 ? 'animal' : 'animals'}
            {animals.some((a) => a.is_demo) && <span className="badge-orange ml-2">Demo Data</span>}
          </p>
        </div>
        <button id="btn-add-animal" onClick={() => navigate('/animals/new')} className="btn-primary">
          <Plus className="w-4 h-4" />
          Register Animal
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
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

      {/* Animals grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="spinner" />
        </div>
      ) : animals.length === 0 ? (
        <div className="text-center py-20">
          <PawPrint className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-lg font-medium">No animals found</p>
          <p className="text-gray-600 text-sm">Try adjusting your search or register a new animal</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {animals.map((animal) => (
            <div
              key={animal.animal_id}
              onClick={() => navigate(`/animals/${animal.animal_id}`)}
              className="card-hover animate-slide-up"
            >
              {/* Top: photo + ID */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-dark-700 border border-white/[0.08] flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden shadow-inner">
                  {animal.primary_photo && !imgErrors[animal.animal_id] ? (
                    <img
                      src={animal.primary_photo}
                      alt={animal.animal_id}
                      className="w-full h-full object-cover"
                      onError={() => setImgErrors((prev) => ({ ...prev, [animal.animal_id]: true }))}
                    />
                  ) : (
                    typeIcon(animal.animal_type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-white font-mono text-sm">{animal.animal_id}</p>
                    {animal.is_demo && <span className="badge-orange text-[10px]">Demo</span>}
                  </div>
                  <p className="text-gray-400 text-sm">{animal.name_label || animal.animal_type}</p>
                  <div className="mt-1.5">
                    <span className={statusColor(animal.status)}>
                      {animal.status === 'Active' ? '🟢' : '⚫'} {animal.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-dark-700/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Sightings</p>
                  <p className="text-sm font-bold text-white">{animal.total_sightings}</p>
                </div>
                <div className="bg-dark-700/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="text-sm font-bold text-white">{animal.animal_type}</p>
                </div>
                <div className="bg-dark-700/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Sex</p>
                  <p className="text-sm font-bold text-white">{animal.sex}</p>
                </div>
              </div>

              {/* Last seen */}
              {animal.last_seen_at && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  Last seen {format(parseISO(animal.last_seen_at), 'MMM d, h:mm a')}
                </div>
              )}
              {animal.most_common_area && (
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
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
