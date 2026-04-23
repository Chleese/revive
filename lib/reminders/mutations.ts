import { createClient } from "@/app/lib/supabase/client";
import type {
  ItemReminderRecord,
  ReminderInsert,
} from "@/lib/reminders/types";
import { isNoRowsError } from "@/lib/utils/http";

export async function upsertActiveReminder(
  reminder: ReminderInsert,
): Promise<ItemReminderRecord> {
  const client = createClient();

  const existing = await client
    .from("item_reminders")
    .select("*")
    .eq("user_id", reminder.user_id)
    .eq("collection_id", reminder.collection_id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing.error && !isNoRowsError(existing.error)) {
    throw existing.error;
  }

  if (existing.data?.id) {
    const { data, error } = await client
      .from("item_reminders")
      .update({
        remind_at: reminder.remind_at,
        timezone: reminder.timezone,
        reminder_type: reminder.reminder_type ?? "once",
        sent_at: null,
        status: "pending",
      })
      .eq("id", existing.data.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as ItemReminderRecord;
  }

  const { data, error } = await client
    .from("item_reminders")
    .insert({
      ...reminder,
      reminder_type: reminder.reminder_type ?? "once",
      status: reminder.status ?? "pending",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ItemReminderRecord;
}

export async function cancelActiveReminder(
  reminderId: string,
): Promise<ItemReminderRecord> {
  const { data, error } = await createClient()
    .from("item_reminders")
    .update({
      status: "cancelled",
    })
    .eq("id", reminderId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ItemReminderRecord;
}
