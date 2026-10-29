import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

// One color per meaning, shared by donation and request statuses: green =
// open/positive, amber = waiting on someone, blue = in progress,
// red = rejected, gray = closed.
const STATUS_TONES: Record<string, Tone> = {
  AVAILABLE: 'success',
  APPROVED: 'success',
  COMPLETED: 'success',
  PENDING: 'warning',
  PENDING_REVIEW: 'warning',
  REQUESTED: 'warning',
  RESERVED: 'info',
  COLLECTED: 'info',
  REJECTED: 'danger',
  DRAFT: 'neutral',
  CANCELLED: 'neutral',
};

const HIDDEN_STATUSES = new Set(['PENDING', 'REQUESTED']);

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-accent-soft text-accent',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-muted text-text-muted',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useTranslation();
  // "Waiting" states are the default and say nothing new, so they get no
  // badge; only outcomes (approved, rejected, reserved…) are labelled.
  if (HIDDEN_STATUSES.has(status)) return null;
  const tone = STATUS_TONES[status] ?? 'neutral';
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {t(`status.${status}`)}
    </span>
  );
}
