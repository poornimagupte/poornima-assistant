import type { Staff, StaffTransaction } from "@/lib/types";

export interface PayReminder {
  staffId: string;
  name: string;
  role: string | null;
  salary: number | null;
  payDate: string; // ISO date of this month's pay day
  daysUntil: number; // negative = overdue
}

const pad = (n: number) => String(n).padStart(2, "0");

// This month's pay date for a staff member, clamping e.g. pay_day 31 in a
// 30-day month to the last day.
function payDateFor(year: number, month: number, payDay: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(payDay, lastDay));
}

// Reminders for active staff whose current-month salary hasn't been logged
// and whose pay day is within `windowDays` (or already overdue).
export function computePayReminders(
  staff: Staff[],
  salaryTx: StaffTransaction[],
  today: Date = new Date(),
  windowDays = 7
): PayReminder[] {
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthKey = `${year}-${pad(month + 1)}`;

  // Staff already paid this month: a salary tx whose for_month falls in this
  // month, or (no for_month) dated within this month.
  const paidIds = new Set(
    salaryTx
      .filter((t) => {
        const anchor = t.for_month ?? t.date;
        return anchor.slice(0, 7) === monthKey;
      })
      .map((t) => t.staff_id)
  );

  const startToday = new Date(year, month, today.getDate());

  return staff
    .filter((s) => s.status === "active" && s.pay_day && !paidIds.has(s.id))
    .map((s): PayReminder => {
      const due = payDateFor(year, month, s.pay_day!);
      const daysUntil = Math.round(
        (due.getTime() - startToday.getTime()) / 86_400_000
      );
      return {
        staffId: s.id,
        name: s.name,
        role: s.role,
        salary: s.monthly_salary,
        payDate: `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`,
        daysUntil,
      };
    })
    .filter((r) => r.daysUntil <= windowDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
