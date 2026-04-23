import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";
import { getReminderAccessDeniedMessage } from "@/lib/profiles/access";
import { userCanUseReminders } from "@/lib/profiles/server";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = createAdminClient();
    const hasAccess = await userCanUseReminders(user.id, adminClient);

    if (!hasAccess) {
      return NextResponse.json(
        { error: getReminderAccessDeniedMessage() },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const { data, error } = await adminClient
      .from("item_reminders")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "取消提醒失败，请重试。",
      },
      { status: 500 },
    );
  }
}
