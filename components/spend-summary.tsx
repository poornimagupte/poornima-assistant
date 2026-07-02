import { TrendingUp } from "lucide-react";
import type { StaffTransaction, TxType } from "@/lib/types";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// Money leaving your pocket vs coming back.
const OUTFLOW: TxType[] = ["salary", "advance", "bonus", "reimbursement", "other"];
const INFLOW: TxType[] = ["repayment", "deduction"];

const TYPE_LABELS: Partial<Record<TxType, string>> = {
  salary: "Salaries",
  advance: "Advances",
  bonus: "Bonuses",
  reimbursement: "Reimbursements",
  repayment: "Repayments",
  deduction: "Deductions",
  other: "Other",
};

interface MonthSummary {
  key: string; // YYYY-MM
  label: string;
  net: number;
  byType: Partial<Record<TxType, number>>;
}

function summarise(transactions: StaffTransaction[]): MonthSummary[] {
  const months = new Map<string, MonthSummary>();

  for (const t of transactions) {
    const key = t.date.slice(0, 7);
    let m = months.get(key);
    if (!m) {
      m = {
        key,
        label: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" })
          .format(new Date(key + "-01")),
        net: 0,
        byType: {},
      };
      months.set(key, m);
    }
    const amount = Number(t.amount);
    m.byType[t.type] = (m.byType[t.type] ?? 0) + amount;
    if (OUTFLOW.includes(t.type)) m.net += amount;
    else if (INFLOW.includes(t.type)) m.net -= amount;
  }

  return [...months.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export function SpendSummary({ transactions }: { transactions: StaffTransaction[] }) {
  const months = summarise(transactions).slice(0, 3);
  if (months.length === 0) return null;

  const [current, ...previous] = months;

  return (
    <section className="card p-4 mb-4">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp size={16} strokeWidth={1.75} className="text-muted" />
        <h2 className="text-base font-medium">Monthly Spend</h2>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        {/* Current month, prominent */}
        <div>
          <p className="text-xs text-faint mb-0.5">{current.label}</p>
          <p className="text-2xl font-semibold">{fmt(current.net)}</p>
          <div className="mt-1.5 space-y-0.5">
            {(Object.entries(current.byType) as [TxType, number][]).map(([type, amt]) => (
              <p key={type} className="text-xs text-muted">
                {TYPE_LABELS[type] ?? type}:{" "}
                <span className={INFLOW.includes(type) ? "text-sky-600" : ""}>
                  {INFLOW.includes(type) ? "−" : ""}{fmt(amt)}
                </span>
              </p>
            ))}
          </div>
        </div>

        {/* Previous months, quiet */}
        {previous.length > 0 && (
          <div className="border-l border-border pl-6 space-y-2">
            {previous.map((m) => (
              <div key={m.key}>
                <p className="text-xs text-faint">{m.label}</p>
                <p className="text-sm font-medium text-muted">{fmt(m.net)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
