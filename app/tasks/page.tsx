import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TaskWithReminders, Project } from "@/lib/types";
import { Sidebar } from "@/components/sidebar";
import { TaskManager } from "@/components/task-manager";

export default async function TasksPage() {
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

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "*, reminders(id, task_id, offset_minutes, remind_at, channel, status)"
    )
    .eq("status", "open")
    .is("deleted_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  // Last 30 completed tasks (most recent first).
  const { data: completed } = await supabase
    .from("tasks")
    .select(
      "*, reminders(id, task_id, offset_minutes, remind_at, channel, status)"
    )
    .eq("status", "done")
    .is("deleted_at", null)
    .order("completed_at", { ascending: false })
    .limit(30);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, color, status")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="min-h-screen flex">
      <Sidebar name={profile?.display_name ?? user.email ?? "you"} />
      <main className="flex-1 px-6 py-8 md:px-10 max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-medium">Tasks</h1>
          <p className="mt-1 text-sm text-muted">
            Everything open, grouped by when it&apos;s due.
          </p>
        </header>
        <TaskManager
          tasks={(tasks as TaskWithReminders[]) ?? []}
          completed={(completed as TaskWithReminders[]) ?? []}
          projects={(projects as Project[]) ?? []}
        />
      </main>
    </div>
  );
}
