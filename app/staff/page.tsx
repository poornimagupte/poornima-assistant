import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Staff, StaffBalance, StaffTransaction } from "@/lib/types";
import { AppShell } from "@/components/app-shell";
import { HouseholdRoster } from "@/components/household-roster";
import { SpendSummary } from "@/components/spend-summary";

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).single();

  const { data: staff } = await supabase
    .from("staff").select("*").is("deleted_at", null).order("name");

  const { data: balances } = await supabase.from("staff_balances").select("*");

  // Transactions from the last 3 calendar months for the spend summary.
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    .toISOString().slice(0, 10);
  const { data: recentTx } = await supabase
    .from("staff_transactions")
    .select("*")
    .gte("date", threeMonthsAgo)
    .order("date", { ascending: false });

  const balanceMap = new Map(
    (balances as StaffBalance[] ?? []).map((b) => [b.staff_id, b])
  );

  const staffWithBalances = (staff as Staff[] ?? []).map((s) => ({
    ...s,
    advance_outstanding: balanceMap.get(s.id)?.advance_outstanding ?? 0,
    last_salary_date: balanceMap.get(s.id)?.last_salary_date ?? null,
  }));

  return (
    <AppShell name={profile?.display_name ?? user.email ?? "you"}>
        <header className="mb-6">
          <h1 className="text-2xl font-medium">Staff</h1>
          <p className="mt-1 text-sm text-muted">
            Roster, salaries, advances, and attendance.
          </p>
        </header>
        <SpendSummary transactions={(recentTx as StaffTransaction[]) ?? []} />
        <HouseholdRoster staff={staffWithBalances} />
      </AppShell>
  );
}
