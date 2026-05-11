"use client";

import { useEffect, type ReactNode } from "react";

type AppDialogProps = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
  cornerStyle?: "soft" | "tight";
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export function AppDialog({
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  tone = "default",
  cornerStyle = "soft",
  onConfirm,
  onCancel,
  children,
}: AppDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const confirmClassName = tone === "danger"
    ? "bg-red-500 text-white hover:bg-red-600"
    : "theme-primary-button";
  const panelRadiusClassName = cornerStyle === "tight" ? "rounded-[18px]" : "rounded-[28px]";
  const buttonRadiusClassName = cornerStyle === "tight" ? "rounded-xl" : "rounded-2xl";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur-[3px]">
      <div
        role="dialog"
        aria-modal="true"
        className={`theme-panel theme-border w-full max-w-sm border p-6 ${panelRadiusClassName}`}
      >
        <div className="mb-5">
          <h3 className="text-lg font-semibold tracking-[0.02em] text-[var(--foreground)]">
            {title}
          </h3>
          {description && (
            <p className="theme-text-muted mt-2 text-sm leading-6">
              {description}
            </p>
          )}
        </div>

        {children && (
          <div className="mb-5">
            {children}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={`theme-secondary-button theme-border flex-1 border px-4 py-2.5 text-sm font-medium transition-colors ${buttonRadiusClassName}`}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${buttonRadiusClassName} ${confirmClassName}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
