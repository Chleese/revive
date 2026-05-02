"use client";

type OfflineNoticeProps = {
  message?: string;
};

export function OfflineNotice({
  message = "当前无网络连接，部分功能暂不可用。",
}: OfflineNoticeProps) {
  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
      {message}
    </div>
  );
}
