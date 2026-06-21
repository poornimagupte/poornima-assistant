import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Staff, StaffBalance } from "@/lib/types";
import { Sidebar } from "@/components/sidebar";
import { HouseholdRoster } from "@/components/household-roster";

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).single();

  const { data: staff } = await supabase
    .from("staff").select("*").is("deleted_at", null).order("name");

  const { data: balances } = await supabase.from("staff_balances").select("*");

  const balanceMap = new Map(
    (balances as StaffBalance[] ?? []).map((b) => [b.staff_id, b])
  );

  const staffWithBalances = (staff as Staff[] ?? []).map((s) => ({
    ...s,
    advance_outstanding: balanceMap.get(s.id)?.advance_outstanding ?? 0,
    last_salary_date: balanceMap.get(s.id)?.last_salary_date ?? null,
  }));

  return (
    <div className="min-h-screen flex">
      <Sidebar name={profile?.display_name ?? user.email ?? "you"} />
      <main className="flex-1 px-6 py-8 md:px-10 max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-medium">Staff</h1>
          <p className="mt-1 text-sm text-muted">
            Roster, salaries, advances, and attendance.
          </p>
        </header>
        <HouseholdRoster staff={staffWithBalances} />
      </main>
    </div>
  );
}
