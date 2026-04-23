export type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat?: {
      id: number;
      type: string;
    };
    from?: {
      username?: string;
    };
  };
};

function getBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }

  return token;
}

export function getTelegramBotUsername() {
  const username = process.env.TELEGRAM_BOT_USERNAME;

  if (!username) {
    throw new Error("TELEGRAM_BOT_USERNAME is not configured.");
  }

  return username;
}

async function callTelegram<Result>(
  method: string,
  body: Record<string, unknown>,
): Promise<Result> {
  const response = await fetch(
    `https://api.telegram.org/bot${getBotToken()}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as {
    ok: boolean;
    result?: Result;
    description?: string;
  };

  if (!response.ok || !payload.ok || payload.result === undefined) {
    throw new Error(payload.description ?? `Telegram ${method} failed.`);
  }

  return payload.result;
}

export function sendTelegramMessage(chatId: string, text: string) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: false,
  });
}

export function getTelegramUpdates() {
  return callTelegram<TelegramUpdate[]>("getUpdates", {
    timeout: 0,
    limit: 100,
    allowed_updates: ["message"],
  });
}

export function acknowledgeTelegramUpdates(offset: number) {
  return callTelegram("getUpdates", {
    offset,
    limit: 1,
    timeout: 0,
    allowed_updates: ["message"],
  });
}
