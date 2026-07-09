import { TrendingUp } from "lucide-react";
import type { Expense, ExpenseCategory } from "@/lib/types";
import { CATEGORY_LABELS, fmtINR } from "@/lib/expense-categories";

// Pure presentational analytics for one month + a 6-month trend.
// `monthExpenses` = the viewed month; `recentExpenses` = last 6 months.
export function ExpenseAnalytics({
  month,
  monthExpenses,
  recentExpenses,
}: {
  month: string; // YYYY-MM
  monthExpenses: Expense[];
  recentExpenses: Expense[];
}) {
  const total = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // Category breakdown, largest first
  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of monthExpenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const maxCat = categories[0]?.[1] ?? 0;

  // 6-month trend (including viewed month)
  const trendMap = new Map<string, number>();
  const base = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    trendMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  for (const e of recentExpenses) {
    const key = e.date.slice(0, 7);
    if (trendMap.has(key)) trendMap.set(key, trendMap.get(key)! + Number(e.amount));
  }
  const trend = [...trendMap.entries()];
  const maxTrend = Math.max(...trend.map(([, v]) => v), 1);

  // Previous-month comparison
  const prevKey = trend[trend.length - 2]?.[0];
  const prevTotal = prevKey ? trendMap.get(prevKey)! : 0;
  const delta = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

  if (monthExpenses.length === 0 && recentExpenses.length === 0) return null;

  return (
    <section className="card p-4 md:p-5 mb-5">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp size={17} strokeWidth={1.75} className="text-muted" />
        <h2 className="text-base font-medium">This Month</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        {/* Left: total + category bars */}
        <div>
          <p className="text-3xl font-semibold">{fmtINR(total)}</p>
          {delta !== null && (
            <p className={`mt-0.5 text-xs ${delta > 0 ? "text-amber-600" : "text-accent"}`}>
              {delta > 0 ? "+" : ""}{delta}% vs last month ({fmtINR(prevTotal)})
            </p>
          )}

          {categories.length > 0 && (
            <div className="mt-4 space-y-2">
              {categories.map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-xs text-muted">{CATEGORY_LABELS[cat]}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(amt / maxCat) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs font-medium">{fmtINR(amt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: 6-month trend */}
        <div className="flex flex-col">
          <p className="mb-2 text-xs text-faint">Last 6 months</p>
          <div className="flex flex-1 items-end gap-2" style={{ minHeight: "110px" }}>
            {trend.map(([key, value]) => {
              const isCurrent = key === month;
              return (
                <div key={key} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-faint">
                    {value > 0 ? fmtINR(value).replace("₹", "₹") : ""}
                  </span>
                  <div
                    className={`w-full rounded-t ${isCurrent ? "bg-accent" : "bg-surface-2 border border-border"}`}
                    style={{ height: `${Math.max((value / maxTrend) * 80, value > 0 ? 4 : 2)}px` }}
                  />
                  <span className={`text-[10px] ${isCurrent ? "text-text font-medium" : "text-faint"}`}>
                    {new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(key + "-01"))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
