import {
  addCollection,
  deleteCollection,
  updateCollection,
} from "@/lib/collections/mutations";
import { getUserCollections } from "@/lib/collections/queries";
import type {
  CollectionInsert,
  CollectionRecord,
  CollectionUpdate,
} from "@/lib/collections/types";

export const collectionService = {
  listUserCollections(userId: string): Promise<CollectionRecord[]> {
    return getUserCollections(userId);
  },

  create(item: CollectionInsert): Promise<CollectionRecord> {
    return addCollection(item);
  },

  update(id: string, updates: CollectionUpdate): Promise<CollectionRecord> {
    return updateCollection(id, updates);
  },

  remove(id: string) {
    return deleteCollection(id);
  },
};
