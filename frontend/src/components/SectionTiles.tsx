import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { SHOP_SECTIONS, sectionHref } from '../utils/shop-sections';

// Pastel tiles with a product photo, one per shopping section.
export function SectionTiles() {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-5">
      {SHOP_SECTIONS.map((section) => (
        <Link
          key={section.key}
          to={sectionHref(section)}
          className={clsx(
            'glow-card group flex flex-col items-center rounded-3xl border border-transparent px-3 pb-5 pt-4 text-center',
            section.tileClass,
          )}
        >
          {/* multiply blends the photo's white backdrop into the tile color */}
          <img
            src={section.photo}
            alt=""
            loading="lazy"
            className="h-28 w-28 rounded-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105 sm:h-32 sm:w-32 dark:mix-blend-normal"
          />
          <span className="mt-2 text-sm font-semibold text-text sm:text-[15px]">
            {t(section.labelKey)}
          </span>
        </Link>
      ))}
    </div>
  );
}
