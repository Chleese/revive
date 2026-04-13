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
            placeholder='粘贴链接...'
            className='w-full p-2 pr-8 border rounded-lg text-gray-900 placeholder:text-gray-400'
          />
          {input && (
            <button
              onClick={onClear}
              className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'>
              ✕
            </button>
          )}
        </div>
        <button
          onClick={onPaste}
          className='bg-gray-100 text-gray-900 px-3 rounded-lg'>
          粘贴
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className='bg-black text-white px-4 rounded-lg disabled:opacity-50'>
          {submitting ? "添加中..." : "添加"}
        </button>
      </div>
      {!clipboardSupported && (
        <p className='mt-2 text-xs text-gray-500'>
          当前地址不支持直接读取系统剪贴板，请长按输入框手动粘贴链接。
        </p>
      )}
    </div>
  );
}
