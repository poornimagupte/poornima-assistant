"use client";

import { useState, useTransition, useCallback } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Copy, Save } from "lucide-react";
import type { MealPlan, Recipe } from "@/lib/types";
import { saveMealPlan, copyLastWeek, suggestMeals } from "@/app/actions";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const day = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

function dateLabel(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function isToday(d: Date): boolean {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

const MEALS = ["breakfast", "lunch", "snacks", "dinner"] as const;
const MEAL_EMOJI: Record<string, string> = { breakfast: "☀️", snacks: "🍵", lunch: "🍛", dinner: "🌙" };

// ─── cell editor ─────────────────────────────────────────────────────────────

function MealCell({
  date,
  meal,
  value,
  recipes,
  onChange,
}: {
  date: string;
  meal: string;
  value: string;
  recipes: Recipe[];
  onChange: (date: string, meal: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter recipes that fit this meal type
  const matching = recipes.filter(r => r.meal_types.includes(meal as "breakfast" | "snacks" | "lunch" | "dinner"));

  function handleBlur() {
    setEditing(false);
    setShowSuggestions(false);
    if (text !== value) {
      onChange(date, meal, text);
    }
  }

  function selectRecipe(name: string) {
    const newValue = text ? `${text}, ${name}` : name;
    setText(newValue);
    setShowSuggestions(false);
    onChange(date, meal, newValue);
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setEditing(true); setText(value); }}
        className={`w-full min-h-[2.5rem] rounded-lg border border-dashed px-2 py-1.5 text-left text-xs transition-colors ${
          value
            ? "border-border bg-surface text-text"
            : "border-border text-faint hover:border-border-strong hover:bg-surface-2"
        }`}
      >
        {value || "—"}
      </button>
    );
  }

  return (
    <div className="relative">
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={handleBlur}
        onFocus={() => setShowSuggestions(true)}
        placeholder={`${meal}…`}
        className="input w-full text-xs"
        onKeyDown={e => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
      />
      {showSuggestions && matching.length > 0 && (
        <div
          className="absolute z-10 mt-1 max-h-32 w-full overflow-auto rounded-lg border border-border bg-surface shadow-lg"
          onMouseDown={e => e.preventDefault()} // prevent blur on click
        >
          {matching.slice(0, 8).map(r => (
            <button
              key={r.id}
              onMouseDown={() => selectRecipe(r.name)}
              className="block w-full px-2.5 py-1.5 text-left text-xs text-muted hover:bg-surface-2 hover:text-text"
            >
              {r.name}
              <span className="ml-1 text-faint">
                {r.is_veg ? "🌿" : "🍗"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── planner ─────────────────────────────────────────────────────────────────

export function MealPlanner({
  plans,
  recipes,
}: {
  plans: MealPlan[];
  recipes: Recipe[];
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [pending, startTransition] = useTransition();
  const [suggesting, setSuggesting] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [localEdits, setLocalEdits] = useState<Record<string, Record<string, string>>>({});

  const dates = getWeekDates(weekOffset);
  const planMap = new Map(plans.map(p => [p.date, p]));

  const getValue = useCallback((date: string, meal: string): string => {
    // Local edit takes priority, then DB
    if (localEdits[date]?.[meal] !== undefined) return localEdits[date][meal];
    const plan = planMap.get(date);
    if (!plan) return "";
    const mealKey = meal as "breakfast" | "snacks" | "lunch" | "dinner";
    return plan[mealKey] ?? "";
  }, [localEdits, planMap]);

  function handleCellChange(date: string, meal: string, value: string) {
    setLocalEdits(prev => ({
      ...prev,
      [date]: { ...prev[date], [meal]: value },
    }));
  }

  function handleSaveDay(date: string) {
    const plan = planMap.get(date);
    const edits = localEdits[date] ?? {};
    const fd = new FormData();
    fd.set("date", date);
    fd.set("breakfast", edits.breakfast ?? plan?.breakfast ?? "");
    fd.set("snacks", edits.snacks ?? plan?.snacks ?? "");
    fd.set("lunch", edits.lunch ?? plan?.lunch ?? "");
    fd.set("dinner", edits.dinner ?? plan?.dinner ?? "");
    fd.set("notes", plan?.notes ?? "");
    startTransition(async () => {
      await saveMealPlan(fd);
      setLocalEdits(prev => {
        const next = { ...prev };
        delete next[date];
        return next;
      });
    });
  }

  function handleSaveAll() {
    const editedDates = Object.keys(localEdits);
    if (editedDates.length === 0) return;
    startTransition(async () => {
      for (const date of editedDates) {
        const plan = planMap.get(date);
        const edits = localEdits[date] ?? {};
        const fd = new FormData();
        fd.set("date", date);
        fd.set("breakfast", edits.breakfast ?? plan?.breakfast ?? "");
        fd.set("snacks", edits.snacks ?? plan?.snacks ?? "");
        fd.set("lunch", edits.lunch ?? plan?.lunch ?? "");
        fd.set("dinner", edits.dinner ?? plan?.dinner ?? "");
        fd.set("notes", plan?.notes ?? "");
        await saveMealPlan(fd);
      }
      setLocalEdits({});
    });
  }

  async function handleCopyLastWeek() {
    startTransition(async () => {
      const result = await copyLastWeek();
      if (!result) return;
      if ("error" in result) setCopyMsg(result.error ?? "Unknown error");
      else setCopyMsg(`Copied ${result.count} days from last week`);
      setTimeout(() => setCopyMsg(null), 3000);
    });
  }

  async function handleSuggest() {
    setSuggesting(true);
    const fd = new FormData();
    const dateStrs = dates.map(d => fmt(d));
    fd.set("dates", dateStrs.join(","));
    // Build current plans object
    const current: Record<string, Record<string, string>> = {};
    for (const d of dateStrs) {
      current[d] = {
        breakfast: getValue(d, "breakfast"),
        snacks: getValue(d, "snacks"),
        lunch: getValue(d, "lunch"),
        dinner: getValue(d, "dinner"),
      };
    }
    fd.set("current_plans", JSON.stringify(current));
    const result = await suggestMeals(fd);
    setSuggesting(false);
    if ("error" in result) {
      setCopyMsg(result.error);
      setTimeout(() => setCopyMsg(null), 4000);
      return;
    }
    // Merge suggestions into local edits (only fill blanks)
    setLocalEdits(prev => {
      const next = { ...prev };
      for (const [date, meals] of Object.entries(result.suggestions)) {
        if (!next[date]) next[date] = {};
        for (const [meal, value] of Object.entries(meals)) {
          const existing = getValue(date, meal);
          if (!existing && value) {
            next[date][meal] = value;
          }
        }
      }
      return next;
    });
  }

  const hasEdits = Object.keys(localEdits).length > 0;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${weekOffset === 0 ? "bg-surface-2 font-medium" : "text-muted hover:bg-surface-2"}`}
          >
            This week
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>
          <span className="text-sm text-faint ml-1">
            {dateLabel(dates[0])} – {dateLabel(dates[6])}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {copyMsg && <span className="text-xs text-muted">{copyMsg}</span>}
          <button
            onClick={handleCopyLastWeek}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface-2 disabled:opacity-50"
          >
            <Copy size={14} strokeWidth={1.75} />
            Copy last week
          </button>
          <button
            onClick={handleSuggest}
            disabled={suggesting || pending}
            className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent-soft px-3 py-1.5 text-sm text-accent hover:bg-accent/10 disabled:opacity-50 transition-colors"
          >
            <Sparkles size={14} strokeWidth={1.75} className={suggesting ? "animate-pulse" : ""} />
            {suggesting ? "Thinking…" : "Suggest meals"}
          </button>
          {hasEdits && (
            <button
              onClick={handleSaveAll}
              disabled={pending}
              className="btn-primary flex items-center gap-1.5"
            >
              <Save size={14} strokeWidth={1.75} />
              {pending ? "Saving…" : "Save all"}
            </button>
          )}
        </div>
      </div>

      {/* Weekly grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-px rounded-xl border border-border bg-border" style={{ minWidth: "700px" }}>
          {/* Header row */}
          <div className="bg-surface-2 p-2" />
          {dates.map(d => (
            <div
              key={fmt(d)}
              className={`bg-surface-2 p-2 text-center ${isToday(d) ? "ring-2 ring-inset ring-accent/30" : ""}`}
            >
              <p className={`text-xs font-medium ${isToday(d) ? "text-accent" : "text-muted"}`}>
                {dayLabel(d)}
              </p>
              <p className={`text-sm ${isToday(d) ? "font-semibold" : ""}`}>{d.getDate()}</p>
            </div>
          ))}

          {/* Meal rows */}
          {MEALS.map(meal => (
            <>
              <div key={`label-${meal}`} className="bg-surface flex items-center px-3 py-2">
                <span className="text-xs text-muted whitespace-nowrap">
                  {MEAL_EMOJI[meal]} {meal.charAt(0).toUpperCase() + meal.slice(1)}
                </span>
              </div>
              {dates.map(d => {
                const dateStr = fmt(d);
                const hasEdit = localEdits[dateStr]?.[meal] !== undefined;
                return (
                  <div
                    key={`${dateStr}-${meal}`}
                    className={`bg-surface p-1.5 ${isToday(d) ? "ring-2 ring-inset ring-accent/10" : ""} ${hasEdit ? "bg-accent-soft/30" : ""}`}
                  >
                    <MealCell
                      date={dateStr}
                      meal={meal}
                      value={getValue(dateStr, meal)}
                      recipes={recipes}
                      onChange={handleCellChange}
                    />
                  </div>
                );
              })}
            </>
          ))}

          {/* Save row */}
          <div className="bg-surface p-1" />
          {dates.map(d => {
            const dateStr = fmt(d);
            const hasEdit = !!localEdits[dateStr];
            return (
              <div key={`save-${dateStr}`} className="bg-surface p-1 flex justify-center">
                {hasEdit && (
                  <button
                    onClick={() => handleSaveDay(dateStr)}
                    disabled={pending}
                    className="rounded px-2 py-0.5 text-xs text-accent hover:bg-accent-soft transition-colors"
                  >
                    Save
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
