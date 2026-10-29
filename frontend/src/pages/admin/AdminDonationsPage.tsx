import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { donationsService } from '../../services/donations.service';
import type { Donation, DonationStatus } from '../../types';
import { useToastStore } from '../../store/toast.store';
import { extractErrorMessage } from '../../services/api-client';
import { Loader, EmptyState, ErrorState } from '../../components/Feedback';
import { Button } from '../../components/Button';
import { toAbsoluteUploadUrl } from '../../services/uploads.service';

const STATUS_FILTERS: (DonationStatus | 'ALL')[] = [
  'PENDING_REVIEW',
  'AVAILABLE',
  'REQUESTED',
  'RESERVED',
  'COLLECTED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
  'ALL',
];

export default function AdminDonationsPage() {
  const { t } = useTranslation();
  const push = useToastStore((s) => s.push);
  const [params, setParams] = useSearchParams();
  const initialStatus = (params.get('status') as DonationStatus | 'ALL' | null) ?? 'PENDING_REVIEW';
  const [status, setStatusState] = useState<DonationStatus | 'ALL'>(initialStatus);

  function setStatus(next: DonationStatus | 'ALL') {
    setStatusState(next);
    const nextParams = new URLSearchParams(params);
    nextParams.set('status', next);
    setParams(nextParams);
  }
  const [items, setItems] = useState<Donation[] | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setItems(null);
    setError(null);
    try {
      const res = await donationsService.adminList({
        status: status === 'ALL' ? undefined : status,
        limit: 50,
      });
      setItems(res.items);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function approve(id: string) {
    try {
      await donationsService.approve(id);
      push(t('admin.donationApproved'));
      load();
    } catch (err) {
      push(extractErrorMessage(err), 'error');
    }
  }

  async function submitReject(id: string) {
    try {
      await donationsService.reject(id, reason);
      push(t('admin.donationRejected'));
      setRejecting(null);
      setReason('');
      load();
    } catch (err) {
      push(extractErrorMessage(err), 'error');
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <h1 className="font-display text-2xl text-text">{t('admin.donationsModeration')}</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ' +
              (status === s
                ? 'border-accent bg-accent text-white'
                : 'border-border bg-surface text-text-muted hover:text-text')
            }
          >
            {s === 'ALL' ? t('admin.allStatuses') : t(`status.${s}`)}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !items ? (
          <Loader />
        ) : items.length === 0 ? (
          <EmptyState title={t('donations.noResults')} />
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
            {items.map((d) => (
              <div key={d.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-accent-soft">
                    {d.images[0] && (
                      <img src={toAbsoluteUploadUrl(d.images[0])} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text">{d.title}</p>
                    <p className="truncate text-xs text-text-muted">
                      {d.donor?.fullName} · {d.category?.name} · {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                    {t(`status.${d.status}`)}
                  </span>
                </div>

                {d.autoFlagged && (
                  <p className="text-xs text-danger">⚠ {t('admin.autoFlagged')}</p>
                )}

                {d.status === 'PENDING_REVIEW' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => approve(d.id)}>
                      {t('contact.approve')}
                    </Button>
                    {rejecting === d.id ? (
                      <>
                        <input
                          autoFocus
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder={t('admin.rejectReasonPlaceholder') ?? undefined}
                          className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text"
                        />
                        <Button size="sm" variant="danger" disabled={reason.trim().length < 3} onClick={() => submitReject(d.id)}>
                          {t('admin.confirmReject')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setRejecting(null); setReason(''); }}>
                          {t('common.cancel')}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setRejecting(d.id)}>
                        {t('contact.reject')}
                      </Button>
                    )}
                  </div>
                )}

                {d.status === 'REJECTED' && d.rejectionReason && (
                  <p className="text-xs text-danger">{d.rejectionReason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
