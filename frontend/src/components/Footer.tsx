import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-12 bg-ink text-white/70">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
          <div className="max-w-sm">
            <Logo size="sm" inverted />
            <p className="mt-3 text-sm text-white/60">{t('home.heroSubtitle')}</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link to="/donations" className="text-white/70 hover:text-white">
              {t('nav.donations')}
            </Link>
            <Link to="/donations/new" className="text-white/70 hover:text-white">
              {t('nav.donate')}
            </Link>
            <Link to="/profile" className="text-white/70 hover:text-white">
              {t('nav.profile')}
            </Link>
          </nav>
        </div>
        <p className="mt-8 border-t border-white/10 pt-6 text-xs text-white/50">
          © {new Date().getFullYear()} Libosim
        </p>
      </div>
    </footer>
  );
}
