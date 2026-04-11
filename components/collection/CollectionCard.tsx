"use client";

import { useRef, useState } from "react";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { getPlatformName } from "@/lib/platform";
import type { CollectionItemView } from "@/lib/collections/types";

type CollectionCardProps = {
  item: CollectionItemView;
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string, newTitle: string) => void;
  onCancelEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function CollectionCard({
  item,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: CollectionCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const imageSrc =
    item.image && /^https?:\/\//i.test(item.image)
      ? `/api/image?url=${encodeURIComponent(item.image)}`
      : item.image;
  const shouldShowImage = Boolean(imageSrc) && imageSrc !== failedImageSrc;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {shouldShowImage && imageSrc && (
        <div className="relative aspect-video w-full bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={item.title}
            className="object-cover w-full h-full"
            onError={() => setFailedImageSrc(imageSrc)}
          />
        </div>
      )}

      <div className="p-3">
        {item.isEditing ? (
          <div className="mb-2">
            <input
              ref={inputRef}
              type="text"
              defaultValue={item.title}
              className="w-full p-2 border rounded-lg text-gray-900 text-sm"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onSaveEdit(item.id, inputRef.current?.value ?? item.title)}
                className="text-sm bg-black text-white px-3 py-1 rounded"
              >
                保存
              </button>
              <button
                onClick={() => onCancelEdit(item.id)}
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
                  onClick={() => onStartEdit(item.id)}
                  className="text-sm bg-gray-100 text-gray-900 px-2 py-1 rounded"
                >
                  编辑
                </button>
                <button
                  onClick={() => onDelete(item.id)}
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
  );
}
