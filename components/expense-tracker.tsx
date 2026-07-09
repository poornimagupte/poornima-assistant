"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Expense, ExpenseCategory } from "@/lib/types";
import { addExpense, updateExpense, deleteExpense } from "@/app/actions";
import { CATEGORIES, CATEGORY_LABELS, METHODS, METHOD_LABELS, fmtINR } from "@/lib/expense-categories";

// ─── quick entry bar ─────────────────────────────────────────────────────────

function EntryBar() {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      ref={formRef}
      action={(fd) => startTransition(async () => {
        await addExpense(fd);
        formRef.current?.reset();
        amountRef.current?.focus();
      })}
      className="card p-3 mb-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={amountRef}
          name="amount"
          type="number"
          min="1"
          step="0.01"
          required
          autoFocus
          placeholder="₹ Amount"
          className="input !w-28"
        />
        <select name="category" className="input !w-36" defaultValue="groceries">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select name="method" className="input !w-24" defaultValue="upi">
          {METHODS.map((m) => (
            <option key={m} value={m}>{METHOD_LABELS[m]}</option>
          ))}
        </select>
        <input name="note" placeholder="Note (optional)" className="input flex-1 min-w-[120px]" />
        <input name="date" type="date" defaultValue={today} className="input !w-36" />
        <button type="submit" disabled={pending}
          className="btn-primary flex items-center gap-1.5 shrink-0">
          <Plus size={15} strokeWidth={1.75} />
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
    </form>
  );
}

// ─── edit form (inline, replaces the row) ────────────────────────────────────

function EditRow({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(async () => { await updateExpense(fd); onClose(); })}
      className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2"
    >
      <input type="hidden" name="id" value={expense.id} />
      <input name="amount" type="number" min="1" step="0.01" defaultValue={expense.amount} required className="input !w-24" />
      <select name="category" defaultValue={expense.category} className="input !w-36">
        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
      </select>
      <select name="method" defaultValue={expense.method ?? "upi"} className="input !w-24">
        {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
      </select>
      <input name="note" defaultValue={expense.note ?? ""} placeholder="Note" className="input flex-1 min-w-[100px]" />
      <input name="date" type="date" defaultValue={expense.date} className="input !w-36" />
      <button type="submit" disabled={pending} className="btn-primary text-xs px-3 py-1.5">Save</button>
      <button type="button" onClick={onClose} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
    </form>
  );
}

// ─── day-grouped list ────────────────────────────────────────────────────────

function ExpenseRow({ expense }: { expense: Expense }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, startTransition] = useTransition();

  if (editing) return <EditRow expense={expense} onClose={() => setEditing(false)} />;

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
      <span className="w-28 shrink-0 text-xs text-muted">{CATEGORY_LABELS[expense.category]}</span>
      <span className="flex-1 min-w-0 truncate text-sm">
        {expense.note || <span className="text-faint">—</span>}
      </span>
      {expense.method && (
        <span className="shrink-0 text-xs text-faint">{METHOD_LABELS[expense.method]}</span>
      )}
      <span className="w-20 shrink-0 text-right text-sm font-medium">{fmtINR(Number(expense.amount))}</span>
      <div className="flex shrink-0 items-center gap-0.5">
        {confirmDelete ? (
          <>
            <form action={(fd) => startTransition(() => deleteExpense(fd))}>
              <input type="hidden" name="id" value={expense.id} />
              <button type="submit" className="rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50">Delete</button>
            </form>
            <button onClick={() => setConfirmDelete(false)} className="rounded px-2 py-0.5 text-xs text-muted">Cancel</button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)}
              className="rounded p-1 text-faint opacity-0 group-hover:opacity-100 hover:text-text">
              <Pencil size={13} strokeWidth={1.75} />
            </button>
            <button onClick={() => setConfirmDelete(true)}
              className="rounded p-1 text-faint opacity-0 group-hover:opacity-100 hover:text-red-500">
              <Trash2 size={13} strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── main tracker ────────────────────────────────────────────────────────────

export function ExpenseTracker({
  expenses,
  month, // YYYY-MM
}: {
  expenses: Expense[];
  month: string;
}) {
  const router = useRouter();

  function shiftMonth(delta: number) {
    const d = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + delta, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const thisMonth = new Date().toISOString().slice(0, 7);
    router.push(key === thisMonth ? "/expenses" : `/expenses?month=${key}`);
  }

  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" })
    .format(new Date(month + "-01"));

  // Group by day, newest first
  const byDay = new Map<string, Expense[]>();
  for (const e of expenses) {
    (byDay.get(e.date) ?? byDay.set(e.date, []).get(e.date)!).push(e);
  }
  const days = [...byDay.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <EntryBar />

      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => shiftMonth(-1)} aria-label="Previous month"
          className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
          <ChevronLeft size={16} strokeWidth={1.75} />
        </button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <button onClick={() => shiftMonth(1)} aria-label="Next month"
          className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
          <ChevronRight size={16} strokeWidth={1.75} />
        </button>
      </div>

      {/* Day groups */}
      {days.length === 0 ? (
        <p className="py-16 text-center text-sm text-faint">
          No expenses logged for {monthLabel}.
        </p>
      ) : (
        <div className="card divide-y divide-border overflow-hidden">
          {days.map((day) => {
            const items = byDay.get(day)!;
            const dayTotal = items.reduce((s, e) => s + Number(e.amount), 0);
            return (
              <div key={day} className="px-3 py-2.5">
                <div className="mb-1 flex items-center justify-between px-2">
                  <span className="text-xs font-medium text-faint">
                    {new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" })
                      .format(new Date(day))}
                  </span>
                  <span className="text-xs text-muted">{fmtINR(dayTotal)}</span>
                </div>
                {items.map((e) => <ExpenseRow key={e.id} expense={e} />)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
