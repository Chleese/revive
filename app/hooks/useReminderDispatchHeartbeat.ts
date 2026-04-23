"use client";

import { useEffect, useRef } from "react";
import { reminderService } from "@/lib/services/reminders";

export function useReminderDispatchHeartbeat(enabled: boolean) {
  const runningRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const run = async () => {
      if (runningRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      runningRef.current = true;
      try {
        await reminderService.runDue();
      } catch (error) {
        console.error("Failed to run due reminders:", error);
      } finally {
        runningRef.current = false;
      }
    };

    if (!mountedRef.current) {
      mountedRef.current = true;
      void run();
    }

    const intervalId = window.setInterval(() => {
      void run();
    }, 60_000);

    const handleFocus = () => {
      void run();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void run();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      runningRef.current = false;
      mountedRef.current = false;
    };
  }, [enabled]);
}
