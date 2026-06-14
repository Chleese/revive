"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type TodoItemView,
  type TodoPriority,
  type TodoRecord,
  type TodoReminderType,
  type TodoStatus,
  mapTodoRecordToItemView,
} from "@/lib/todos/types";
import { sortTodosForView } from "@/lib/todos/display";
import {
  formatDateTimeLocalValue,
  getDefaultReminderDateTimeValue,
  getNextDailyReminderAt,
  parseDateTimeLocalValue,
} from "@/lib/reminders/time";
import { authService } from "@/lib/services/auth";
import { todoService } from "@/lib/services/todos";
import { telegramService } from "@/lib/services/telegram";
import { profileService } from "@/lib/services/profile";
import { canUseReminders } from "@/lib/profiles/access";
import type { UserProfileRecord } from "@/lib/profiles/types";
import type { UserTelegramConnectionRecord } from "@/lib/telegram/types";
import { AddTodoForm } from "@/components/todos/AddTodoForm";
import { TodoList } from "@/components/todos/TodoList";
import { BottomNav } from "@/components/navigation/BottomNav";
import { AppDialog } from "@/components/ui/AppDialog";
import { AppToast } from "@/components/ui/AppToast";
import { OfflineNotice } from "@/components/ui/OfflineNotice";
import { ReviveLoading } from "@/components/ui/ReviveLoading";
import { ThemeToggleButton } from "@/components/ui/ThemeToggleButton";
import { useReminderDispatchHeartbeat } from "@/app/hooks/useReminderDispatchHeartbeat";
import { useOfflineStatus } from "@/app/hooks/useOfflineStatus";
import { usePullToRefresh } from "@/app/hooks/usePullToRefresh";
import { useAuth } from "@/app/components/AuthProvider";

type DialogState =
  | { type: "delete"; itemId: string }
  | { type: "reminder"; itemId: string }
  | null;

type ToastState = { message: string; tone: "info" | "error" } | null;

const PRIORITY_CYCLE: TodoPriority[] = ["medium", "high", "low"];
const STATUS_CYCLE: TodoStatus[] = ["todo", "in_progress", "done", "snoozed"];

function nextInCycle<T>(cycle: T[], current: T): T {
  const index = cycle.indexOf(current);
  return cycle[(index + 1) % cycle.length] ?? current;
}

const STATUS_FILTERS: { value: "all" | TodoStatus; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "todo", label: "待办" },
  { value: "in_progress", label: "进行中" },
  { value: "done", label: "已完成" },
  { value: "snoozed", label: "搁置" },
];

export default function TodosPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<TodoItemView[]>([]);
  const [input, setInput] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | TodoStatus>(
    "all",
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [toastState, setToastState] = useState<ToastState>(null);
  const [telegramConnection, setTelegramConnection] =
    useState<UserTelegramConnectionRecord | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileRecord | null>(null);
  const [reminderDraftType, setReminderDraftType] =
    useState<TodoReminderType>("once");
  const [reminderDraftAt, setReminderDraftAt] = useState(() =>
    getDefaultReminderDateTimeValue(),
  );
  const [savingReminder, setSavingReminder] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasReminderAccess = canUseReminders(userProfile);
  const isOffline = useOfflineStatus();
  const { pullDistance, isRefreshing } = usePullToRefresh();

  useReminderDispatchHeartbeat(Boolean(user && hasReminderAccess));

  const showToast = useCallback(
    (message: string, tone: "info" | "error" = "info") => {
      setToastState({ message, tone });
    },
    [],
  );

  const sortedItems = useMemo(() => sortTodosForView(items), [items]);
  const filteredItems = useMemo(
    () =>
      sortedItems.filter((item) =>
        selectedStatusFilter === "all" ? true : item.status === selectedStatusFilter,
      ),
    [sortedItems, selectedStatusFilter],
  );
  const hasActiveFilters = selectedStatusFilter !== "all";

  const reminderDialogItem =
    dialogState?.type === "reminder"
      ? items.find((item) => item.id === dialogState.itemId) ?? null
      : null;

  const loadTodos = useCallback(async () => {
    if (!user) return;
    setLoadError(false);
    setLoading(true);
    try {
      const [todosResult, connectionResult, profileResult] = await Promise.allSettled([
        todoService.listUserTodos(user.id),
        telegramService.getUserConnection(user.id),
        profileService.getUserProfile(user.id),
      ]);

      if (todosResult.status === "rejected") {
        throw todosResult.reason;
      }

      setItems(
        (todosResult.value as TodoRecord[]).map((record) =>
          mapTodoRecordToItemView(record),
        ),
      );

      if (connectionResult.status === "fulfilled") {
        setTelegramConnection(
          connectionResult.value?.is_active ? connectionResult.value : null,
        );
      } else {
        setTelegramConnection(null);
      }
      if (profileResult.status === "fulfilled") {
        setUserProfile(profileResult.value);
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      console.error("Failed to load todos:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void loadTodos();
    }
    if (!authLoading && !user) {
      setLoading(false);
      setTelegramConnection(null);
      setUserProfile(null);
    }
  }, [authLoading, user, loadTodos]);

  const addTodo = useCallback(async () => {
    if (!user || submitting) return;
    const content = input.trim();
    if (!content) {
      showToast("先写点什么再添加。");
      return;
    }
    setSubmitting(true);
    try {
      const data = await todoService.create({
        user_id: user.id,
        content,
        priority: "medium",
        sort_order: 0,
        status: "todo",
      });
      const newItem = mapTodoRecordToItemView(data);
      setItems((current) => [newItem, ...current]);
      setInput("");
      showToast("已记录。");
    } catch (error) {
      console.error("Failed to add todo:", error);
      showToast("添加失败，请重试", "error");
    } finally {
      setSubmitting(false);
    }
  }, [input, showToast, submitting, user]);

  const deleteTodo = useCallback(
    async (id: string) => {
      try {
        await todoService.remove(id);
        setItems((current) => current.filter((item) => item.id !== id));
      } catch (error) {
        console.error("Failed to delete todo:", error);
        showToast("删除失败，请重试", "error");
      }
    },
    [showToast],
  );

  const startEdit = (id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, isEditing: true } : item)),
    );
  };
  const cancelEdit = (id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, isEditing: false } : item)),
    );
  };
  const saveEdit = useCallback(
    async (id: string, newContent: string) => {
      const trimmed = newContent.trim();
      if (!trimmed) {
        showToast("内容不能为空。", "error");
        return;
      }
      try {
        await todoService.update(id, { content: trimmed });
        setItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, content: trimmed, isEditing: false } : item,
          ),
        );
      } catch (error) {
        console.error("Failed to update todo:", error);
        showToast("保存失败，请重试", "error");
      }
    },
    [showToast],
  );

  const cyclePriority = useCallback(
    async (id: string, current: TodoPriority) => {
      const next = nextInCycle(PRIORITY_CYCLE, current);
      try {
        await todoService.update(id, { priority: next });
        setItems((currentItems) =>
          currentItems.map((item) =>
            item.id === id ? { ...item, priority: next } : item,
          ),
        );
      } catch (error) {
        console.error("Failed to update priority:", error);
        showToast("更新失败，请重试", "error");
      }
    },
    [showToast],
  );

  const cycleStatus = useCallback(
    async (id: string, current: TodoStatus) => {
      const next = nextInCycle(STATUS_CYCLE, current);
      try {
        await todoService.update(id, { status: next });
        setItems((currentItems) =>
          currentItems.map((item) =>
            item.id === id ? { ...item, status: next } : item,
          ),
        );
      } catch (error) {
        console.error("Failed to update status:", error);
        showToast("更新失败，请重试", "error");
      }
    },
    [showToast],
  );

  // 滑动"完成"：在 待办 ↔ 已完成 之间切换
  const toggleDone = useCallback(
    async (id: string) => {
      const current = items.find((item) => item.id === id);
      if (!current) return;
      const next: TodoStatus = current.status === "done" ? "todo" : "done";
      try {
        await todoService.update(id, { status: next });
        setItems((currentItems) =>
          currentItems.map((item) =>
            item.id === id ? { ...item, status: next } : item,
          ),
        );
      } catch (error) {
        console.error("Failed to toggle done:", error);
        showToast("更新失败，请重试", "error");
      }
    },
    [items, showToast],
  );

  const handleRequestReminder = useCallback(
    (id: string) => {
      const item = items.find((current) => current.id === id);
      if (!item) return;
      setReminderDraftType(item.reminder?.type ?? "once");
      setReminderDraftAt(
        item.reminder?.type === "once"
          ? formatDateTimeLocalValue(new Date(item.reminder.remindAt))
          : getDefaultReminderDateTimeValue(),
      );
      setDialogState({ type: "reminder", itemId: id });
    },
    [items],
  );

  const handleSaveReminder = useCallback(async () => {
    if (!reminderDialogItem || savingReminder) return;

    if (!telegramConnection?.is_active) {
      window.location.href = "/my";
      return;
    }

    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
    let remindAt: string | null = null;

    if (reminderDraftType === "once") {
      remindAt = parseDateTimeLocalValue(reminderDraftAt);
      if (!remindAt) {
        showToast("请先选一个有效的提醒时间。", "error");
        return;
      }
      if (new Date(remindAt).getTime() <= Date.now()) {
        showToast("提醒时间需要晚于当前时间。", "error");
        return;
      }
    } else {
      remindAt = getNextDailyReminderAt(timezone, 20, 0).toISOString();
    }

    const hadReminder = Boolean(reminderDialogItem.reminder);
    setSavingReminder(true);
    try {
      await todoService.update(reminderDialogItem.id, {
        remind_at: remindAt,
        reminder_type: reminderDraftType,
        reminder_status: "pending",
        reminder_timezone: timezone,
      });
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === reminderDialogItem.id
            ? {
                ...item,
                reminder: {
                  type: reminderDraftType,
                  remindAt: remindAt as string,
                  timezone,
                  status: "pending",
                },
              }
            : item,
        ),
      );
      setDialogState(null);
      showToast(hadReminder ? "提醒已更新。" : "提醒已设置。");
    } catch (error) {
      console.error("Failed to save todo reminder:", error);
      showToast("保存提醒失败，请重试。", "error");
    } finally {
      setSavingReminder(false);
    }
  }, [
    reminderDialogItem,
    reminderDraftAt,
    reminderDraftType,
    savingReminder,
    showToast,
    telegramConnection,
  ]);

  const handleCancelReminder = useCallback(async () => {
    if (!reminderDialogItem?.reminder) return;
    try {
      await todoService.update(reminderDialogItem.id, {
        remind_at: null,
        reminder_type: null,
        reminder_status: "cancelled",
      });
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === reminderDialogItem.id ? { ...item, reminder: undefined } : item,
        ),
      );
      setDialogState(null);
      showToast("提醒已取消。");
    } catch (error) {
      console.error("Failed to cancel todo reminder:", error);
      showToast("取消提醒失败，请重试。", "error");
    }
  }, [reminderDialogItem, showToast]);

  const handleReorder = useCallback(
    async (newOrder: TodoItemView[]) => {
      // 按新顺序重新分配 sort_order（0..n-1），持久化全部
      setItems((current) => {
        const orderMap = new Map(newOrder.map((item, index) => [item.id, index]));
        return current.map((item) =>
          orderMap.has(item.id)
            ? { ...item, sortOrder: orderMap.get(item.id) as number }
            : item,
        );
      });
      try {
        await todoService.reorder(
          newOrder.map((item, index) => ({ id: item.id, sort_order: index })),
        );
      } catch (error) {
        console.error("Failed to persist reorder:", error);
        showToast("排序保存失败，已恢复。刷新后可能不一致。");
        void loadTodos();
      }
    },
    [loadTodos, showToast],
  );

  if (!user) {
    if (authLoading) {
      return (
        <ReviveLoading
          fullscreen
          label="Revive 正在确认你的身份"
          detail="待办列表马上就到。"
        />
      );
    }
    return null;
  }

  return (
    <div className="theme-page min-h-screen p-4 pb-20">
      {pullDistance > 0 && (
        <div
          className="theme-text-subtle flex items-center justify-center text-xs transition-opacity"
          style={{ height: pullDistance, opacity: pullDistance / 60 }}
        >
          {isRefreshing ? "刷新中..." : "下拉刷新"}
        </div>
      )}
      {isOffline && <OfflineNotice />}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--foreground)]">待办</h1>
        <div className="flex items-center gap-2">
          <ThemeToggleButton />
          <button
            type="button"
            onClick={async () => {
              await authService.signOut();
              window.location.replace("/login");
            }}
            className="theme-secondary-button inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
          >
            登出
          </button>
        </div>
      </div>

      <AddTodoForm
        input={input}
        submitting={submitting}
        inputRef={inputRef}
        onInputChange={setInput}
        onClear={() => setInput("")}
        onSubmit={addTodo}
      />

      {/* 状态筛选条 */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((filter) => {
          const active = selectedStatusFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setSelectedStatusFilter(filter.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? "theme-primary-button" : "theme-secondary-button"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <ReviveLoading
          compact
          label="Revive 正在整理你的待办"
          detail="马上就好。"
        />
      ) : loadError ? (
        <div className="theme-panel rounded-xl p-4 text-center">
          <div className="mb-3 text-[var(--foreground)]">列表加载失败，请重试</div>
          <button
            onClick={loadTodos}
            className="theme-primary-button rounded-lg px-4 py-2 transition-opacity"
          >
            重试
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="theme-panel theme-text-muted rounded-xl p-5 text-sm">
          还没有待办，先记一件小事试试。长按卡片可以调整顺序。
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="theme-panel theme-text-muted rounded-xl p-5 text-sm">
          当前筛选下没有内容，换个状态或分类看看。
        </div>
      ) : (
        <>
          {!hasActiveFilters && (
            <p className="theme-text-subtle mb-2 text-xs">长按卡片可拖拽调整顺序</p>
          )}
          <TodoList
            items={filteredItems}
            draggable={!hasActiveFilters}
            onCyclePriority={cyclePriority}
            onCycleStatus={cycleStatus}
            onToggleDone={toggleDone}
            onRequestReminder={handleRequestReminder}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
            onDelete={(id) => setDialogState({ type: "delete", itemId: id })}
            onReorder={handleReorder}
          />
        </>
      )}

      {dialogState?.type === "delete" && (
        <AppDialog
          title="确认删除这条待办？"
          description="这条记录会直接从列表中移除。"
          confirmText="删除"
          cancelText="保留"
          tone="danger"
          cornerStyle="tight"
          onConfirm={() => {
            const { itemId } = dialogState;
            setDialogState(null);
            void deleteTodo(itemId);
          }}
          onCancel={() => setDialogState(null)}
        />
      )}


      {dialogState?.type === "reminder" && reminderDialogItem && (
        <AppDialog
          title={
            !hasReminderAccess
              ? "Telegram 提醒正在内测"
              : telegramConnection
                ? reminderDialogItem.reminder
                  ? "修改提醒"
                  : "设置提醒"
                : "先绑定 Telegram"
          }
          description={
            !hasReminderAccess
              ? "待办可设置单次提醒或每日 20:00 提醒。当前仅对受邀用户开放。"
              : telegramConnection
                ? "单次提醒可自定义时间，重复提醒先固定为每天 20:00。"
                : "提醒会发到你的 Telegram 私聊。先去「我的」完成绑定。"
          }
          confirmText={
            !hasReminderAccess
              ? "知道了"
              : telegramConnection
                ? savingReminder
                  ? "保存中..."
                  : reminderDialogItem.reminder
                    ? "保存修改"
                    : "保存提醒"
                : "去绑定"
          }
          cancelText={hasReminderAccess && telegramConnection ? "取消" : "稍后再说"}
          onConfirm={() => {
            if (!hasReminderAccess) {
              setDialogState(null);
              return;
            }
            if (telegramConnection) {
              void handleSaveReminder();
              return;
            }
            window.location.href = "/my";
          }}
          onCancel={() => {
            if (savingReminder) return;
            setDialogState(null);
          }}
        >
          {!hasReminderAccess ? (
            <div className="theme-panel-muted rounded-2xl px-3 py-4 text-sm leading-6">
              这会是未来的能力：把重要待办设置成稍后提醒，或每天 20:00 统一回看。
            </div>
          ) : telegramConnection ? (
            <div className="space-y-4">
              <div className="theme-panel-muted rounded-2xl px-3 py-3 text-sm">
                当前待办：
                <div className="mt-1 line-clamp-2 font-medium text-[var(--foreground)]">
                  {reminderDialogItem.content}
                </div>
              </div>

              <div className="space-y-2">
                <label className="theme-panel theme-border flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm">
                  <input
                    type="radio"
                    name="todo-reminder-type"
                    checked={reminderDraftType === "once"}
                    onChange={() => setReminderDraftType("once")}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-[var(--foreground)]">
                      选择一个时间提醒我
                    </div>
                    <div className="theme-text-muted mt-1 text-xs">
                      支持今天、明天或更晚的单次提醒。
                    </div>
                  </div>
                </label>

                <label className="theme-panel theme-border flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm">
                  <input
                    type="radio"
                    name="todo-reminder-type"
                    checked={reminderDraftType === "daily_20"}
                    onChange={() => setReminderDraftType("daily_20")}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-[var(--foreground)]">
                      每天 20:00 提醒我
                    </div>
                    <div className="theme-text-muted mt-1 text-xs">
                      适合晚上统一回看待办。
                    </div>
                  </div>
                </label>
              </div>

              {reminderDraftType === "once" ? (
                <label className="block text-sm text-[var(--foreground)]">
                  <div className="theme-text-muted mb-1 text-xs">提醒时间</div>
                  <input
                    type="datetime-local"
                    value={reminderDraftAt}
                    min={getDefaultReminderDateTimeValue(new Date())}
                    onChange={(event) => setReminderDraftAt(event.target.value)}
                    className="theme-input w-full rounded-xl border px-3 py-2.5 text-sm"
                  />
                </label>
              ) : (
                <div className="theme-border theme-text-muted rounded-2xl border border-dashed px-3 py-4 text-sm">
                  保存后，这条待办会在每天晚上 20:00 提醒你。
                </div>
              )}

              {reminderDialogItem.reminder && (
                <button
                  type="button"
                  onClick={() => void handleCancelReminder()}
                  className="theme-danger-soft w-full rounded-xl px-4 py-2.5 text-sm transition-colors"
                >
                  取消当前提醒
                </button>
              )}
            </div>
          ) : (
            <div className="theme-panel-muted rounded-2xl px-3 py-4 text-sm leading-6">
              在 Telegram 里点一次 Start，Revive 才知道以后把提醒发到哪一个账号。
            </div>
          )}
        </AppDialog>
      )}

      {toastState && (
        <AppToast
          message={toastState.message}
          tone={toastState.tone}
          onDismiss={() => setToastState(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
