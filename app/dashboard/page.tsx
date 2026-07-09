import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayRange } from "@/lib/date";
import type { Task, Capture, MealPlan, Staff, StaffTransaction, StashItem, Expense } from "@/lib/types";
import { StashResurfaceCard } from "@/components/stash-resurface-card";
import { ExpenseMonthCard } from "@/components/expense-month-card";
import { AppShell } from "@/components/app-shell";
import { QuickCapture } from "@/components/quick-capture";
import { CaptureList } from "@/components/capture-list";
import { TodayPanel } from "@/components/today-panel";
import { TodayMenuCard } from "@/components/today-menu-card";
import { PayRemindersCard } from "@/components/pay-reminders-card";
import { computePayReminders } from "@/lib/staff-pay";
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

  // Salary reminders: active staff with a pay day, minus anyone already
  // paid this month (salary tx anchored to the current month).
  const monthStart = new Date().toLocaleDateString("en-CA", { timeZone: tz }).slice(0, 7) + "-01";
  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .eq("status", "active")
    .not("pay_day", "is", null)
    .is("deleted_at", null);

  const { data: salaryTx } = await supabase
    .from("staff_transactions")
    .select("*")
    .eq("type", "salary")
    .or(`for_month.gte.${monthStart},and(for_month.is.null,date.gte.${monthStart})`);

  const payReminders = computePayReminders(
    (staff as Staff[]) ?? [],
    (salaryTx as StaffTransaction[]) ?? []
  );

  // This month's expenses for the glance card.
  const { data: monthExpenses } = await supabase
    .from("expenses")
    .select("*")
    .is("deleted_at", null)
    .gte("date", monthStart);

  // Random stash resurface: count, then fetch one at a random offset.
  const { count: stashCount } = await supabase
    .from("stash_items")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);

  let stashItem: StashItem | null = null;
  if (stashCount && stashCount > 0) {
    const offset = Math.floor(Math.random() * stashCount);
    const { data } = await supabase
      .from("stash_items")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset);
    stashItem = (data?.[0] as StashItem) ?? null;
  }

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
    <AppShell name={user.email ?? profile?.display_name ?? "you"}>
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
            <PayRemindersCard reminders={payReminders} />
            <ExpenseMonthCard expenses={(monthExpenses as Expense[]) ?? []} />
            <CaptureList captures={(captures as Capture[]) ?? []} />
            <TodayMenuCard plan={(mealPlan as MealPlan) ?? null} />
            <StashResurfaceCard item={stashItem} />
          </div>
        </div>
    </AppShell>
  );
}
