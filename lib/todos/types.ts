export type TodoPriority = "high" | "medium" | "low";

export type TodoStatus = "todo" | "in_progress" | "done" | "snoozed";

export type TodoReminderType = "once" | "daily_20";

export type TodoReminderStatus = "pending" | "sent" | "cancelled" | "failed";

export type TodoRecord = {
  id?: string;
  user_id: string;
  content: string;
  priority: TodoPriority;
  sort_order: number;
  status: TodoStatus;
  category_id?: string | null;
  remind_at?: string | null;
  reminder_type?: TodoReminderType | null;
  reminder_status?: TodoReminderStatus | null;
  reminder_timezone?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export type TodoInsert = Omit<TodoRecord, "id" | "created_at" | "updated_at">;

export type TodoUpdate = Partial<
  Omit<TodoRecord, "id" | "user_id" | "created_at" | "updated_at">
>;

export type TodoReminderView = {
  type: TodoReminderType;
  remindAt: string;
  timezone: string;
  status: TodoReminderStatus;
};

export type TodoItemView = {
  id: string;
  content: string;
  priority: TodoPriority;
  sortOrder: number;
  status: TodoStatus;
  categoryId?: string;
  categoryName?: string;
  reminder?: TodoReminderView;
  isEditing?: boolean;
};

export function mapTodoRecordToItemView(
  item: TodoRecord,
  options?: { categoryNameById?: Record<string, string> }
): TodoItemView {
  const categoryNameById = options?.categoryNameById ?? {};
  const categoryId = item.category_id ?? undefined;
  const reminderStatus = item.reminder_status ?? null;

  return {
    id: item.id ?? "",
    content: item.content,
    priority: item.priority,
    sortOrder: item.sort_order,
    status: item.status,
    categoryId,
    categoryName: categoryId ? categoryNameById[categoryId] : undefined,
    reminder:
      item.remind_at && reminderStatus === "pending" && item.reminder_type
        ? {
            type: item.reminder_type,
            remindAt: item.remind_at,
            timezone: item.reminder_timezone ?? "Asia/Shanghai",
            status: reminderStatus,
          }
        : undefined,
  };
}
