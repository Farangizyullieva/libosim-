import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { favoritesService } from '../services/favorites.service';
import type { Donation } from '../types';
import { DonationCard } from '../components/DonationCard';
import { Loader, EmptyState } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';

export default function FavoritesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Donation[] | null>(null);

  useEffect(() => {
    favoritesService.list().then((res) => setItems(res.items));
  }, []);

  if (items === null) return <Loader />;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title={t('nav.favorites')} />

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t('favorites.emptyTitle')}
            description={t('favorites.emptyDescription')}
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
          {items.map((d) => (
            <DonationCard key={d.id} donation={d} />
          ))}
        </div>
      )}
    </div>
  );
}
