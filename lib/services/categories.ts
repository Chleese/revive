import {
  createCategory,
  deleteCategory,
  updateCategory,
} from '@/lib/categories/mutations';
import { getUserCategories } from '@/lib/categories/queries';
import type {
  CategoryInsert,
  CategoryRecord,
  CategoryUpdate,
} from '@/lib/categories/types';

export const categoryService = {
  listUserCategories(userId: string): Promise<CategoryRecord[]> {
    return getUserCategories(userId);
  },

  create(input: CategoryInsert): Promise<CategoryRecord> {
    return createCategory(input);
  },

  update(id: string, updates: CategoryUpdate): Promise<CategoryRecord> {
    return updateCategory(id, updates);
  },

  remove(id: string) {
    return deleteCategory(id);
  },
};
