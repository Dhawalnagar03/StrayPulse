import { useState, type FC } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PawPrint, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

const LoginPage: FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const { access_token, user_id, role, name } = res.data;
      login(access_token, { id: user_id, name, email, role, is_active: true, total_sightings: 0, created_at: '' });
      toast.success(`Welcome back, ${name}!`);
      navigate('/dashboard');
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot reach the server. Make sure the backend is running on port 8000.');
      } else {
        setError(err.response?.data?.detail || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'admin' | 'citizen') => {
    if (role === 'admin') {
      setEmail('admin@straypulse.org');
      setPassword('Admin@StrayPulse2026!');
    } else {
      setEmail('citizen@demo.com');
      setPassword('Demo@1234!');
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      {/* Glow background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] bg-accent-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4 shadow-glow-green">
            <PawPrint className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to StrayPulse</h1>
          <p className="text-gray-400 mt-1 text-sm">AI-Powered Stray Animal Location Prediction</p>
        </div>

        {/* Card */}
        <div className="card-glass">
          <h2 className="text-lg font-semibold text-white mb-6">Sign In</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-11"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center text-base py-3"
            >
              {loading ? <span className="spinner w-4 h-4 border border-white/30 border-t-white" /> : 'Sign In'}
            </button>
          </form>

          {/* Demo buttons */}
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <p className="text-xs text-gray-500 text-center mb-3">Quick Demo Access</p>
            <div className="flex gap-2">
              <button onClick={() => fillDemo('admin')} className="btn-secondary flex-1 justify-center text-xs py-2">
                Admin Demo
              </button>
              <button onClick={() => fillDemo('citizen')} className="btn-secondary flex-1 justify-center text-xs py-2">
                Citizen Demo
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
