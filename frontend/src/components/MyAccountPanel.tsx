import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Heart, Inbox, MessageCircle, Package, Plus, Send, type LucideIcon } from 'lucide-react';
import { donationsService } from '../services/donations.service';
import { donationRequestsService } from '../services/donation-requests.service';
import { usersService } from '../services/users.service';
import { useAuthStore } from '../store/auth.store';
import { useFavoritesStore } from '../store/favorites.store';
import { useTelegramLink } from '../hooks/useTelegramLink';
import { buttonClass } from './button-styles';

interface Shortcut {
  to: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  count: number | null;
  tone: string;
}

// Home-page panel for signed-in users: quick links to their own pages with
// live counts, plus a prominent "connect Telegram" card until it's linked.
export function MyAccountPanel() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const favoritesCount = useFavoritesStore((s) => s.ids.size);

  const [donations, setDonations] = useState<number | null>(null);
  const [requests, setRequests] = useState<number | null>(null);
  const [incoming, setIncoming] = useState<number | null>(null);
  const [telegramLinked, setTelegramLinked] = useState<boolean | null>(null);
  const telegram = useTelegramLink(telegramLinked === false);

  useEffect(() => {
    donationsService.mine(1, 1).then((r) => setDonations(r.total)).catch(() => setDonations(0));
    donationRequestsService.mine(1, 1).then((r) => setRequests(r.total)).catch(() => setRequests(0));
    donationRequestsService.incomingCount().then(setIncoming).catch(() => setIncoming(0));

    // Re-check when the user comes back from Telegram so the card flips to
    // "connected" without a manual reload.
    const checkLinked = () =>
      usersService.getMe().then((p) => setTelegramLinked(p.telegramLinked)).catch(() => {});
    checkLinked();
    window.addEventListener('focus', checkLinked);
    return () => window.removeEventListener('focus', checkLinked);
  }, []);

  const shortcuts: Shortcut[] = [
    { to: '/my-donations', label: t('nav.myDonations'), hint: t('account.myDonationsHint'), icon: Package, count: donations, tone: 'bg-[#e4f3e7] text-[#2f6b4f] dark:bg-[#1d2c21] dark:text-[#8fcfa6]' },
    { to: '/my-requests', label: t('contact.yourRequests'), hint: t('account.myRequestsHint'), icon: Send, count: requests, tone: 'bg-[#e3edfb] text-[#2f5d8a] dark:bg-[#1b2433] dark:text-[#84b3e0]' },
    { to: '/incoming-requests', label: t('contact.incomingRequests'), hint: t('account.incomingHint'), icon: Inbox, count: incoming, tone: 'bg-[#fbf1df] text-[#8a5a12] dark:bg-[#352a17] dark:text-[#e0b366]' },
    { to: '/favorites', label: t('nav.favorites'), hint: t('account.favoritesHint'), icon: Heart, count: favoritesCount, tone: 'bg-[#fde7ec] text-[#b4435f] dark:bg-[#33212a] dark:text-[#f0a3b5]' },
  ];

  return (
    <section className="mx-auto max-w-[1600px] px-4 pt-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{t('account.eyebrow')}</p>
          <h2 className="mt-2 font-display text-xl text-text sm:text-2xl">
            {t('account.greeting', { name: user?.fullName?.split(' ')[0] ?? '' })}
          </h2>
        </div>
        <Link to="/donations/new" className={buttonClass('primary', 'md', 'rounded-full px-5')}>
          <Plus size={16} />
          {t('nav.donate')}
        </Link>
      </div>

      {incoming !== null && incoming > 0 && (
        <Link
          to="/incoming-requests"
          className="glow-card mt-6 flex items-center gap-4 rounded-2xl border border-[#f0d9a8] bg-[#fdf6e7] p-4 dark:border-[#5a4a22] dark:bg-[#2c2413]"
        >
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f5b942] text-white">
            <MessageCircle size={22} className="wiggle-icon" />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
              {incoming}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-text">{t('account.incomingAlert', { count: incoming })}</span>
            <span className="mt-0.5 block text-sm text-text-muted">{t('account.incomingAlertHint')}</span>
          </span>
          <span className={buttonClass('primary', 'sm', 'hidden shrink-0 rounded-full px-4 sm:inline-flex')}>
            {t('account.incomingAlertCta')}
          </span>
        </Link>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map(({ to, label, hint, icon: Icon, count, tone }) => (
          <Link
            key={to}
            to={to}
            className="glow-card group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4"
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon size={22} className="wiggle-icon" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate font-semibold text-text">{label}</span>
                {count !== null && count > 0 && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">{count}</span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-sm text-text-muted">{hint}</span>
            </span>
          </Link>
        ))}
      </div>

      {telegramLinked === false && (
        <div className="mt-3 flex flex-col items-start gap-4 rounded-2xl border border-[#bfe0f2] bg-[#eaf6fd] p-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#24435a] dark:bg-[#16232e]">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2a9fd8] text-white">
              <Send size={22} />
            </span>
            <div>
              <p className="font-semibold text-text">{t('account.telegramTitle')}</p>
              <p className="mt-0.5 max-w-xl text-sm text-text-muted">{t('account.telegramText')}</p>
              <p className="mt-1 max-w-xl text-sm font-medium text-text">{t('account.telegramStartHint')}</p>
            </div>
          </div>
          {telegram.href ? (
            <a
              href={telegram.href}
              target="_blank"
              rel="noopener noreferrer"
              className="tg-button inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-[#2a9fd8] px-6 font-semibold text-white hover:bg-[#2390c5] sm:w-auto"
            >
              <Send size={17} className="tg-plane" />
              {t('profile.telegramLinkAction')}
            </a>
          ) : (
            <span className="text-sm text-text-muted">
              {telegram.unavailable ? t('profile.telegramBotNotConfigured') : t('common.loading')}
            </span>
          )}
        </div>
      )}
      {telegramLinked === true && (
        <p className="mt-3 flex items-center gap-2 text-sm text-text-muted">
          <CheckCircle2 size={16} className="text-accent" />
          {t('account.telegramLinked')}
        </p>
      )}
    </section>
  );
}
