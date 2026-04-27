"use client";

import { useEffect, useRef, useState } from "react";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { getPlatformName } from "@/lib/platform";
import type { CollectionItemView } from "@/lib/collections/types";
import { formatReminderSummary } from "@/lib/reminders/display";

type CollectionCardProps = {
  item: CollectionItemView;
  layout?: "grid" | "list";
  itemIndex?: number;
  totalItems?: number;
  onOpen: (id: string, url: string) => void;
  onRequestReminder: (id: string) => void;
  onEditCategory: (id: string) => void;
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string, newTitle: string) => void;
  onCancelEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function CollectionCard({
  item,
  layout = "grid",
  itemIndex = 0,
  totalItems = 0,
  onOpen,
  onRequestReminder,
  onEditCategory,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: CollectionCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const categoryLabel = item.categoryName ?? "未分类";
  const reminderLabel = item.reminder
    ? formatReminderSummary(item.reminder)
    : null;
  const isGrid = layout === "grid";
  const shouldOpenMenuLeft = totalItems - itemIndex <= 2;
  const imageSrc =
    item.image && /^https?:\/\//i.test(item.image)
      ? `/api/image?url=${encodeURIComponent(item.image)}&source=${encodeURIComponent(item.url)}`
      : item.image;
  const shouldShowImage = Boolean(imageSrc) && imageSrc !== failedImageSrc;

  const handleImageLoad = (
    event: React.SyntheticEvent<HTMLImageElement>
  ) => {
    if (item.platform !== "wechat" || !imageSrc) return;

    const { naturalWidth, naturalHeight } = event.currentTarget;
    const looksLikeBlockedWechatImage =
      naturalWidth <= 160 &&
      naturalHeight <= 160 &&
      Math.abs(naturalWidth - naturalHeight) <= 4;

    if (looksLikeBlockedWechatImage) {
      setFailedImageSrc(imageSrc);
    }
  };

  const handleOpen = () => {
    if (item.isEditing) return;
    onOpen(item.id, item.url);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  return (
    <div
      role={item.isEditing ? undefined : "link"}
      tabIndex={item.isEditing ? -1 : 0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (item.isEditing) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpen();
        }
      }}
      className={`bg-white ${isGrid ? "rounded-lg" : "rounded-xl"} shadow-sm overflow-visible transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-black/15 cursor-pointer`}>
      {shouldShowImage && imageSrc && (
        <div className={`relative w-full overflow-hidden bg-gray-100 ${isGrid ? "aspect-4/3 rounded-t-lg" : "aspect-video rounded-t-xl"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={item.title}
            className='object-cover w-full h-full'
            onLoad={handleImageLoad}
            onError={() => setFailedImageSrc(imageSrc)}
          />
        </div>
      )}

      <div className={isGrid ? "p-2.5" : "p-3"}>
        {item.isEditing ? (
          <div className='mb-2' onClick={(event) => event.stopPropagation()}>
            <input
              ref={inputRef}
              type='text'
              defaultValue={item.title}
              className='w-full p-2 border rounded-lg text-gray-900 text-sm'
              autoFocus
            />
            <div className='flex gap-2 mt-2'>
              <button
                onClick={() =>
                  onSaveEdit(item.id, inputRef.current?.value ?? item.title)
                }
                className='text-sm bg-black text-white px-3 py-1 rounded'>
                保存
              </button>
              <button
                onClick={() => onCancelEdit(item.id)}
                className='text-sm bg-gray-200 text-gray-900 px-3 py-1 rounded'>
                取消
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={`font-medium text-gray-900 line-clamp-2 ${isGrid ? "mb-1 text-sm" : "mb-1"}`}>
              {item.title}
            </div>
            <div className={`text-xs text-gray-700 flex items-center justify-between ${isGrid ? "mb-1" : "mb-2"}`}>
              <span className="flex items-center gap-2">
                <PlatformIcon platform={item.platform} size={16} />
                {getPlatformName(item.platform)}
                {item.needsEdit && (
                  <span className='bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs'>
                    标题待编辑
                  </span>
                )}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${
                  item.categoryName
                    ? "bg-gray-100 text-gray-700"
                    : "bg-stone-100 text-stone-500"
                }`}>
                {categoryLabel}
              </span>
            </div>
            {reminderLabel && (
              <div className={`text-xs text-stone-500 ${isGrid ? "mb-1" : "mb-2"}`}>{reminderLabel}</div>
            )}

            <div className='flex justify-end items-center'>
              <div
                ref={menuRef}
                className='relative'
                onClick={(event) => event.stopPropagation()}>
                <button
                  type='button'
                  onClick={() => setMenuOpen((current) => !current)}
                  aria-label='更多操作'
                  className='text-sm bg-gray-100 text-gray-900 px-3 py-1 rounded'>
                  更多
                </button>
                {menuOpen && (
                  <div
                    className={`absolute z-10 min-w-36 rounded-xl border border-gray-100 bg-white p-1 shadow-lg ${
                      shouldOpenMenuLeft
                        ? "right-full bottom-0 mr-2"
                        : "right-0 top-10"
                    }`}
                  >
                    <button
                      type='button'
                      onClick={() => {
                        setMenuOpen(false);
                        onRequestReminder(item.id);
                      }}
                      className='block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50'>
                      {item.reminder ? "修改提醒" : "设置提醒"}
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setMenuOpen(false);
                        onEditCategory(item.id);
                      }}
                      className='block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50'>
                      {item.categoryName ? "编辑分类" : "设置分类"}
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setMenuOpen(false);
                        onStartEdit(item.id);
                      }}
                      className='block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50'>
                      编辑标题
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(item.id);
                      }}
                      className='block w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50'>
                      删除
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
