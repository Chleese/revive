import { getUserTelegramConnection } from "@/lib/telegram/queries";
import type {
  TelegramConnectLinkResult,
  TelegramSyncResult,
  UserTelegramConnectionRecord,
} from "@/lib/telegram/types";
import { readJsonOrThrow } from "@/lib/utils/http";

export const telegramService = {
  getUserConnection(userId: string): Promise<UserTelegramConnectionRecord | null> {
    return getUserTelegramConnection(userId);
  },

  async disconnect(): Promise<UserTelegramConnectionRecord | null> {
    const response = await fetch("/api/telegram/connection", {
      method: "DELETE",
    });

    return readJsonOrThrow<UserTelegramConnectionRecord | null>(response);
  },

  async createConnectLink(): Promise<TelegramConnectLinkResult> {
    const response = await fetch("/api/telegram/connect-link", {
      method: "GET",
      cache: "no-store",
    });

    return readJsonOrThrow<TelegramConnectLinkResult>(response);
  },

  async syncUpdates(): Promise<TelegramSyncResult> {
    const response = await fetch("/api/telegram/sync", {
      method: "POST",
    });

    return readJsonOrThrow<TelegramSyncResult>(response);
  },
};
