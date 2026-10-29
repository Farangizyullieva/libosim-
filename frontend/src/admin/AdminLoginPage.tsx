import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { extractErrorMessage } from '../services/api-client';
import { isValidUzPhone } from '../utils/phone';
import { Button } from '../components/Button';

export default function AdminLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout, user, isAuthenticated } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated && user?.role === 'admin') return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidUzPhone(phone)) {
      setError(t('auth.invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      await login(phone, password);
      // A valid account that isn't an admin must not stay signed in here.
      if (useAuthStore.getState().user?.role !== 'admin') {
        await logout();
        setError(t('admin.notAdmin'));
        return;
      }
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#2b5641] to-[#16291f] px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-8 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.6)]">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <ShieldCheck size={24} />
        </span>
        <h1 className="mt-5 font-display text-2xl text-text">{t('admin.loginTitle')}</h1>
        <p className="mt-1.5 text-sm text-text-muted">{t('admin.loginSubtitle')}</p>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          <div>
            <label htmlFor="admin-phone" className="text-sm font-medium text-text">
              {t('auth.phone')}
            </label>
            <input
              id="admin-phone"
              type="tel"
              required
              autoComplete="username"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998901234567"
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-bg px-4 text-text"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="text-sm font-medium text-text">
              {t('auth.password')}
            </label>
            <div className="relative mt-1.5">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-bg px-4 pr-11 text-text"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={t('auth.togglePasswordVisibility') ?? undefined}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

          <Button type="submit" size="lg" loading={loading} className="mt-1 w-full rounded-xl">
            {t('auth.signInAction')}
          </Button>
        </form>
      </div>
    </div>
  );
}
