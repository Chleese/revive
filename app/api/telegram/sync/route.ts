import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";
import { getReminderAccessDeniedMessage } from "@/lib/profiles/access";
import { userCanUseReminders } from "@/lib/profiles/server";
import {
  acknowledgeTelegramUpdates,
  getTelegramUpdates,
} from "@/lib/telegram/bot";
import { processTelegramUpdates } from "@/lib/telegram/updates";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const hasAccess = await userCanUseReminders(user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: getReminderAccessDeniedMessage() },
        { status: 403 },
      );
    }

    const updates = await getTelegramUpdates();
    const { processedUpdates, matchedBindings } =
      await processTelegramUpdates(updates);

    if (updates.length > 0) {
      const maxUpdateId = Math.max(...updates.map((update) => update.update_id));
      await acknowledgeTelegramUpdates(maxUpdateId + 1);
    }

    const adminClient = createAdminClient();
    const { data: connection } = await adminClient
      .from("user_telegram_connections")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      connected: Boolean(connection?.is_active),
      processedUpdates,
      matchedBindings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "同步 Telegram 绑定状态失败。",
      },
      { status: 500 },
    );
  }
}
