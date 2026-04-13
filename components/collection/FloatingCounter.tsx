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
    <div className="fixed bottom-20 right-4 z-30 rounded-full border border-white/45 bg-white/42 px-3 py-2 text-xs font-medium text-stone-900 shadow-[0_10px_28px_rgba(15,23,42,0.08)] ring-1 ring-stone-200/25 backdrop-blur-xl">
      <div
        key={`${current}-${total}`}
        className="floating-counter-value min-w-[46px] text-center tracking-[0.02em]"
      >
        {current} / {total}
      </div>
    </div>
  );
}
