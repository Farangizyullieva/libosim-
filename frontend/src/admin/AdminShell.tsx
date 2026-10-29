import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shirt,
  Tags,
  Users,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../store/auth.store';
import { SITE_URL } from './urls';

export function AdminShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { to: '/', label: t('admin.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/donations', label: t('admin.donationsModeration'), icon: Shirt },
    { to: '/categories', label: t('admin.categories'), icon: Tags },
    { to: '/users', label: t('admin.users'), icon: Users },
    { to: '/settings', label: t('admin.settings'), icon: Settings },
  ];

  async function handleLogout() {
    if (!window.confirm(t('nav.signOutConfirm') ?? '')) return;
    await logout();
    navigate('/login', { replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
          <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
            <path
              d="M16 25 C10.5 23.5 8.5 18.5 9.2 13 C14 12.5 15.8 14.2 16.8 17 C18 14 20.6 11.8 23.4 11.8 C24 18.4 20.6 23.6 16 25 Z"
              fill="#fff"
            />
          </svg>
        </span>
        <div>
          <p className="font-display text-lg leading-none text-white">Libosim</p>
          <p className="mt-1 text-xs text-white/60">{t('admin.panel')}</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-white text-[#1f3a2b]' : 'text-white/75 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
            {user?.fullName?.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user?.fullName}</p>
            <p className="truncate text-xs text-white/55">{user?.phone}</p>
          </div>
        </div>
        <a
          href={SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-white/75 hover:bg-white/10 hover:text-white"
        >
          <ExternalLink size={18} />
          {t('admin.openSite')}
        </a>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-white/75 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} />
          {t('nav.signOut')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-bg text-text">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-gradient-to-b from-[#2b5641] to-[#1c3628] lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-gradient-to-b from-[#2b5641] to-[#1c3628]">
            <button
              onClick={() => setMenuOpen(false)}
              aria-label={t('common.menu') ?? undefined}
              className="absolute right-3 top-5 p-1 text-white/70"
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label={t('common.menu') ?? undefined}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface-muted lg:hidden"
          >
            <Menu size={20} />
          </button>
          <p className="text-sm font-medium text-text-muted">{t('admin.panel')}</p>
        </header>
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
