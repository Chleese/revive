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
