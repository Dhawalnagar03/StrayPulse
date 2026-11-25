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
      const { access_token, user_id, role, name, profile_type, organization_name } = res.data;
      login(access_token, {
        id: user_id,
        name,
        email,
        role,
        profile_type,
        organization_name,
        is_active: true,
        total_sightings: 0,
        created_at: '',
      });
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

  return (
    <div className="auth-shell min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="auth-shell-glow auth-shell-glow-one absolute left-1/2 top-1/4 h-[360px] w-[560px] -translate-x-1/2 rounded-full blur-3xl" />
        <div className="auth-shell-glow auth-shell-glow-two absolute bottom-1/4 left-1/3 h-[260px] w-[380px] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#081a1a] shadow-[0_12px_35px_rgba(8,26,26,0.22)]">
            <PawPrint className="h-8 w-8 text-white" />
          </div>
          <h1 className="auth-shell-heading text-2xl font-bold">Welcome to StrayPulse</h1>
          <p className="auth-shell-subtitle mt-1 text-sm">AI-powered stray animal welfare intelligence</p>
        </div>

        <div className="auth-shell-card rounded-[28px] border p-6 shadow-[0_18px_40px_rgba(8,26,26,0.06)] sm:p-7">
          <h2 className="auth-shell-heading mb-6 text-lg font-semibold">Sign In</h2>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? <span className="spinner h-4 w-4 border border-white/30 border-t-white" /> : 'Sign In'}
            </button>
          </form>

          <p className="auth-shell-copy mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-[#dc2101] hover:text-[#b51d00]">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
