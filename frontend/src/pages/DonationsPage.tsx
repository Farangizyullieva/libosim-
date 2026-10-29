import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { donationsService, type DonationQuery } from '../services/donations.service';
import type { Donation, DonationGender } from '../types';
import { DonationCard } from '../components/DonationCard';
import { Loader, EmptyState, ErrorState } from '../components/Feedback';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { useCategoriesStore } from '../store/categories.store';
import { SHOP_SECTIONS, type ShopSection } from '../utils/shop-sections';
import clsx from 'clsx';

export default function DonationsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();

  const [items, setItems] = useState<Donation[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  // Shown under an empty search so the page never ends on a dead end.
  const [suggestions, setSuggestions] = useState<Donation[] | null>(null);

  const { categories, fetch: fetchCategories } = useCategoriesStore();
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Section filters arrive as ?gender=WOMEN or ?category=shoes (a slug,
  // resolved to the category id the API expects).
  const genderParam = params.get('gender') as DonationGender | null;
  const categorySlug = params.get('category');
  const categoryId = categorySlug
    ? categories.find((c) => c.slug === categorySlug)?.id
    : undefined;
  const waitingForCategory = Boolean(categorySlug) && !categoryId;

  const query: DonationQuery = {
    gender: genderParam ?? undefined,
    categoryId,
    search: params.get('search') ?? undefined,
    sort: (params.get('sort') as 'newest' | 'oldest') ?? 'newest',
    page,
    limit: 12,
  };

  useEffect(() => {
    if (waitingForCategory) return;
    setItems(null);
    setError(null);
    donationsService
      .list(query)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        if (res.items.length === 0 && query.search) {
          donationsService
            .list({ sort: 'newest', limit: 8 })
            .then((latest) => setSuggestions(latest.items))
            .catch(() => setSuggestions([]));
        } else {
          setSuggestions(null);
        }
      })
      .catch(() => setError(t('common.error')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, page, categoryId, waitingForCategory]);

  function selectSection(section: ShopSection | null) {
    const next = new URLSearchParams(params);
    next.delete('gender');
    next.delete('category');
    if (section) next.set(section.param, section.value);
    setParams(next);
    setPage(1);
  }

  const activeSection =
    SHOP_SECTIONS.find((s) => params.get(s.param) === s.value) ?? null;

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
    setPage(1);
  }

  const totalPages = Math.ceil(total / 12) || 1;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="bg-hero rounded-3xl border border-border px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader title={t('donations.title')} description={t('donations.subtitle')} />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get('search');
            updateParam('search', typeof value === 'string' ? value.trim() : '');
          }}
        >
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="search"
              name="search"
              key={params.get('search') ?? ''}
              defaultValue={params.get('search') ?? ''}
              placeholder={t('donations.searchPlaceholder') ?? ''}
              className="h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm text-text"
            />
          </div>
          <Button type="submit">{t('common.search')}</Button>
        </form>

        <select
          value={params.get('sort') ?? 'newest'}
          onChange={(e) => updateParam('sort', e.target.value)}
          aria-label={t('donations.sort') ?? undefined}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text sm:w-44"
        >
          <option value="newest">{t('donations.sortNewest')}</option>
          <option value="oldest">{t('donations.sortOldest')}</option>
        </select>
      </div>
      </div>

      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          type="button"
          onClick={() => selectSection(null)}
          className={clsx(
            'h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors',
            activeSection === null
              ? 'border-accent bg-accent text-white'
              : 'border-border bg-surface text-text hover:border-border-strong',
          )}
        >
          {t('donations.filterAll')}
        </button>
        {SHOP_SECTIONS.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => selectSection(section)}
            className={clsx(
              'flex h-10 shrink-0 items-center gap-2 rounded-full border pl-1 pr-4 text-sm font-medium transition-colors',
              activeSection?.key === section.key
                ? 'border-accent bg-accent text-white'
                : 'border-border bg-surface text-text hover:border-border-strong',
            )}
          >
            <span className={clsx('flex h-8 w-8 items-center justify-center overflow-hidden rounded-full', section.tileClass)}>
              <img src={section.photo} alt="" className="h-8 w-8 object-contain mix-blend-multiply dark:mix-blend-normal" />
            </span>
            {t(section.labelKey)}
          </button>
        ))}
      </div>

      {!error && items !== null && total > 0 && (
        <p className="mt-6 text-sm text-text-muted">
          {t('donations.resultsCount', { count: total })}
        </p>
      )}

      <div className="mt-5">
        {error ? (
          <ErrorState message={error} />
        ) : items === null ? (
          <Loader />
        ) : items.length === 0 ? (
          <>
            <EmptyState
              title={
                params.get('search')
                  ? t('donations.noResultsFor', { query: params.get('search') })
                  : t('donations.noResults')
              }
              description={params.get('search') ? t('donations.noResultsHint') : undefined}
              action={
                params.get('search') ? (
                  <Button size="sm" onClick={() => updateParam('search', '')}>
                    {t('donations.clearFilters')}
                  </Button>
                ) : undefined
              }
            />

            {suggestions && suggestions.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-xl text-text sm:text-2xl">
                  {t('donations.suggestionsTitle')}
                </h2>
                <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
                  {suggestions.map((donation) => (
                    <DonationCard key={donation.id} donation={donation} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
              {items.map((donation) => (
                <DonationCard key={donation.id} donation={donation} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mx-auto mt-8 flex w-fit items-center justify-center gap-1 rounded-lg border border-border bg-surface p-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label={t('admin.prevPage') ?? undefined}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft size={18} />
                </button>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium ${
                      page === i + 1
                        ? 'bg-accent text-white'
                        : 'text-text-muted hover:bg-surface-muted hover:text-text'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label={t('admin.nextPage') ?? undefined}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
