"use client";

import { useEffect } from "react";

type AppToastProps = {
  message: string;
  tone?: "info" | "error";
  onDismiss: () => void;
};

export function AppToast({
  message,
  tone = "info",
  onDismiss,
}: AppToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDismiss();
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  const toneClassName = tone === "error"
    ? "border-red-100 bg-red-50 text-red-700"
    : "border-stone-200 bg-white text-stone-700";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[86px] z-50 flex justify-center px-4">
      <div
        role="status"
        className={`pointer-events-auto inline-flex max-w-sm items-center gap-3 rounded-full border px-4 py-3 text-sm shadow-[0_20px_50px_rgba(15,23,42,0.12)] ${toneClassName}`}
      >
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current/70" />
        <span>{message}</span>
      </div>
    </div>
  );
}
