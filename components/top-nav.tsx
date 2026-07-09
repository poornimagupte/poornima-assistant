"use client";

import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  CheckSquare,
  CalendarRange,
  UtensilsCrossed,
  PenLine,
  BookOpen,
  Scissors,
  Home,
  Archive,
  IndianRupee,
  LogOut,
} from "lucide-react";

const NAV = [
  { label: "Today",   icon: LayoutGrid,      href: "/dashboard", ready: true },
  { label: "Tasks",   icon: CheckSquare,     href: "/tasks",     ready: true },
  { label: "Plan",    icon: CalendarRange,   href: "/plan",      ready: true },
  { label: "Meals",   icon: UtensilsCrossed, href: "/meals",     ready: true },
  { label: "Staff",   icon: Home,            href: "/staff",     ready: true },
  { label: "Expenses", icon: IndianRupee,    href: "/expenses",  ready: true },
  { label: "Writing", icon: PenLine,         href: "/writing",   ready: true },
  { label: "Stash",   icon: Archive,         href: "/stash",     ready: true },
  { label: "Reading", icon: BookOpen,        href: "#",          ready: false },
  { label: "Crochet", icon: Scissors,        href: "/crochet",   ready: true },
];

// Top navigation chrome, per the Assistant Dashboard design:
// brand + account row, then a horizontal nav rail. The rail scrolls
// sideways on narrow screens so the phone finally gets navigation too.
export function TopNav({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-border shrink-0">
      <div className="flex items-center justify-between px-6 pt-3.5 pb-2.5 md:px-10">
        <div className="text-sm font-medium tracking-tight">Poornima's Assistant</div>
        <div className="flex items-center gap-2.5">
          <span className="hidden sm:inline text-xs text-faint truncate max-w-[200px]">{name}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted hover:bg-surface-2 transition-colors"
            >
              <LogOut size={14} strokeWidth={1.75} />
              Sign out
            </button>
          </form>
        </div>
      </div>
      <nav className="flex items-center gap-0.5 overflow-x-auto px-6 pb-2.5 md:px-10">
        {NAV.map(({ label, icon: Icon, href, ready }) => {
          const active = ready && pathname.startsWith(href);
          return (
            <a
              key={label}
              href={href}
              aria-disabled={!ready}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-surface-2 text-text font-medium"
                  : ready
                    ? "text-muted hover:bg-surface-2"
                    : "text-faint cursor-default"
              }`}
            >
              <Icon size={15} strokeWidth={1.75} />
              {label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}
