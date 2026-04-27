import { NextRequest, NextResponse } from "next/server";
import { dispatchDueReminders } from "@/lib/reminders/dispatch";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expectedSecret =
    process.env.REMINDER_CRON_SECRET ?? process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(
      await dispatchDueReminders({
        source: "scheduled_dispatch",
      }),
    );
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
