import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useNavigationStore } from '../store/navigation.store';

export function BackButton({ fallback = '/' }: { fallback?: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const depth = useNavigationStore((s) => s.depth);

  function handleClick() {
    // window.history.length counts the whole browser tab, not just
    // in-app routes, so it can't tell us whether -1 actually leads
    // somewhere inside the app. Use our own tracked depth instead.
    if (depth > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text"
    >
      <ArrowLeft size={16} />
      {t('common.back')}
    </button>
  );
}
