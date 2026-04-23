import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getReminderAccessDeniedMessage } from "@/lib/profiles/access";
import { userCanUseReminders } from "@/lib/profiles/server";
import { createTelegramBindingToken } from "@/lib/telegram/binding";
import { getTelegramBotUsername } from "@/lib/telegram/bot";

export const runtime = "nodejs";

export async function GET() {
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

    const { token, expiresAt } = createTelegramBindingToken(user.id);
    const username = getTelegramBotUsername();

    return NextResponse.json({
      url: `https://t.me/${username}?start=${token}`,
      expiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Telegram 绑定暂时还没配置好。",
      },
      { status: 500 },
    );
  }
}
