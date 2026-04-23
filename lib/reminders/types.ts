export type ReminderType = "once" | "daily_20";
export type ReminderStatus = "pending" | "sent" | "cancelled" | "failed";

export type ItemReminderRecord = {
  id?: string;
  user_id: string;
  collection_id: string;
  remind_at: string;
  timezone: string;
  reminder_type?: ReminderType | null;
  status?: ReminderStatus | null;
  sent_at?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export type ReminderInsert = Omit<
  ItemReminderRecord,
  "id" | "created_at" | "updated_at"
>;

export type ReminderUpdate = Partial<
  Omit<ItemReminderRecord, "id" | "user_id" | "collection_id" | "created_at">
>;

export type ActiveReminderView = {
  id: string;
  type: ReminderType;
  remindAt: string;
  timezone: string;
  status: ReminderStatus;
};

export function mapReminderRecordToView(
  reminder: ItemReminderRecord,
): ActiveReminderView {
  return {
    id: reminder.id ?? "",
    type: reminder.reminder_type ?? "once",
    remindAt: reminder.remind_at,
    timezone: reminder.timezone,
    status: reminder.status ?? "pending",
  };
}
