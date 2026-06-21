"use client";

import { useState } from "react";
import { CalendarRange, BookOpen } from "lucide-react";
import type { Recipe, MealPlan } from "@/lib/types";
import { MealPlanner } from "@/components/meal-planner";
import { RecipeLibrary } from "@/components/recipe-library";

type Tab = "planner" | "recipes";

export function MealsPageClient({
  recipes,
  plans,
}: {
  recipes: Recipe[];
  plans: MealPlan[];
}) {
  const [tab, setTab] = useState<Tab>("planner");

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-5 flex gap-1">
        <button
          onClick={() => setTab("planner")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
            tab === "planner" ? "bg-surface-2 font-medium text-text" : "text-muted hover:bg-surface-2"
          }`}
        >
          <CalendarRange size={15} strokeWidth={1.75} />
          Weekly Plan
        </button>
        <button
          onClick={() => setTab("recipes")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
            tab === "recipes" ? "bg-surface-2 font-medium text-text" : "text-muted hover:bg-surface-2"
          }`}
        >
          <BookOpen size={15} strokeWidth={1.75} />
          Dishes
          {recipes.length > 0 && (
            <span className="text-xs text-faint">{recipes.length}</span>
          )}
        </button>
      </div>

      {tab === "planner" ? (
        <MealPlanner plans={plans} recipes={recipes} />
      ) : (
        <RecipeLibrary recipes={recipes} />
      )}
    </div>
  );
}
