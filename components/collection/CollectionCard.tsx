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
  const titleMeasureHostRef = useRef<HTMLDivElement>(null);
  const titleMeasureRef = useRef<HTMLDivElement>(null);
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showInlineEditBadge, setShowInlineEditBadge] = useState(true);
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

  useEffect(() => {
    if (!item.needsEdit) return;

    const host = titleMeasureHostRef.current;
    const measure = titleMeasureRef.current;
    if (!host || !measure) return;

    const updateLayoutMode = () => {
      const lineHeight = Number.parseFloat(
        window.getComputedStyle(measure).lineHeight || "20",
      );
      const measuredHeight = measure.getBoundingClientRect().height;
      setShowInlineEditBadge(measuredHeight <= lineHeight * 2 + 1);
    };

    const frameId = window.requestAnimationFrame(() => {
      updateLayoutMode();
    });

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      updateLayoutMode();
    });

    observer.observe(host);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, [isGrid, item.needsEdit, item.title]);

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
      className={`theme-panel theme-border border ${isGrid ? "rounded-lg" : "rounded-xl"} overflow-visible cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-strong)]`}>
      {shouldShowImage && imageSrc && (
        <div className={`relative w-full overflow-hidden bg-[var(--surface-muted)] ${isGrid ? "aspect-4/3 rounded-t-lg" : "aspect-video rounded-t-xl"}`}>
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
              className='theme-input w-full rounded-lg border p-2 text-sm'
              autoFocus
            />
            <div className='flex gap-2 mt-2'>
              <button
                onClick={() =>
                  onSaveEdit(item.id, inputRef.current?.value ?? item.title)
                }
                className='theme-primary-button rounded px-3 py-1 text-sm transition-opacity'>
                保存
              </button>
              <button
                onClick={() => onCancelEdit(item.id)}
                className='theme-secondary-button rounded px-3 py-1 text-sm transition-colors'>
                取消
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              ref={titleMeasureHostRef}
              className={`relative text-[var(--foreground)] ${isGrid ? "mb-1 text-sm" : "mb-1"}`}
            >
              {item.needsEdit && (
                <div
                  ref={titleMeasureRef}
                  aria-hidden="true"
                  className="pointer-events-none invisible absolute inset-x-0 top-0 font-medium leading-5"
                >
                  <span>{item.title}</span>{" "}
                  <span className="theme-warning-badge inline-flex rounded-full px-2 py-0.5 text-[11px] leading-4 align-middle">
                    待编辑
                  </span>
                </div>
              )}

              {item.needsEdit ? (
                showInlineEditBadge ? (
                  <div className="line-clamp-2 font-medium leading-5">
                    <span>{item.title}</span>{" "}
                    <span className="theme-warning-badge inline-flex rounded-full px-2 py-0.5 text-[11px] leading-4 align-middle">
                      待编辑
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <div
                      className={`line-clamp-2 font-medium leading-5 ${isGrid ? "pr-12" : "pr-14"}`}
                    >
                      {item.title}
                    </div>
                    <span className="theme-warning-badge absolute bottom-0 right-0 inline-flex rounded-full px-2 py-0.5 text-[11px] leading-4">
                      待编辑
                    </span>
                  </div>
                )
              ) : (
                <div className="line-clamp-2 font-medium leading-5">
                  {item.title}
                </div>
              )}
            </div>
            <div className={`theme-text-muted flex items-center justify-between text-xs ${isGrid ? "mb-1" : "mb-2"}`}>
              <span className="flex items-center gap-2">
                <PlatformIcon platform={item.platform} size={16} />
                {getPlatformName(item.platform)}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${
                  item.categoryName
                    ? "theme-secondary-button"
                    : "theme-panel-muted"
                }`}>
                {categoryLabel}
              </span>
            </div>
            {reminderLabel && (
              <div className={`theme-text-muted text-xs ${isGrid ? "mb-1" : "mb-2"}`}>{reminderLabel}</div>
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
                  className='theme-secondary-button rounded px-3 py-1 text-sm transition-colors'>
                  更多
                </button>
                {menuOpen && (
                  <div
                    className={`theme-panel theme-border absolute z-10 min-w-36 rounded-xl border p-1 shadow-lg ${
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
                      className='block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]'>
                      {item.reminder ? "修改提醒" : "设置提醒"}
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setMenuOpen(false);
                        onEditCategory(item.id);
                      }}
                      className='block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]'>
                      {item.categoryName ? "编辑分类" : "设置分类"}
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setMenuOpen(false);
                        onStartEdit(item.id);
                      }}
                      className='block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]'>
                      编辑标题
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(item.id);
                      }}
                      className='theme-danger-soft block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors'>
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
