"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "收藏", icon: BookmarkIcon },
  { href: "/todos", label: "待办", icon: TodoIcon },
  { href: "/my", label: "我的", icon: UserIcon },
];

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 ${active ? "text-[var(--foreground)]" : "theme-text-subtle"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 3.75h10A1.5 1.5 0 0 1 18.5 5.25v15l-6.5-4-6.5 4v-15A1.5 1.5 0 0 1 7 3.75Z" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 ${active ? "text-[var(--foreground)]" : "theme-text-subtle"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function TodoIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 ${active ? "text-[var(--foreground)]" : "theme-text-subtle"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3.75h6a.75.75 0 0 1 .75.75v.75h1.5A2.25 2.25 0 0 1 19.5 7.5v11.25A2.25 2.25 0 0 1 17.25 21H6.75A2.25 2.25 0 0 1 4.5 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h1.5V4.5A.75.75 0 0 1 9 3.75Z" />
      <path d="m8.5 12.5 2 2 4-4" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t theme-border bg-[var(--surface-overlay)] backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2">
        {LINKS.map((link) => {
          const Icon = link.icon;
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-w-20 flex-col items-center gap-1 rounded-2xl px-4 py-1.5 text-xs transition-colors ${
                active
                  ? "text-[var(--foreground)]"
                  : "theme-text-muted hover:text-[var(--foreground)]"
              }`}
            >
              <Icon active={active} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
