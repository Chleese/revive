import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getReminderAccessDeniedMessage } from "@/lib/profiles/access";
import { userCanUseReminders } from "@/lib/profiles/server";
import { dispatchDueReminders } from "@/lib/reminders/dispatch";

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

    return NextResponse.json(
      await dispatchDueReminders({
        userId: user.id,
        limit: 20,
        source: "page_heartbeat",
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "执行提醒检查失败，请稍后再试。",
      },
      { status: 500 },
    );
  }
}
