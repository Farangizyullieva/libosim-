import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { donationRequestsService, type DonationRequestItem } from '../services/donation-requests.service';
import { useToastStore } from '../store/toast.store';
import { extractErrorMessage } from '../services/api-client';
import { Loader, EmptyState } from '../components/Feedback';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { buttonClass } from '../components/button-styles';
import { RequestConversation } from '../components/RequestConversation';

export default function MyRequestsPage() {
  const { t } = useTranslation();
  const push = useToastStore((s) => s.push);
  const [items, setItems] = useState<DonationRequestItem[] | null>(null);

  function load() {
    donationRequestsService.mine().then((res) => setItems(res.items));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(id: string) {
    if (!window.confirm(t('contact.cancelRequestConfirm') ?? '')) return;
    try {
      await donationRequestsService.cancel(id);
      load();
    } catch (err) {
      push(extractErrorMessage(err), 'error');
    }
  }

  if (items === null) return <Loader />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader title={t('contact.yourRequests')} description={t('contact.yourRequestsHint')} />

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t('contact.noRequestsYet')}
            action={
              <Link to="/donations" className={buttonClass('secondary', 'sm')}>
                {t('home.ctaBrowse')}
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/donations/${r.donationId}`}
                    className="font-medium text-text hover:text-accent hover:underline"
                  >
                    {r.donation?.title ?? r.donationId}
                  </Link>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-3">
                <RequestConversation request={r} requesterName={r.requester?.fullName ?? ''} />
              </div>
              {r.status === 'PENDING' && (
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger-soft hover:text-danger"
                    onClick={() => handleCancel(r.id)}
                  >
                    {t('contact.cancelRequest')}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
