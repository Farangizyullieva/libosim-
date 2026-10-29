import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Heart, MapPin, Shirt } from 'lucide-react';
import type { Donation } from '../types';
import { toAbsoluteUploadUrl } from '../services/uploads.service';
import { categoryName } from '../utils/category';
import { useAuthStore } from '../store/auth.store';
import { useFavoritesStore } from '../store/favorites.store';
import { StatusBadge } from './StatusBadge';
import { buttonClass } from './button-styles';

// Image-first listing card (the pattern calm marketplaces like Vinted and
// Airbnb use): a square photo with soft corners, no box around the card,
// and only the few facts someone needs to decide whether to open it.
export function DonationCard({ donation }: { donation: Donation }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOwn = useAuthStore((s) => s.user?.id === donation.donorId);
  const favorited = useFavoritesStore((s) => s.ids.has(donation.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const cover = donation.images[0];
  const [imageFailed, setImageFailed] = useState(false);

  function handleFavorite(e: React.MouseEvent) {
    // The whole card is a link — keep the heart from also opening it.
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/donations/${donation.id}` } });
      return;
    }
    toggleFavorite(donation.id);
  }

  return (
    <Link to={`/donations/${donation.id}`} className="lift group flex h-full flex-col rounded-xl">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-muted shadow-[0_10px_26px_-20px_rgba(35,38,31,0.6)] transition-shadow duration-300 group-hover:shadow-[0_18px_34px_-18px_rgba(35,38,31,0.55)]">
        {cover && !imageFailed ? (
          <img
            src={toAbsoluteUploadUrl(cover)}
            alt={donation.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            <Shirt size={32} strokeWidth={1.25} />
          </div>
        )}

        {/* Only flag the non-default state — every public listing is
            available unless someone has already asked for it. */}
        {donation.status !== 'AVAILABLE' && (
          <StatusBadge status={donation.status} className="absolute left-2.5 top-2.5 shadow-sm" />
        )}

        <span className="absolute bottom-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-neutral-800 shadow-sm backdrop-blur">
          {t('conditions.' + donation.condition)}
        </span>

        {!isOwn && (
          <button
            type="button"
            onClick={handleFavorite}
            aria-pressed={favorited}
            aria-label={t('nav.favorites') ?? undefined}
            className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-sm backdrop-blur transition-colors hover:bg-white"
          >
            <Heart
              size={16}
              className={favorited ? 'fill-rose-500 text-rose-500' : ''}
              strokeWidth={2}
            />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col px-0.5 pt-2.5">
        <p className="line-clamp-2 text-[15px] font-medium leading-snug sm:line-clamp-1 text-text ">
          {donation.title}
        </p>
        <p className="mt-0.5 truncate text-sm text-text-muted">
          {categoryName(t, donation.category)}
          {donation.size ? ` · ${donation.size}` : ''}
        </p>
        {donation.location && (
          <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{donation.location}</span>
          </p>
        )}
        <span className="min-h-3 flex-1" aria-hidden="true" />
        {/* A span, not a <button>: the whole card is already the link. */}
        <span className={buttonClass('primary', 'sm', 'mt-auto w-full rounded-lg')}>
          {t('donations.view')}
          <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}
