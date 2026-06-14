"use client";

import { useCallback } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import type { TodoItemView, TodoPriority, TodoStatus } from "@/lib/todos/types";
import { TodoCard } from "@/components/todos/TodoCard";

type TodoListProps = {
  items: TodoItemView[];
  /**
   * 是否允许拖拽排序。开启筛选时设为 false（sensors 为空，无法触发拖拽，
   * 但 useSortable 始终处于有效上下文中，不会报错）。
   */
  draggable?: boolean;
  onCyclePriority: (id: string, current: TodoPriority) => void;
  onCycleStatus: (id: string, current: TodoStatus) => void;
  onToggleDone: (id: string) => void;
  onRequestReminder: (id: string) => void;
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string, newContent: string) => void;
  onCancelEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (newOrder: TodoItemView[]) => void;
};

export function TodoList({
  items,
  draggable = true,
  onCyclePriority,
  onCycleStatus,
  onToggleDone,
  onRequestReminder,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onReorder,
}: TodoListProps) {
  // 长按激活拖拽：避免误触（点击/滚动不会触发拖拽）
  const longPressSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const sensors = draggable ? longPressSensors : [];

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      onReorder(arrayMove(items, oldIndex, newIndex));
    },
    [items, onReorder],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}>
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5">
          {items.map((item) => (
            <TodoCard
              key={item.id}
              item={item}
              onCyclePriority={onCyclePriority}
              onCycleStatus={onCycleStatus}
              onToggleDone={onToggleDone}
              onRequestReminder={onRequestReminder}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
