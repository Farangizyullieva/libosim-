import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Plus, Shirt } from 'lucide-react';
import { donationsService } from '../services/donations.service';
import type { Donation } from '../types';
import { Loader, EmptyState } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { buttonClass } from '../components/button-styles';
import { toAbsoluteUploadUrl } from '../services/uploads.service';

export default function MyDonationsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Donation[] | null>(null);

  useEffect(() => {
    donationsService.mine().then((res) => setItems(res.items));
  }, []);

  if (items === null) return <Loader />;

  const newDonationLink = (
    <Link to="/donations/new" className={buttonClass('primary')}>
      <Plus size={16} />
      {t('nav.donate')}
    </Link>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader title={t('nav.myDonations')} action={items.length > 0 && newDonationLink} />

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t('myDonations.emptyTitle')}
            description={t('myDonations.emptyDescription')}
            action={newDonationLink}
          />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {items.map((d) => (
            <li key={d.id}>
              <Link
                to={`/donations/${d.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-surface-muted"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted text-text-muted">
                  {d.images[0] ? (
                    <img src={toAbsoluteUploadUrl(d.images[0])} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Shirt size={20} strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text">{d.title}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={d.status} />
                <ChevronRight size={18} className="hidden shrink-0 text-text-muted sm:block" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
