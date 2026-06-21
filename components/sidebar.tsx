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
  LogOut,
} from "lucide-react";

const NAV = [
  { label: "Today",     icon: LayoutGrid,       href: "/dashboard", ready: true },
  { label: "Tasks",     icon: CheckSquare,      href: "/tasks",     ready: true },
  { label: "Plan",      icon: CalendarRange,    href: "/plan",      ready: true },
  { label: "Meals",     icon: UtensilsCrossed,  href: "/meals",     ready: true },
  { label: "Staff",     icon: Home,             href: "/staff",     ready: true },
  { label: "Writing",   icon: PenLine,          href: "/writing",   ready: true },
  { label: "Reading",   icon: BookOpen,         href: "#",          ready: false },
  { label: "Crochet",   icon: Scissors,         href: "/crochet",   ready: true },
];


export function Sidebar({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col justify-between border-r border-border px-4 py-6">
      <div>
        <div className="px-2 mb-6 text-sm font-medium tracking-tight">
          Poornima's Assistant
        </div>
        <nav className="space-y-0.5">
          {NAV.map(({ label, icon: Icon, href, ready }) => {
            const active = ready && pathname === href;
            return (
              <a
                key={label}
                href={href}
                aria-disabled={!ready}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  active
                    ? "bg-surface-2 text-text font-medium"
                    : ready
                      ? "text-muted hover:bg-surface-2"
                      : "text-faint cursor-default"
                }`}
              >
                <Icon size={16} strokeWidth={1.75} />
                {label}
              </a>
            );
          })}
        </nav>
      </div>

      <form action="/auth/signout" method="post" className="px-1">
        <p className="px-1.5 mb-2 text-xs text-faint truncate">{name}</p>
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-surface-2 transition-colors"
        >
          <LogOut size={16} strokeWidth={1.75} />
          Sign out
        </button>
      </form>
    </aside>
  );
}
