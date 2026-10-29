import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { donationsService } from '../services/donations.service';
import { donationRequestsService, type DonationRequestItem } from '../services/donation-requests.service';
import type { Donation } from '../types';
import { useToastStore } from '../store/toast.store';
import { extractErrorMessage } from '../services/api-client';
import { Loader, EmptyState } from '../components/Feedback';
import { Phone } from 'lucide-react';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { RequestConversation } from '../components/RequestConversation';

interface Group {
  donation: Donation;
  requests: DonationRequestItem[];
}

export default function IncomingRequestsPage() {
  const { t } = useTranslation();
  const push = useToastStore((s) => s.push);
  const [groups, setGroups] = useState<Group[] | null>(null);

  async function load() {
    const mine = await donationsService.mine(1, 100);
    const relevant = mine.items.filter((d) =>
      ['REQUESTED', 'RESERVED', 'COLLECTED'].includes(d.status),
    );

    const withRequests = await Promise.all(
      relevant.map(async (donation) => {
        const res = await donationRequestsService.forDonation(donation.id);
        return { donation, requests: res.items };
      }),
    );

    setGroups(withRequests.filter((g) => g.requests.length > 0));
  }

  useEffect(() => {
    load();
  }, []);

  async function act(action: () => Promise<unknown>) {
    try {
      await action();
      load();
    } catch (err) {
      push(extractErrorMessage(err), 'error');
    }
  }

  if (groups === null) return <Loader />;

  const contactVisible = (status: string) =>
    ['APPROVED', 'RESERVED', 'COLLECTED', 'COMPLETED'].includes(status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title={t('contact.incomingRequests')}
        description={t('contact.incomingRequestsHint')}
      />

      {groups.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={t('contact.noRequestsYet')} />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {groups.map(({ donation, requests }) => (
            <section key={donation.id} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-muted/60 px-4 py-3">
                <Link
                  to={`/donations/${donation.id}`}
                  className="truncate font-medium text-text hover:text-accent hover:underline"
                >
                  {donation.title}
                </Link>
                <StatusBadge status={donation.status} />
              </div>
              <ul className="divide-y divide-border">
                {requests.map((r) => (
                  <li key={r.id} className="flex flex-col gap-3 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                          {(r.requester?.fullName ?? '?').charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text">
                            {r.requester?.fullName ?? r.requesterId}
                          </p>
                          {contactVisible(r.status) && r.requester?.phone ? (
                            <a
                              href={`tel:${r.requester.phone}`}
                              className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                            >
                              <Phone size={13} />
                              {r.requester.phone}
                            </a>
                          ) : (
                            <p className="text-xs text-text-muted">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>

                    <RequestConversation request={r} requesterName={r.requester?.fullName ?? ''} />

                    {(r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'COLLECTED') && (
                      <div className="flex flex-wrap gap-2">
                        {r.status === 'PENDING' && (
                          <>
                            <Button size="sm" onClick={() => act(() => donationRequestsService.approve(r.id))}>
                              {t('contact.approve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                if (window.confirm(t('contact.rejectConfirm') ?? '')) {
                                  act(() => donationRequestsService.reject(r.id));
                                }
                              }}
                            >
                              {t('contact.reject')}
                            </Button>
                          </>
                        )}
                        {r.status === 'APPROVED' && (
                          <Button size="sm" onClick={() => act(() => donationRequestsService.collect(r.id))}>
                            {t('contact.markCollected')}
                          </Button>
                        )}
                        {r.status === 'COLLECTED' && (
                          <Button size="sm" onClick={() => act(() => donationRequestsService.complete(r.id))}>
                            {t('contact.markCompleted')}
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
