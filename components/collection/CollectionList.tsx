import { CollectionCard } from "@/components/collection/CollectionCard";
import type { CollectionItemView } from "@/lib/collections/types";

type CollectionListProps = {
  items: CollectionItemView[];
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string, newTitle: string) => void;
  onCancelEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function CollectionList({
  items,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: CollectionListProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <CollectionCard
          key={item.id}
          item={item}
          onStartEdit={onStartEdit}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
