import { Platform, getPlatformName } from "../utils/platform";
import { AppDialog } from "@/components/ui/AppDialog";

interface ClipboardPromptProps {
  url: string;
  platform: Platform;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 剪贴板检测到链接时的确认弹窗
 */
export function ClipboardPrompt({
  url,
  platform,
  onConfirm,
  onCancel,
}: ClipboardPromptProps) {
  return (
    <AppDialog
      title="检测到剪贴板链接"
      description="要把这条内容直接加入 Revive 吗？"
      confirmText="添加收藏"
      cancelText="稍后再说"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className="rounded-2xl bg-stone-50 px-4 py-3 text-left">
        <p className="mb-1 text-xs uppercase tracking-[0.28em] text-stone-400">
          {getPlatformName(platform)}
        </p>
        <p className="truncate text-sm text-stone-600">{url}</p>
      </div>
    </AppDialog>
  );
}
