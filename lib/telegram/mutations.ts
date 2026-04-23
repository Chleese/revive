import { createClient } from "@/app/lib/supabase/client";
import type { UserTelegramConnectionRecord } from "@/lib/telegram/types";

export async function deactivateTelegramConnection(
  userId: string,
): Promise<UserTelegramConnectionRecord | null> {
  const { data, error } = await createClient()
    .from("user_telegram_connections")
    .update({
      is_active: false,
    })
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as UserTelegramConnectionRecord | null;
}
