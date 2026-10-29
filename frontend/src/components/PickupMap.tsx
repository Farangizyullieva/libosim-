import { useTranslation } from 'react-i18next';
import { ExternalLink, MapPin } from 'lucide-react';

const COORDS_RE = /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/;

// Yandex's embeddable map widget needs no API key. A location sent from the
// Telegram bot is "lat, lng" and gets an exact pin; a typed address such as
// "Toshkent, Chilonzor" is passed as a search query instead.
function mapUrls(location: string, lang: string) {
  const match = COORDS_RE.exec(location);
  const query = match
    ? `ll=${match[2]},${match[1]}&pt=${match[2]},${match[1]},pm2gnm&z=15`
    : `text=${encodeURIComponent(`${location}, O'zbekiston`)}&z=13`;
  return {
    embed: `https://yandex.uz/map-widget/v1/?${query}&lang=${lang}`,
    open: `https://yandex.uz/maps/?${query}`,
  };
}

export function PickupMap({ location }: { location: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('ru') ? 'ru_RU' : 'uz_UZ';
  const { embed, open } = mapUrls(location, lang);

  return (
    <section>
      <h2 className="font-display text-xl text-text sm:text-2xl">{t('ask.pickupTitle')}</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface-muted">
        <iframe
          src={embed}
          title={t('ask.pickupTitle') ?? 'map'}
          loading="lazy"
          className="block h-72 w-full sm:h-80"
          allowFullScreen
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-text-muted">
          <MapPin size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-text">{location}</p>
          <p className="text-sm text-text-muted">{t('ask.pickupHint')}</p>
        </div>
        <a
          href={open}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-soft sm:inline-flex"
        >
          {t('ask.openMap')}
          <ExternalLink size={14} />
        </a>
      </div>
    </section>
  );
}
