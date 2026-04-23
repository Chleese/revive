import { createClient } from "@/app/lib/supabase/client";
import {
  createDefaultUserProfile,
  type UserProfileRecord,
} from "@/lib/profiles/types";

function isNoRowsError(error: { code?: string } | null) {
  return error?.code === "PGRST116";
}

export async function getUserProfile(
  userId: string,
): Promise<UserProfileRecord> {
  const { data, error } = await createClient()
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && !isNoRowsError(error)) {
    console.warn("Falling back to default user profile:", error);
    return createDefaultUserProfile(userId);
  }

  return {
    ...createDefaultUserProfile(userId),
    ...(data ?? {}),
  } as UserProfileRecord;
}
