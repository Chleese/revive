import { createClient } from "@/app/lib/supabase/client";
import type {
  CollectionInsert,
  CollectionRecord,
  CollectionUpdate,
} from "@/lib/collections/types";

function shouldRetryWithLegacyColumns(error: { message?: string; details?: string; hint?: string } | null) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
  return /(resolved_url|raw_input|metadata_source|metadata_confidence)/i.test(text);
}

/**
 * 添加收藏
 */
export async function addCollection(item: CollectionInsert): Promise<CollectionRecord> {
  const client = createClient();

  const { data, error } = await client
    .from("collections")
    .insert(item)
    .select()
    .single();

  if (error && shouldRetryWithLegacyColumns(error)) {
    const legacyInsert = {
      user_id: item.user_id,
      title: item.title,
      url: item.url,
      platform: item.platform,
      image: item.image,
      needs_edit: item.needs_edit,
    };

    const retry = await client
      .from("collections")
      .insert(legacyInsert)
      .select()
      .single();

    if (retry.error) throw retry.error;
    return retry.data as CollectionRecord;
  }

  if (error) throw error;
  return data as CollectionRecord;
}

/**
 * 更新收藏
 */
export async function updateCollection(
  id: string,
  updates: CollectionUpdate
): Promise<CollectionRecord> {
  const { data, error } = await createClient()
    .from("collections")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as CollectionRecord;
}

/**
 * 删除收藏
 */
export async function deleteCollection(id: string) {
  const { error } = await createClient().from("collections").delete().eq("id", id);

  if (error) throw error;
}
