"use client";

import { useEffect, useState } from "react";

type ContentPreviewProps = {
  url: string;
  onClose: () => void;
};

export function ContentPreview({ url, onClose }: ContentPreviewProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [url]);

  useEffect(() => {
    if (loaded) return;

    const timer = setTimeout(() => {
      window.open(url, "_blank", "noopener,noreferrer");
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [url, loaded, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Top navigation bar */}
      <div className="flex h-12 shrink-0 items-center border-b border-stone-200 px-3">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回
        </button>
      </div>

      {/* iframe area */}
      <div className="relative flex-1">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" />
              <span className="text-xs text-stone-400">正在加载预览...</span>
            </div>
          </div>
        )}
        <iframe
          src={url}
          onLoad={() => setLoaded(true)}
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer"
          title="内容预览"
        />
      </div>
    </div>
  );
}
