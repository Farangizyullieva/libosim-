import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { notificationsService } from '../services/notifications.service';
import type { AppNotification } from '../types';
import { CheckCheck } from 'lucide-react';
import { Loader, EmptyState } from '../components/Feedback';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    notificationsService.list().then((res) => setItems(res.items));
  }, []);

  async function handleMarkAllRead() {
    await notificationsService.markAllRead();
    setItems((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? null);
  }

  async function handleMarkRead(id: string) {
    await notificationsService.markRead(id);
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? null);
  }

  if (items === null) return <Loader />;

  const hasUnread = items.some((n) => !n.isRead);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title={t('nav.notifications')}
        action={
          hasUnread && (
            <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck size={16} />
              {t('notifications.markAllRead')}
            </Button>
          )
        }
      />

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={t('notifications.allCaughtUp')} />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {items.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => !n.isRead && handleMarkRead(n.id)}
                className={`flex w-full gap-3 px-4 py-4 text-left transition-colors ${
                  n.isRead ? 'cursor-default' : 'bg-accent-soft/50 hover:bg-accent-soft'
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-accent'}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm text-text ${n.isRead ? '' : 'font-semibold'}`}>
                    {n.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-text-muted">{n.message}</span>
                  <span className="mt-1.5 block text-xs text-text-muted">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
