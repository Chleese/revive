import { NextRequest, NextResponse } from "next/server";
import { processTelegramUpdate } from "@/lib/telegram/updates";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const providedSecret = request.headers.get(
    "x-telegram-bot-api-secret-token",
  );

  if (expectedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const update = await request.json();
    await processTelegramUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook 处理失败，请重试。",
      },
      { status: 500 },
    );
  }
}
