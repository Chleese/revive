"use client";

type OfflineNoticeProps = {
  message?: string;
};

export function OfflineNotice({
  message = "当前无网络连接，部分功能暂不可用。",
}: OfflineNoticeProps) {
  return (
    <div className="theme-notice mb-4 rounded-2xl border px-4 py-3 text-sm shadow-sm">
      {message}
    </div>
  );
}
