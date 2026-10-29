import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Camera,
  HandHeart,
  Leaf,
  MessageCircle,
  Send,
  ShieldCheck,
  Search,
  Shirt,
  UploadCloud,
  type LucideIcon,
} from 'lucide-react';
import { donationsService } from '../services/donations.service';
import { telegramService } from '../services/telegram.service';
import type { Donation } from '../types';
import { DonationCard } from '../components/DonationCard';
import { Loader, EmptyState } from '../components/Feedback';
import { buttonClass } from '../components/button-styles';
import { Reveal } from '../components/Reveal';
import { SectionTiles } from '../components/SectionTiles';
import { MyAccountPanel } from '../components/MyAccountPanel';
import { useAuthStore } from '../store/auth.store';
import heroRoomPhoto from '../assets/hero/hero-room.jpg';

const steps: { key: string; icon: LucideIcon }[] = [
  { key: 'step1', icon: Shirt },
  { key: 'step2', icon: Camera },
  { key: 'step3', icon: ShieldCheck },
  { key: 'step4', icon: MessageCircle },
  { key: 'step5', icon: HandHeart },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{children}</p>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [recent, setRecent] = useState<Donation[] | null>(null);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);

  useEffect(() => {
    donationsService
      .list({ sort: 'newest', limit: 8 })
      .then((res) => setRecent(res.items))
      .catch(() => setRecent([]));

    telegramService
      .getConfig()
      .then((config) => {
        if (config.enabled && config.botUsername) {
          // A start parameter makes Telegram show the Start button even
          // to people who have opened the bot before.
          setTelegramLink(`https://t.me/${config.botUsername}?start=web`);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero: bright room photo on the right melting into a warm
          background, headline and actions on the left. */}
      <section className="relative overflow-hidden bg-[#f8f3ec] dark:bg-[#1e3329]">
        <img
          src={heroRoomPhoto}
          alt=""
          className="hero-room-fade block h-64 dark:brightness-[0.88] w-full object-cover sm:h-80 md:absolute md:inset-y-0 md:right-0 md:h-full md:w-[56%]"
        />
        <div className="relative mx-auto max-w-[1600px] px-4 pb-12 pt-8 sm:px-6 lg:px-8 md:py-20 lg:py-24">
          <div className="md:max-w-[46%]">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#e6ede3] px-3.5 py-1.5 text-sm font-medium text-[#3d5a40] dark:bg-[#24302a] dark:text-[#b9d3bd]">
              <Leaf size={15} />
              {t('home.heroBadge')}
            </span>
            <h1 className="mt-5 font-display text-[2rem] font-bold leading-[1.12] text-[#1f2a22] sm:text-[2.4rem] lg:text-[2.7rem] dark:text-[#eef1ec]">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[#4c5249] dark:text-[#b8bdb4]">
              {t('home.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/donations/new"
                className="lift inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-[#4f7a4a] px-7 text-base font-semibold text-white shadow-[0_12px_26px_-12px_rgba(54,101,60,0.8)] hover:bg-[#446a40]"
              >
                <UploadCloud size={20} />
                {t('home.ctaDonate')}
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/donations"
                className="lift inline-flex h-14 items-center justify-center gap-2.5 rounded-full border-2 border-[#2f3a2f]/70 bg-white/60 px-7 text-base font-semibold text-[#1f2a22] backdrop-blur hover:bg-white dark:border-white/40 dark:bg-transparent dark:text-white"
              >
                <Search size={19} />
                {t('home.ctaBrowse')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {isAuthenticated && <MyAccountPanel />}

      {/* Shopping sections */}
      <section className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <Eyebrow>{t('home.categoriesEyebrow')}</Eyebrow>
            <h2 className="mt-2 font-display text-xl text-text sm:text-2xl">{t('home.categoriesTitle')}</h2>
          </div>
          <Link
            to="/donations"
            className="hidden shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-soft sm:inline-flex"
          >
            {t('common.viewAll')}
            <ArrowRight size={15} />
          </Link>
        </div>
        <SectionTiles />
      </section>

      {/* How it works + Telegram */}
      <section className="bg-sage">
        <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
          <Reveal>
            <div className="max-w-xl">
              <Eyebrow>{t('home.howEyebrow')}</Eyebrow>
              <h2 className="mt-2 font-display text-xl text-text sm:text-2xl">{t('home.howItWorks')}</h2>
              <p className="mt-2 text-text-muted">{t('home.howItWorksSubtitle')}</p>
            </div>

            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {steps.map(({ key, icon: Icon }) => (
                <li
                  key={key}
                  className="glow-card group relative overflow-hidden rounded-2xl border border-border bg-surface p-5"
                >
                  <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-white">
                    <Icon size={20} strokeWidth={1.9} className="wiggle-icon" />
                  </span>
                  <h3 className="relative mt-4 font-semibold text-text">{t(`home.${key}Title`)}</h3>
                  <p className="relative mt-1 text-sm leading-relaxed text-text-muted">{t(`home.${key}Desc`)}</p>
                </li>
              ))}
            </ol>
          </Reveal>

          {telegramLink && (
            <Reveal className="mt-6">
              <div className="glow-card group flex flex-col items-start gap-5 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e3f1fb] text-[#2a9fd8] transition-colors duration-300 group-hover:bg-[#2a9fd8] group-hover:text-white dark:bg-[#1b2a38] dark:text-[#6cc2ef]">
                    <Send size={22} className="wiggle-icon" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-text">{t('home.telegramTitle')}</h3>
                    <p className="mt-1 max-w-lg text-sm text-text-muted">{t('home.telegramDesc')}</p>
                  </div>
                </div>
                <a
                  href={telegramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass('primary', 'md', 'tg-button w-full overflow-hidden rounded-xl sm:w-auto')}
                >
                  <Send size={16} className="tg-plane" />
                  {t('home.telegramCta')}
                </a>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* Invitation banner */}
      <section className="mx-auto max-w-[1600px] px-4 pt-12 sm:px-6 lg:px-8">
        <Reveal>
          <Link
            to="/donations/new"
            className="glow-card group relative flex items-center gap-5 overflow-hidden rounded-3xl border border-[#d6e6cf] bg-[#e8f1e2] px-6 py-8 sm:gap-7 sm:px-10 dark:border-border dark:bg-[#1c2a20]"
          >
            {/* Leaf-heart mark */}
            <svg viewBox="0 0 64 64" className="h-14 w-14 shrink-0 text-accent sm:h-16 sm:w-16" aria-hidden="true">
              <path
                d="M32 54 C18 44 8 34 10 22 C12 12 24 9 32 19 C40 9 52 12 54 22 C56 34 46 44 32 54 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <path d="M34 20 C42 8 56 10 56 10 C56 10 54 26 40 30 C36 31 34 27 34 20 Z" fill="currentColor" />
              <path d="M32 54 C28 58 22 60 18 60" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
            <div className="relative min-w-0 flex-1">
              <h2 className="font-display text-lg leading-snug text-text sm:text-2xl">{t('home.bannerTitle')}</h2>
              <p className="mt-1.5 max-w-xl text-sm text-text-muted sm:text-base">{t('home.bannerText')}</p>
            </div>
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/80 text-accent transition-colors group-hover:bg-accent group-hover:text-white dark:bg-surface">
              <ArrowRight size={20} />
            </span>
            {/* Thin heart-shaped line along the bottom-right corner */}
            <svg
              viewBox="0 0 320 90"
              className="pointer-events-none absolute -bottom-2 right-0 hidden h-24 w-80 text-accent/40 sm:block"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M0 85 C70 80 120 70 170 55 C200 46 210 30 200 22 C190 14 178 24 182 36 C186 24 176 12 166 20 C156 28 170 46 200 50 C240 56 280 50 320 40"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        </Reveal>
      </section>

      {/* Recent donations */}
      <section className="mx-auto max-w-[1600px] px-4 pb-6 pt-12 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Eyebrow>{t('home.recentEyebrow')}</Eyebrow>
            <h2 className="mt-2 font-display text-xl text-text sm:text-2xl">{t('home.recentDonations')}</h2>
            <p className="mt-2 text-text-muted">{t('home.recentSubtitle')}</p>
          </div>
          <Link
            to="/donations"
            className="hidden shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-soft sm:inline-flex"
          >
            {t('common.viewAll')}
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="mt-7">
          {recent === null ? (
            <Loader />
          ) : recent.length === 0 ? (
            <EmptyState title={t('donations.noResults')} />
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
              {recent.map((donation) => (
                <DonationCard key={donation.id} donation={donation} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center sm:hidden">
          <Link to="/donations" className={buttonClass('primary', 'md', 'w-full rounded-xl')}>
            {t('common.viewAll')}
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
