"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { detectPlatform } from "@/lib/platform";
import { extractUrl } from "@/lib/metadata/normalize";
import type { MetadataResult } from "@/lib/metadata/types";
import {
  type CollectionRecord,
  mapCollectionRecordToItemView,
  type CollectionItemView,
} from "@/lib/collections/types";
import { authService } from "@/lib/services/auth";
import { collectionService } from "@/lib/services/collections";
import { metadataService } from "@/lib/services/metadata";
import { AddCollectionForm } from "@/components/collection/AddCollectionForm";
import { CollectionList } from "@/components/collection/CollectionList";
import { ClipboardPrompt } from "./components/ClipboardPrompt";
import { useAuth } from "./components/AuthProvider";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CollectionItemView[]>([]);
  const [input, setInput] = useState("");
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [detectedRawInput, setDetectedRawInput] = useState<string | null>(null);
  const [showClipboardPrompt, setShowClipboardPrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [clipboardSupported, setClipboardSupported] = useState(true);
  const attemptedImageBackfillIds = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputPaste = useCallback((value: string) => {
    setInput(value);
  }, []);

  const checkClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const extractedUrl = extractUrl(text.trim());
      const clipboardUrl =
        extractedUrl ?? (text.trim().startsWith("http://") || text.trim().startsWith("https://")
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

  const resolveRemoteMetadata = useCallback(async (rawInput: string): Promise<MetadataResult | null> => {
    return metadataService.resolve(rawInput);
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

          return collectionService.update(item.id, { image: metadata.image });
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
        collectionService.listUserCollections(user.id),
        timeoutPromise,
      ])) as Awaited<ReturnType<typeof collectionService.listUserCollections>>;
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
    if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user, loadItems]);

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
        handleInputPaste(text);
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

    if (!supported) {
      return;
    }

    const timer = setTimeout(checkClipboard, 500);
    return () => clearTimeout(timer);
  }, [checkClipboard]);

  const addItem = async (overrideInput?: string) => {
    if (!user) return;
    if (submitting) return;
    setSubmitting(true);
    const rawInput = (overrideInput ?? input).trim();
    const extractedUrl = extractUrl(rawInput);
    const targetUrl = extractedUrl || rawInput;

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
      const data = await collectionService.create({
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

      setItems((currentItems) => [newItem, ...currentItems]);
      setInput("");
      setShowClipboardPrompt(false);
      setDetectedUrl(null);
      setDetectedRawInput(null);

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
      await collectionService.remove(id);
      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== id)
      );
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert("删除失败，请重试");
    }
  };

  const startEdit = (id: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, isEditing: true } : item
      )
    );
  };

  const saveEdit = async (id: string, newTitle: string) => {
    try {
      await collectionService.update(id, { title: newTitle, needs_edit: false });
      setItems((currentItems) =>
        currentItems.map((item) =>
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
    setItems((currentItems) =>
      currentItems.map((item) =>
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
            await authService.signOut();
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
        onInputPaste={handleInputPaste}
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
          onConfirm={() => addItem(detectedRawInput ?? detectedUrl)}
          onCancel={() => {
            setShowClipboardPrompt(false);
            setDetectedUrl(null);
            setDetectedRawInput(null);
          }}
        />
      )}
    </div>
  );
}
