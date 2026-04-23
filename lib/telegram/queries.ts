import { createClient } from "@/app/lib/supabase/client";
import type { UserTelegramConnectionRecord } from "@/lib/telegram/types";
import { isNoRowsError } from "@/lib/utils/http";

export async function getUserTelegramConnection(
  userId: string,
): Promise<UserTelegramConnectionRecord | null> {
  const { data, error } = await createClient()
    .from("user_telegram_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && !isNoRowsError(error)) {
    throw error;
  }

  return (data ?? null) as UserTelegramConnectionRecord | null;
}
