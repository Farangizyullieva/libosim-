import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { usersService, type FullProfile } from '../../services/users.service';
import { useToastStore } from '../../store/toast.store';
import { extractErrorMessage } from '../../services/api-client';
import { Loader, EmptyState, ErrorState } from '../../components/Feedback';
import { Button } from '../../components/Button';

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const push = useToastStore((s) => s.push);
  const [params, setParams] = useSearchParams();
  const blockedOnly = params.get('blocked') === 'true';
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Awaited<ReturnType<typeof usersService.list>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await usersService.list(page, 20, blockedOnly ? true : undefined);
      setResult(res);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, blockedOnly]);

  function setBlockedOnly(value: boolean) {
    setPage(1);
    const next = new URLSearchParams(params);
    if (value) next.set('blocked', 'true');
    else next.delete('blocked');
    setParams(next);
  }

  async function toggleBlock(user: FullProfile) {
    try {
      if (user.isBlocked) {
        await usersService.unblock(user.id);
      } else {
        await usersService.block(user.id);
      }
      load();
    } catch (err) {
      push(extractErrorMessage(err), 'error');
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <h1 className="font-display text-2xl text-text">{t('admin.users')}</h1>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setBlockedOnly(false)}
          className={
            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ' +
            (!blockedOnly
              ? 'border-accent bg-accent text-white'
              : 'border-border bg-surface text-text-muted hover:text-text')
          }
        >
          {t('admin.allStatuses')}
        </button>
        <button
          onClick={() => setBlockedOnly(true)}
          className={
            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ' +
            (blockedOnly
              ? 'border-accent bg-accent text-white'
              : 'border-border bg-surface text-text-muted hover:text-text')
          }
        >
          {t('admin.blocked')}
        </button>
      </div>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !result ? (
          <Loader />
        ) : result.items.length === 0 ? (
          <EmptyState title={t('admin.noUsers')} />
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-text-muted">
                  <tr>
                    <th className="px-4 py-3">{t('admin.table.name')}</th>
                    <th className="px-4 py-3">{t('admin.table.phone')}</th>
                    <th className="px-4 py-3">{t('admin.table.role')}</th>
                    <th className="px-4 py-3">{t('admin.table.status')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.items.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 font-medium text-text">{user.fullName}</td>
                      <td className="px-4 py-3 text-text-muted">{user.phone}</td>
                      <td className="px-4 py-3 text-text-muted">{user.role}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            'rounded-full px-3 py-1 text-xs font-medium ' +
                            (user.isBlocked ? 'bg-danger/10 text-danger' : 'bg-accent-soft text-accent')
                          }
                        >
                          {user.isBlocked ? t('admin.blocked') : t('admin.active')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant={user.isBlocked ? 'secondary' : 'danger'}
                            onClick={() => toggleBlock(user)}
                          >
                            {user.isBlocked ? t('admin.unblock') : t('admin.block')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  {t('admin.prevPage')}
                </Button>
                <span className="text-sm text-text-muted">
                  {page} / {result.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= result.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('admin.nextPage')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
