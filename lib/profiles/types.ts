export type UserPlan = "free" | "pro";

export type UserProfileRecord = {
  user_id: string;
  plan: UserPlan;
  reminder_beta_enabled: boolean;
  reminder_access_expires_at?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export const DEFAULT_USER_PROFILE: Pick<
  UserProfileRecord,
  "plan" | "reminder_beta_enabled" | "reminder_access_expires_at"
> = {
  plan: "free",
  reminder_beta_enabled: false,
  reminder_access_expires_at: null,
};

export function createDefaultUserProfile(userId: string): UserProfileRecord {
  return {
    user_id: userId,
    ...DEFAULT_USER_PROFILE,
  };
}
