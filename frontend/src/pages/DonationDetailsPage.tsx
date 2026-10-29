import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Pencil, Phone, Shirt } from 'lucide-react';
import { donationsService } from '../services/donations.service';
import { donationRequestsService } from '../services/donation-requests.service';
import type { Donation } from '../types';
import { useAuthStore } from '../store/auth.store';
import { useToastStore } from '../store/toast.store';
import { extractErrorMessage } from '../services/api-client';
import { toAbsoluteUploadUrl } from '../services/uploads.service';
import { categoryName } from '../utils/category';
import { Loader, ErrorState } from '../components/Feedback';
import { Button } from '../components/Button';
import { buttonClass } from '../components/button-styles';
import { StatusBadge } from '../components/StatusBadge';
import { AskDonorBox } from '../components/AskDonorBox';
import { PickupMap } from '../components/PickupMap';

export default function DonationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  // Set by the create/edit form so the owner gets a clear "saved" message.
  const saved = (location.state as { saved?: 'created' | 'review' | 'updated' } | null)?.saved;
  const { user, isAuthenticated } = useAuthStore();
  const push = useToastStore((s) => s.push);

  const [donation, setDonation] = useState<Donation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [imageFailed, setImageFailed] = useState<Record<number, boolean>>({});
  const [cancelling, setCancelling] = useState(false);

  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    donationsService
      .getOne(id)
      .then(setDonation)
      .catch(() => setError(t('common.error')));
  }, [id, t]);

  if (error) return <ErrorState message={error} />;
  if (!donation) return <Loader />;

  const isOwner = user?.id === donation.donorId;
  const canContact = ['AVAILABLE', 'REQUESTED'].includes(donation.status) && !isOwner;
  const canManage = isOwner && ['DRAFT', 'PENDING_REVIEW', 'AVAILABLE'].includes(donation.status);

  async function handleCancel() {
    if (!donation) return;
    if (!window.confirm(t('myDonations.cancelConfirm') ?? '')) return;
    setCancelling(true);
    try {
      const updated = await donationsService.cancel(donation.id);
      setDonation(updated);
      push(t('donationForm.toastCancelled'));
    } catch {
      push(t('common.error'), 'error');
    } finally {
      setCancelling(false);
    }
  }

  function requireAuth(action: () => void) {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/donations/${id}` } });
      return;
    }
    action();
  }

  function handleCallClick() {
    // The backend only returns the donor's phone to signed-in users.
    requireAuth(() => {
      if (donation?.donor?.phone) {
        window.location.href = `tel:${donation.donor.phone}`;
      }
    });
  }

  // Sending a message from the "ask the donor" box creates a donation
  // request with the message as its note.
  async function handleAsk(message: string) {
    if (!donation) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/donations/${id}` } });
      return;
    }
    try {
      await donationRequestsService.create(donation.id, message);
      setRequestSent(true);
      push(t('contact.requestSent'));
    } catch (err) {
      push(extractErrorMessage(err), 'error');
    }
  }

  const details: { label: string; value: string }[] = [
    { label: t('donations.category'), value: categoryName(t, donation.category) },
    { label: t('donations.condition'), value: t(`conditions.${donation.condition}`) },
    { label: t('donations.gender'), value: t(`genders.${donation.gender}`) },
    { label: t('donations.ageGroup'), value: t(`ageGroups.${donation.ageGroup}`) },
    ...(donation.size ? [{ label: t('donations.size'), value: donation.size }] : []),
    { label: t('donations.quantity'), value: String(donation.quantity) },
    ...(donation.location ? [{ label: t('donations.location'), value: donation.location }] : []),
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      {saved && (
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={24} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <p className="font-semibold text-text">
                {saved === 'updated' ? t('donationForm.updatedTitle') : t('donationForm.savedTitle')}
              </p>
              {saved !== 'updated' && (
                <p className="mt-0.5 text-sm text-text-muted">
                  {saved === 'review' ? t('donationForm.savedReview') : t('donationForm.savedText')}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link to="/my-donations" className={buttonClass('primary', 'sm', 'rounded-full px-4')}>
              {t('nav.myDonations')}
            </Link>
            {saved !== 'updated' && (
              <Link to="/donations/new" className={buttonClass('secondary', 'sm', 'rounded-full px-4')}>
                {t('donationForm.addAnother')}
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,380px)_1fr] lg:grid-cols-[minmax(0,440px)_1fr] lg:gap-12">
        <div>
          <div className="mx-auto aspect-square max-h-[60vh] w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface-muted md:max-w-none">
            {donation.images[activeImage] && !imageFailed[activeImage] ? (
              <img
                src={toAbsoluteUploadUrl(donation.images[activeImage])}
                alt={donation.title}
                onError={() => setImageFailed((s) => ({ ...s, [activeImage]: true }))}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text-muted">
                <Shirt size={40} strokeWidth={1.25} />
              </div>
            )}
          </div>
          {donation.images.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {donation.images.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setActiveImage(i)}
                  aria-label={`${i + 1}`}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    i === activeImage ? 'border-accent' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  {imageFailed[i] ? (
                    <div className="flex h-full w-full items-center justify-center bg-surface-muted">
                      <Shirt size={16} strokeWidth={1.25} className="text-text-muted" />
                    </div>
                  ) : (
                    <img
                      src={toAbsoluteUploadUrl(img)}
                      alt=""
                      onError={() => setImageFailed((s) => ({ ...s, [i]: true }))}
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <StatusBadge status={donation.status} />
          <h1 className="mt-3 font-display text-2xl text-text sm:text-3xl">{donation.title}</h1>

          <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-text">
            {donation.description}
          </p>

          <dl className="mt-6 divide-y divide-border rounded-xl border border-border bg-surface">
            {details.map((row) => (
              <div key={row.label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                <dt className="text-text-muted">{row.label}</dt>
                <dd className="text-right font-medium text-text">{row.value}</dd>
              </div>
            ))}
          </dl>

          {donation.donor && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                {donation.donor.fullName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-text-muted">{t('contact.donor')}</p>
                <p className="truncate text-sm font-medium text-text">{donation.donor.fullName}</p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {canContact && (
              <>
                <Button size="lg" onClick={handleCallClick} className="w-full rounded-xl sm:w-auto sm:px-8">
                  <Phone size={18} />
                  {t('contact.call')}
                </Button>
                {!isAuthenticated && (
                  <p className="text-sm text-text-muted">{t('contact.loginToContact')}</p>
                )}
              </>
            )}

            {canManage && (
              <div className="flex flex-wrap gap-2">
                <Link to={`/donations/${donation.id}/edit`} className={buttonClass('secondary')}>
                  <Pencil size={16} />
                  {t('common.edit')}
                </Link>
                <Button variant="ghost" loading={cancelling} onClick={handleCancel} className="text-danger hover:bg-danger-soft hover:text-danger">
                  {t('common.cancel')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {((canContact || requestSent) || donation.location) && (
        <div
          className={`mt-12 grid gap-10 ${
            (canContact || requestSent) && donation.location ? 'lg:grid-cols-2' : 'max-w-3xl'
          }`}
        >
          {(canContact || requestSent) && <AskDonorBox onSend={handleAsk} sent={requestSent} />}
          {donation.location && <PickupMap location={donation.location} />}
        </div>
      )}
    </div>
  );
}
