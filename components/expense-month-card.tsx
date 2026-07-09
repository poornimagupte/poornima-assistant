import { IndianRupee } from "lucide-react";
import type { Expense } from "@/lib/types";
import { CATEGORY_LABELS, fmtINR } from "@/lib/expense-categories";

// Dashboard glance: this month's spend. Hidden until something is logged.
export function ExpenseMonthCard({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) return null;

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
  }
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <section className="card p-4 md:p-5">
      <div className="mb-2 flex items-center gap-2">
        <IndianRupee size={17} strokeWidth={1.75} className="text-muted" />
        <h2 className="text-base font-medium">Spent This Month</h2>
      </div>
      <a href="/expenses" className="block rounded-lg -mx-2 px-2 py-1 hover:bg-surface-2 transition-colors">
        <p className="text-2xl font-semibold">{fmtINR(total)}</p>
        {top && (
          <p className="mt-0.5 text-xs text-muted">
            most on {CATEGORY_LABELS[top[0] as keyof typeof CATEGORY_LABELS].toLowerCase()} ({fmtINR(top[1])})
          </p>
        )}
      </a>
    </section>
  );
}
