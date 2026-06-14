"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";

type AddTodoFormProps = {
  input: string;
  submitting: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onClear: () => void;
  onSubmit: () => void;
};

// 触屏检测：用 useSyncExternalStore 读取浏览器环境值，
// 既避免 setState-in-effect，也避免 SSR 水合不一致。
const COARSE_QUERY = "(pointer: coarse)";

function subscribeTouch(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(COARSE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getTouchSnapshot() {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.(COARSE_QUERY).matches
  );
}

function getServerTouchSnapshot() {
  return false;
}

export function AddTodoForm({
  input,
  submitting,
  inputRef,
  onInputChange,
  onClear,
  onSubmit,
}: AddTodoFormProps) {
  const isTouch = useSyncExternalStore(
    subscribeTouch,
    getTouchSnapshot,
    getServerTouchSnapshot,
  );

  // 自动撑高：根据内容行数调整高度，最多 6 行。
  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = "auto";
    const lineHeight = 24;
    const maxHeight = lineHeight * 6;
    node.style.height = `${Math.min(node.scrollHeight, maxHeight)}px`;
  }, [input, inputRef]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 触屏设备：让 Enter 走默认换行，不拦截
    if (isTouch) return;
    // 非触屏：Enter 提交，Shift+Enter 换行
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="mb-4">
      <div className="flex gap-2 items-start">
        <div className="group relative flex-1">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="记录一件事…"
            rows={1}
            className="theme-input w-full resize-none rounded-lg border py-2 pl-3 pr-9 text-sm leading-6"
          />
          {input && (
            <button
              type="button"
              onClick={onClear}
              aria-label="清空输入内容"
              className="theme-text-subtle absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full transition-opacity hover:opacity-75"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="theme-primary-button rounded-lg px-4 py-2 transition-opacity disabled:opacity-50"
        >
          {submitting ? "添加中..." : "添加"}
        </button>
      </div>
      {!isTouch && (
        <p className="theme-text-subtle mt-1.5 text-[11px]">
          Enter 添加 · Shift+Enter 换行
        </p>
      )}
    </div>
  );
}
