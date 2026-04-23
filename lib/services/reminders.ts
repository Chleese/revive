import { getUserActiveReminders } from "@/lib/reminders/queries";
import type { ItemReminderRecord, ReminderInsert } from "@/lib/reminders/types";
import type { ReminderDispatchResult } from "@/lib/reminders/dispatch";
import { readJsonOrThrow } from "@/lib/utils/http";

export const reminderService = {
  listUserActiveReminders(userId: string): Promise<ItemReminderRecord[]> {
    return getUserActiveReminders(userId);
  },

  async upsert(reminder: ReminderInsert): Promise<ItemReminderRecord> {
    const response = await fetch("/api/reminders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        collectionId: reminder.collection_id,
        remindAt: reminder.remind_at,
        timezone: reminder.timezone,
        reminderType: reminder.reminder_type ?? "once",
      }),
    });

    return readJsonOrThrow<ItemReminderRecord>(response);
  },

  async cancel(reminderId: string): Promise<ItemReminderRecord> {
    const response = await fetch(`/api/reminders/${reminderId}`, {
      method: "DELETE",
    });

    return readJsonOrThrow<ItemReminderRecord>(response);
  },

  async runDue(): Promise<ReminderDispatchResult> {
    const response = await fetch("/api/reminders/run-due", {
      method: "POST",
    });

    return readJsonOrThrow<ReminderDispatchResult>(response);
  },
};
