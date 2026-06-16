"use client";

import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TodoItemView, TodoPriority, TodoStatus } from "@/lib/todos/types";
import {
  formatTodoReminderSummary,
  getPriorityColorVar,
  getPriorityLabel,
  getPrioritySoftVar,
  getStatusLabel,
  getStatusStyle,
  isLongContent,
  parseBoldSegments,
} from "@/lib/todos/display";

type TodoCardProps = {
  item: TodoItemView;
  onCyclePriority: (id: string, current: TodoPriority) => void;
  onCycleStatus: (id: string, current: TodoStatus) => void;
  onToggleDone: (id: string) => void;
  onRequestReminder: (id: string) => void;
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string, newContent: string) => void;
  onCancelEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

const PRIORITY_CYCLE: TodoPriority[] = ["medium", "high", "low"];
const STATUS_CYCLE: TodoStatus[] = ["todo", "in_progress", "done", "snoozed"];

// 滑动手势参数
const REVEAL = 80; // 完全滑出露出的按钮宽度
const THRESHOLD = 32; // 松手后判定为完全展开的阈值

type PointerState = {
  x: number;
  y: number;
  decided: "none" | "horizontal" | "vertical";
  base: number; // 按下时的 swipeX，让滑动从当前位置开始（可往回滑收起）
};

export function TodoCard({
  item,
  onCyclePriority,
  onCycleStatus,
  onToggleDone,
  onRequestReminder,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: TodoCardProps) {
  const editRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<PointerState | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: item.status === "done" });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const priorityColor = getPriorityColorVar(item.priority);
  const prioritySoft = getPrioritySoftVar(item.priority);
  const statusStyle = getStatusStyle(item.status);
  const reminderLabel = item.reminder
    ? formatTodoReminderSummary(item.reminder)
    : null;
  const long = isLongContent(item.content);
  const showClamp = long && !expanded;

  // 关闭滑出 / 菜单时复位
  const resetSwipe = () => {
    pointerRef.current = null;
    setIsSwiping(false);
    setSwipeX(0);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-menu-trigger]") || menuRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  // 展开后 5 秒无操作自动收起
  useEffect(() => {
    if (swipeX === 0 || isSwiping) return;
    const timer = window.setTimeout(() => setSwipeX(0), 5000);
    return () => window.clearTimeout(timer);
  }, [swipeX, isSwiping]);

  // 展开时点击卡片以外的任何地方 → 收起
  useEffect(() => {
    if (swipeX === 0) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (cardRef.current?.contains(target)) return; // 点在本卡片内（含动作按钮）不处理
      setSwipeX(0);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [swipeX]);

  const stop = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
  };

  // —— 滑动手势：仅横向接管，竖向放行给原生滚动 / dnd 拖拽 ——
  const handlePointerDown = (event: React.PointerEvent) => {
    if (item.isEditing || menuOpen) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, textarea, input, a, select")) return;
    pointerRef.current = {
      x: event.clientX,
      y: event.clientY,
      decided: "none",
      base: swipeX, // 从当前位置算起，已展开时往回滑能收起
    };
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const st = pointerRef.current;
    if (!st) return;
    const dx = event.clientX - st.x;
    const dy = event.clientY - st.y;

    if (st.decided === "none") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        st.decided = "horizontal";
        setIsSwiping(true);
      } else {
        st.decided = "vertical";
        return;
      }
    }
    if (st.decided === "vertical") return;

    // 横向滑动：不阻止冒泡 —— 让 @dnd-kit 收到移动事件并自行取消拖拽激活
    // （快速横向移动 > tolerance，dnd 不会启动排序）
    setSwipeX(Math.max(-REVEAL, Math.min(REVEAL, st.base + dx)));
  };

  const handlePointerUp = () => {
    const st = pointerRef.current;
    pointerRef.current = null;
    if (!st || st.decided !== "horizontal") return;

    setIsSwiping(false);
    setSwipeX((current) =>
      Math.abs(current) >= THRESHOLD ? (current > 0 ? REVEAL : -REVEAL) : 0,
    );
  };

  const handleComplete = () => {
    resetSwipe();
    onToggleDone(item.id);
  };
  const handleDeleteSwipe = () => {
    resetSwipe();
    onDelete(item.id);
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        cardRef.current = node;
      }}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative ${isDragging ? "z-50" : ""}`}>
      <div
        className={`theme-panel theme-border relative overflow-hidden rounded-xl border border-l-4 ${
          isDragging ? "shadow-lg" : "transition-shadow hover:shadow-md"
        }`}
        style={{ borderLeftColor: priorityColor }}>
        {/* 滑出动作层 */}
        <div className='pointer-events-none absolute inset-0 flex justify-between'>
          <button
            type='button'
            aria-label='标记完成'
            onClick={(event) => {
              event.stopPropagation();
              handleComplete();
            }}
            className='flex w-20 items-center justify-center gap-1 text-xs font-medium text-white pointer-events-auto'
            style={{ background: "var(--action-done)" }}>
            <CheckIcon /> 完成
          </button>
          <button
            type='button'
            aria-label='删除'
            onClick={(event) => {
              event.stopPropagation();
              handleDeleteSwipe();
            }}
            className='flex w-20 items-center justify-center gap-1 text-xs font-medium text-white pointer-events-auto'
            style={{ background: "var(--action-delete)" }}>
            删除
          </button>
        </div>

        {/* 可滑动内容 */}
        <div
          className='relative bg-[var(--surface)]'
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: isSwiping ? "none" : "transform 200ms ease",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}>
          <div className='pl-3 pr-2.5 py-2.5'>
            {item.isEditing ? (
              <div onClick={stop} onKeyDown={stop}>
                <textarea
                  ref={editRef}
                  defaultValue={item.content}
                  autoFocus
                  rows={Math.min(item.content.split("\n").length + 1, 8)}
                  className='theme-input w-full resize-none rounded-lg border p-2 text-sm leading-6'
                />
                <div className='mt-2 flex gap-2'>
                  <button
                    type='button'
                    onClick={() =>
                      onSaveEdit(item.id, editRef.current?.value ?? item.content)
                    }
                    className='theme-primary-button rounded px-3 py-1 text-sm transition-opacity'>
                    保存
                  </button>
                  <button
                    type='button'
                    onClick={() => onCancelEdit(item.id)}
                    className='theme-secondary-button rounded px-3 py-1 text-sm transition-colors'>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 顶栏：优先级 + 提醒 + 菜单 */}
                <div className='mb-1.5 flex items-center gap-2'>
                  <button
                    type='button'
                    data-menu-trigger
                    onClick={(event) => {
                      event.stopPropagation();
                      onCyclePriority(item.id, item.priority);
                    }}
                    aria-label={`切换优先级（当前${getPriorityLabel(item.priority)}）`}
                    className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80'
                    style={{ background: prioritySoft, color: priorityColor }}>
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: priorityColor }}
                    />
                    {getPriorityLabel(item.priority)}
                  </button>

                  <div className="flex-1" />

                  {reminderLabel && (
                    <span className="theme-text-muted inline-flex items-center gap-1 text-xs">
                      ⏰ {reminderLabel}
                    </span>
                  )}

                  <div onClick={stop} onKeyDown={stop}>
                    <button
                      type='button'
                      data-menu-trigger
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuOpen((current) => !current);
                      }}
                      aria-label="更多操作"
                      className="theme-secondary-button rounded-full px-2.5 py-1 text-xs font-medium transition-colors">
                      更多
                    </button>
                  </div>
                </div>

                {/* 内容 */}
                <button
                  type='button'
                  onClick={(event) => {
                    event.stopPropagation();
                    if (long) setExpanded((current) => !current);
                  }}
                  className={`block w-full text-left text-sm leading-6 text-[var(--foreground)] ${
                    showClamp ? "line-clamp-3" : ""
                  }`}>
                  <span className="whitespace-pre-wrap">
                    {parseBoldSegments(item.content).map((segment, index) =>
                      segment.bold ? (
                        <strong
                          key={index}
                          className="font-bold"
                          style={{ color: "var(--todo-emphasis)" }}>
                          {segment.text}
                        </strong>
                      ) : (
                        <span key={index}>{segment.text}</span>
                      ),
                    )}
                  </span>
                </button>

                {/* 底栏：状态 */}
                <div className="theme-text-muted mt-2 flex items-center justify-between text-xs">
                  <button
                    type='button'
                    onClick={(event) => {
                      event.stopPropagation();
                      onCycleStatus(item.id, item.status);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-opacity hover:opacity-80"
                    style={{ background: statusStyle.background, color: statusStyle.color }}>
                    {item.status === "done" && <CheckIcon />}
                    {getStatusLabel(item.status)}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 更多菜单：放在裁剪层外，避免被 overflow-hidden 裁掉 */}
      {menuOpen && (
        <div
          ref={menuRef}
          className='theme-panel theme-border absolute right-0 top-9 z-40 min-w-36 rounded-xl border p-1 shadow-lg'
          onClick={stop}
          onKeyDown={stop}>
          <MenuButton
            label={item.reminder ? "修改提醒" : "设置提醒"}
            onClick={() => {
              setMenuOpen(false);
              onRequestReminder(item.id);
            }}
          />
          <MenuButton
            label="编辑内容"
            onClick={() => {
              setMenuOpen(false);
              onStartEdit(item.id);
            }}
          />
          <MenuButton
            label="删除"
            tone="danger"
            onClick={() => {
              setMenuOpen(false);
              onDelete(item.id);
            }}
          />
        </div>
      )}
    </div>
  );
}

function MenuButton({
  label,
  onClick,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        tone === "danger"
          ? "theme-danger-soft block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors"
          : "block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
      }>
      {label}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export { PRIORITY_CYCLE, STATUS_CYCLE };
