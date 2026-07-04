import { CreditCard } from "lucide-react";
import type { PayReminder } from "@/lib/staff-pay";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function dueLabel(daysUntil: number): { text: string; overdue: boolean } {
  if (daysUntil < 0) return { text: `overdue by ${-daysUntil} day${daysUntil === -1 ? "" : "s"}`, overdue: true };
  if (daysUntil === 0) return { text: "due today", overdue: true };
  if (daysUntil === 1) return { text: "due tomorrow", overdue: false };
  return { text: `due in ${daysUntil} days`, overdue: false };
}

// Renders nothing when no salaries are coming up — the dashboard stays calm.
export function PayRemindersCard({ reminders }: { reminders: PayReminder[] }) {
  if (reminders.length === 0) return null;

  return (
    <section className="card p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2">
        <CreditCard size={18} strokeWidth={1.75} className="text-muted" />
        <h2 className="text-base font-medium">Salaries Due</h2>
      </div>

      <ul className="space-y-2">
        {reminders.map((r) => {
          const { text, overdue } = dueLabel(r.daysUntil);
          return (
            <li key={r.staffId}>
              <a
                href={`/staff/${r.staffId}`}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 hover:bg-surface-2 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{r.name}</p>
                  <p className={`text-xs ${overdue ? "text-amber-600 font-medium" : "text-muted"}`}>
                    {text}
                    {r.role && <span className="text-faint"> · {r.role}</span>}
                  </p>
                </div>
                {r.salary != null && (
                  <span className="shrink-0 text-sm font-medium">{fmt(r.salary)}</span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
