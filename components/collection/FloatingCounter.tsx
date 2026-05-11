"use client";

type FloatingCounterProps = {
  current: number;
  total: number;
};

export function FloatingCounter({
  current,
  total,
}: FloatingCounterProps) {
  return (
    <div className="theme-floating fixed bottom-20 right-4 z-30 rounded-full border px-3 py-2 text-xs font-medium backdrop-blur-xl">
      <div
        key={`${current}-${total}`}
        className="floating-counter-value min-w-[46px] text-center tracking-[0.02em]"
      >
        {current} / {total}
      </div>
    </div>
  );
}
