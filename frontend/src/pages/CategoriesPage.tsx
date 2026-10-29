import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCategoriesStore } from '../store/categories.store';
import { CategoryBadge } from '../components/CategoryIcon';
import { Loader, ErrorState, EmptyState } from '../components/Feedback';
import { categoryName } from '../utils/category';

export default function CategoriesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { categories, loaded, loading, error, fetch, retry } = useCategoriesStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl text-text">{t('donations.category')}</h1>
      <p className="mt-2 text-sm text-text-muted">
        {t('home.heroSubtitle')}
      </p>

      <div className="mt-8">
        {error ? (
          <ErrorState message={t('common.error') ?? error} onRetry={retry} />
        ) : loading || !loaded ? (
          <Loader label={t('common.loading') ?? undefined} />
        ) : categories.length === 0 ? (
          <EmptyState title={t('donations.noResults')} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c, i) => (
              <button
                key={c.id}
                onClick={() => navigate(`/donations?categoryId=${c.id}`)}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
              >
                <CategoryBadge slug={c.slug} index={i} size="lg" />
                <span className="text-sm font-medium text-text">{categoryName(t, c)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
