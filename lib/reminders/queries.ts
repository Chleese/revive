import { createClient } from "@/app/lib/supabase/client";
import type { ItemReminderRecord } from "@/lib/reminders/types";

export async function getUserActiveReminders(
  userId: string,
): Promise<ItemReminderRecord[]> {
  const { data, error } = await createClient()
    .from("item_reminders")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("remind_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ItemReminderRecord[];
}
