import { formatTimeForTimeZone, getTimeZoneDaySerial, getTimeZoneParts } from "@/lib/reminders/time";
import type { ActiveReminderView } from "@/lib/reminders/types";

export function formatReminderSummary(
  reminder: ActiveReminderView,
  now = new Date(),
) {
  if (reminder.type === "daily_20") {
    return "每日 20:00 提醒";
  }

  const remindAt = new Date(reminder.remindAt);
  const timeLabel = formatTimeForTimeZone(remindAt, reminder.timezone);
  const dayDifference =
    getTimeZoneDaySerial(remindAt, reminder.timezone) -
    getTimeZoneDaySerial(now, reminder.timezone);

  if (dayDifference === 0) {
    return `今天 ${timeLabel} 提醒`;
  }

  if (dayDifference === 1) {
    return `明天 ${timeLabel} 提醒`;
  }

  if (dayDifference === 2) {
    return `后天 ${timeLabel} 提醒`;
  }

  const remindAtParts = getTimeZoneParts(remindAt, reminder.timezone);
  const nowParts = getTimeZoneParts(now, reminder.timezone);
  const yearPrefix =
    remindAtParts.year === nowParts.year ? "" : `${remindAtParts.year}年`;

  return `${yearPrefix}${remindAtParts.month}月${remindAtParts.day}日 ${timeLabel} 提醒`;
}
