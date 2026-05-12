"use client";

import { useState, type ClipboardEvent, type RefObject } from "react";

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
  const [isInputFocused, setIsInputFocused] = useState(false);
  const shouldShowClearAction = isInputFocused && Boolean(input);

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData.getData("text");
    if (pastedText) {
      onInputPaste(pastedText);
    }
  };

  return (
    <div className='mb-4'>
      <div className='flex gap-2'>
        <div className='group relative flex-1'>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onPaste={handlePaste}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder='当前版本仅支持链接收藏'
            className={`theme-input w-full rounded-lg border py-2 pl-3 text-sm ${
              shouldShowClearAction ? "pr-24" : "pr-16"
            }`}
          />
          <div className='absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5'>
            {input && (
              <button
                type='button'
                onClick={onClear}
                onMouseDown={(event) => event.preventDefault()}
                aria-label='清空输入内容'
                className={`theme-text-subtle flex h-7 w-7 items-center justify-center rounded-full transition-all hover:opacity-75 ${
                  shouldShowClearAction
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0"
                }`}>
                ✕
              </button>
            )}
            <button
              type='button'
              onClick={onPaste}
              className='theme-secondary-button rounded-full px-2.5 py-1 text-xs font-medium transition-colors'>
              粘贴
            </button>
          </div>
        </div>
        <button
          type='button'
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
