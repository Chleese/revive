"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CategoryOption, CategoryRecord } from "@/lib/categories/types";
import { detectPlatform, getPlatformName } from "@/lib/platform";
import type { Platform } from "@/lib/platform";
import { extractUrl } from "@/lib/metadata/normalize";
import type { MetadataResult } from "@/lib/metadata/types";
import {
  type CollectionRecord,
  mapCollectionRecordToItemView,
  type CollectionItemView,
} from "@/lib/collections/types";
import {
  formatDateTimeLocalValue,
  getDefaultReminderDateTimeValue,
  getNextDailyReminderAt,
  parseDateTimeLocalValue,
} from "@/lib/reminders/time";
import {
  mapReminderRecordToView,
  type ItemReminderRecord,
  type ReminderType,
} from "@/lib/reminders/types";
import { authService } from "@/lib/services/auth";
import { categoryService } from "@/lib/services/categories";
import { collectionService } from "@/lib/services/collections";
import { metadataService } from "@/lib/services/metadata";
import { profileService } from "@/lib/services/profile";
import { reminderService } from "@/lib/services/reminders";
import { telegramService } from "@/lib/services/telegram";
import {
  canUseReminders,
} from "@/lib/profiles/access";
import type { UserProfileRecord } from "@/lib/profiles/types";
import type { UserTelegramConnectionRecord } from "@/lib/telegram/types";
import { AddCollectionForm } from "@/components/collection/AddCollectionForm";
import { FloatingCounter } from "@/components/collection/FloatingCounter";
import { CollectionList } from "@/components/collection/CollectionList";
import { BottomNav } from "@/components/navigation/BottomNav";
import { AppDialog } from "@/components/ui/AppDialog";
import { AppToast } from "@/components/ui/AppToast";
import { ContentPreview } from "@/components/ui/ContentPreview";
import { OfflineNotice } from "@/components/ui/OfflineNotice";
import { ReviveLoading } from "@/components/ui/ReviveLoading";
import { ThemeToggleButton } from "@/components/ui/ThemeToggleButton";
import { useReminderDispatchHeartbeat } from "@/app/hooks/useReminderDispatchHeartbeat";
import { useOfflineStatus } from "@/app/hooks/useOfflineStatus";
import { usePullToRefresh } from "@/app/hooks/usePullToRefresh";
import { ClipboardPrompt } from "./components/ClipboardPrompt";
import { useAuth } from "./components/AuthProvider";

type DialogState =
  | { type: "needsEdit"; itemId: string }
  | { type: "delete"; itemId: string }
  | { type: "filters" }
  | { type: "itemCategory"; itemId: string }
  | { type: "reminder"; itemId: string }
  | null;

type ToastState = { message: string; tone: "info" | "error" } | null;

function pickBottomReachedMessage(total: number) {
  const variants = [
    `当前到底，共 ${total} 条`,
    `第 ${total} 条 · 没有更多了`,
    "已全部看完，真棒",
    `${total} 条全部解锁`,
    "就这些了，去添加新的吧",
    "- END -",
  ];

  return variants[Math.floor(Math.random() * variants.length)] ?? variants[0];
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CollectionItemView[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [input, setInput] = useState("");
  const [selectedPlatformFilter, setSelectedPlatformFilter] =
    useState<Platform | "all">("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [detectedRawInput, setDetectedRawInput] = useState<string | null>(null);
  const [showClipboardPrompt, setShowClipboardPrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [clipboardSupported, setClipboardSupported] = useState(true);
  const [layout, setLayout] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "list";
    return (localStorage.getItem("revive-layout") as "grid" | "list") ?? "list";
  });
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [toastState, setToastState] = useState<ToastState>(null);
  const [activeItemIndex, setActiveItemIndex] = useState(1);
  const [isNearListBottom, setIsNearListBottom] = useState(false);
  const [bottomReachedMessage, setBottomReachedMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingCategoryId, setPendingCategoryId] = useState<
    string | null | undefined
  >(undefined);
  const [telegramConnection, setTelegramConnection] =
    useState<UserTelegramConnectionRecord | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileRecord | null>(null);
  const [reminderDraftType, setReminderDraftType] =
    useState<ReminderType>("once");
  const [reminderDraftAt, setReminderDraftAt] = useState(() =>
    getDefaultReminderDateTimeValue(),
  );
  const [savingReminder, setSavingReminder] = useState(false);
  const attemptedImageBackfillIds = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const hasReminderAccess = canUseReminders(userProfile);
  const isOffline = useOfflineStatus();
  const { pullDistance, isRefreshing } = usePullToRefresh();

  useReminderDispatchHeartbeat(Boolean(user && hasReminderAccess));

  const showToast = useCallback(
    (message: string, tone: "info" | "error" = "info") => {
      setToastState({ message, tone });
    },
    [],
  );

  const categoryOptions: CategoryOption[] = useMemo(
    () =>
      categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    [categories],
  );
  const categoryNameById = useMemo(
    () =>
      categories.reduce<Record<string, string>>((accumulator, category) => {
        accumulator[category.id] = category.name;
        return accumulator;
      }, {}),
    [categories],
  );
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesPlatform =
          selectedPlatformFilter === "all" ||
          item.platform === selectedPlatformFilter;
        const matchesCategory =
          selectedCategoryFilter === "all" ||
          item.categoryId === selectedCategoryFilter;

        return matchesPlatform && matchesCategory;
      }),
    [items, selectedCategoryFilter, selectedPlatformFilter],
  );
  const hasActiveFilters =
    selectedPlatformFilter !== "all" || selectedCategoryFilter !== "all";
  const visibleCounter = filteredItems.length
    ? Math.min(Math.max(activeItemIndex, 1), filteredItems.length)
    : 0;
  const categoryDialogItem =
    dialogState?.type === "itemCategory"
      ? items.find((item) => item.id === dialogState.itemId) ?? null
      : null;
  const reminderDialogItem =
    dialogState?.type === "reminder"
      ? items.find((item) => item.id === dialogState.itemId) ?? null
      : null;

  const applyRemindersToItems = useCallback(
    (sourceItems: CollectionItemView[], reminders: ItemReminderRecord[]) => {
      const reminderMap = new Map(
        reminders.map((reminder) => [
          reminder.collection_id,
          mapReminderRecordToView(reminder),
        ]),
      );

      return sourceItems.map((item) => ({
        ...item,
        reminder: reminderMap.get(item.id),
      }));
    },
    [],
  );

  useEffect(() => {
    setActiveItemIndex(filteredItems.length ? 1 : 0);
  }, [filteredItems.length]);

  useEffect(() => {
    if (!filteredItems.length) {
      setIsNearListBottom(false);
      setBottomReachedMessage("");
      return;
    }

    const node = listEndRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          setIsNearListBottom((current) => {
            if (!current) {
              setBottomReachedMessage(
                pickBottomReachedMessage(filteredItems.length),
              );
            }
            return true;
          });
        } else {
          setIsNearListBottom(false);
        }
      },
      {
        root: null,
        rootMargin: "0px 0px 120px 0px",
        threshold: 0,
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [filteredItems.length]);

  const handleInputPaste = useCallback(
    (value: string) => {
      setInput(value);

      if (isOffline && extractUrl(value.trim())) {
        showToast("链接已粘贴，但当前无网络，恢复连接后再添加。");
      }
    },
    [isOffline, showToast],
  );

  const checkClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const extractedUrl = extractUrl(text.trim());
      const clipboardUrl =
        extractedUrl ??
        (text.trim().startsWith("http://") || text.trim().startsWith("https://")
          ? text.trim()
          : null);

      if (clipboardUrl) {
        setDetectedRawInput(text.trim());
        setDetectedUrl(clipboardUrl);
        setShowClipboardPrompt(true);
      }
    } catch {
      // 某些浏览器要求用户手势后才能读取剪贴板。
    }
  }, []);

  const resolveRemoteMetadata = useCallback(
    async (rawInput: string): Promise<MetadataResult | null> => {
      return metadataService.resolve(rawInput);
    },
    [],
  );

  const backfillMissingImages = useCallback(
    async (records: CollectionRecord[]) => {
      const candidates = records
        .filter(
          (item) =>
            item.id &&
            !item.image &&
            !attemptedImageBackfillIds.current.has(item.id),
        )
        .slice(0, 3);

      if (!candidates.length) return;

      candidates.forEach((item) => {
        attemptedImageBackfillIds.current.add(item.id!);
      });

      const updates = await Promise.allSettled(
        candidates.map(async (item) => {
          const metadata = await resolveRemoteMetadata(
            item.raw_input?.trim() || item.url,
          );

          if (!metadata?.image || !item.id) {
            return null;
          }

          return collectionService.update(item.id, { image: metadata.image });
        }),
      );

      updates.forEach((result) => {
        if (result.status === "rejected") {
          console.error("Failed to backfill image:", result.reason);
        }
      });

      const refreshedItems = updates.flatMap((result) =>
        result.status === "fulfilled" && result.value ? [result.value] : [],
      );

      if (!refreshedItems.length) return;

      setItems((currentItems) =>
        currentItems.map((currentItem) => {
          const refreshedItem = refreshedItems.find(
            (item) => item.id === currentItem.id,
          );
          return refreshedItem
            ? {
                ...currentItem,
                image: refreshedItem.image ?? currentItem.image,
              }
            : currentItem;
        }),
      );
    },
    [resolveRemoteMetadata],
  );

  const loadItems = useCallback(async () => {
    if (!user) return;

    setLoadError(false);
    setLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("加载超时")), 15000),
      );
      const [collectionsResult, remindersResult, connectionResult, profileResult] =
        await Promise.allSettled([
          Promise.race([
            collectionService.listUserCollections(user.id),
            timeoutPromise,
          ]),
          reminderService.listUserActiveReminders(user.id),
          telegramService.getUserConnection(user.id),
          profileService.getUserProfile(user.id),
        ]);

      if (collectionsResult.status === "rejected") {
        throw collectionsResult.reason;
      }

      const collectionsData =
        collectionsResult.value as Awaited<
          ReturnType<typeof collectionService.listUserCollections>
        >;
      const activeReminders =
        remindersResult.status === "fulfilled" ? remindersResult.value : [];

      setItems(
        applyRemindersToItems(
          collectionsData.map((item) => mapCollectionRecordToItemView(item)),
          activeReminders,
        ),
      );

      if (remindersResult.status === "rejected") {
        console.error("Failed to load reminders:", remindersResult.reason);
      }

      if (connectionResult.status === "fulfilled") {
        setTelegramConnection(
          connectionResult.value?.is_active ? connectionResult.value : null,
        );
      } else {
        console.error(
          "Failed to load Telegram connection:",
          connectionResult.reason,
        );
        setTelegramConnection(null);
      }

      if (profileResult.status === "fulfilled") {
        setUserProfile(profileResult.value);
      } else {
        console.warn("Failed to load user profile:", profileResult.reason);
        setUserProfile(null);
      }

      void backfillMissingImages(collectionsData);

      void categoryService
        .listUserCategories(user.id)
        .then((categoriesData) => {
          setCategories(categoriesData);
        })
        .catch((error) => {
          console.error("Failed to load categories:", error);
          showToast("分类暂时加载失败，不影响你先查看收藏。");
          setCategories([]);
        });
    } catch (error) {
      console.error("Failed to load items:", error);
      setLoadError(true);
      if (error instanceof Error) {
        setErrorMsg(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [applyRemindersToItems, backfillMissingImages, showToast, user]);

  useEffect(() => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.categoryId
          ? {
              ...item,
              categoryName: categoryNameById[item.categoryId],
            }
          : { ...item, categoryName: undefined },
      ),
    );
  }, [categories, categoryNameById]);

  // 从 Supabase 加载数据
  useEffect(() => {
    if (!authLoading && user) {
      void loadItems();
    }
    if (!authLoading && !user) {
      setLoading(false);
      setTelegramConnection(null);
      setUserProfile(null);
    }
  }, [authLoading, user, loadItems]);

  // 手动粘贴按钮（兼容 iOS Safari）
  const pasteFromClipboard = async () => {
    if (!clipboardSupported) {
      inputRef.current?.focus();
      inputRef.current?.select();
      showToast("当前无法直接读取剪贴板，请手动粘贴。");
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        showToast("剪贴板里还没有内容。");
        return;
      }

      handleInputPaste(text);
    } catch {
      showToast("无法读取剪贴板，请手动粘贴", "error");
    }
  };

  // 页面加载时检测剪贴板
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      window.isSecureContext &&
      typeof navigator !== "undefined" &&
      typeof navigator.clipboard?.readText === "function";

    setClipboardSupported(supported);

    if (!supported) {
      return;
    }

    const timer = setTimeout(checkClipboard, 500);
    return () => clearTimeout(timer);
  }, [checkClipboard]);

  const addItem = useCallback(
    async (overrideInput?: string) => {
      if (!user) return;
      if (submitting) return;
      setSubmitting(true);
      const rawInput = (overrideInput ?? input).trim();
      const extractedUrl = extractUrl(rawInput);

      if (!rawInput) {
        setSubmitting(false);
        showToast("先粘贴或输入一个链接。");
        return;
      }

      if (!extractedUrl) {
        setSubmitting(false);
        showToast("当前先支持保存链接，纯文字收藏后续会支持。", "error");
        return;
      }

      const targetUrl = extractedUrl;

      if (isOffline) {
        setSubmitting(false);
        showToast("当前无网络，暂时无法保存链接。", "error");
        return;
      }

      const resolvedMetadata = await resolveRemoteMetadata(rawInput);
      const platform = resolvedMetadata?.platform ?? detectPlatform(targetUrl);
      const title = resolvedMetadata?.title ?? targetUrl;
      const image = resolvedMetadata?.image;
      const needsEdit = resolvedMetadata?.needsEdit ?? false;
      const finalUrl =
        resolvedMetadata?.resolvedUrl ?? resolvedMetadata?.url ?? targetUrl;

      try {
        const data = await collectionService.create({
          user_id: user.id,
          title,
          url: finalUrl,
          resolved_url: resolvedMetadata?.resolvedUrl ?? finalUrl,
          platform,
          image,
          raw_input: rawInput,
          category_id: null,
          metadata_source: resolvedMetadata?.metadataSource,
          metadata_confidence: resolvedMetadata?.metadataConfidence,
          needs_edit: needsEdit,
        });

        const newItem = mapCollectionRecordToItemView(data, {
          categoryNameById,
        });

        setItems((currentItems) => {
          const shortTitle = title.length > 20 ? title.slice(0, 20) + '…' : title;
          const isDuplicate = currentItems.some((it) => it.url === finalUrl);
          showToast(
            isDuplicate
              ? `已收藏「${shortTitle}」— 该链接之前已收藏过`
              : `已收藏「${shortTitle}」`,
          );
          return [newItem, ...currentItems];
        });
        setInput("");
        setShowClipboardPrompt(false);
        setDetectedUrl(null);
        setDetectedRawInput(null);

        if (needsEdit) {
          setTimeout(() => {
            setDialogState({ type: "needsEdit", itemId: newItem.id });
          }, 100);
        }
      } catch (error) {
        console.error("Failed to add item:", error);
        showToast("添加失败，请重试", "error");
      } finally {
        setSubmitting(false);
      }
    },
    [
      categoryNameById,
      input,
      isOffline,
      resolveRemoteMetadata,
      showToast,
      submitting,
      user,
    ],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      try {
        await collectionService.remove(id);
        setItems((currentItems) =>
          currentItems.filter((item) => item.id !== id),
        );
      } catch (error) {
        console.error("Failed to delete item:", error);
        showToast("删除失败，请重试", "error");
      }
    },
    [showToast],
  );

  const startEdit = (id: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, isEditing: true } : item,
      ),
    );
  };

  const saveEdit = useCallback(
    async (id: string, newTitle: string) => {
      try {
        await collectionService.update(id, {
          title: newTitle,
          needs_edit: false,
          metadata_source: "manual",
          metadata_confidence: 1,
        });
        setItems((currentItems) =>
          currentItems.map((item) =>
            item.id === id
              ? { ...item, title: newTitle, isEditing: false, needsEdit: false }
              : item,
          ),
        );
      } catch (error) {
        console.error("Failed to update item:", error);
        showToast("保存失败，请重试", "error");
      }
    },
    [showToast],
  );

  const cancelEdit = (id: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, isEditing: false } : item,
      ),
    );
  };

  const handleOpen = useCallback(async (id: string, url: string) => {
    const openedAt = new Date().toISOString();

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, lastOpenedAt: openedAt } : item,
      ),
    );

    void collectionService
      .update(id, {
        last_opened_at: openedAt,
      })
      .catch((error) => {
        console.error("Failed to update open timestamp:", error);
      });

    // Open synchronously to preserve user gesture on mobile browsers
    const popup = window.open(url, "_blank", "noopener,noreferrer");

    try {
      const response = await fetch(
        `/api/embed-check?url=${encodeURIComponent(url)}`,
      );
      const data = await response.json();

      if (data.embeddable && popup) {
        popup.close();
        setPreviewUrl(url);
      }
    } catch {
      // Already opened in new tab, nothing to do
    }
  }, []);

  const handleRequestReminder = useCallback(
    (id: string) => {
      const item = items.find((currentItem) => currentItem.id === id);
      if (!item) return;

      if (!hasReminderAccess) {
        setDialogState({ type: "reminder", itemId: id });
        return;
      }

      setReminderDraftType(item.reminder?.type ?? "once");
      setReminderDraftAt(
        item.reminder?.type === "once"
          ? formatDateTimeLocalValue(new Date(item.reminder.remindAt))
          : getDefaultReminderDateTimeValue(),
      );
      setDialogState({ type: "reminder", itemId: id });
    },
    [hasReminderAccess, items],
  );

  const handleCategoryUpdate = useCallback(
    async (itemId: string, categoryId: string | null) => {
      try {
        await collectionService.update(itemId, {
          category_id: categoryId,
        });

        setItems((currentItems) =>
          currentItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  categoryId: categoryId ?? undefined,
                  categoryName: categoryId
                    ? categoryNameById[categoryId]
                    : undefined,
                }
              : item,
          ),
        );

        setDialogState(null);
        showToast(categoryId ? "分类已更新。" : "已取消分类。");
      } catch (error) {
        console.error("Failed to update item category:", error);
        showToast("更新分类失败，请重试", "error");
      }
    },
    [categoryNameById, showToast],
  );

  const handleSaveReminder = useCallback(async () => {
    if (!user || !reminderDialogItem || savingReminder) return;

    if (!telegramConnection?.is_active) {
      window.location.href = "/my";
      return;
    }

    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
    let remindAt: string | null = null;

    if (reminderDraftType === "once") {
      remindAt = parseDateTimeLocalValue(reminderDraftAt);
      if (!remindAt) {
        showToast("请先选一个有效的提醒时间。", "error");
        return;
      }

      if (new Date(remindAt).getTime() <= Date.now()) {
        showToast("提醒时间需要晚于当前时间。", "error");
        return;
      }
    } else {
      remindAt = getNextDailyReminderAt(timezone, 20, 0).toISOString();
    }

    const hadReminder = Boolean(reminderDialogItem.reminder);

    setSavingReminder(true);
    try {
      const savedReminder = await reminderService.upsert({
        user_id: user.id,
        collection_id: reminderDialogItem.id,
        remind_at: remindAt,
        timezone,
        reminder_type: reminderDraftType,
        status: "pending",
      });
      const reminder = mapReminderRecordToView(savedReminder);

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === reminderDialogItem.id ? { ...item, reminder } : item,
        ),
      );
      setDialogState(null);
      showToast(hadReminder ? "提醒已更新。" : "提醒已设置。");
    } catch (error) {
      console.error("Failed to save reminder:", error);
      showToast(
        error instanceof Error ? error.message : "保存提醒失败，请重试。",
        "error",
      );
    } finally {
      setSavingReminder(false);
    }
  }, [
    reminderDialogItem,
    reminderDraftAt,
    reminderDraftType,
    savingReminder,
    showToast,
    telegramConnection,
    user,
  ]);

  const handleCancelReminder = useCallback(async () => {
    if (!reminderDialogItem?.reminder?.id) return;

    try {
      await reminderService.cancel(reminderDialogItem.reminder.id);
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === reminderDialogItem.id
            ? { ...item, reminder: undefined }
            : item,
        ),
      );
      setDialogState(null);
      showToast("提醒已取消。");
    } catch (error) {
      console.error("Failed to cancel reminder:", error);
      showToast("取消提醒失败，请重试。", "error");
    }
  }, [reminderDialogItem, showToast]);

  if (!user) {
    if (authLoading) {
      return (
        <ReviveLoading
          fullscreen
          label='Revive 正在确认你的身份'
          detail='收藏列表马上就到。'
        />
      );
    }

    return null;
  }

  return (
    <div className='theme-page min-h-screen p-4 pb-20'>
      {pullDistance > 0 && (
        <div
          className='theme-text-subtle flex items-center justify-center text-xs transition-opacity'
          style={{ height: pullDistance, opacity: pullDistance / 60 }}
        >
          {isRefreshing ? "刷新中..." : "下拉刷新"}
        </div>
      )}
      {isOffline && <OfflineNotice />}
      <div className='flex justify-between items-center mb-4'>
        <h1 className='text-xl font-bold text-[var(--foreground)]'>Revive</h1>
        <div className="flex items-center gap-2">
          <ThemeToggleButton />
          <button
            type='button'
            onClick={async () => {
              await authService.signOut();
              window.location.replace("/login");
            }}
            className='theme-secondary-button inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors'>
            <svg
              viewBox='0 0 24 24'
              width='16'
              height='16'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              strokeLinecap='round'
              strokeLinejoin='round'>
              <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
              <path d='M16 17l5-5-5-5' />
              <path d='M21 12H9' />
            </svg>
            登出
          </button>
        </div>
      </div>

      <AddCollectionForm
        input={input}
        submitting={submitting || authLoading}
        clipboardSupported={clipboardSupported}
        inputRef={inputRef}
        onInputChange={setInput}
        onInputPaste={handleInputPaste}
        onClear={() => setInput("")}
        onPaste={pasteFromClipboard}
        onSubmit={() => addItem()}
      />

      {hasActiveFilters && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {selectedPlatformFilter !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedPlatformFilter("all")}
              className="theme-secondary-button inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors"
            >
              {getPlatformName(selectedPlatformFilter)}
              <span className="theme-text-subtle">&times;</span>
            </button>
          )}
          {selectedCategoryFilter !== "all" && categoryNameById[selectedCategoryFilter] && (
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter("all")}
              className="theme-secondary-button inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors"
            >
              {categoryNameById[selectedCategoryFilter]}
              <span className="theme-text-subtle">&times;</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSelectedPlatformFilter("all");
              setSelectedCategoryFilter("all");
            }}
            className="theme-text-muted text-xs transition-opacity hover:opacity-80"
          >
            清除全部
          </button>
        </div>
      )}

      {/* 浮动筛选按钮 */}
      <button
        type="button"
        onClick={() => setDialogState({ type: "filters" })}
        className="theme-floating theme-border fixed bottom-34 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-xl transition-colors"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="5" x2="21" y2="5" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="19" x2="21" y2="19" />
          <circle cx="8" cy="5" r="2" fill="currentColor" />
          <circle cx="16" cy="12" r="2" fill="currentColor" />
          <circle cx="11" cy="19" r="2" fill="currentColor" />
        </svg>
        {hasActiveFilters && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
        )}
      </button>

      {loading ? (
        <ReviveLoading
          compact
          label='Revive 正在展开你的列表'
          detail='标题、封面和状态正在同步。'
        />
      ) : loadError ? (
        <div className='theme-panel rounded-xl p-4 text-center'>
          <div className='mb-3 text-[var(--foreground)]'>列表加载失败，请重试</div>
          {errorMsg && (
            <div className='theme-text-muted mb-3 text-xs'>{errorMsg}</div>
          )}
          <button
            onClick={loadItems}
            className='theme-primary-button rounded-lg px-4 py-2 transition-opacity'>
            重试
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className='theme-panel theme-text-muted rounded-xl p-5 text-sm'>
          还没有收藏，先粘贴一个链接试试。
        </div>
      ) : filteredItems.length === 0 ? (
        <div className='theme-panel theme-text-muted rounded-xl p-5 text-sm'>
          当前筛选条件下还没有匹配内容，换个分类或平台试试。
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              const next = layout === "grid" ? "list" : "grid";
              setLayout(next);
              localStorage.setItem("revive-layout", next);
            }}
            className="theme-floating theme-border fixed bottom-46 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-xl transition-colors"
            aria-label={layout === "grid" ? "切换为列表布局" : "切换为瀑布流布局"}
          >
            {layout === "grid" ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            )}
          </button>
        <CollectionList
          items={filteredItems}
          layout={layout}
          onOpen={handleOpen}
          onRequestReminder={handleRequestReminder}
          onEditCategory={(id) => setDialogState({ type: "itemCategory", itemId: id })}
          onStartEdit={startEdit}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelEdit}
          onDelete={(id) => setDialogState({ type: "delete", itemId: id })}
          onActiveIndexChange={setActiveItemIndex}
        />
        <div ref={listEndRef} className="h-1" aria-hidden="true" />
        {isNearListBottom && bottomReachedMessage && (
          <div className="theme-text-subtle mt-4 mb-2 text-center text-sm font-medium tracking-[0.02em]">
            {bottomReachedMessage}
          </div>
        )}
        </>
      )}

      {!loading && !loadError && filteredItems.length > 0 && !isNearListBottom && (
        <FloatingCounter current={visibleCounter} total={filteredItems.length} />
      )}

      {/* 剪贴板检测提示 */}
      {showClipboardPrompt && detectedUrl && (
        <ClipboardPrompt
          url={detectedUrl}
          platform={detectPlatform(detectedUrl)}
          onConfirm={() => addItem(detectedRawInput ?? detectedUrl)}
          onCancel={() => {
            setShowClipboardPrompt(false);
            setDetectedUrl(null);
            setDetectedRawInput(null);
          }}
        />
      )}

      {dialogState?.type === "needsEdit" && (
        <AppDialog
          title='还没有拿到合适标题'
          description='这条内容已经保存成功，要不要现在顺手补一个更清晰的备注？'
          confirmText='立即编辑'
          cancelText='稍后处理'
          onConfirm={() => {
            startEdit(dialogState.itemId);
            setDialogState(null);
          }}
          onCancel={() => setDialogState(null)}
        />
      )}

      {dialogState?.type === "delete" && (
        <AppDialog
          title='确认删除这条收藏？'
          description='这条记录会直接从列表中移除。'
          confirmText='删除'
          cancelText='保留'
          tone='danger'
          cornerStyle='tight'
          onConfirm={() => {
            const { itemId } = dialogState;
            setDialogState(null);
            void deleteItem(itemId);
          }}
          onCancel={() => setDialogState(null)}
        />
      )}

      {dialogState?.type === "reminder" && reminderDialogItem && (
        <AppDialog
          title={
            !hasReminderAccess
              ? "Telegram 提醒正在内测"
              : telegramConnection
              ? reminderDialogItem.reminder
                ? "修改提醒"
                : "设置提醒"
              : "先绑定 Telegram"
          }
          description={
            !hasReminderAccess
              ? "收藏后可设置单次提醒或每日 20:00 提醒。当前仅对受邀用户开放，正式开放后将作为 Pro 功能提供。"
              : telegramConnection
              ? "单次提醒可以自定义时间，重复提醒先固定为每天 20:00。"
              : "提醒会发到你的 Telegram 私聊。先去「我的」完成绑定，再回来给收藏设提醒。"
          }
          confirmText={
            !hasReminderAccess
              ? "知道了"
              : telegramConnection
              ? savingReminder
                ? "保存中..."
                : reminderDialogItem.reminder
                  ? "保存修改"
                  : "保存提醒"
              : "去绑定"
          }
          cancelText={hasReminderAccess && telegramConnection ? "取消" : "稍后再说"}
          onConfirm={() => {
            if (!hasReminderAccess) {
              setDialogState(null);
              return;
            }

            if (telegramConnection) {
              void handleSaveReminder();
              return;
            }

            window.location.href = "/my";
          }}
          onCancel={() => {
            if (savingReminder) return;
            setDialogState(null);
          }}
        >
          {!hasReminderAccess ? (
            <div className='theme-panel-muted rounded-2xl px-3 py-4 text-sm leading-6'>
              这会是未来的 Pro 能力：把重要收藏设置成稍后提醒，或每天 20:00 统一回看。
            </div>
          ) : telegramConnection ? (
            <div className='space-y-4'>
              <div className='theme-panel-muted rounded-2xl px-3 py-3 text-sm'>
                当前内容：
                <div className='mt-1 line-clamp-2 font-medium text-[var(--foreground)]'>
                  {reminderDialogItem.title}
                </div>
              </div>

              <div className='space-y-2'>
                <label className='theme-panel theme-border flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm'>
                  <input
                    type='radio'
                    name='reminder-type'
                    checked={reminderDraftType === "once"}
                    onChange={() => setReminderDraftType("once")}
                    className='mt-0.5'
                  />
                  <div>
                    <div className='font-medium text-[var(--foreground)]'>
                      选择一个时间提醒我
                    </div>
                    <div className='theme-text-muted mt-1 text-xs'>
                      支持今天、明天或更晚的单次提醒。
                    </div>
                  </div>
                </label>

                <label className='theme-panel theme-border flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm'>
                  <input
                    type='radio'
                    name='reminder-type'
                    checked={reminderDraftType === "daily_20"}
                    onChange={() => setReminderDraftType("daily_20")}
                    className='mt-0.5'
                  />
                  <div>
                    <div className='font-medium text-[var(--foreground)]'>
                      每天 20:00 提醒我
                    </div>
                    <div className='theme-text-muted mt-1 text-xs'>
                      适合晚上统一回看收藏。
                    </div>
                  </div>
                </label>
              </div>

              {reminderDraftType === "once" ? (
                <label className='block text-sm text-[var(--foreground)]'>
                  <div className='theme-text-muted mb-1 text-xs'>提醒时间</div>
                  <input
                    type='datetime-local'
                    value={reminderDraftAt}
                    min={getDefaultReminderDateTimeValue(new Date())}
                    onChange={(event) => setReminderDraftAt(event.target.value)}
                    className='theme-input w-full rounded-xl border px-3 py-2.5 text-sm'
                  />
                </label>
              ) : (
                <div className='theme-border theme-text-muted rounded-2xl border border-dashed px-3 py-4 text-sm'>
                  保存后，这条内容会在每天晚上 20:00 提醒你。
                </div>
              )}

              {reminderDialogItem.reminder && (
                <button
                  type='button'
                  onClick={() => void handleCancelReminder()}
                  className='theme-danger-soft w-full rounded-xl px-4 py-2.5 text-sm transition-colors'>
                  取消当前提醒
                </button>
              )}
            </div>
          ) : (
            <div className='theme-panel-muted rounded-2xl px-3 py-4 text-sm leading-6'>
              在 Telegram 里点一次 Start，Revive 才知道以后把提醒发到哪一个账号。
            </div>
          )}
        </AppDialog>
      )}

      {dialogState?.type === "filters" && (
        <AppDialog
          title="筛选收藏"
          description="先用轻量筛选来整理列表，搜索和标签我们下一阶段再接。"
          confirmText="完成"
          cancelText="关闭"
          onConfirm={() => setDialogState(null)}
          onCancel={() => setDialogState(null)}
        >
          <div className="space-y-4">
            <label className="block text-sm text-[var(--foreground)]">
              <div className="theme-text-muted mb-1 text-xs">平台</div>
              <select
                value={selectedPlatformFilter}
                onChange={(event) =>
                  setSelectedPlatformFilter(event.target.value as Platform | "all")
                }
                className="theme-input w-full rounded-xl border px-3 py-2.5 text-sm"
              >
                <option value="all">全部平台</option>
                <option value="douyin">抖音</option>
                <option value="xiaohongshu">小红书</option>
                <option value="bilibili">B 站</option>
                <option value="youtube">YouTube</option>
                <option value="weibo">微博</option>
                <option value="wechat">公众号</option>
                <option value="other">其他</option>
              </select>
            </label>

            <label className="block text-sm text-[var(--foreground)]">
              <div className="theme-text-muted mb-1 text-xs">分类</div>
              <select
                value={selectedCategoryFilter}
                onChange={(event) => setSelectedCategoryFilter(event.target.value)}
                className="theme-input w-full rounded-xl border px-3 py-2.5 text-sm"
              >
                <option value="all">全部分类</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </AppDialog>
      )}

      {dialogState?.type === "itemCategory" && categoryDialogItem && (
        <AppDialog
          title="编辑分类"
          description='这里先只处理这条内容的分类。分类的新建和删除统一放到"我的"页面。'
          confirmText="确定"
          cancelText="取消"
          onConfirm={() => {
            const targetId =
              pendingCategoryId !== undefined
                ? pendingCategoryId
                : categoryDialogItem.categoryId ?? null;
            void handleCategoryUpdate(categoryDialogItem.id, targetId);
          }}
          onCancel={() => {
            setPendingCategoryId(undefined);
            setDialogState(null);
          }}
        >
          <div className="space-y-4">
            <div className="theme-panel-muted rounded-2xl px-3 py-3 text-sm">
              当前内容：
              <div className="mt-1 line-clamp-2 font-medium text-[var(--foreground)]">
                {categoryDialogItem.title}
              </div>
            </div>

            {categoryOptions.length === 0 ? (
              <div className="theme-border theme-text-muted rounded-2xl border border-dashed px-3 py-4 text-sm">
                你还没有创建分类，先去「我的」里添加一个吧。
              </div>
            ) : (
              <div>
                <div className="theme-text-muted mb-2 text-xs">选择分类</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingCategoryId(null)}
                    className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                      (pendingCategoryId !== undefined
                        ? pendingCategoryId === null
                        : !categoryDialogItem.categoryId)
                        ? "theme-primary-button"
                        : "theme-secondary-button"
                    }`}
                  >
                    暂不分类
                  </button>
                  {categoryOptions.map((category) => {
                    const isSelected =
                      pendingCategoryId !== undefined
                        ? category.id === pendingCategoryId
                        : category.id === categoryDialogItem.categoryId;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setPendingCategoryId(category.id)}
                        className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                          isSelected
                            ? "theme-primary-button"
                            : "theme-secondary-button"
                        }`}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </AppDialog>
      )}

      {toastState && (
        <AppToast
          message={toastState.message}
          tone={toastState.tone}
          onDismiss={() => setToastState(null)}
        />
      )}

      <BottomNav />

      {previewUrl && (
        <ContentPreview
          key={previewUrl}
          url={previewUrl}
          onClose={() => setPreviewUrl(null)}
        />
      )}
    </div>
  );
}
