export type CategoryScope = "all" | "bookmarks" | "todos";

export type CategoryRecord = {
  id: string;
  user_id: string;
  name: string;
  color?: string | null;
  sort_order?: number | null;
  scope?: CategoryScope;
  created_at?: string;
  updated_at?: string | null;
};

export type CategoryInsert = Omit<CategoryRecord, 'id' | 'created_at' | 'updated_at'>;

export type CategoryUpdate = Partial<
  Omit<CategoryRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

export type CategoryOption = {
  id: string;
  name: string;
};

export function mapCategoryRecordToOption(category: CategoryRecord): CategoryOption {
  return {
    id: category.id,
    name: category.name,
  };
}
