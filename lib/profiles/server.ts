import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { canUseReminders } from "@/lib/profiles/access";
import {
  DEFAULT_USER_PROFILE,
  type UserProfileRecord,
} from "@/lib/profiles/types";
import { isNoRowsError } from "@/lib/utils/http";

export async function getUserProfileForAccess(
  userId: string,
  client: SupabaseClient = createAdminClient(),
): Promise<UserProfileRecord> {
  const { data, error } = await client
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && !isNoRowsError(error)) {
    throw error;
  }

  return {
    user_id: userId,
    ...DEFAULT_USER_PROFILE,
    ...(data ?? {}),
  } as UserProfileRecord;
}

export async function userCanUseReminders(
  userId: string,
  client: SupabaseClient = createAdminClient(),
) {
  return canUseReminders(await getUserProfileForAccess(userId, client));
}
