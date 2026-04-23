export type UserTelegramConnectionRecord = {
  id?: string;
  user_id: string;
  telegram_chat_id: string;
  telegram_username?: string | null;
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string | null;
};

export type TelegramConnectLinkResult = {
  url: string;
  expiresAt: string;
};

export type TelegramSyncResult = {
  connected: boolean;
  processedUpdates: number;
  matchedBindings: number;
};
