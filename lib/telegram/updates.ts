import { createAdminClient } from "@/app/lib/supabase/admin";
import { sendTelegramMessage, type TelegramUpdate } from "@/lib/telegram/bot";
import { verifyTelegramBindingToken } from "@/lib/telegram/binding";
import type { UserTelegramConnectionRecord } from "@/lib/telegram/types";

function extractStartToken(text: string) {
  const match = text.trim().match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  return match?.[1]?.trim() ?? null;
}

type ProcessUpdateResult = {
  consumed: boolean;
  matchedBinding: boolean;
};

export async function processTelegramUpdate(
  update: TelegramUpdate,
): Promise<ProcessUpdateResult> {
  const text = update.message?.text?.trim();
  const chatId = update.message?.chat?.id;

  if (!text || !chatId) {
    return { consumed: false, matchedBinding: false };
  }

  if (!text.startsWith("/start")) {
    return { consumed: false, matchedBinding: false };
  }

  const chatIdText = String(chatId);
  const token = extractStartToken(text);

  if (!token) {
    await sendTelegramMessage(
      chatIdText,
      "回到 Revive 点击一次“绑定 Telegram”，再回来点 Start 就能完成连接。",
    );
    return { consumed: true, matchedBinding: false };
  }

  const verification = verifyTelegramBindingToken(token);
  if (!verification.ok) {
    await sendTelegramMessage(chatIdText, verification.reason);
    return { consumed: true, matchedBinding: false };
  }

  const adminClient = createAdminClient();
  const { data: existingByChat, error: existingByChatError } = await adminClient
    .from("user_telegram_connections")
    .select("*")
    .eq("telegram_chat_id", chatIdText)
    .maybeSingle();

  if (existingByChatError && existingByChatError.code !== "PGRST116") {
    throw existingByChatError;
  }

  const boundChat = existingByChat as UserTelegramConnectionRecord | null;
  if (boundChat?.user_id && boundChat.user_id !== verification.userId) {
    await sendTelegramMessage(
      chatIdText,
      "这个 Telegram 账号已经绑定了另一个 Revive 账号，暂时不能重复绑定。",
    );
    return { consumed: true, matchedBinding: false };
  }

  const { error: upsertError } = await adminClient
    .from("user_telegram_connections")
    .upsert(
      {
        user_id: verification.userId,
        telegram_chat_id: chatIdText,
        telegram_username: update.message?.from?.username ?? null,
        is_active: true,
      },
      {
        onConflict: "user_id",
      },
    );

  if (upsertError) {
    throw upsertError;
  }

  await sendTelegramMessage(
    chatIdText,
    "绑定成功，现在你可以回到 Revive 给收藏设置提醒了。",
  );

  return { consumed: true, matchedBinding: true };
}

export async function processTelegramUpdates(updates: TelegramUpdate[]) {
  let processedUpdates = 0;
  let matchedBindings = 0;

  for (const update of updates) {
    const result = await processTelegramUpdate(update);
    if (result.consumed) {
      processedUpdates += 1;
    }
    if (result.matchedBinding) {
      matchedBindings += 1;
    }
  }

  return {
    processedUpdates,
    matchedBindings,
  };
}
