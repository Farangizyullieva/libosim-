import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { authService } from '../services/auth.service';
import { extractErrorMessage } from '../services/api-client';
import { isValidUzPhone } from '../utils/phone';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { Logo } from '../components/Logo';
import { BackButton } from '../components/BackButton';
import authPhoto from '../assets/hero/hero-box.jpg';

type Step = 'phone' | 'code' | 'details';

const DRAFT_KEY = 'libosim_register_draft';

function readDraft(): { fullName?: string; phone?: string } {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const register = useAuthStore((s) => s.register);

  const [step, setStep] = useState<Step>('phone');
  const [otpEnabled, setOtpEnabled] = useState(true);
  // Name and phone survive leaving the page and coming back (never the
  // password), so an error doesn't cost the user what they typed.
  const [fullName, setFullName] = useState(() => readDraft().fullName ?? '');
  const [phone, setPhone] = useState(() => readDraft().phone ?? '');
  const [code, setCode] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authService
      .getOtpConfig()
      .then((config) => setOtpEnabled(config.enabled))
      .catch(() => setOtpEnabled(true));
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ fullName, phone }));
    } catch {
      // Storage unavailable (private mode) — the form still works.
    }
  }, [fullName, phone]);

  // Back inside the form returns to the previous step with everything kept;
  // only from the first step does it leave the page.
  function goBackStep() {
    setError(null);
    setStep('phone');
  }

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) {
      setError(t('errors.nameTooShort'));
      return;
    }
    if (!isValidUzPhone(phone)) {
      setError(t('auth.invalidPhone'));
      return;
    }

    if (!otpEnabled) {
      setStep('details');
      return;
    }

    setSendingCode(true);
    try {
      await authService.sendOtp(phone);
      setStep('code');
      setResendIn(60);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSendingCode(false);
    }
  }

  async function handleResendCode() {
    setError(null);
    setSendingCode(true);
    try {
      await authService.sendOtp(phone);
      setResendIn(60);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setVerifyingCode(true);
    try {
      const result = await authService.verifyOtp(phone, code);
      setOtpToken(result.otpToken);
      setStep('details');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t('errors.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      await register({ fullName: fullName.trim(), phone, password, otpToken: otpEnabled ? otpToken : undefined });
      // New users land on the donations list unless they were sent here from
      // a specific page.
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/donations';
      sessionStorage.removeItem(DRAFT_KEY);
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
          {step === 'phone' ? (
            <BackButton />
          ) : (
            <button
              type="button"
              onClick={goBackStep}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text"
            >
              <ArrowLeft size={16} />
              {t('common.back')}
            </button>
          )}
          <div className="mt-6">
            <Logo />
          </div>

          <h1 className="mt-8 font-display text-2xl text-text">{t('auth.signUp')}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('auth.signUpSubtitle')}</p>

          {step === 'phone' && (
            <form noValidate onSubmit={handleSendCode} className="mt-8 flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-text">{t('auth.fullName')}</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text"
                />
              </div>

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

              <FormError message={error} />

              <Button type="submit" loading={sendingCode} className="mt-2 w-full">
                {t('auth.sendCode')}
              </Button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="mt-8 flex flex-col gap-4">
              <p className="text-sm text-text-muted">
                {t('auth.codeSentTo', { phone })}{' '}
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="font-medium text-accent hover:underline"
                >
                  {t('auth.changePhone')}
                </button>
              </p>

              <div>
                <label className="text-sm font-medium text-text">{t('auth.otpCodeLabel')}</label>
                <input
                  required
                  inputMode="numeric"
                  autoFocus
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-4 py-2.5 tracking-[0.3em] text-text"
                />
              </div>

              <FormError message={error} />

              <Button type="submit" loading={verifyingCode} className="mt-2 w-full">
                {t('auth.verifyCode')}
              </Button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendIn > 0 || sendingCode}
                className="text-sm text-accent hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline"
              >
                {resendIn > 0 ? t('auth.resendIn', { seconds: resendIn }) : t('auth.resendCode')}
              </button>
            </form>
          )}

          {step === 'details' && (
            <form noValidate onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-text">{t('auth.password')}</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoFocus
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
                {t('auth.createAccount')}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-text-muted">
            {t('auth.haveAccount')}{' '}
            <Link to="/login" state={location.state} className="font-medium text-accent hover:underline">
              {t('auth.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
