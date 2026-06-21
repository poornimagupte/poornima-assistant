"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, Leaf, Drumstick } from "lucide-react";
import type { Recipe, Cuisine, RecipeCategory, Effort, MealType } from "@/lib/types";
import { addRecipe, updateRecipe, deleteRecipe } from "@/app/actions";

// ─── constants ───────────────────────────────────────────────────────────────

const CUISINE_LABELS: Record<Cuisine, string> = {
  south_indian: "South Indian",
  north_indian: "North Indian",
  maharashtrian: "Maharashtrian",
  continental: "Continental",
  chinese_indian: "Indo-Chinese",
  other: "Other",
};

const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  dal: "Dal / Lentils",
  sabzi: "Sabzi / Dry",
  rice: "Rice dish",
  roti: "Roti / Bread",
  curry: "Curry / Gravy",
  snack: "Snack",
  sweet: "Sweet",
  main: "Main dish",
  side: "Side",
  breakfast: "Breakfast item",
  chutney: "Chutney",
  raita: "Raita",
  other: "Other",
};

const EFFORT_LABELS: Record<Effort, string> = {
  quick: "Quick (< 20 min)",
  regular: "Regular",
  elaborate: "Elaborate",
};

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  snacks: "Snacks",
  lunch: "Lunch",
  dinner: "Dinner",
};

const CUISINE_COLORS: Record<Cuisine, string> = {
  south_indian: "bg-emerald-50 text-emerald-700",
  north_indian: "bg-amber-50 text-amber-700",
  maharashtrian: "bg-orange-50 text-orange-700",
  continental: "bg-blue-50 text-blue-700",
  chinese_indian: "bg-red-50 text-red-700",
  other: "bg-surface-2 text-muted",
};

// ─── recipe form ─────────────────────────────────────────────────────────────

function RecipeForm({ recipe, onClose }: { recipe?: Recipe; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const isEdit = !!recipe;

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          if (isEdit) await updateRecipe(fd);
          else await addRecipe(fd);
          onClose();
        })
      }
      className="card p-4 space-y-3 mb-4"
    >
      {isEdit && <input type="hidden" name="id" value={recipe.id} />}
      <h3 className="text-sm font-medium">{isEdit ? "Edit dish" : "Add a dish"}</h3>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Dish name</label>
          <input name="name" defaultValue={recipe?.name ?? ""} required
            placeholder="e.g. Palak Paneer, Masala Dosa" className="input w-full" />
        </div>

        <div>
          <label className="label">Cuisine</label>
          <select name="cuisine" defaultValue={recipe?.cuisine ?? "south_indian"} className="input w-full">
            {(Object.keys(CUISINE_LABELS) as Cuisine[]).map(k => (
              <option key={k} value={k}>{CUISINE_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Category</label>
          <select name="category" defaultValue={recipe?.category ?? "main"} className="input w-full">
            {(Object.keys(CATEGORY_LABELS) as RecipeCategory[]).map(k => (
              <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Effort</label>
          <select name="effort" defaultValue={recipe?.effort ?? "regular"} className="input w-full">
            {(Object.keys(EFFORT_LABELS) as Effort[]).map(k => (
              <option key={k} value={k}>{EFFORT_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Veg / Non-veg</label>
          <select name="is_veg" defaultValue={recipe?.is_veg !== false ? "true" : "false"} className="input w-full">
            <option value="true">🌿 Vegetarian</option>
            <option value="false">🍗 Non-vegetarian</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="label">Fits which meals?</label>
          <div className="flex gap-3">
            {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map(mt => (
              <label key={mt} className="flex items-center gap-1.5 text-sm text-muted">
                <input
                  type="checkbox"
                  name="meal_types"
                  value={mt}
                  defaultChecked={recipe ? recipe.meal_types.includes(mt) : mt !== "breakfast"}
                  className="rounded"
                />
                {MEAL_TYPE_LABELS[mt]}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="label">Notes (optional)</label>
          <textarea name="notes" defaultValue={recipe?.notes ?? ""} rows={2}
            placeholder="Boys love this, Mom's recipe, goes well with raita…"
            className="input w-full resize-none" />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : isEdit ? "Save" : "Add dish"}
        </button>
      </div>
    </form>
  );
}

// ─── recipe card ─────────────────────────────────────────────────────────────

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, startTransition] = useTransition();

  if (editing) return <RecipeForm recipe={recipe} onClose={() => setEditing(false)} />;

  return (
    <div className="card p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug">{recipe.name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CUISINE_COLORS[recipe.cuisine]}`}>
              {CUISINE_LABELS[recipe.cuisine]}
            </span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
              {CATEGORY_LABELS[recipe.category]}
            </span>
          </div>
        </div>
        <span className="shrink-0 pt-0.5">
          {recipe.is_veg
            ? <Leaf size={14} strokeWidth={1.75} className="text-emerald-500" />
            : <Drumstick size={14} strokeWidth={1.75} className="text-amber-600" />}
        </span>
      </div>

      {recipe.notes && (
        <p className="text-xs text-muted line-clamp-2">{recipe.notes}</p>
      )}

      <div className="flex items-center gap-1 text-xs text-faint mt-auto pt-1 border-t border-border">
        <span>{EFFORT_LABELS[recipe.effort]}</span>
        <span className="ml-auto flex items-center gap-1">
          {recipe.meal_types.map(mt => (
            <span key={mt} className="rounded bg-surface-2 px-1.5 py-0.5">
              {mt === "breakfast" ? "B" : mt === "lunch" ? "L" : "D"}
            </span>
          ))}
        </span>
        <div className="flex items-center gap-0.5 ml-2">
          {confirmDelete ? (
            <>
              <form action={(fd) => startTransition(() => deleteRecipe(fd))}>
                <input type="hidden" name="id" value={recipe.id} />
                <button type="submit" className="rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 font-medium">Delete</button>
              </form>
              <button onClick={() => setConfirmDelete(false)} className="rounded px-2 py-0.5 text-xs text-muted hover:bg-surface-2">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="rounded p-1 text-faint hover:text-text">
                <Pencil size={13} strokeWidth={1.75} />
              </button>
              <button onClick={() => setConfirmDelete(true)} className="rounded p-1 text-faint hover:text-red-500">
                <Trash2 size={13} strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── library ─────────────────────────────────────────────────────────────────

type FilterCuisine = Cuisine | "all";
type FilterMeal = MealType | "all";

export function RecipeLibrary({ recipes }: { recipes: Recipe[] }) {
  const [adding, setAdding] = useState(false);
  const [cuisineFilter, setCuisineFilter] = useState<FilterCuisine>("all");
  const [mealFilter, setMealFilter] = useState<FilterMeal>("all");
  const [vegFilter, setVegFilter] = useState<"all" | "veg" | "nonveg">("all");

  const filtered = recipes.filter(r => {
    if (cuisineFilter !== "all" && r.cuisine !== cuisineFilter) return false;
    if (mealFilter !== "all" && !r.meal_types.includes(mealFilter)) return false;
    if (vegFilter === "veg" && !r.is_veg) return false;
    if (vegFilter === "nonveg" && r.is_veg) return false;
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Cuisine filter */}
          {(["all", ...Object.keys(CUISINE_LABELS)] as FilterCuisine[]).map(c => (
            <button
              key={c}
              onClick={() => setCuisineFilter(c)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${cuisineFilter === c ? "bg-surface-2 font-medium" : "text-muted hover:bg-surface-2"}`}
            >
              {c === "all" ? "All" : CUISINE_LABELS[c]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* Meal type filter */}
          <select
            value={mealFilter}
            onChange={e => setMealFilter(e.target.value as FilterMeal)}
            className="input text-sm"
            style={{ width: "auto" }}
          >
            <option value="all">All meals</option>
            {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map(mt => (
              <option key={mt} value={mt}>{MEAL_TYPE_LABELS[mt]}</option>
            ))}
          </select>
          {/* Veg filter */}
          <select
            value={vegFilter}
            onChange={e => setVegFilter(e.target.value as "all" | "veg" | "nonveg")}
            className="input text-sm"
            style={{ width: "auto" }}
          >
            <option value="all">Veg & Non-veg</option>
            <option value="veg">🌿 Veg only</option>
            <option value="nonveg">🍗 Non-veg only</option>
          </select>
          <button
            onClick={() => setAdding(v => !v)}
            className="btn-primary flex items-center gap-1.5 shrink-0"
          >
            {adding ? <X size={15} strokeWidth={1.75} /> : <Plus size={15} strokeWidth={1.75} />}
            {adding ? "Cancel" : "Add dish"}
          </button>
        </div>
      </div>

      {adding && <RecipeForm onClose={() => setAdding(false)} />}

      {filtered.length === 0 && !adding ? (
        <p className="py-16 text-center text-sm text-faint">
          {recipes.length === 0
            ? "No dishes yet. Start building your recipe library!"
            : "No dishes match the current filters."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(r => <RecipeCard key={r.id} recipe={r} />)}
        </div>
      )}
    </div>
  );
}
