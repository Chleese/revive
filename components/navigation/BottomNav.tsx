"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "首页", icon: HomeIcon },
  { href: "/my", label: "我的", icon: UserIcon },
];

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 ${active ? "text-stone-900" : "text-stone-400"}`}
      fill="currentColor"
    >
      <path d="M12 3.8a1 1 0 0 1 .6.2l7.75 5.94a1 1 0 0 1-.6 1.8H19v7.15a1.6 1.6 0 0 1-1.6 1.6H14.3a.8.8 0 0 1-.8-.8v-4.05a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0-.5.5v4.05a.8.8 0 0 1-.8.8H6.6A1.6 1.6 0 0 1 5 18.9v-7.15h-.75a1 1 0 0 1-.6-1.8L11.4 4a1 1 0 0 1 .6-.2Z" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 ${active ? "text-stone-900" : "text-stone-400"}`}
      fill="currentColor"
    >
      <path d="M12 3.75a4.25 4.25 0 1 1 0 8.5 4.25 4.25 0 0 1 0-8.5Zm0 10.5c4.07 0 7.55 2.34 9 5.75a.75.75 0 0 1-.69 1.05H3.69A.75.75 0 0 1 3 20c1.45-3.4 4.93-5.75 9-5.75Z" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur">
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
                  ? "bg-stone-100 text-stone-900"
                  : "text-stone-500 hover:text-stone-900"
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
