import type { TFunction } from 'i18next';
import type { Category } from '../types';

export function categoryName(t: TFunction, category?: Pick<Category, 'slug' | 'name'> | null) {
  if (!category) return '';
  return t(`categories.${category.slug}`, category.name);
}
