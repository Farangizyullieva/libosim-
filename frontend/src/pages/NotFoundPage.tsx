import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buttonClass } from '../components/button-styles';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-5xl text-text-muted">404</p>
      <h1 className="mt-4 font-display text-2xl text-text">{t('notFound.title')}</h1>
      <p className="mt-2 text-sm text-text-muted">{t('notFound.description')}</p>
      <Link
        to="/"
        className={buttonClass('primary', 'md', 'mt-6')}
      >
        {t('notFound.backHome')}
      </Link>
    </div>
  );
}
