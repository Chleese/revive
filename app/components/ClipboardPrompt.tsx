import { Platform, getPlatformName } from "../utils/platform";

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-lg font-bold mb-2">检测到链接</h3>
        <p className="text-gray-600 mb-1">来源: {getPlatformName(platform)}</p>
        <p className="text-xs text-gray-400 mb-4 truncate">{url}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-gray-300 rounded-lg font-medium"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-black text-white rounded-lg font-medium"
          >
            添加收藏
          </button>
        </div>
      </div>
    </div>
  );
}
