import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayRange } from "@/lib/date";
import type { Task, Capture, MealPlan } from "@/lib/types";
import { Sidebar } from "@/components/sidebar";
import { QuickCapture } from "@/components/quick-capture";
import { CaptureList } from "@/components/capture-list";
import { TodayPanel } from "@/components/today-panel";
import { TodayMenuCard } from "@/components/today-menu-card";
import { fetchTodayEvents } from "@/lib/google-calendar";

function greeting(tz: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone")
    .eq("id", user.id)
    .single();

  const tz = profile?.timezone ?? "Asia/Kolkata";
  const { startISO, endISO } = todayRange(tz);

  // Tasks due today OR scheduled (time-blocked) for today.
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "open")
    .is("deleted_at", null)
    .or(
      `and(due_at.gte.${startISO},due_at.lt.${endISO}),and(scheduled_at.gte.${startISO},scheduled_at.lt.${endISO})`
    )
    .order("due_at", { ascending: true, nullsFirst: false });

  const { data: captures } = await supabase
    .from("captures")
    .select("*")
    .eq("status", "inbox")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const calendarEvents = await fetchTodayEvents(
    supabase,
    user.id,
    startISO,
    endISO,
    tz
  );

  // Today's meal plan
  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
  const { data: mealPlan } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("date", todayDate)
    .single();

  const today = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="min-h-screen flex">
      <Sidebar
        name={profile?.display_name ?? user.email ?? "you"}
      />
      <main className="flex-1 px-6 py-8 md:px-10 max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-medium">
            {greeting(tz)}
            {profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted">{today}</p>
        </header>

        <QuickCapture />

        <div className="mt-6 grid gap-3 md:grid-cols-[1.5fr_1fr]">
          <TodayPanel tasks={(tasks as Task[]) ?? []} calendarEvents={calendarEvents} timeZone={tz} />
          <div className="space-y-3">
            <CaptureList captures={(captures as Capture[]) ?? []} />
            <TodayMenuCard plan={(mealPlan as MealPlan) ?? null} />
          </div>
        </div>
      </main>
    </div>
  );
}
