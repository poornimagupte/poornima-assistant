import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Staff, StaffTransaction, StaffBalance, StaffAbsence } from "@/lib/types";
import { Sidebar } from "@/components/sidebar";
import { StaffDetail } from "@/components/staff-detail";

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).single();

  const { data: staff } = await supabase
    .from("staff").select("*").eq("id", id).single();
  if (!staff) notFound();

  const { data: transactions } = await supabase
    .from("staff_transactions")
    .select("*").eq("staff_id", id)
    .order("date", { ascending: false }).limit(50);

  const { data: balance } = await supabase
    .from("staff_balances").select("*").eq("staff_id", id).single();

  const { data: absences } = await supabase
    .from("staff_absences").select("*").eq("staff_id", id)
    .order("date", { ascending: false });

  return (
    <div className="min-h-screen flex">
      <Sidebar name={profile?.display_name ?? user.email ?? "you"} />
      <main className="flex-1 px-6 py-8 md:px-10 max-w-4xl">
        <StaffDetail
          staff={staff as Staff}
          transactions={(transactions as StaffTransaction[]) ?? []}
          balance={balance as StaffBalance ?? null}
          absences={(absences as StaffAbsence[]) ?? []}
        />
      </main>
    </div>
  );
}
