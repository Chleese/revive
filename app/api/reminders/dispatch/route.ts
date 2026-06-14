import { NextRequest, NextResponse } from "next/server";
import {
  dispatchDueReminders,
  dispatchDueTodoReminders,
  type ReminderDispatchResult,
} from "@/lib/reminders/dispatch";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expectedSecret =
    process.env.REMINDER_CRON_SECRET ?? process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const collectionResult = await dispatchDueReminders({
      source: "scheduled_dispatch",
    });
    const todoResult = await dispatchDueTodoReminders({
      source: "scheduled_dispatch",
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
          error instanceof Error ? error.message : "提醒派发任务执行失败。",
      },
      { status: 500 },
    );
  }
}
