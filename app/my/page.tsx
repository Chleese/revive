"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/navigation/BottomNav";
import { AppDialog } from "@/components/ui/AppDialog";
import { AppToast } from "@/components/ui/AppToast";
import { ReviveLoading } from "@/components/ui/ReviveLoading";
import { useAuth } from "@/app/components/AuthProvider";
import { useReminderDispatchHeartbeat } from "@/app/hooks/useReminderDispatchHeartbeat";
import type { CategoryRecord } from "@/lib/categories/types";
import { authService } from "@/lib/services/auth";
import { categoryService } from "@/lib/services/categories";
import { profileService } from "@/lib/services/profile";
import { telegramService } from "@/lib/services/telegram";
import {
  canUseReminders,
  getReminderAccessDeniedMessage,
} from "@/lib/profiles/access";
import type { UserProfileRecord } from "@/lib/profiles/types";
import type { UserTelegramConnectionRecord } from "@/lib/telegram/types";
import { generateDefaultName } from "@/lib/username";

type ToastState = { message: string; tone: "info" | "error" } | null;
type DialogState = "categories" | { type: "delete"; id: string } | null;

export default function MyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [toastState, setToastState] = useState<ToastState>(null);
  const [telegramConnection, setTelegramConnection] =
    useState<UserTelegramConnectionRecord | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileRecord | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const [telegramSyncing, setTelegramSyncing] = useState(false);
  const [telegramDisconnecting, setTelegramDisconnecting] = useState(false);
  const hasReminderAccess = canUseReminders(userProfile);

  useReminderDispatchHeartbeat(Boolean(user && hasReminderAccess));

  const showToast = useCallback(
    (message: string, tone: "info" | "error" = "info") => {
      setToastState({ message, tone });
    },
    [],
  );

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((left, right) => {
        const leftOrder = left.sort_order ?? 0;
        const rightOrder = right.sort_order ?? 0;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.name.localeCompare(right.name, "zh-CN");
      }),
    [categories],
  );

  const defaultName = useMemo(
    () => (user ? generateDefaultName(user.id) : ""),
    [user],
  );

  const loadCategories = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await categoryService.listUserCategories(user.id);
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
      showToast("分类加载失败，请重试", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, user]);

  const loadTelegramConnection = useCallback(async () => {
    if (!user) return;

    setTelegramLoading(true);
    try {
      const [connection, profile] = await Promise.all([
        telegramService.getUserConnection(user.id),
        profileService.getUserProfile(user.id),
      ]);
      setTelegramConnection(connection?.is_active ? connection : null);
      setUserProfile(profile);
    } catch (error) {
      console.error("Failed to load Telegram connection:", error);
      setTelegramConnection(null);
      setUserProfile(null);
    } finally {
      setTelegramLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      void loadCategories();
      void loadTelegramConnection();
    }
    if (!authLoading && !user) {
      setLoading(false);
      setTelegramLoading(false);
      setUserProfile(null);
    }
  }, [authLoading, loadCategories, loadTelegramConnection, user]);

  const createNewCategory = useCallback(async () => {
    if (!user) return;

    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;

    const duplicate = categories.find(
      (category) =>
        category.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );

    if (duplicate) {
      showToast("这个分类已经存在。");
      return;
    }

    setCreatingCategory(true);
    try {
      const created = await categoryService.create({
        user_id: user.id,
        name: trimmedName,
        color: null,
        sort_order: categories.length,
      });

      setCategories((current) => [created, ...current]);
      setNewCategoryName("");
      showToast("分类已创建。");
    } catch (error) {
      console.error("Failed to create category:", error);
      showToast("创建分类失败，请重试", "error");
    } finally {
      setCreatingCategory(false);
    }
  }, [categories, newCategoryName, showToast, user]);

  const deleteCategory = useCallback(
    async (id: string) => {
      try {
        await categoryService.remove(id);
        setCategories((current) =>
          current.filter((category) => category.id !== id),
        );
        showToast("分类已删除。");
      } catch (error) {
        console.error("Failed to delete category:", error);
        showToast("删除分类失败，请重试", "error");
      }
    },
    [showToast],
  );

  const handleSignOut = useCallback(async () => {
    await authService.signOut();
    router.replace("/login");
  }, [router]);

  const handleTelegramConnect = useCallback(async () => {
    if (!hasReminderAccess) {
      showToast(getReminderAccessDeniedMessage(), "error");
      return;
    }

    setTelegramConnecting(true);
    try {
      const result = await telegramService.createConnectLink();
      const popup = window.open(result.url, "_blank", "noopener,noreferrer");
      if (!popup) {
        window.location.href = result.url;
      }
      showToast("Telegram 已打开，点一次 Start 后再回来检查绑定状态。");
    } catch (error) {
      console.error("Failed to create Telegram connect link:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "暂时还没法打开 Telegram 绑定。",
        "error",
      );
    } finally {
      setTelegramConnecting(false);
    }
  }, [hasReminderAccess, showToast]);

  const handleSyncTelegramConnection = useCallback(async () => {
    if (!hasReminderAccess) {
      showToast(getReminderAccessDeniedMessage(), "error");
      return;
    }

    setTelegramSyncing(true);
    try {
      const result = await telegramService.syncUpdates();
      await loadTelegramConnection();
      showToast(
        result.connected
          ? "Telegram 已绑定，现在可以在首页设置提醒了。"
          : "还没有检测到绑定，请先在 Telegram 里点一次 Start。",
      );
    } catch (error) {
      console.error("Failed to sync Telegram connection:", error);
      showToast(
        error instanceof Error ? error.message : "检查绑定状态失败，请重试。",
        "error",
      );
    } finally {
      setTelegramSyncing(false);
    }
  }, [hasReminderAccess, loadTelegramConnection, showToast]);

  const handleDisconnectTelegram = useCallback(async () => {
    if (!user) return;

    setTelegramDisconnecting(true);
    try {
      await telegramService.disconnect();
      setTelegramConnection(null);
      showToast("Telegram 已解绑。");
    } catch (error) {
      console.error("Failed to disconnect Telegram:", error);
      showToast("解绑 Telegram 失败，请重试。", "error");
    } finally {
      setTelegramDisconnecting(false);
    }
  }, [showToast, user]);

  if (!user) {
    if (authLoading) {
      return (
        <ReviveLoading
          fullscreen
          label='Revive 正在确认你的身份'
          detail='马上打开你的分类页。'
        />
      );
    }

    return null;
  }

  const profileLabel = user.email?.slice(0, 1).toUpperCase() ?? "R";

  return (
    <div className='flex min-h-screen flex-col bg-gray-50 p-4 pb-20'>
      <div className='mb-4 rounded-3xl bg-white p-5 shadow-sm'>
        <div className='flex items-center gap-4'>
          <div className='flex h-14 w-14 items-center justify-center rounded-full bg-stone-900 text-lg font-semibold text-white'>
            {profileLabel}
          </div>
          <div className='min-w-0 flex-1'>
            <div className='text-lg font-semibold text-stone-900'>{defaultName}</div>
            <div className='truncate text-sm text-stone-500'>
              {user.email ?? "已登录用户"}
            </div>
          </div>
        </div>
      </div>

      <div className='mb-4 rounded-3xl bg-white p-4 shadow-sm'>
        <div className='mb-3 text-sm font-medium text-stone-900'>内容管理</div>
        <div className='overflow-x-auto'>
          <div className='flex gap-3'>
            <button
              type='button'
              onClick={() => setDialogState("categories")}
              className='min-w-[132px] rounded-2xl bg-stone-100 px-4 py-4 text-left text-stone-900 transition-colors hover:bg-stone-200'>
              <div className='text-sm font-medium'>分类管理</div>
              <div className='mt-1 text-xs text-stone-500'>
                新建、查看和删除分类
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className='mb-4 rounded-3xl bg-white p-4 shadow-sm'>
        <div className='mb-3 text-sm font-medium text-stone-900'>提醒通知</div>
        <div className='rounded-2xl bg-stone-50 px-4 py-4'>
          <div className='text-sm font-medium text-stone-900'>
            {!hasReminderAccess
              ? "Telegram 提醒正在内测"
              : telegramLoading
              ? "正在确认 Telegram 绑定状态"
              : telegramConnection?.telegram_username
                ? `已绑定 Telegram @${telegramConnection.telegram_username}`
                : telegramConnection
                  ? "已绑定 Telegram"
                  : "还没有绑定 Telegram"}
          </div>
          <div className='mt-1 text-xs leading-5 text-stone-500'>
            {!hasReminderAccess
              ? "收藏后可设置单次提醒或每日 20:00 提醒。当前仅对受邀用户开放，正式开放后将作为 Pro 功能提供。"
              : telegramConnection
              ? "收藏提醒会通过 Revive Bot 发到你的 Telegram 私聊。"
              : "先绑定 Telegram，首页的收藏才可以设置单次提醒或每日 20:00 提醒。"}
          </div>
          {!hasReminderAccess && (
            <div className='mt-3 inline-flex rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-white'>
              受邀用户可用
            </div>
          )}
          {hasReminderAccess && (
          <div className='mt-3 flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={() => void handleTelegramConnect()}
              disabled={telegramConnecting}
              className='rounded-xl bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50'>
              {telegramConnecting
                ? "打开中..."
                : telegramConnection
                  ? "重新绑定"
                  : "绑定 Telegram"}
            </button>
            <button
              type='button'
              onClick={() => void handleSyncTelegramConnection()}
              disabled={telegramSyncing}
              className='rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 disabled:opacity-50'>
              {telegramSyncing ? "检查中..." : "检查绑定状态"}
            </button>
            {telegramConnection && (
              <button
                type='button'
                onClick={() => void handleDisconnectTelegram()}
                disabled={telegramDisconnecting}
                className='rounded-xl bg-red-50 px-4 py-2 text-sm text-red-500 disabled:opacity-50'>
                {telegramDisconnecting ? "解绑中..." : "取消绑定"}
              </button>
            )}
          </div>
          )}
        </div>
      </div>

      <div className='mt-auto pt-6'>
        <button
          type='button'
          onClick={() => void handleSignOut()}
          className='mx-auto block w-full max-w-sm rounded-2xl bg-stone-900 px-4 py-3 text-sm font-medium text-white'>
          退出登录
        </button>
      </div>

      {dialogState === "categories" && (
        <AppDialog
          title='分类管理'
          confirmText='完成'
          cancelText='关闭'
          onConfirm={() => setDialogState(null)}
          onCancel={() => setDialogState(null)}>
          <div className='space-y-4'>
            <div>
              <div className='mb-2 text-xs text-stone-500'>新建分类</div>
              <div className='flex gap-2'>
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder='例如：健身'
                  className='w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400'
                />
                <button
                  type='button'
                  onClick={() => void createNewCategory()}
                  disabled={creatingCategory || !newCategoryName.trim()}
                  className='rounded-xl bg-stone-900 px-4 py-2.5 text-sm text-white disabled:opacity-50'>
                  {creatingCategory ? "创建中..." : "新建"}
                </button>
              </div>
            </div>

            <div>
              <div className='mb-2 text-xs text-stone-500'>
                已有分类 · {sortedCategories.length}
              </div>
              {loading ? (
                <ReviveLoading
                  compact
                  label='正在加载分类'
                  detail='马上就好。'
                />
              ) : sortedCategories.length === 0 ? (
                <div className='rounded-2xl border border-dashed border-stone-200 px-3 py-4 text-sm text-stone-500'>
                  还没有分类，先创建一个试试。
                </div>
              ) : (
                <div className='space-y-2'>
                  {sortedCategories.map((category) => (
                    <div
                      key={category.id}
                      className='flex items-center justify-between rounded-2xl border border-stone-100 px-3 py-3'>
                      <div className='text-sm text-stone-900'>
                        {category.name}
                      </div>
                      <button
                        type='button'
                        onClick={() =>
                          setDialogState({ type: "delete", id: category.id })
                        }
                        className='rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-500'>
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AppDialog>
      )}

      {dialogState &&
        typeof dialogState === "object" &&
        dialogState.type === "delete" && (
          <AppDialog
            title='确认删除这个分类？'
            description='删除分类不会删除收藏，只会把这些收藏变成未分类。'
            confirmText='删除'
            cancelText='保留'
            tone='danger'
            cornerStyle='tight'
            onConfirm={() => {
              const { id } = dialogState;
              setDialogState("categories");
              void deleteCategory(id);
            }}
            onCancel={() => setDialogState("categories")}
          />
        )}

      {toastState && (
        <AppToast
          message={toastState.message}
          tone={toastState.tone}
          onDismiss={() => setToastState(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
