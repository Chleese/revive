import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getReminderAccessDeniedMessage } from "@/lib/profiles/access";
import { userCanUseReminders } from "@/lib/profiles/server";
import {
  dispatchDueReminders,
  dispatchDueTodoReminders,
  type ReminderDispatchResult,
} from "@/lib/reminders/dispatch";

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

    const collectionResult = await dispatchDueReminders({
      userId: user.id,
      limit: 20,
      source: "page_heartbeat",
    });
    const todoResult = await dispatchDueTodoReminders({
      userId: user.id,
      limit: 20,
      source: "page_heartbeat",
    });

    const merged: ReminderDispatchResult = {
      source: collectionResult.source,
      processed: collectionResult.processed + todoResult.processed,
      sentCount: collectionResult.sentCount + todoResult.sentCount,
      failedCount: collectionResult.failedCount + todoResult.failedCount,
      skippedCount: collectionResult.skippedCount + todoResult.skippedCount,
    };

    return NextResponse.json(merged);
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
