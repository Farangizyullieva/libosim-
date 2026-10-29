import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound } from 'lucide-react';
import { usersService } from '../services/users.service';
import { useAuthStore } from '../store/auth.store';
import { useToastStore } from '../store/toast.store';
import { extractErrorMessage } from '../services/api-client';
import { Button } from '../components/Button';

const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-border bg-bg px-4 text-text';

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const push = useToastStore((s) => s.push);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== repeatPassword) {
      setError(t('admin.passwordMismatch'));
      return;
    }
    setSaving(true);
    try {
      await usersService.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setRepeatPassword('');
      push(t('admin.passwordChanged'));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <h1 className="font-display text-2xl text-text">{t('admin.settings')}</h1>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-display text-base text-text">{t('admin.account')}</h2>
          <dl className="mt-4 divide-y divide-border text-sm">
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-text-muted">{t('auth.fullName')}</dt>
              <dd className="font-medium text-text">{user?.fullName}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-text-muted">{t('auth.phone')}</dt>
              <dd className="font-medium text-text">{user?.phone}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-text-muted">{t('admin.table.role')}</dt>
              <dd className="font-medium text-text">{user?.role}</dd>
            </div>
          </dl>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-base text-text">
            <KeyRound size={18} className="text-accent" />
            {t('profile.changePassword')}
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            <label className="text-sm font-medium text-text">
              {t('profile.currentPassword')}
              <input
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-text">
              {t('profile.newPassword')}
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-text">
              {t('admin.repeatPassword')}
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
            <Button type="submit" loading={saving} className="w-full rounded-xl sm:w-fit">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
