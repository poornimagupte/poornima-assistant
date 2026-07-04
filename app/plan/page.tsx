import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/types";
import { AppShell } from "@/components/app-shell";
import { Planner } from "@/components/planner";

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  // Small personal task counts -> fetch all open tasks and let the planner
  // filter by day on the client (avoids server-vs-user timezone mismatches).
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "open")
    .is("deleted_at", null)
    .order("due_at", { ascending: true, nullsFirst: false });

  return (
    <AppShell name={profile?.display_name ?? user.email ?? "you"} maxWidth="max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-medium">Plan</h1>
          <p className="mt-1 text-sm text-muted">
            Drag tasks onto the day to block time for them.
          </p>
        </header>
        <Planner tasks={(tasks as Task[]) ?? []} />
      </AppShell>
  );
}
