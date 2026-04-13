import { ReviveLoading } from "@/components/ui/ReviveLoading";

export default function Loading() {
  return (
    <ReviveLoading
      fullscreen
      label="Revive 正在唤醒页面"
      detail="内容和状态正在就位。"
    />
  );
}
