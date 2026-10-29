import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { usersService } from '../services/users.service';
import { useTelegramLink } from '../hooks/useTelegramLink';
import { buttonClass } from '../components/button-styles';
import { authService } from '../services/auth.service';
import { useToastStore } from '../store/toast.store';
import { extractErrorMessage } from '../services/api-client';
import { isValidUzPhone } from '../utils/phone';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';

type PhoneChangeStep = 'closed' | 'phone' | 'code';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuthStore();
  const push = useToastStore((s) => s.push);

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const telegram = useTelegramLink(user?.telegramLinked === false);

  const [phoneChangeStep, setPhoneChangeStep] = useState<PhoneChangeStep>('closed');
  const [newPhone, setNewPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false);
  const [verifyingPhoneCode, setVerifyingPhoneCode] = useState(false);
  const [changingPhone, setChangingPhone] = useState(false);
  const [phoneResendIn, setPhoneResendIn] = useState(0);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (phoneResendIn <= 0) return;
    const id = setInterval(() => setPhoneResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [phoneResendIn]);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    try {
      await usersService.updateMe({ fullName, email: email || undefined });
      await refreshProfile();
      push('Profile updated');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    setError(null);
    try {
      await usersService.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      push(t('admin.passwordChanged'));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  }

  function openPhoneChange() {
    setPhoneChangeStep('phone');
    setNewPhone('');
    setPhoneCode('');
    setPhoneError(null);
  }

  function closePhoneChange() {
    setPhoneChangeStep('closed');
  }

  async function handleSendPhoneCode(e: FormEvent) {
    e.preventDefault();
    setPhoneError(null);
    if (!isValidUzPhone(newPhone)) {
      setPhoneError(t('auth.invalidPhone'));
      return;
    }
    if (newPhone === user?.phone) {
      setPhoneError(t('profile.phoneSameAsCurrent'));
      return;
    }
    setSendingPhoneCode(true);
    try {
      await authService.sendOtp(newPhone);
      setPhoneChangeStep('code');
      setPhoneResendIn(60);
    } catch (err) {
      setPhoneError(extractErrorMessage(err));
    } finally {
      setSendingPhoneCode(false);
    }
  }

  async function handleResendPhoneCode() {
    setPhoneError(null);
    setSendingPhoneCode(true);
    try {
      await authService.sendOtp(newPhone);
      setPhoneResendIn(60);
    } catch (err) {
      setPhoneError(extractErrorMessage(err));
    } finally {
      setSendingPhoneCode(false);
    }
  }

  async function handleVerifyPhoneCode(e: FormEvent) {
    e.preventDefault();
    setPhoneError(null);
    setVerifyingPhoneCode(true);
    try {
      const result = await authService.verifyOtp(newPhone, phoneCode);
      setChangingPhone(true);
      await usersService.changePhone({ phone: newPhone, otpToken: result.otpToken });
      await refreshProfile();
      push(t('profile.phoneChanged'));
      setPhoneChangeStep('closed');
    } catch (err) {
      setPhoneError(extractErrorMessage(err));
    } finally {
      setVerifyingPhoneCode(false);
      setChangingPhone(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <PageHeader title={t('nav.profile')} />

      <form onSubmit={handleProfileSubmit} className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
        <div>
          <label className="text-sm font-medium text-text">{t('auth.fullName')}</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-text"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-text">{t('auth.email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-text"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-text-muted">{t('auth.phone')}</label>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-sm text-text">{user.phone}</p>
            {phoneChangeStep === 'closed' && (
              <button
                type="button"
                onClick={openPhoneChange}
                className="text-sm font-medium text-accent hover:underline"
              >
                {t('profile.changePhone')}
              </button>
            )}
          </div>
        </div>
        <Button type="submit" loading={savingProfile} className="mt-1 w-full sm:w-fit">
          {t('common.save')}
        </Button>
      </form>

      {phoneChangeStep !== 'closed' && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-display text-base text-text">{t('profile.changePhone')}</h2>

          {phoneChangeStep === 'phone' && (
            <form onSubmit={handleSendPhoneCode} className="mt-4 flex flex-col gap-4">
              <input
                type="tel"
                required
                autoFocus
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+998901234567"
                className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-text"
              />
              {phoneError && <p className="text-sm text-danger">{phoneError}</p>}
              <div className="flex gap-2">
                <Button type="submit" loading={sendingPhoneCode} size="sm">
                  {t('auth.sendCode')}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={closePhoneChange}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          )}

          {phoneChangeStep === 'code' && (
            <form onSubmit={handleVerifyPhoneCode} className="mt-4 flex flex-col gap-4">
              <p className="text-sm text-text-muted">{t('auth.codeSentTo', { phone: newPhone })}</p>
              <input
                required
                inputMode="numeric"
                autoFocus
                maxLength={6}
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 tracking-[0.3em] text-text"
              />
              {phoneError && <p className="text-sm text-danger">{phoneError}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" loading={verifyingPhoneCode || changingPhone} size="sm">
                  {t('auth.verifyCode')}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={closePhoneChange}>
                  {t('common.cancel')}
                </Button>
                <button
                  type="button"
                  onClick={handleResendPhoneCode}
                  disabled={phoneResendIn > 0 || sendingPhoneCode}
                  className="text-sm text-accent hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline"
                >
                  {phoneResendIn > 0 ? t('auth.resendIn', { seconds: phoneResendIn }) : t('auth.resendCode')}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <form onSubmit={handlePasswordSubmit} className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-display text-base text-text">{t('profile.changePassword')}</h2>
        <input
          type="password"
          required
          placeholder={t('profile.currentPassword') ?? ''}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-text"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder={t('profile.newPassword') ?? ''}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-text"
        />
        <Button type="submit" loading={savingPassword} variant="secondary" className="w-full sm:w-fit">
          {t('common.save')}
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-display text-base text-text">{t('profile.telegram')}</h2>
        {user.telegramLinked ? (
          <p className="text-sm text-accent">{t('profile.telegramLinked')}</p>
        ) : (
          <>
            <p className="text-sm text-text-muted">{t('profile.telegramNotLinked')}</p>
            {telegram.href ? (
              <a
                href={telegram.href}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass('primary', 'md', 'w-full sm:w-fit')}
              >
                <Send size={16} />
                {t('profile.telegramLinkAction')}
              </a>
            ) : (
              <p className="text-sm text-text-muted">
                {telegram.unavailable ? t('profile.telegramBotNotConfigured') : t('common.loading')}
              </p>
            )}
            <p className="text-sm text-text-muted">{t('account.telegramStartHint')}</p>
          </>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </div>
  );
}
