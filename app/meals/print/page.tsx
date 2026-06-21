import { createClient } from "@/lib/supabase/server";
import type { MealPlan } from "@/lib/types";

function getWeekDates(): { dates: Date[]; startLabel: string; endLabel: string } {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return { dates, startLabel: fmt(dates[0]), endLabel: fmt(dates[6]) };
}

export default async function MealsPrintPage() {
  const supabase = await createClient();
  const { dates, startLabel, endLabel } = getWeekDates();

  const startStr = dates[0].toISOString().slice(0, 10);
  const endStr = dates[6].toISOString().slice(0, 10);

  const { data: plans } = await supabase
    .from("meal_plans")
    .select("*")
    .gte("date", startStr)
    .lte("date", endStr)
    .order("date");

  const planMap = new Map((plans as MealPlan[] ?? []).map(p => [p.date, p]));

  return (
    <main className="max-w-3xl mx-auto px-6 py-8 print:px-0 print:py-2">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-medium">Weekly Menu</h1>
        <p className="mt-1 text-sm text-muted">{startLabel} – {endLabel}</p>
      </header>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-border bg-surface-2 px-3 py-2 text-left text-xs font-medium text-muted">Day</th>
            <th className="border border-border bg-surface-2 px-3 py-2 text-left text-xs font-medium text-muted">☀️ Breakfast</th>
            <th className="border border-border bg-surface-2 px-3 py-2 text-left text-xs font-medium text-muted">🍛 Lunch</th>
            <th className="border border-border bg-surface-2 px-3 py-2 text-left text-xs font-medium text-muted">🍵 Snacks</th>
            <th className="border border-border bg-surface-2 px-3 py-2 text-left text-xs font-medium text-muted">🌙 Dinner</th>
          </tr>
        </thead>
        <tbody>
          {dates.map(d => {
            const dateStr = d.toISOString().slice(0, 10);
            const plan = planMap.get(dateStr);
            const dayName = d.toLocaleDateString("en-IN", { weekday: "long" });
            const dateNum = d.getDate();
            return (
              <tr key={dateStr}>
                <td className="border border-border px-3 py-2.5 font-medium whitespace-nowrap">
                  {dayName}
                  <span className="ml-1 text-faint font-normal">{dateNum}</span>
                </td>
                <td className="border border-border px-3 py-2.5">{plan?.breakfast || "—"}</td>
                <td className="border border-border px-3 py-2.5">{plan?.lunch || "—"}</td>
                <td className="border border-border px-3 py-2.5">{plan?.snacks || "—"}</td>
                <td className="border border-border px-3 py-2.5">{plan?.dinner || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-6 flex justify-center print:hidden">
        <button
          onClick={() => { if (typeof window !== "undefined") window.print(); }}
          className="btn-primary px-6"
        >
          Print
        </button>
      </div>
    </main>
  );
}
