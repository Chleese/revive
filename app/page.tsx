"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { detectPlatform } from "@/lib/platform";
import { extractUrl } from "@/lib/metadata/normalize";
import type { MetadataResult } from "@/lib/metadata/types";
import {
  addCollection,
  deleteCollection,
  updateCollection,
} from "@/lib/collections/mutations";
import {
  getUserCollections,
} from "@/lib/collections/queries";
import {
  type CollectionRecord,
  mapCollectionRecordToItemView,
  type CollectionItemView,
} from "@/lib/collections/types";
import { AddCollectionForm } from "@/components/collection/AddCollectionForm";
import { CollectionList } from "@/components/collection/CollectionList";
import { ClipboardPrompt } from "./components/ClipboardPrompt";
import { useAuth } from "./components/AuthProvider";
import { createClient } from "./lib/supabase/client";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CollectionItemView[]>([]);
  const [input, setInput] = useState("");
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [showClipboardPrompt, setShowClipboardPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [clipboardSupported, setClipboardSupported] = useState(true);
  const attemptedImageBackfillIds = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const resolveRemoteMetadata = useCallback(async (rawInput: string): Promise<MetadataResult | null> => {
    try {
      const response = await fetch("/api/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rawInput }),
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as MetadataResult;
    } catch (error) {
      console.error("Failed to resolve metadata:", error);
      return null;
    }
  }, []);

  const backfillMissingImages = useCallback(
    async (records: CollectionRecord[]) => {
      const candidates = records
        .filter((item) => item.id && !item.image && !attemptedImageBackfillIds.current.has(item.id))
        .slice(0, 3);

      if (!candidates.length) return;

      candidates.forEach((item) => {
        attemptedImageBackfillIds.current.add(item.id!);
      });

      const updates = await Promise.allSettled(
        candidates.map(async (item) => {
          const metadata = await resolveRemoteMetadata(item.raw_input?.trim() || item.url);

          if (!metadata?.image || !item.id) {
            return null;
          }

          return updateCollection(item.id, { image: metadata.image });
        })
      );

      updates.forEach((result) => {
        if (result.status === "rejected") {
          console.error("Failed to backfill image:", result.reason);
        }
      });

      const refreshedItems = updates
        .flatMap((result) =>
          result.status === "fulfilled" && result.value ? [result.value] : []
        );

      if (!refreshedItems.length) return;

      setItems((currentItems) =>
        currentItems.map((currentItem) => {
          const refreshedItem = refreshedItems.find((item) => item.id === currentItem.id);
          return refreshedItem ? mapCollectionRecordToItemView(refreshedItem) : currentItem;
        })
      );
    },
    [resolveRemoteMetadata]
  );

  const loadItems = useCallback(async () => {
    if (!user) return;

    setLoadError(false);
    setLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("加载超时")), 15000)
      );
      const data = (await Promise.race([
        getUserCollections(user!.id),
        timeoutPromise,
      ])) as Awaited<ReturnType<typeof getUserCollections>>;
      setItems(data.map(mapCollectionRecordToItemView));
      void backfillMissingImages(data);
    } catch (error) {
      console.error("Failed to load items:", error);
      setLoadError(true);
      if (error instanceof Error) {
        setErrorMsg(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [backfillMissingImages, user]);

  // 从 Supabase 加载数据
  useEffect(() => {
    if (!authLoading && user) {
      loadItems();
    }
  }, [authLoading, user, loadItems]);

  // 剪贴板检测
  const checkClipboard = useCallback(async () => {
    if (!clipboardSupported) return;

    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
        setDetectedUrl(text);
        setShowClipboardPrompt(true);
      }
    } catch {
      // 忽略（iOS Safari 不允许无手势调用）
    }
  }, [clipboardSupported]);

  // 手动粘贴按钮（兼容 iOS Safari）
  const pasteFromClipboard = async () => {
    if (!clipboardSupported) {
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInput(text);
      }
    } catch {
      alert("无法读取剪贴板，请手动粘贴");
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

    const timer = setTimeout(checkClipboard, 500);
    return () => clearTimeout(timer);
  }, [checkClipboard, clipboardSupported]);

  const addItem = async (url?: string) => {
    if (!user) return;
    if (submitting) return;
    setSubmitting(true);
    const rawInput = (url || input).trim();
    const extractedUrl = extractUrl(rawInput);
    const targetUrl = url || extractedUrl || rawInput;

    if (!targetUrl) {
      setSubmitting(false);
      return;
    }

    const resolvedMetadata = await resolveRemoteMetadata(rawInput);
    const platform = resolvedMetadata?.platform ?? detectPlatform(targetUrl);
    const title = resolvedMetadata?.title ?? targetUrl;
    const image = resolvedMetadata?.image;
    const needsEdit = resolvedMetadata?.needsEdit ?? false;
    const finalUrl = resolvedMetadata?.resolvedUrl ?? resolvedMetadata?.url ?? targetUrl;

    // 保存到 Supabase
    try {
      const data = await addCollection({
        user_id: user.id,
        title,
        url: finalUrl,
        resolved_url: resolvedMetadata?.resolvedUrl ?? finalUrl,
        platform,
        image,
        raw_input: rawInput,
        metadata_source: resolvedMetadata?.metadataSource,
        metadata_confidence: resolvedMetadata?.metadataConfidence,
        needs_edit: needsEdit,
      });

      const newItem = mapCollectionRecordToItemView(data);

      setItems([newItem, ...items]);
      setInput("");
      setShowClipboardPrompt(false);
      setDetectedUrl(null);

      // 如果是纯链接，提示用户编辑
      if (needsEdit) {
        setTimeout(() => {
          const shouldEdit = confirm("未获取到视频标题，是否立即编辑备注？");
          if (shouldEdit) {
            startEdit(newItem.id);
          }
        }, 100);
      }
    } catch (error) {
      console.error("Failed to add item:", error);
      alert("添加失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteCollection(id);
      setItems(items.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert("删除失败，请重试");
    }
  };

  const startEdit = (id: string) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, isEditing: true } : item
      )
    );
  };

  const saveEdit = async (id: string, newTitle: string) => {
    try {
      await updateCollection(id, { title: newTitle, needs_edit: false });
      setItems(
        items.map((item) =>
          item.id === id
            ? { ...item, title: newTitle, isEditing: false, needsEdit: false }
            : item
        )
      );
    } catch (error) {
      console.error("Failed to update item:", error);
      alert("保存失败，请重试");
    }
  };

  const cancelEdit = (id: string) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, isEditing: false } : item
      )
    );
  };

  if (!user) {
    if (authLoading) {
      return (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-gray-900">Revive</h1>
          </div>
          <div className="mb-4">
            <div className="h-10 w-full rounded-lg bg-white animate-pulse" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl bg-white p-4 shadow-sm animate-pulse"
              >
                <div className="h-4 w-2/3 rounded bg-gray-200 mb-3" />
                <div className="h-3 w-24 rounded bg-gray-100 mb-4" />
                <div className="h-3 w-16 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-900">Revive</h1>
        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.replace("/login");
          }}
          className="text-sm text-gray-500"
        >
          登出
        </button>
      </div>

      <AddCollectionForm
        input={input}
        submitting={submitting || authLoading}
        clipboardSupported={clipboardSupported}
        inputRef={inputRef}
        onInputChange={setInput}
        onClear={() => setInput("")}
        onPaste={pasteFromClipboard}
        onSubmit={() => addItem()}
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl bg-white p-4 shadow-sm animate-pulse"
            >
              <div className="h-4 w-2/3 rounded bg-gray-200 mb-3" />
              <div className="h-3 w-24 rounded bg-gray-100 mb-4" />
              <div className="h-3 w-16 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-xl bg-white p-4 shadow-sm text-center">
          <div className="text-gray-900 mb-3">列表加载失败，请重试</div>
          {errorMsg && <div className="text-xs text-gray-400 mb-3">{errorMsg}</div>}
          <button
            onClick={loadItems}
            className="bg-black text-white px-4 py-2 rounded-lg"
          >
            重试
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl bg-white p-5 shadow-sm text-sm text-gray-500">
          还没有收藏，先粘贴一个链接试试。
        </div>
      ) : (
        <CollectionList
          items={items}
          onStartEdit={startEdit}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelEdit}
          onDelete={(id) => {
            if (confirm("确定删除吗？")) deleteItem(id);
          }}
        />
      )}

      {/* 剪贴板检测提示 */}
      {showClipboardPrompt && detectedUrl && (
        <ClipboardPrompt
          url={detectedUrl}
          platform={detectPlatform(detectedUrl)}
          onConfirm={() => addItem(detectedUrl)}
          onCancel={() => {
            setShowClipboardPrompt(false);
            setDetectedUrl(null);
          }}
        />
      )}
    </div>
  );
}
