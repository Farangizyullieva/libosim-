import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ChevronDown,
  Heart,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Send,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { buttonClass } from './button-styles';
import { Logo } from './Logo';
import { ADMIN_URL } from '../admin/urls';
import { notificationsService } from '../services/notifications.service';

interface MenuItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin';
  const firstName = user?.fullName?.split(' ')[0] ?? t('nav.profile');

  // Close the account menu on outside click or Escape.
  // Unread notifications badge on the bell; refreshed on every page change.
  const [unread, setUnread] = useState(0);
  const { pathname } = useLocation();
  useEffect(() => {
    if (!isAuthenticated) {
      setUnread(0);
      return;
    }
    notificationsService.unreadCount().then(setUnread).catch(() => {});
  }, [isAuthenticated, pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    function onPointer(e: MouseEvent) {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAccountOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  function closeMenus() {
    setMobileOpen(false);
    setAccountOpen(false);
  }

  function handleLogout() {
    if (window.confirm(t('nav.signOutConfirm') ?? '')) {
      closeMenus();
      logout();
      navigate('/');
    }
  }

  const mainLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/donations', label: t('nav.donations') },
  ];

  const accountItems: MenuItem[] = [
    { to: '/profile', label: t('nav.profile'), icon: User },
    { to: '/my-donations', label: t('nav.myDonations'), icon: Package },
    { to: '/my-requests', label: t('contact.yourRequests'), icon: Send },
    { to: '/incoming-requests', label: t('contact.incomingRequests'), icon: Inbox },
    { to: '/favorites', label: t('nav.favorites'), icon: Heart },
    { to: '/notifications', label: t('nav.notifications'), icon: Bell },
  ];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-muted hover:text-text'
    }`;

  const iconButton =
    'flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text';

  const languageSelect = (
    <select
      value={i18n.language.startsWith('ru') ? 'ru' : 'uz'}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-text"
      aria-label={t('common.language') ?? undefined}
    >
      <option value="uz">O'zbekcha</option>
      <option value="ru">Русский</option>
    </select>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {mainLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass} end>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {languageSelect}

          {isAuthenticated ? (
            <>
              <Link
                to="/notifications"
                className={iconButton}
                aria-label={t('nav.notifications') ?? undefined}
                title={t('nav.notifications') ?? undefined}
              >
                <span className="relative">
                  <Bell size={18} />
                  {unread > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
              </Link>

              <Link to="/donations/new" className={buttonClass('primary', 'md', 'ml-1')}>
                <Plus size={16} />
                {t('nav.donate')}
              </Link>

              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  className="flex h-10 items-center gap-2 rounded-lg border border-border pl-1.5 pr-2.5 text-sm font-medium text-text hover:bg-surface-muted"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft text-xs font-semibold text-accent">
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[8rem] truncate">{firstName}</span>
                  <ChevronDown size={16} className="text-text-muted" />
                </button>

                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface py-1.5 shadow-lg"
                  >
                    <div className="border-b border-border px-4 pb-2.5 pt-1.5">
                      <p className="truncate text-sm font-medium text-text">{user?.fullName}</p>
                      <p className="truncate text-xs text-text-muted">{user?.phone}</p>
                    </div>
                    <div className="py-1">
                      {isAdmin && (
                        <a
                          href={ADMIN_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          role="menuitem"
                          onClick={closeMenus}
                          className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-accent hover:bg-surface-muted"
                        >
                          <LayoutDashboard size={16} />
                          {t('admin.panel')}
                        </a>
                      )}
                      {accountItems.map(({ to, label, icon: Icon }) => (
                        <Link
                          key={to}
                          to={to}
                          role="menuitem"
                          onClick={closeMenus}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-text hover:bg-surface-muted"
                        >
                          <Icon size={16} className="text-text-muted" />
                          {label}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-border pt-1">
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-danger-soft"
                      >
                        <LogOut size={16} />
                        {t('nav.signOut')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/login" className={buttonClass('primary', 'md', 'ml-1')}>
              {t('nav.signIn')}
            </Link>
          )}
        </div>

        <button
          className={`${iconButton} ml-auto lg:hidden`}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={t('common.menu') ?? undefined}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-surface px-4 pb-5 pt-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {mainLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClass} end onClick={closeMenus}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {isAuthenticated ? (
            <>
              <Link
                to="/donations/new"
                onClick={closeMenus}
                className={buttonClass('primary', 'md', 'mt-3 w-full')}
              >
                <Plus size={16} />
                {t('nav.donate')}
              </Link>
              <div className="mt-3 border-t border-border pt-3">
                <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                  {user?.fullName}
                </p>
                {isAdmin && (
                  <a
                    href={ADMIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMenus}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-accent hover:bg-surface-muted"
                  >
                    <LayoutDashboard size={16} />
                    {t('admin.panel')}
                  </a>
                )}
                {accountItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={closeMenus}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                        isActive ? 'bg-accent-soft text-accent' : 'text-text hover:bg-surface-muted'
                      }`
                    }
                  >
                    <Icon size={16} />
                    {label}
                  </NavLink>
                ))}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger-soft"
                >
                  <LogOut size={16} />
                  {t('nav.signOut')}
                </button>
              </div>
            </>
          ) : (
            <Link
              to="/login"
              onClick={closeMenus}
              className={buttonClass('primary', 'md', 'mt-3 w-full')}
            >
              {t('nav.signIn')}
            </Link>
          )}

          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
            {languageSelect}
            </div>
        </div>
      )}
    </header>
  );
}
