import { supabase } from './supabase';

export type CollectionItem = {
  id?: string;
  user_id: string;
  title: string;
  url: string;
  platform: string;
  image?: string;
  needs_edit?: boolean;
  created_at?: string;
};

/**
 * 获取用户的所有收藏
 */
export async function getUserCollections(userId: string) {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * 添加收藏
 */
export async function addCollection(item: Omit<CollectionItem, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('collections')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 更新收藏
 */
export async function updateCollection(id: string, updates: Partial<CollectionItem>) {
  const { data, error } = await supabase
    .from('collections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 删除收藏
 */
export async function deleteCollection(id: string) {
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
