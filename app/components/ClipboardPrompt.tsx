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
      <div className="theme-panel-muted rounded-2xl px-4 py-3 text-left">
        <p className="theme-text-subtle mb-1 text-xs uppercase tracking-[0.28em]">
          {getPlatformName(platform)}
        </p>
        <p className="theme-text-muted truncate text-sm">{url}</p>
      </div>
    </AppDialog>
  );
}
