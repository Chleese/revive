"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PullToRefreshState = {
  pullDistance: number;
  isRefreshing: boolean;
};

export function usePullToRefresh(threshold = 60) {
  const [state, setState] = useState<PullToRefreshState>({
    pullDistance: 0,
    isRefreshing: false,
  });
  const startY = useRef(0);
  const isActive = useRef(false);

  const handleTouchStart = useCallback(() => {
    const scrollTop =
      window.scrollY ?? document.documentElement.scrollTop ?? 0;
    if (scrollTop <= 0) {
      isActive.current = true;
      startY.current = 0;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isActive.current || state.isRefreshing) return;

      const touch = e.touches[0];
      if (!touch) return;

      if (startY.current === 0) {
        startY.current = touch.clientY;
        return;
      }

      const distance = touch.clientY - startY.current;
      if (distance <= 0) {
        setState({ pullDistance: 0, isRefreshing: false });
        isActive.current = false;
        return;
      }

      const pullDistance = Math.min(distance * 0.5, threshold * 1.5);
      setState({ pullDistance, isRefreshing: false });
    },
    [state.isRefreshing, threshold],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isActive.current || state.isRefreshing) return;

    if (state.pullDistance >= threshold) {
      setState({ pullDistance: threshold, isRefreshing: true });
      setTimeout(() => window.location.reload(), 300);
    } else {
      setState({ pullDistance: 0, isRefreshing: false });
    }
    isActive.current = false;
  }, [state.isRefreshing, state.pullDistance, threshold]);

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return state;
}
