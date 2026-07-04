import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Recipe, MealPlan } from "@/lib/types";
import { AppShell } from "@/components/app-shell";
import { MealsPageClient } from "@/components/meals-page-client";

export default async function MealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).single();

  // Fetch recipes
  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  // Fetch meal plans for a 3-week window (last week + this week + next week)
  const today = new Date();
  const day = today.getDay();
  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(today.getDate() - ((day + 6) % 7));
  const mondayLastWeek = new Date(mondayThisWeek);
  mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);
  const sundayNextWeek = new Date(mondayThisWeek);
  sundayNextWeek.setDate(mondayThisWeek.getDate() + 20); // generous window

  const { data: plans } = await supabase
    .from("meal_plans")
    .select("*")
    .gte("date", mondayLastWeek.toISOString().slice(0, 10))
    .lte("date", sundayNextWeek.toISOString().slice(0, 10))
    .order("date");

  return (
    <AppShell name={profile?.display_name ?? user.email ?? "you"} maxWidth="">
        <header className="mb-6">
          <h1 className="text-2xl font-medium">Meals</h1>
          <p className="mt-1 text-sm text-muted">
            Plan the week, browse your dishes, and let AI help fill the gaps.
          </p>
        </header>
        <MealsPageClient
          recipes={(recipes as Recipe[]) ?? []}
          plans={(plans as MealPlan[]) ?? []}
        />
      </AppShell>
  );
}
