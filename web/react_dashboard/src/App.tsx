import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Lazy load pages for code splitting
const DashboardPage    = lazy(() => import('./pages/DashboardPage'));
const AnimalsPage      = lazy(() => import('./pages/AnimalsPage'));
const AnimalDetailPage = lazy(() => import('./pages/AnimalDetailPage'));
const RegisterAnimalPage = lazy(() => import('./pages/RegisterAnimalPage'));
const MapPage          = lazy(() => import('./pages/MapPage'));
const AdminPage        = lazy(() => import('./pages/AdminPage'));
const SubmitSightingPage = lazy(() => import('./pages/SubmitSightingPage'));
const FeedingPage        = lazy(() => import('./pages/FeedingPage'));

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[300px]">
    <div className="spinner" />
  </div>
);

function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><Layout><Suspense fallback={<PageLoader />}><Navigate to="/dashboard" replace /></Suspense></Layout></ProtectedRoute>} />

          <Route path="/dashboard" element={
            <ProtectedRoute><Layout>
              <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
            </Layout></ProtectedRoute>
          } />

          <Route path="/animals" element={
            <ProtectedRoute><Layout>
              <Suspense fallback={<PageLoader />}><AnimalsPage /></Suspense>
            </Layout></ProtectedRoute>
          } />

          <Route path="/animals/new" element={
            <ProtectedRoute><Layout>
              <Suspense fallback={<PageLoader />}><RegisterAnimalPage /></Suspense>
            </Layout></ProtectedRoute>
          } />

          <Route path="/animals/:animalId" element={
            <ProtectedRoute><Layout>
              <Suspense fallback={<PageLoader />}><AnimalDetailPage /></Suspense>
            </Layout></ProtectedRoute>
          } />

          <Route path="/sightings/new" element={
            <ProtectedRoute><Layout>
              <Suspense fallback={<PageLoader />}><SubmitSightingPage /></Suspense>
            </Layout></ProtectedRoute>
          } />

          <Route path="/sightings" element={
            <ProtectedRoute><Layout>
              <Suspense fallback={<PageLoader />}><SubmitSightingPage /></Suspense>
            </Layout></ProtectedRoute>
          } />

          <Route path="/map" element={
            <ProtectedRoute><Layout>
              <Suspense fallback={<PageLoader />}><MapPage /></Suspense>
            </Layout></ProtectedRoute>
          } />

          <Route path="/feeding" element={
            <ProtectedRoute><Layout>
              <Suspense fallback={<PageLoader />}><FeedingPage /></Suspense>
            </Layout></ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}><Layout>
              <Suspense fallback={<PageLoader />}><AdminPage /></Suspense>
            </Layout></ProtectedRoute>
          } />

          <Route path="/admin/ml" element={
            <ProtectedRoute allowedRoles={['admin']}><Layout>
              <Suspense fallback={<PageLoader />}><AdminPage /></Suspense>
            </Layout></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
