import { Dumbbell, Package, Shirt, type LucideIcon } from 'lucide-react';
import accessoriesPhoto from '../assets/categories/accessories.png';
import childrensClothingPhoto from '../assets/categories/childrens-clothing.png';
import dressesPhoto from '../assets/categories/dresses.png';
import mensClothingPhoto from '../assets/categories/mens-clothing.png';
import jacketsPhoto from '../assets/categories/jackets.png';
import shoesPhoto from '../assets/categories/shoes.png';
import otherPhoto from '../assets/categories/other.png';
import sweatersPhoto from '../assets/categories/sweaters.png';
import womensClothingPhoto from '../assets/categories/womens-clothing.png';
import sportswearPhoto from '../assets/categories/sportswear.png';

// Real product photos supplied for every category — each is a pre-cropped
// circular shot (item + soft background + shadow already baked in), so it's
// rendered as-is inside a plain circular mask rather than tinted with our
// own background color.
const CATEGORY_PHOTOS: Record<string, string> = {
  accessories: accessoriesPhoto,
  'childrens-clothing': childrensClothingPhoto,
  dresses: dressesPhoto,
  'mens-clothing': mensClothingPhoto,
  jackets: jacketsPhoto,
  shoes: shoesPhoto,
  other: otherPhoto,
  sweaters: sweatersPhoto,
  'womens-clothing': womensClothingPhoto,
  sportswear: sportswearPhoto,
};

export function getCategoryPhoto(slug: string): string | undefined {
  return CATEGORY_PHOTOS[slug];
}

// Purely decorative — an icon per known category slug so the grid doesn't
// look bare. The category list/names themselves always come from the
// backend; this map only supplies a visual, and falls back to a generic
// icon for any slug it doesn't recognize (e.g. a category an admin adds
// later).
//
// Most garment types have no good match in lucide's generic icon set (a
// watch or a snowflake doesn't read as "sweater"), so those are drawn here
// as small custom line-art glyphs in the same stroke style as the lucide
// icons we do keep (Shirt, Dumbbell, Package), rather than reusing a
// mismatched library icon.

type CustomIconProps = { size: number; strokeWidth: number };

// Icons are drawn with a soft currentColor fill behind a firmer currentColor
// stroke — a filled, two-weight look (rather than plain line-art) so each
// glyph reads as a small colorful illustration in its tinted circle, closer
// to a product photo than a thin outline icon.
function Jacket({ size, strokeWidth }: CustomIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M9 3 L4 6 L3 11 L5 11 L7 7 L7 20 L17 20 L17 7 L19 11 L21 11 L20 6 L15 3 L12 6 Z"
        fill="currentColor"
        fillOpacity={0.22}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 6 L12 19" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

function Sweater({ size, strokeWidth }: CustomIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M8 4 L4 7 L3 12 L5 12 L7 8 L7 20 L17 20 L17 8 L19 12 L21 12 L20 7 L16 4 Q12 2 8 4 Z"
        fill="currentColor"
        fillOpacity={0.22}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 11.5 L6 11.5 M18 11.5 L19.5 11.5 M7.5 17.5 L16.5 17.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Dress({ size, strokeWidth }: CustomIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M9 4 Q12 6.5 15 4 L16 9.5 L19 20 L5 20 L8 9.5 Z"
        fill="currentColor"
        fillOpacity={0.22}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.3 9.7 Q12 11 15.7 9.7"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Blouse({ size, strokeWidth }: CustomIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M9 4 L5 6 L4 10 L6 10 L7 8 L7 20 L17 20 L17 8 L18 10 L20 10 L19 6 L15 4 Q12 7.5 9 4 Z"
        fill="currentColor"
        fillOpacity={0.22}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Onesie({ size, strokeWidth }: CustomIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M9 4 L5 6 L4 9 L6 9 L7 8 L7 15 L5 20 L8 20 L9 15 L12 17 L15 15 L16 20 L19 20 L17 15 L17 8 L18 9 L20 9 L19 6 L15 4 Q12 6.5 9 4 Z"
        fill="currentColor"
        fillOpacity={0.22}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Sneaker({ size, strokeWidth }: CustomIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M2 19 C2 16 4 15 7 15 L11 10 C12 9 14 9 15 10 L18 13 C20 14 22 15 22 17 C22 18.4 21 19 19.5 19 Z"
        fill="currentColor"
        fillOpacity={0.22}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 11.5 L11.5 9.5 M11.5 13.5 L14 11.3 M13.5 15 L16.5 12.7"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.85}
        strokeLinecap="round"
      />
      <path d="M2 19 L22 19" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

function Bag({ size, strokeWidth }: CustomIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M6 9 L18 9 L19.5 20 L4.5 20 Z"
        fill="currentColor"
        fillOpacity={0.22}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 9 C8.5 5.5 15.5 5.5 15.5 9"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

const CUSTOM_ICON_MAP: Record<string, (props: CustomIconProps) => React.JSX.Element> = {
  'womens-clothing': Blouse,
  'childrens-clothing': Onesie,
  shoes: Sneaker,
  jackets: Jacket,
  dresses: Dress,
  sweaters: Sweater,
  accessories: Bag,
};

const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  'mens-clothing': Shirt,
  sportswear: Dumbbell,
  other: Package,
};

// Each known category gets its own fixed color pair (not cycled by position)
// so the row reads as a set of distinct, vivid little illustrations —
// closer to a shelf of product photos than a repeating accent swatch.
const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  accessories: { bg: '#dcefe0', fg: '#2f4a3a' }, // bag — deep green on mint
  'childrens-clothing': { bg: '#fbdee6', fg: '#c15c81' }, // pink
  'womens-clothing': { bg: '#e0f0e3', fg: '#3f7d4c' }, // green
  'mens-clothing': { bg: '#dde7f6', fg: '#3a5a8c' }, // navy on light blue
  jackets: { bg: '#f8ead0', fg: '#b8791f' }, // marigold clay
  shoes: { bg: '#e9e1f6', fg: '#6a5a99' }, // lavender
  dresses: { bg: '#e0f0e3', fg: '#4a7a54' }, // green
  sweaters: { bg: '#f8ead0', fg: '#9c6a34' }, // clay
  sportswear: { bg: '#dde9f6', fg: '#3f7d68' }, // teal-blue
  other: { bg: '#e9e1f6', fg: '#7a5a8c' }, // lavender
};

// Fallback rotation for any category slug not in the map above (e.g. one an
// admin adds later), so the grid never looks bare.
const FALLBACK_TINTS = [
  { bg: '#f8ead0', fg: '#b8791f' },
  { bg: '#e0f0e3', fg: '#3f7d4c' },
  { bg: '#fbdee6', fg: '#c15c81' },
  { bg: '#dde7f6', fg: '#3a5a8c' },
  { bg: '#e9e1f6', fg: '#6a5a99' },
];

export function getCategoryTint(slugOrIndex: string | number) {
  if (typeof slugOrIndex === 'string' && CATEGORY_COLORS[slugOrIndex]) {
    return CATEGORY_COLORS[slugOrIndex];
  }
  const index = typeof slugOrIndex === 'number' ? slugOrIndex : 0;
  return FALLBACK_TINTS[index % FALLBACK_TINTS.length];
}

export function CategoryIcon({ slug, size = 22 }: { slug: string; size?: number }) {
  const strokeWidth = 1.7;
  const Custom = CUSTOM_ICON_MAP[slug];
  if (Custom) return <Custom size={size} strokeWidth={strokeWidth} />;

  const Lucide = LUCIDE_ICON_MAP[slug] ?? Shirt;
  return <Lucide size={size} strokeWidth={strokeWidth} />;
}

// Single place that decides how a category's circle is rendered: a real
// product photo when we have one, otherwise the tinted line-art icon. Used
// by both the homepage strip and the full categories page so the two never
// drift out of sync.
export function CategoryBadge({
  slug,
  index = 0,
  size = 'md',
}: {
  slug: string;
  index?: number;
  size?: 'md' | 'lg';
}) {
  const photo = getCategoryPhoto(slug);
  const dimClass = size === 'lg' ? 'h-24 w-24' : 'h-20 w-20';
  const iconSize = size === 'lg' ? 30 : 32;

  if (photo) {
    return (
      <span className={`block ${dimClass} overflow-hidden rounded-full transition-transform group-hover:-translate-y-1`}>
        <img src={photo} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  const tint = getCategoryTint(slug || index);
  return (
    <span
      className={`flex ${dimClass} items-center justify-center rounded-full ring-1 ring-inset transition-transform group-hover:-translate-y-1`}
      style={{
        backgroundColor: tint.bg,
        color: tint.fg,
        ['--tw-ring-color' as string]: `${tint.fg}33`,
      }}
    >
      <CategoryIcon slug={slug} size={iconSize} />
    </span>
  );
}
