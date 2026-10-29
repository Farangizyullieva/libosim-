import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { extractErrorMessage } from '../services/api-client';
import { isValidUzPhone } from '../utils/phone';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { Logo } from '../components/Logo';
import { BackButton } from '../components/BackButton';
import authPhoto from '../assets/hero/hero-box.jpg';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';
      // replace: "back" must not return to the sign-in form.
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src={authPhoto} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
        <p className="absolute bottom-10 left-10 right-10 font-display text-xl leading-snug text-white">
          {t('auth.tagline')}
        </p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <BackButton />
          <div className="mt-6">
            <Logo />
          </div>

          <h1 className="mt-8 font-display text-2xl text-text">{t('auth.signIn')}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('auth.signInSubtitle')}</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-text">{t('auth.phone')}</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998901234567"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-text">{t('auth.password')}</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 pr-10 text-text"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                  aria-label={t('auth.togglePasswordVisibility') ?? undefined}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <FormError message={error} />

            <Button type="submit" loading={loading} className="mt-2 w-full">
              {t('auth.signInAction')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            {t('auth.noAccount')}{' '}
            <Link to="/register" state={location.state} className="font-medium text-accent hover:underline">
              {t('auth.createAccount')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
