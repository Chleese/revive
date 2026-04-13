import { createClient } from '@/app/lib/supabase/client';
import type {
  CategoryInsert,
  CategoryRecord,
  CategoryUpdate,
} from '@/lib/categories/types';

export async function createCategory(input: CategoryInsert): Promise<CategoryRecord> {
  const { data, error } = await createClient()
    .from('categories')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as CategoryRecord;
}

export async function updateCategory(
  id: string,
  updates: CategoryUpdate,
): Promise<CategoryRecord> {
  const { data, error } = await createClient()
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CategoryRecord;
}

export async function deleteCategory(id: string) {
  const { error } = await createClient().from('categories').delete().eq('id', id);

  if (error) throw error;
}
