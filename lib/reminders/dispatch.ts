import { createAdminClient } from "@/app/lib/supabase/admin";
import { getPlatformName } from "@/lib/platform";
import { userCanUseReminders } from "@/lib/profiles/server";
import { getNextDailyReminderAt } from "@/lib/reminders/time";
import type { ItemReminderRecord } from "@/lib/reminders/types";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import type { UserTelegramConnectionRecord } from "@/lib/telegram/types";

type ReminderCollection = {
  id: string;
  title: string;
  url: string;
  platform: string;
};

export type ReminderDispatchSource = "page_heartbeat" | "scheduled_dispatch";

export type ReminderDispatchResult = {
  source: ReminderDispatchSource;
  processed: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
};

function getDispatchSourceLabel(source: ReminderDispatchSource) {
  return source === "page_heartbeat" ? "页面在线补发" : "后台定时任务";
}

function buildReminderText(
  collection: ReminderCollection,
  source: ReminderDispatchSource,
) {
  return [
    "提醒你看这条收藏",
    "",
    `标题：${collection.title}`,
    `平台：${getPlatformName(collection.platform as never)}`,
    `链接：${collection.url}`,
    `触发来源：${getDispatchSourceLabel(source)}`,
    "",
    "现在打开看看",
  ].join("\n");
}

export async function dispatchDueReminders(options?: {
  userId?: string;
  now?: Date;
  limit?: number;
  source?: ReminderDispatchSource;
}): Promise<ReminderDispatchResult> {
  const adminClient = createAdminClient();
  const now = options?.now ?? new Date();
  const nowIso = now.toISOString();
  const source = options?.source ?? "scheduled_dispatch";

  let remindersQuery = adminClient
    .from("item_reminders")
    .select("*")
    .eq("status", "pending")
    .lte("remind_at", nowIso)
    .order("remind_at", { ascending: true })
    .limit(options?.limit ?? 50);

  if (options?.userId) {
    remindersQuery = remindersQuery.eq("user_id", options.userId);
  }

  const { data: reminders, error } = await remindersQuery;

  if (error) {
    throw error;
  }

  const dueReminders = (reminders ?? []) as ItemReminderRecord[];
  const connectionsByUser = new Map<string, UserTelegramConnectionRecord | null>();
  const collectionsById = new Map<string, ReminderCollection | null>();
  const accessByUser = new Map<string, boolean>();

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const reminder of dueReminders) {
    if (!reminder.id) continue;
    let hasAccess = accessByUser.get(reminder.user_id);
    if (hasAccess === undefined) {
      hasAccess = await userCanUseReminders(reminder.user_id, adminClient);
      accessByUser.set(reminder.user_id, hasAccess);
    }

    if (!hasAccess) {
      skippedCount += 1;
      continue;
    }

    let connection = connectionsByUser.get(reminder.user_id);
    if (connection === undefined) {
      const connectionQuery = await adminClient
        .from("user_telegram_connections")
        .select("*")
        .eq("user_id", reminder.user_id)
        .eq("is_active", true)
        .maybeSingle();

      if (connectionQuery.error && connectionQuery.error.code !== "PGRST116") {
        throw connectionQuery.error;
      }

      connection = (connectionQuery.data ?? null) as UserTelegramConnectionRecord | null;
      connectionsByUser.set(reminder.user_id, connection);
    }

    if (!connection?.telegram_chat_id) {
      skippedCount += 1;
      if ((reminder.reminder_type ?? "once") === "daily_20") {
        await adminClient
          .from("item_reminders")
          .update({
            remind_at: getNextDailyReminderAt(
              reminder.timezone,
              20,
              0,
              new Date(reminder.remind_at),
            ).toISOString(),
          })
          .eq("id", reminder.id)
          .eq("status", "pending");
      } else {
        await adminClient
          .from("item_reminders")
          .update({ status: "failed" })
          .eq("id", reminder.id)
          .eq("status", "pending");
      }
      continue;
    }

    let collection = collectionsById.get(reminder.collection_id);
    if (collection === undefined) {
      const collectionQuery = await adminClient
        .from("collections")
        .select("id,title,url,platform")
        .eq("id", reminder.collection_id)
        .maybeSingle();

      if (collectionQuery.error && collectionQuery.error.code !== "PGRST116") {
        throw collectionQuery.error;
      }

      collection = (collectionQuery.data ?? null) as ReminderCollection | null;
      collectionsById.set(reminder.collection_id, collection);
    }

    if (!collection?.url) {
      failedCount += 1;
      await adminClient
        .from("item_reminders")
        .update({ status: "failed" })
        .eq("id", reminder.id!);
      continue;
    }

    try {
      await sendTelegramMessage(
        connection.telegram_chat_id,
        buildReminderText(collection, source),
      );

      if ((reminder.reminder_type ?? "once") === "daily_20") {
        await adminClient
          .from("item_reminders")
          .update({
            remind_at: getNextDailyReminderAt(
              reminder.timezone,
              20,
              0,
              new Date(reminder.remind_at),
            ).toISOString(),
            sent_at: nowIso,
          })
          .eq("id", reminder.id)
          .eq("status", "pending");
      } else {
        await adminClient
          .from("item_reminders")
          .update({
            status: "sent",
            sent_at: nowIso,
          })
          .eq("id", reminder.id)
          .eq("status", "pending");
      }

      sentCount += 1;
      console.info("Reminder dispatched", {
        reminderId: reminder.id,
        source,
        userId: reminder.user_id,
        collectionId: reminder.collection_id,
      });
    } catch (sendError) {
      console.error("Failed to dispatch reminder:", sendError);
      failedCount += 1;

      if ((reminder.reminder_type ?? "once") === "daily_20") {
        await adminClient
          .from("item_reminders")
          .update({
            remind_at: getNextDailyReminderAt(
              reminder.timezone,
              20,
              0,
              new Date(reminder.remind_at),
            ).toISOString(),
          })
          .eq("id", reminder.id)
          .eq("status", "pending");
      } else {
        await adminClient
          .from("item_reminders")
          .update({ status: "failed" })
          .eq("id", reminder.id)
          .eq("status", "pending");
      }
    }
  }

  return {
    source,
    processed: dueReminders.length,
    sentCount,
    failedCount,
    skippedCount,
  };
}

type ReminderTodo = {
  id: string;
  content: string;
};

function buildTodoReminderText(
  todo: ReminderTodo,
  source: ReminderDispatchSource,
) {
  return [
    "⏰ 提醒你这件事：",
    "",
    todo.content,
    "",
    `触发来源：${getDispatchSourceLabel(source)}`,
  ].join("\n");
}

/**
 * 处理到期的待办提醒。提醒字段直接存储在 todos 表上（reminder_status / remind_at）。
 * 与收藏提醒使用相同的访问控制、Telegram 发送和 daily_20 重排逻辑。
 */
export async function dispatchDueTodoReminders(options?: {
  userId?: string;
  now?: Date;
  limit?: number;
  source?: ReminderDispatchSource;
}): Promise<ReminderDispatchResult> {
  const adminClient = createAdminClient();
  const now = options?.now ?? new Date();
  const nowIso = now.toISOString();
  const source = options?.source ?? "scheduled_dispatch";

  let todosQuery = adminClient
    .from("todos")
    .select("id,user_id,content,remind_at,reminder_type,reminder_status,reminder_timezone")
    .eq("reminder_status", "pending")
    .lte("remind_at", nowIso)
    .order("remind_at", { ascending: true })
    .limit(options?.limit ?? 50);

  if (options?.userId) {
    todosQuery = todosQuery.eq("user_id", options.userId);
  }

  const { data: dueTodos, error } = await todosQuery;

  if (error) {
    throw error;
  }

  const dueReminders = (dueTodos ?? []) as Array<{
    id: string;
    user_id: string;
    content: string;
    remind_at: string;
    reminder_type: string | null;
    reminder_status: string | null;
    reminder_timezone: string | null;
  }>;

  const connectionsByUser = new Map<string, UserTelegramConnectionRecord | null>();
  const accessByUser = new Map<string, boolean>();

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const todo of dueReminders) {
    let hasAccess = accessByUser.get(todo.user_id);
    if (hasAccess === undefined) {
      hasAccess = await userCanUseReminders(todo.user_id, adminClient);
      accessByUser.set(todo.user_id, hasAccess);
    }

    if (!hasAccess) {
      skippedCount += 1;
      continue;
    }

    let connection = connectionsByUser.get(todo.user_id);
    if (connection === undefined) {
      const connectionQuery = await adminClient
        .from("user_telegram_connections")
        .select("*")
        .eq("user_id", todo.user_id)
        .eq("is_active", true)
        .maybeSingle();

      if (connectionQuery.error && connectionQuery.error.code !== "PGRST116") {
        throw connectionQuery.error;
      }

      connection = (connectionQuery.data ?? null) as UserTelegramConnectionRecord | null;
      connectionsByUser.set(todo.user_id, connection);
    }

    if (!connection?.telegram_chat_id) {
      skippedCount += 1;
      if (todo.reminder_type === "daily_20") {
        await adminClient
          .from("todos")
          .update({
            remind_at: getNextDailyReminderAt(
              todo.reminder_timezone ?? "Asia/Shanghai",
              20,
              0,
              new Date(todo.remind_at),
            ).toISOString(),
          })
          .eq("id", todo.id)
          .eq("reminder_status", "pending");
      } else {
        await adminClient
          .from("todos")
          .update({ reminder_status: "failed" })
          .eq("id", todo.id)
          .eq("reminder_status", "pending");
      }
      continue;
    }

    try {
      await sendTelegramMessage(
        connection.telegram_chat_id,
        buildTodoReminderText({ id: todo.id, content: todo.content }, source),
      );

      if (todo.reminder_type === "daily_20") {
        await adminClient
          .from("todos")
          .update({
            remind_at: getNextDailyReminderAt(
              todo.reminder_timezone ?? "Asia/Shanghai",
              20,
              0,
              new Date(todo.remind_at),
            ).toISOString(),
            reminder_status: "pending",
          })
          .eq("id", todo.id)
          .eq("reminder_status", "pending");
      } else {
        await adminClient
          .from("todos")
          .update({
            reminder_status: "sent",
          })
          .eq("id", todo.id)
          .eq("reminder_status", "pending");
      }

      sentCount += 1;
      console.info("Todo reminder dispatched", {
        todoId: todo.id,
        source,
        userId: todo.user_id,
      });
    } catch (sendError) {
      console.error("Failed to dispatch todo reminder:", sendError);
      failedCount += 1;

      if (todo.reminder_type === "daily_20") {
        await adminClient
          .from("todos")
          .update({
            remind_at: getNextDailyReminderAt(
              todo.reminder_timezone ?? "Asia/Shanghai",
              20,
              0,
              new Date(todo.remind_at),
            ).toISOString(),
          })
          .eq("id", todo.id)
          .eq("reminder_status", "pending");
      } else {
        await adminClient
          .from("todos")
          .update({ reminder_status: "failed" })
          .eq("id", todo.id)
          .eq("reminder_status", "pending");
      }
    }
  }

  return {
    source,
    processed: dueReminders.length,
    sentCount,
    failedCount,
    skippedCount,
  };
}
