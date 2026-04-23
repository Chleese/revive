import type { UserProfileRecord } from "@/lib/profiles/types";

export const REMINDER_BETA_LIMIT = 5;

export function canUseReminders(
  profile:
    | Pick<
        UserProfileRecord,
        "plan" | "reminder_beta_enabled" | "reminder_access_expires_at"
      >
    | null
    | undefined,
  now = new Date(),
) {
  if (!profile) return false;
  if (profile.plan === "pro") return true;
  if (profile.reminder_beta_enabled) return true;
  if (!profile.reminder_access_expires_at) return false;

  return new Date(profile.reminder_access_expires_at).getTime() > now.getTime();
}

export function getReminderAccessDeniedMessage() {
  return "Telegram 提醒正在内测，当前仅对受邀用户开放。";
}

export function getReminderLimitMessage(limit = REMINDER_BETA_LIMIT) {
  return `内测阶段最多同时设置 ${limit} 个有效提醒`;
}
