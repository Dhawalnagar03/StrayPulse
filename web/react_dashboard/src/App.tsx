import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy, useEffect } from 'react';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AnimalsPage = lazy(() => import('./pages/AnimalsPage'));
const AnimalDetailPage = lazy(() => import('./pages/AnimalDetailPage'));
const RegisterAnimalPage = lazy(() => import('./pages/RegisterAnimalPage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const PredictionsPage = lazy(() => import('./pages/PredictionsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SubmitSightingPage = lazy(() => import('./pages/SubmitSightingPage'));
const FeedingPage = lazy(() => import('./pages/FeedingPage'));

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex min-h-[280px] items-center justify-center">
    <div className="spinner" />
  </div>
);

const SETTINGS_STORAGE_KEY = 'straypulse-settings';

const syncThemeFromSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const nextTheme = raw ? JSON.parse(raw)?.theme === 'dark' ? 'dark' : 'light' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.documentElement.style.colorScheme = nextTheme;
  } catch {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.colorScheme = 'light';
  }
};

function AppShell() {
  const location = useLocation();

  useEffect(() => {
    syncThemeFromSettings();
  }, [location.pathname]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={<ProtectedRoute><Layout><Suspense fallback={<PageLoader />}><Navigate to="/dashboard" replace /></Suspense></Layout></ProtectedRoute>} />

        <Route path="/dashboard" element={<ProtectedRoute><Layout><Suspense fallback={<PageLoader />}><DashboardPage /></Suspense></Layout></ProtectedRoute>} />
        <Route path="/animals" element={<ProtectedRoute><Layout><Suspense fallback={<PageLoader />}><AnimalsPage /></Suspense></Layout></ProtectedRoute>} />
        <Route path="/animals/new" element={<ProtectedRoute><Layout><Suspense fallback={<PageLoader />}><RegisterAnimalPage /></Suspense></Layout></ProtectedRoute>} />
        <Route path="/animals/:animalId" element={<ProtectedRoute><Layout><Suspense fallback={<PageLoader />}><AnimalDetailPage /></Suspense></Layout></ProtectedRoute>} />
        <Route path="/sightings/new" element={<ProtectedRoute><Layout><Suspense fallback={<PageLoader />}><SubmitSightingPage /></Suspense></Layout></ProtectedRoute>} />
        <Route path="/sightings" element={<ProtectedRoute><Layout><Suspense fallback={<PageLoader />}><SubmitSightingPage /></Suspense></Layout></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><Layout><Suspense fallback={<PageLoader />}><MapPage /></Suspense></Layout></ProtectedRoute>} />
        <Route path="/predictions" element={<ProtectedRoute><Layout><Suspense fallback={<PageLoader />}><PredictionsPage /></Suspense></Layout></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin']}><Layout><Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense></Layout></ProtectedRoute>} />
        <Route path="/feeding" element={<ProtectedRoute><Layout><Suspense fallback={<PageLoader />}><FeedingPage /></Suspense></Layout></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Layout><Suspense fallback={<PageLoader />}><AdminPage /></Suspense></Layout></ProtectedRoute>} />
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#14b8a6', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
