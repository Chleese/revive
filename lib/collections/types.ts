import type { Platform } from "@/lib/platform";
import type { MetadataSource } from "@/lib/metadata/types";

export type CollectionStatus = "unread" | "viewed" | "archived";

export type CollectionRecord = {
  id?: string;
  user_id: string;
  title: string;
  url: string;
  resolved_url?: string | null;
  platform: Platform;
  image?: string | null;
  raw_input?: string | null;
  notes?: string | null;
  status?: CollectionStatus | null;
  category_id?: string | null;
  metadata_source?: MetadataSource | null;
  metadata_confidence?: number | null;
  needs_edit?: boolean | null;
  last_opened_at?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export type CollectionInsert = Omit<CollectionRecord, "id" | "created_at" | "updated_at">;

export type CollectionUpdate = Partial<
  Omit<CollectionRecord, "id" | "user_id" | "created_at" | "updated_at">
>;

export type CollectionItemView = {
  id: string;
  title: string;
  url: string;
  platform: Platform;
  image?: string;
  isEditing?: boolean;
  needsEdit?: boolean;
};

export function mapCollectionRecordToItemView(
  item: CollectionRecord
): CollectionItemView {
  return {
    id: item.id ?? "",
    title: item.title,
    url: item.url,
    platform: item.platform,
    image: item.image ?? undefined,
    needsEdit: item.needs_edit ?? false,
  };
}
