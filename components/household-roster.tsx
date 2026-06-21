"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, AlertCircle } from "lucide-react";
import type { StaffWithBalance } from "@/lib/types";
import { addStaff } from "@/app/actions";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function AddStaffForm({ onClose }: { onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          await addStaff(fd);
          onClose();
        })
      }
      className="card mb-4 p-4 space-y-3"
    >
      <h3 className="text-sm font-medium">Add staff member</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="name" required placeholder="Name *" className="input" />
        <input name="role" placeholder="Role (Cook, Driver…)" className="input" />
        <input name="phone" placeholder="Phone" className="input" />
        <input name="monthly_salary" type="number" placeholder="Monthly salary (₹)" className="input" />
        <input name="pay_day" type="number" min="1" max="31" placeholder="Pay day (1–31)" className="input" />
        <div>
          <label className="label">Start date (optional)</label>
          <input name="start_date" type="date" className="input" />
        </div>
      </div>
      <textarea name="notes" placeholder="Notes" rows={2} className="input w-full resize-none" />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
    </form>
  );
}

export function HouseholdRoster({ staff }: { staff: StaffWithBalance[] }) {
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  const active = staff.filter((s) => s.status === "active");
  const inactive = staff.filter((s) => s.status === "inactive");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Users size={16} strokeWidth={1.75} />
          {active.length} active
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={15} strokeWidth={1.75} />
          Add staff
        </button>
      </div>

      {adding && <AddStaffForm onClose={() => setAdding(false)} />}

      {staff.length === 0 && !adding ? (
        <p className="py-16 text-center text-sm text-faint">
          No staff yet. Add someone above.
        </p>
      ) : (
        <>
          {active.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {active.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/staff/${s.id}`)}
                  className="card p-4 text-left hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      {s.role && <p className="text-xs text-muted mt-0.5">{s.role}</p>}
                    </div>
                    {s.advance_outstanding > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 shrink-0">
                        <AlertCircle size={13} strokeWidth={1.75} />
                        Advance
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-faint mb-0.5">Monthly salary</p>
                      <p className="font-medium">{s.monthly_salary ? fmt(s.monthly_salary) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-faint mb-0.5">Outstanding advance</p>
                      <p className={`font-medium ${s.advance_outstanding > 0 ? "text-amber-600" : "text-muted"}`}>
                        {s.advance_outstanding > 0 ? fmt(s.advance_outstanding) : "None"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-faint mb-0.5">Last paid</p>
                      <p className="text-muted">
                        {s.last_salary_date
                          ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(s.last_salary_date))
                          : "Never"}
                      </p>
                    </div>
                    {s.pay_day && (
                      <div>
                        <p className="text-xs text-faint mb-0.5">Pay day</p>
                        <p className="text-muted">{s.pay_day}th of month</p>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {inactive.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium text-faint">Inactive</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {inactive.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => router.push(`/staff/${s.id}`)}
                    className="card p-4 text-left opacity-60 hover:opacity-80 transition-opacity"
                  >
                    <p className="font-medium">{s.name}</p>
                    {s.role && <p className="text-xs text-muted mt-0.5">{s.role}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
