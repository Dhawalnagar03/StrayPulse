import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('sp_token');
      localStorage.removeItem('sp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: object) => api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ── Animals ───────────────────────────────────────────────────────────────────
export const animalsApi = {
  list: (params?: object) => api.get('/animals/', { params }),
  count: () => api.get('/animals/count'),
  get: (animalId: string) => api.get(`/animals/${animalId}`),
  create: (data: object) => api.post('/animals/', data),
  update: (animalId: string, data: object) => api.put(`/animals/${animalId}`, data),
  delete: (animalId: string) => api.delete(`/animals/${animalId}`),
  uploadPhoto: (animalId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/animals/${animalId}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  detectAndMatch: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/animals/detect', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ── Sightings ─────────────────────────────────────────────────────────────────
export const sightingsApi = {
  submit: (data: object) => api.post('/sightings/', data),
  getForAnimal: (animalId: string, params?: object) =>
    api.get(`/sightings/animal/${animalId}`, { params }),
  getNearby: (lat: number, lng: number, radiusKm?: number) =>
    api.get('/sightings/nearby', { params: { lat, lng, radius_km: radiusKm || 2 } }),
  uploadPhoto: (sightingId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/sightings/${sightingId}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  verify: (sightingId: string, status: string) =>
    api.put(`/sightings/${sightingId}/verify`, { status }),
};

// ── Predictions ───────────────────────────────────────────────────────────────
export const predictionsApi = {
  get: (animalId: string, hour?: number) =>
    api.get(`/predictions/${animalId}`, { params: hour !== undefined ? { hour } : {} }),
  list: (confidenceMin?: number) =>
    api.get('/predictions/', { params: { confidence_min: confidenceMin || 0 } }),
};

// ── Feeding Locations ─────────────────────────────────────────────────────────
export const feedingApi = {
  list: () => api.get('/feeding-locations/'),
  get: (id: string) => api.get(`/feeding-locations/${id}`),
  create: (data: object) => api.post('/feeding-locations/', data),
};

// ── Environmental ─────────────────────────────────────────────────────────────
export const envApi = {
  list: (envType?: string) => api.get('/environment/', { params: envType ? { env_type: envType } : {} }),
  create: (data: object) => api.post('/environment/', data),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  analytics: () => api.get('/admin/analytics'),
  users: (params?: object) => api.get('/admin/users', { params }),
  modelVersions: () => api.get('/admin/model-versions'),
  suspicious: () => api.get('/admin/suspicious-sightings'),
  mlStatus: () => api.get('/ml/status'),
  mlEvaluation: () => api.get('/ml/evaluation-results'),
  triggerTraining: () => api.post('/ml/trigger-training'),
};
