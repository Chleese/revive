import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await createAdminClient()
      .from("user_telegram_connections")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data ?? null);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "解绑 Telegram 失败，请重试。",
      },
      { status: 500 },
    );
  }
}
