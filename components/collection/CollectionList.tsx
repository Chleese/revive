import { useCallback, useEffect, useRef } from "react";
import { CollectionCard } from "@/components/collection/CollectionCard";
import type { CollectionItemView } from "@/lib/collections/types";

type CollectionListProps = {
  items: CollectionItemView[];
  layout?: "grid" | "list";
  onOpen: (id: string, url: string) => void;
  onRequestReminder: (id: string) => void;
  onEditCategory: (id: string) => void;
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string, newTitle: string) => void;
  onCancelEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onActiveIndexChange?: (index: number) => void;
};

export function CollectionList({
  items,
  layout = "grid",
  onOpen,
  onRequestReminder,
  onEditCategory,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onActiveIndexChange,
}: CollectionListProps) {
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const updateActiveIndex = useCallback(() => {
    if (!items.length) {
      onActiveIndexChange?.(0);
      return;
    }

    const nearBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 24;

    if (nearBottom) {
      onActiveIndexChange?.(items.length);
      return;
    }

    const anchorY = 96;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    itemRefs.current.forEach((node, index) => {
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const visible = rect.bottom > 0 && rect.top < window.innerHeight;

      if (!visible) return;

      const distance = Math.abs(rect.top - anchorY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    onActiveIndexChange?.(closestIndex + 1);
  }, [items.length, onActiveIndexChange]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items.length]);

  useEffect(() => {
    updateActiveIndex();

    let frameId: number | null = null;
    const handleScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        updateActiveIndex();
        frameId = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [updateActiveIndex]);

  return (
    <div className={layout === "grid" ? "columns-2 sm:columns-3 lg:columns-4 gap-3" : "space-y-3"}>
      {items.map((item, index) => (
        <div
          key={item.id}
          ref={(node) => {
            itemRefs.current[index] = node;
          }}
          className={layout === "grid" ? "break-inside-avoid mb-3" : undefined}
        >
          <CollectionCard
            item={item}
            layout={layout}
            onOpen={onOpen}
            onRequestReminder={onRequestReminder}
            onEditCategory={onEditCategory}
            onStartEdit={onStartEdit}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
}
