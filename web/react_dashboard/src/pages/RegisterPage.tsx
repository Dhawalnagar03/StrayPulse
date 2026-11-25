import { useState, type FC } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PawPrint, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../lib/api';

const profileOptions = [
  { value: 'individual', label: 'Individual', description: 'Citizen volunteer or animal welfare supporter' },
  { value: 'ngo', label: 'NGO / Animal Welfare Organization', description: 'Organization-led rescue and care coordination' },
  { value: 'rescuer', label: 'Rescuer', description: 'On-ground rescue and transport support' },
  { value: 'volunteer', label: 'Volunteer', description: 'Field reporting, transport, and observation support' },
  { value: 'feeder', label: 'Feeder', description: 'Daily feeding and monitoring routine' },
] as const;

const RegisterPage: FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    profile_type: 'individual',
    organization_name: '',
    organization_details: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match. Please confirm your password.');
      return;
    }

    setLoading(true);

    try {
      await authApi.register({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        role: form.profile_type === 'ngo' ? 'ngo' : 'citizen',
        profile_type: form.profile_type,
        organization_name: form.organization_name.trim() || undefined,
        organization_details: form.organization_details.trim() || undefined,
      });
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="auth-shell-glow auth-shell-glow-two absolute right-1/3 top-1/3 h-[360px] w-[480px] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#081a1a] shadow-[0_12px_35px_rgba(8,26,26,0.22)]">
            <PawPrint className="h-8 w-8 text-white" />
          </div>
          <h1 className="auth-shell-heading text-2xl font-bold">Join StrayPulse</h1>
          <p className="auth-shell-subtitle mt-1 text-sm">Help locate stray animals with AI-assisted insights</p>
        </div>

        <div className="auth-shell-card rounded-[28px] border p-6 shadow-[0_18px_40px_rgba(8,26,26,0.06)] sm:p-7">
          <h2 className="auth-shell-heading mb-6 text-lg font-semibold">Create Account</h2>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input name="name" value={form.name} onChange={handleChange} className="input" placeholder="Your name" required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} className="input" placeholder="you@example.com" required />
              </div>
              <div>
                <label className="label">Phone (optional)</label>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} className="input" placeholder="+91 98765 43210" />
              </div>
            </div>

            <div>
              <label className="label">I am a</label>
              <select name="profile_type" value={form.profile_type} onChange={handleChange} className="input">
                {profileOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="auth-shell-copy mt-1 text-xs">
                {profileOptions.find((option) => option.value === form.profile_type)?.description}
              </p>
            </div>

            {form.profile_type === 'ngo' && (
              <div className="space-y-4 rounded-2xl border border-[#efe5dc] bg-[#fffaf6] p-4">
                <div>
                  <label className="label">Organization name</label>
                  <input
                    name="organization_name"
                    value={form.organization_name}
                    onChange={handleChange}
                    className="input"
                    placeholder="e.g. Paws & Hope Foundation"
                  />
                </div>
                <div>
                  <label className="label">Organization details</label>
                  <textarea
                    name="organization_details"
                    value={form.organization_details}
                    onChange={handleChange}
                    rows={3}
                    className="input resize-none"
                    placeholder="Briefly describe the organization’s rescue or care activities"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} className="input" placeholder="Min. 8 characters" required minLength={8} />
            </div>

            <div>
              <label className="label">Confirm password</label>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="input"
                placeholder="Re-enter your password"
                required
              />
            </div>

            <button type="submit" id="btn-register" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? <span className="spinner h-4 w-4 border border-white/30 border-t-white" /> : 'Create Account'}
            </button>
          </form>

          <p className="auth-shell-copy mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-[#dc2101] hover:text-[#b51d00]">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
