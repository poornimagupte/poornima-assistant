import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Expense } from "@/lib/types";
import { AppShell } from "@/components/app-shell";
import { ExpenseTracker } from "@/components/expense-tracker";
import { ExpenseAnalytics } from "@/components/expense-analytics";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).single();

  // Viewed month (YYYY-MM), defaulting to the current one.
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
    ? monthParam!
    : new Date().toISOString().slice(0, 7);

  const monthStart = `${month}-01`;
  const next = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1);
  const nextStart = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;

  // Six months back from the viewed month, for the trend.
  const trendFrom = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 6, 1);
  const trendStart = `${trendFrom.getFullYear()}-${String(trendFrom.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: recent } = await supabase
    .from("expenses")
    .select("*")
    .is("deleted_at", null)
    .gte("date", trendStart)
    .lt("date", nextStart)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const recentExpenses = (recent as Expense[]) ?? [];
  const monthExpenses = recentExpenses.filter(
    (e) => e.date >= monthStart && e.date < nextStart
  );

  return (
    <AppShell name={profile?.display_name ?? user.email ?? "you"}>
      <header className="mb-6">
        <h1 className="text-2xl font-medium">Expenses</h1>
        <p className="mt-1 text-sm text-muted">
          Log it in three seconds. See where it goes.
        </p>
      </header>
      <ExpenseAnalytics
        month={month}
        monthExpenses={monthExpenses}
        recentExpenses={recentExpenses}
      />
      <ExpenseTracker expenses={monthExpenses} month={month} />
    </AppShell>
  );
}
