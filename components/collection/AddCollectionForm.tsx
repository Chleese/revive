"use client";

import type { ClipboardEvent, RefObject } from "react";

type AddCollectionFormProps = {
  input: string;
  submitting: boolean;
  clipboardSupported: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onInputChange: (value: string) => void;
  onInputPaste: (value: string) => void;
  onClear: () => void;
  onPaste: () => void;
  onSubmit: () => void;
};

export function AddCollectionForm({
  input,
  submitting,
  clipboardSupported,
  inputRef,
  onInputChange,
  onInputPaste,
  onClear,
  onPaste,
  onSubmit,
}: AddCollectionFormProps) {
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData.getData("text");
    if (pastedText) {
      onInputPaste(pastedText);
    }
  };

  return (
    <div className='mb-4'>
      <div className='flex gap-2'>
        <div className='relative flex-1'>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onPaste={handlePaste}
            placeholder='当前版本仅支持链接收藏'
            className='theme-input w-full rounded-lg border p-2 pr-8 text-sm'
          />
          {input && (
            <button
              onClick={onClear}
              className='theme-text-subtle absolute right-2 top-1/2 -translate-y-1/2 transition-colors hover:opacity-75'>
              ✕
            </button>
          )}
        </div>
        <button
          onClick={onPaste}
          className='theme-secondary-button rounded-lg px-3 transition-colors'>
          粘贴
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className='theme-primary-button rounded-lg px-4 transition-opacity disabled:opacity-50'>
          {submitting ? "添加中..." : "添加"}
        </button>
      </div>
      {!clipboardSupported && (
        <p className='theme-text-muted mt-2 text-xs'>
          当前地址不支持直接读取系统剪贴板，请长按输入框手动粘贴链接或直接点击粘贴按钮。
        </p>
      )}
    </div>
  );
}
