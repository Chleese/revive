import { createClient } from "@/app/lib/supabase/client";
import type { CollectionRecord } from "@/lib/collections/types";

/**
 * 获取用户的所有收藏
 */
export async function getUserCollections(userId: string): Promise<CollectionRecord[]> {
  const { data, error } = await createClient()
    .from("collections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CollectionRecord[];
}
