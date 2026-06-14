import type {
  TodoItemView,
  TodoPriority,
  TodoStatus,
} from "@/lib/todos/types";
import type { ActiveReminderView } from "@/lib/reminders/types";
import { formatReminderSummary } from "@/lib/reminders/display";

/**
 * 优先级显示文案
 */
export function getPriorityLabel(priority: TodoPriority): string {
  switch (priority) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
  }
}

/**
 * 优先级对应的主题色 CSS 变量（红/橙/灰）。
 * 使用 globals.css 中专门的 --priority-* 变量，自动适配深浅模式，
 * 且和其他 UI 共用的 warning/danger 变量解耦。
 */
export function getPriorityColorVar(priority: TodoPriority): string {
  switch (priority) {
    case "high":
      return "var(--priority-high)";
    case "medium":
      return "var(--priority-medium)";
    case "low":
      return "var(--priority-low)";
  }
}

/**
 * 优先级对应的柔色背景 CSS 变量（用于标签底色）。
 */
export function getPrioritySoftVar(priority: TodoPriority): string {
  switch (priority) {
    case "high":
      return "var(--priority-high-soft)";
    case "medium":
      return "var(--priority-medium-soft)";
    case "low":
      return "var(--priority-low-soft)";
  }
}

/**
 * 状态显示文案
 */
export function getStatusLabel(status: TodoStatus): string {
  switch (status) {
    case "todo":
      return "待办";
    case "in_progress":
      return "进行中";
    case "done":
      return "已完成";
    case "snoozed":
      return "已搁置";
  }
}

/**
 * 状态标签的主题色。done 用绿色（已完成的积极反馈）。
 */
export function getStatusStyle(status: TodoStatus): {
  background: string;
  color: string;
} {
  switch (status) {
    case "todo":
      return {
        background: "var(--surface-muted)",
        color: "var(--text-muted)",
      };
    case "in_progress":
      return {
        background: "var(--warning-soft)",
        color: "var(--warning-text)",
      };
    case "done":
      return {
        background: "rgba(34, 197, 94, 0.16)",
        color: "#16a34a",
      };
    case "snoozed":
      return {
        background: "transparent",
        color: "var(--text-subtle)",
      };
  }
}

/**
 * 状态在显示时的权重：待办最前，已完成沉底。
 */
const STATUS_RANK: Record<TodoStatus, number> = {
  todo: 0,
  in_progress: 1,
  snoozed: 2,
  done: 3,
};

/**
 * 列表显示排序：先按状态权重，再按 sort_order，再按创建时间倒序。
 */
export function sortTodosForView(items: TodoItemView[]): TodoItemView[] {
  return [...items].sort((a, b) => {
    const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rankDiff !== 0) return rankDiff;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return 0;
  });
}

/**
 * 长内容预览截断
 */
export function getPreviewText(content: string, maxLength = 140): string {
  const collapsed = content.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, maxLength)}…`;
}

export function isLongContent(content: string): boolean {
  return content.length > 80 || content.includes("\n");
}

/**
 * 复用收藏提醒的摘要格式化逻辑（将 TodoReminderView 适配为 ActiveReminderView）。
 */
export function formatTodoReminderSummary(
  reminder: NonNullable<TodoItemView["reminder"]>,
  now = new Date()
): string {
  return formatReminderSummary(reminder as ActiveReminderView, now);
}
