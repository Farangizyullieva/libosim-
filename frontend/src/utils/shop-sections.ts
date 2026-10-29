import womenPhoto from '../assets/home-categories/women.jpg';
import menPhoto from '../assets/home-categories/men.jpg';
import kidsPhoto from '../assets/home-categories/kids.jpg';

// The three big shopping sections shown as tiles on the home page and as
// filter chips on the donations list. Each maps to one URL query param the
// donations page understands: `gender` directly, or `category` (a slug the
// page resolves to a category id).
export interface ShopSection {
  key: 'women' | 'men' | 'kids';
  labelKey: string;
  param: 'gender' | 'category';
  value: string;
  photo: string;
  tileClass: string;
}

export const SHOP_SECTIONS: ShopSection[] = [
  {
    key: 'women',
    labelKey: 'home.catWomen',
    param: 'gender',
    value: 'WOMEN',
    photo: womenPhoto,
    tileClass: 'bg-[#e4f3e7] dark:bg-[#1d2c21]',
  },
  {
    key: 'men',
    labelKey: 'home.catMen',
    param: 'gender',
    value: 'MEN',
    photo: menPhoto,
    tileClass: 'bg-[#e3edfb] dark:bg-[#1b2433]',
  },
  {
    key: 'kids',
    labelKey: 'home.catKids',
    param: 'gender',
    value: 'KIDS',
    photo: kidsPhoto,
    tileClass: 'bg-[#fde7ec] dark:bg-[#33212a]',
  },
];

export function sectionHref(section: ShopSection) {
  return `/donations?${section.param}=${encodeURIComponent(section.value)}`;
}
