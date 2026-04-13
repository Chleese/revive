"use client";

type ReviveLoadingProps = {
  label?: string;
  detail?: string;
  fullscreen?: boolean;
  compact?: boolean;
};

const LETTERS = ["R", "E", "V", "I", "V", "E"];

export function ReviveLoading({
  label = "Revive 正在整理你的收藏",
  detail = "等一下，精彩内容正在浮现。",
  fullscreen = false,
  compact = false,
}: ReviveLoadingProps) {
  const shellClassName = fullscreen
    ? "min-h-screen bg-stone-950 px-6 py-10 text-stone-100"
    : "px-6 py-10 text-stone-900";

  const frameClassName = compact
    ? "mx-auto max-w-md"
    : "mx-auto flex min-h-full max-w-3xl items-center justify-center";

  return (
    <div className={shellClassName}>
      <div className={frameClassName}>
        <div className="revive-loader-minimal mx-auto flex w-full flex-col items-center gap-5 text-center">
          <div className="revive-loader-word" aria-hidden="true">
            {LETTERS.map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className="revive-loader-char"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {letter}
              </span>
            ))}
          </div>

          <div className="revive-loader-line">
            <span className="revive-loader-line-beam" />
          </div>

          <div className="space-y-1.5">
            <p className={`text-sm font-medium tracking-[0.14em] ${fullscreen ? "text-white/88" : "text-stone-700"}`}>
              {label}
            </p>
            <p className={`mx-auto max-w-md text-sm leading-6 ${fullscreen ? "text-white/45" : "text-stone-400"}`}>
              {detail}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
