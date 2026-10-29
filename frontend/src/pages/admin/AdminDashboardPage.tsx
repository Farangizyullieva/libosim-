import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle2, Clock, Package, ShieldOff, Tags, Users } from 'lucide-react';
import { adminService, type AdminStats } from '../../services/admin.service';
import { extractErrorMessage } from '../../services/api-client';
import { Loader, ErrorState } from '../../components/Feedback';

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    adminService.getStats().then(setStats).catch((err) => setError(extractErrorMessage(err)));
  }

  useEffect(() => {
    load();
  }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!stats) return <Loader />;

  const tiles = [
    { label: t('admin.stats.totalUsers'), tone: 'bg-[#e3edfb] text-[#2f5d8a]', value: stats.totalUsers, icon: Users, to: '/users' },
    {
      label: t('admin.stats.blockedUsers'), tone: 'bg-[#fbeceb] text-[#b4433a]',
      value: stats.blockedUsers,
      icon: ShieldOff,
      to: '/users?blocked=true',
    },
    {
      label: t('admin.stats.totalDonations'), tone: 'bg-[#e4f3e7] text-[#2f6b4f]',
      value: stats.totalDonations,
      icon: Package,
      to: '/donations?status=ALL',
    },
    {
      label: t('admin.stats.pendingDonations'), tone: 'bg-[#fbf1df] text-[#8a5a12]',
      value: stats.pendingDonations,
      icon: Clock,
      to: '/donations?status=PENDING_REVIEW',
    },
    {
      label: t('admin.stats.availableDonations'), tone: 'bg-[#e4f3e7] text-[#2f6b4f]',
      value: stats.availableDonations,
      icon: CheckCircle2,
      to: '/donations?status=AVAILABLE',
    },
    { label: t('admin.stats.totalCategories'), tone: 'bg-[#ede7fb] text-[#5b4a9e]', value: stats.totalCategories, icon: Tags, to: '/categories' },
    { label: t('admin.stats.totalRequests'), tone: 'bg-[#e3edfb] text-[#2f5d8a]', value: stats.totalRequests, icon: Bell, to: null },
    {
      label: t('admin.stats.pendingRequests'), tone: 'bg-[#fbf1df] text-[#8a5a12]',
      value: stats.pendingRequests,
      icon: Clock,
      to: '/donations?status=REQUESTED',
    },
  ];

  return (
    <div className="px-4 py-6 sm:px-6">
      <h1 className="font-display text-2xl text-text">{t('admin.dashboard')}</h1>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => {
          const content = (
            <>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tile.tone} dark:bg-surface-muted`}>
                <tile.icon size={20} className="wiggle-icon" />
              </span>
              <p className="mt-4 font-display text-3xl text-text">{tile.value}</p>
              <p className="mt-1 text-sm text-text-muted">{tile.label}</p>
            </>
          );
          return tile.to ? (
            <Link
              key={tile.label}
              to={tile.to}
              className="glow-card rounded-2xl border border-border bg-surface p-5"
            >
              {content}
            </Link>
          ) : (
            <div key={tile.label} className="rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_24px_-18px_rgba(35,38,31,0.35)]">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
