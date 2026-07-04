import { UtensilsCrossed } from "lucide-react";
import type { MealPlan } from "@/lib/types";

export function TodayMenuCard({ plan }: { plan: MealPlan | null }) {
  const meals = [
    { letter: "B", label: "Breakfast", value: plan?.breakfast },
    { letter: "L", label: "Lunch", value: plan?.lunch },
    { letter: "S", label: "Snacks", value: plan?.snacks },
    { letter: "D", label: "Dinner", value: plan?.dinner },
  ];

  const hasAnyMeal = meals.some(m => m.value);

  return (
    <section className="card p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2">
        <UtensilsCrossed size={18} strokeWidth={1.75} className="text-muted" />
        <h2 className="text-base font-medium">Today&apos;s Menu</h2>
      </div>

      {!hasAnyMeal ? (
        <a
          href="/meals"
          className="block py-6 text-center text-sm text-faint hover:text-muted transition-colors"
        >
          No menu planned — tap to decide.
        </a>
      ) : (
        <div className="space-y-2">
          {meals.map(({ letter, label, value }) => (
            <div key={label} className="flex gap-2">
              <span className="w-5 shrink-0 text-xs text-faint pt-0.5">{letter}</span>
              <div className="min-w-0">
                <p className="text-[11px] leading-tight text-faint">{label}</p>
                <p className="text-sm leading-snug">
                  {value || <span className="text-faint">—</span>}
                </p>
              </div>
            </div>
          ))}
          {plan?.notes && (
            <p className="text-xs text-muted border-t border-border pt-2 mt-2">
              📝 {plan.notes}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
