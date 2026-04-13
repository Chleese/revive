import { createClient } from '@/app/lib/supabase/client';
import type { CategoryRecord } from '@/lib/categories/types';

export async function getUserCategories(userId: string): Promise<CategoryRecord[]> {
  const { data, error } = await createClient()
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CategoryRecord[];
}
