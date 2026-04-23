import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";
import {
  getReminderAccessDeniedMessage,
  getReminderLimitMessage,
  REMINDER_BETA_LIMIT,
} from "@/lib/profiles/access";
import { userCanUseReminders } from "@/lib/profiles/server";
import type { ItemReminderRecord, ReminderType } from "@/lib/reminders/types";
import { isNoRowsError } from "@/lib/utils/http";

type ReminderRequestBody = {
  collectionId?: string;
  remindAt?: string;
  timezone?: string;
  reminderType?: ReminderType;
};

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as ReminderRequestBody;
    const collectionId = body.collectionId?.trim();
    const remindAt = body.remindAt;
    const timezone = body.timezone?.trim() || "Asia/Shanghai";
    const reminderType = body.reminderType ?? "once";

    if (!collectionId || !remindAt) {
      return NextResponse.json(
        { error: "collectionId and remindAt are required" },
        { status: 400 },
      );
    }

    if (reminderType !== "once" && reminderType !== "daily_20") {
      return NextResponse.json(
        { error: "invalid reminder type" },
        { status: 400 },
      );
    }

    const collectionQuery = await adminClient
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (collectionQuery.error && !isNoRowsError(collectionQuery.error)) {
      throw collectionQuery.error;
    }

    if (!collectionQuery.data?.id) {
      return NextResponse.json({ error: "collection not found" }, { status: 404 });
    }

    const existing = await adminClient
      .from("item_reminders")
      .select("*")
      .eq("user_id", user.id)
      .eq("collection_id", collectionId)
      .eq("status", "pending")
      .maybeSingle();

    if (existing.error && !isNoRowsError(existing.error)) {
      throw existing.error;
    }

    if (!existing.data?.id) {
      const { count, error: countError } = await adminClient
        .from("item_reminders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (countError) {
        throw countError;
      }

      if ((count ?? 0) >= REMINDER_BETA_LIMIT) {
        return NextResponse.json(
          { error: getReminderLimitMessage() },
          { status: 429 },
        );
      }
    }

    if (existing.data?.id) {
      const { data, error } = await adminClient
        .from("item_reminders")
        .update({
          remind_at: remindAt,
          timezone,
          reminder_type: reminderType,
          sent_at: null,
          status: "pending",
        })
        .eq("id", existing.data.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data as ItemReminderRecord);
    }

    const { data, error } = await adminClient
      .from("item_reminders")
      .insert({
        user_id: user.id,
        collection_id: collectionId,
        remind_at: remindAt,
        timezone,
        reminder_type: reminderType,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data as ItemReminderRecord);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "保存提醒失败，请重试。",
      },
      { status: 500 },
    );
  }
}
