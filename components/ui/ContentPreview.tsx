"use client";

import { useEffect, useState } from "react";

type ContentPreviewProps = {
  url: string;
  onClose: () => void;
};

export function ContentPreview({ url, onClose }: ContentPreviewProps) {
  const [loaded, setLoaded] = useState(false);

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
    <div className="theme-page fixed inset-0 z-50 flex flex-col">
      {/* Top navigation bar */}
      <div className="theme-border flex h-12 shrink-0 items-center border-b px-3">
        <button
          type="button"
          onClick={onClose}
          className="theme-secondary-button flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors"
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
          <div className="theme-page absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--foreground)]" />
              <span className="theme-text-subtle text-xs">正在加载预览...</span>
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
