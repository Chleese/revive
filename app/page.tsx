"use client";

import { useEffect, useState, useRef } from "react";
import { detectPlatform, Platform, getPlatformName } from "./utils/platform";
import { ClipboardPrompt } from "./components/ClipboardPrompt";
import { PlatformIcon } from "./components/PlatformIcon";
import {
  getUserCollections,
  addCollection,
  updateCollection,
  deleteCollection,
} from "./lib/operations";

// 匿名用户ID（你自用阶段，以后改为登录用户）
const ANONYMOUS_USER_ID = "user-revive-001";

type Item = {
  id: string;
  title: string;
  url: string;
  platform: Platform;
  image?: string;
  isEditing?: boolean;
  needsEdit?: boolean;
};

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [showClipboardPrompt, setShowClipboardPrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isMounted = useRef(false);

  // 从 Supabase 加载数据
  useEffect(() => {
    isMounted.current = true;
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoadError(false);
    setLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("加载超时")), 8000)
      );
      const data = (await Promise.race([
        getUserCollections(ANONYMOUS_USER_ID),
        timeoutPromise,
      ])) as Awaited<ReturnType<typeof getUserCollections>>;
      const items = data.map((item: { id?: string; title: string; url: string; platform: string; image?: string; needs_edit?: boolean }) => ({
        id: item.id!,
        title: item.title,
        url: item.url,
        platform: item.platform as Platform,
        image: item.image || undefined,
        needsEdit: item.needs_edit,
      }));
      setItems(items);
    } catch (error) {
      console.error("Failed to load items:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  // 剪贴板检测
  const checkClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
        setDetectedUrl(text);
        setShowClipboardPrompt(true);
      }
    } catch {
      // 忽略（iOS Safari 不允许无手势调用）
    }
  };

  // 手动粘贴按钮（兼容 iOS Safari）
  const pasteFromClipboard = async () => {
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
    const timer = setTimeout(checkClipboard, 500);
    return () => clearTimeout(timer);
  }, []);

  // 从文本中提取 URL
  const extractUrl = (text: string): string | null => {
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/g);
    return urlMatch ? urlMatch[0] : null;
  };

  // 从分享文案中提取标题
  const extractTitle = (
    text: string,
    url: string,
    platform: Platform
  ): string => {
    // 小红书格式：提取【和 - 之间的标题
    const xhsMatch = text.match(/【(.+?)\s*- /);
    if (xhsMatch) return xhsMatch[1];

    // 通用格式：提取【和】之间的内容
    const bracketMatch = text.match(/【(.+?)】/);
    if (bracketMatch) return bracketMatch[1];

    // 抖音格式：提取链接前的描述内容
    if (platform === "douyin") {
      const beforeUrl = text.replace(url, "").trim();
      const cleaned = beforeUrl
        .replace(/^[\d\s.:/\w@]+\s*/i, "")
        .replace(/复制此链接.*$/i, "")
        .replace(/打开Dou音搜索.*$/i, "")
        .replace(/直接观看视频.*$/i, "")
        .trim();

      if (cleaned && cleaned.length > 0) {
        return cleaned.length > 50 ? cleaned.substring(0, 50) + "..." : cleaned;
      }
    }

    // 如果是纯链接，显示友好的标题
    if (text === url || text.length === url.length) {
      const platformNames: Record<Platform, string> = {
        douyin: "抖音",
        xiaohongshu: "小红书",
        bilibili: "B站",
        youtube: "YouTube",
        weibo: "微博",
        wechat: "公众号",
        other: "链接",
      };

      const date = new Date().toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
      });

      return `${platformNames[platform]} - ${date}`;
    }

    return url;
  };

  const addItem = async (url?: string) => {
    if (submitting) return;
    setSubmitting(true);
    const extractedUrl = extractUrl(input);
    const targetUrl = url || extractedUrl || input;

    if (!targetUrl) {
      setSubmitting(false);
      return;
    }

    // 检测平台
    const platform = detectPlatform(targetUrl);

    // 先用本地提取的标题作为默认值
    let title = url
      ? targetUrl
      : extractedUrl
        ? extractTitle(input, targetUrl, platform)
        : targetUrl;
    let image: string | undefined;

    // 抖音、小红书不支持 Open Graph，跳过 API 调用
    const skipOgPlatforms: Platform[] = ["douyin", "xiaohongshu"];

    if (!skipOgPlatforms.includes(platform)) {
      try {
        const response = await fetch(
          `/api/og?url=${encodeURIComponent(targetUrl)}`
        );
        if (response.ok) {
          const ogData = await response.json();
          if (ogData.title) title = ogData.title;
          if (ogData.image) image = ogData.image;
        }
      } catch (error) {
        console.error("Failed to fetch OG data:", error);
      }
    }

    // 检测是否是纯链接
    const needsEdit =
      title.includes("抖音 - ") ||
      title.includes("小红书 - ") ||
      title.includes("B站 - ");

    // 保存到 Supabase
    try {
      const data = await addCollection({
        user_id: ANONYMOUS_USER_ID,
        title,
        url: targetUrl,
        platform,
        image,
        needs_edit: needsEdit,
      });

      const newItem: Item = {
        id: data.id!,
        title: data.title,
        url: data.url,
        platform: data.platform as Platform,
        image: data.image || undefined,
        needsEdit: data.needs_edit,
      };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-gray-900">加载中...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-900 mb-3">加载失败，请检查网络</div>
          <button
            onClick={loadItems}
            className="bg-black text-white px-4 py-2 rounded-lg"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-xl font-bold mb-4 text-gray-900">Revive</h1>

      {/* 输入框 */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="粘贴链接..."
            className="w-full p-2 pr-8 border rounded-lg text-gray-900 placeholder:text-gray-400"
          />
          {input && (
            <button
              onClick={() => setInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={pasteFromClipboard}
          className="bg-gray-100 text-gray-900 px-3 rounded-lg"
        >
          粘贴
        </button>
        <button
          onClick={() => addItem()}
          disabled={submitting}
          className="bg-black text-white px-4 rounded-lg disabled:opacity-50"
        >
          {submitting ? "添加中..." : "添加"}
        </button>
      </div>

      {/* 卡片列表 */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden"
          >
            {/* 封面图 */}
            {item.image && (
              <div className="relative aspect-video w-full bg-gray-100">
                <img
                  src={item.image}
                  alt={item.title}
                  className="object-cover w-full h-full"
                />
              </div>
            )}

            <div className="p-3">
              {/* 标题显示/编辑 */}
              {item.isEditing ? (
                <div className="mb-2">
                  <input
                    type="text"
                    defaultValue={item.title}
                    id={`edit-${item.id}`}
                    className="w-full p-2 border rounded-lg text-gray-900 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        const input = document.getElementById(
                          `edit-${item.id}`
                        ) as HTMLInputElement;
                        saveEdit(item.id, input.value);
                      }}
                      className="text-sm bg-black text-white px-3 py-1 rounded"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => cancelEdit(item.id)}
                      className="text-sm bg-gray-200 text-gray-900 px-3 py-1 rounded"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="font-medium mb-1 text-gray-900 line-clamp-2">
                    {item.title}
                  </div>
                  <div className="text-xs text-gray-700 mb-2 flex items-center gap-2">
                    <PlatformIcon platform={item.platform} size={16} />
                    {getPlatformName(item.platform)}
                    {item.needsEdit && (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">
                        待编辑
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 text-sm"
                    >
                      打开
                    </a>

                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(item.id)}
                        className="text-sm bg-gray-100 text-gray-900 px-2 py-1 rounded"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("确定删除吗？")) deleteItem(item.id);
                        }}
                        className="text-sm bg-red-50 text-red-500 px-2 py-1 rounded"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

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
