"use client";

import { useTheme } from "@/app/components/ThemeProvider";

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-secondary-button inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
      aria-label={isDark ? "切换到日间模式" : "切换到夜间模式"}
      title={isDark ? "切换到日间模式" : "切换到夜间模式"}
    >
      {isDark ? (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.2" />
          <path d="M12 19.3v2.2" />
          <path d="M4.93 4.93l1.56 1.56" />
          <path d="M17.51 17.51l1.56 1.56" />
          <path d="M2.5 12h2.2" />
          <path d="M19.3 12h2.2" />
          <path d="M4.93 19.07l1.56-1.56" />
          <path d="M17.51 6.49l1.56-1.56" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.8A8.8 8.8 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
      <span>{isDark ? "日间" : "夜间"}</span>
    </button>
  );
}
