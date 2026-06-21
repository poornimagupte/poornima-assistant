"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2, CalendarOff, Printer } from "lucide-react";
import type { Staff, StaffTransaction, StaffBalance, StaffAbsence, TxType, PayMethod, AbsenceType } from "@/lib/types";
import { logTransaction, logSalaryWithDeduction, updateStaff, deleteTransaction, addAbsence, deleteAbsence } from "@/app/actions";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const TX_LABELS: Record<TxType, string> = {
  salary: "Salary",
  advance: "Advance",
  repayment: "Repayment",
  bonus: "Bonus",
  reimbursement: "Reimbursement",
  deduction: "Deduction",
  other: "Other",
};

const TX_COLORS: Record<TxType, string> = {
  salary: "text-accent",
  bonus: "text-accent",
  reimbursement: "text-accent",
  advance: "text-amber-600",
  deduction: "text-red-500",
  repayment: "text-sky-600",
  other: "text-muted",
};

function LogTransactionForm({ staffId, salary, outstanding, onClose }: {
  staffId: string;
  salary: number | null;
  outstanding: number;
  onClose: () => void;
}) {
  const [type, setType] = useState<TxType>("salary");
  const [deductMode, setDeductMode] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7) + "-01";

  const isSalary = type === "salary";

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      if (deductMode) {
        await logSalaryWithDeduction(fd);
      } else {
        await logTransaction(fd);
      }
      onClose();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="card p-4 space-y-3">
      <h3 className="text-sm font-medium">Log transaction</h3>
      <input type="hidden" name="staff_id" value={staffId} />

      {/* Deduct-from-salary shortcut banner */}
      {outstanding > 0 && isSalary && (
        <button
          type="button"
          onClick={() => setDeductMode((v) => !v)}
          className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
            deductMode
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-muted hover:bg-surface-2"
          }`}
        >
          <span className="font-medium">Deduct repayment from salary</span>
          <span className="ml-1 text-faint">
            — outstanding advance: {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(outstanding)}
          </span>
        </button>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {!deductMode && (
          <div>
            <label className="label">Type</label>
            <select
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as TxType)}
              className="input w-full"
            >
              {(Object.keys(TX_LABELS) as TxType[]).map((t) => (
                <option key={t} value={t}>{TX_LABELS[t]}</option>
              ))}
            </select>
          </div>
        )}

        {deductMode ? (
          <>
            <div>
              <label className="label">Salary paid (₹)</label>
              <input
                name="salary_amount"
                type="number"
                min="0"
                defaultValue={salary ?? ""}
                required
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">Advance deducted (₹)</label>
              <input
                name="deduct_amount"
                type="number"
                min="0"
                max={outstanding}
                defaultValue=""
                required
                className="input w-full"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="label">Amount (₹)</label>
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={isSalary && salary ? salary : ""}
              required
              className="input w-full"
            />
          </div>
        )}

        <div>
          <label className="label">Date</label>
          <input name="date" type="date" defaultValue={today} className="input w-full" />
        </div>

        <div>
          <label className="label">Method</label>
          <select name="method" className="input w-full">
            <option value="">—</option>
            {(["cash", "upi", "bank", "other"] as PayMethod[]).map((m) => (
              <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
        </div>

        {(isSalary || deductMode) && (
          <div>
            <label className="label">For month</label>
            <input name="for_month" type="date" defaultValue={thisMonth} className="input w-full" />
          </div>
        )}
      </div>

      {!deductMode && (
        <div>
          <label className="label">Note</label>
          <input name="note" placeholder="Optional note" className="input w-full" />
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : deductMode ? "Log salary + repayment" : "Save"}
        </button>
      </div>
    </form>
  );
}

function EditStaffForm({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(async () => { await updateStaff(fd); onClose(); })}
      className="card p-4 space-y-3"
    >
      <h3 className="text-sm font-medium">Edit staff</h3>
      <input type="hidden" name="id" value={staff.id} />
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="name" defaultValue={staff.name} required placeholder="Name *" className="input" />
        <input name="role" defaultValue={staff.role ?? ""} placeholder="Role" className="input" />
        <input name="phone" defaultValue={staff.phone ?? ""} placeholder="Phone" className="input" />
        <input name="monthly_salary" type="number" defaultValue={staff.monthly_salary ?? ""} placeholder="Monthly salary (₹)" className="input" />
        <input name="pay_day" type="number" min="1" max="31" defaultValue={staff.pay_day ?? ""} placeholder="Pay day" className="input" />
        <input name="start_date" type="date" defaultValue={staff.start_date ?? ""} className="input" />
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={staff.status} className="input w-full">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <textarea name="notes" defaultValue={staff.notes ?? ""} placeholder="Notes" rows={2} className="input w-full resize-none" />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

const ABSENCE_LABELS: Record<AbsenceType, string> = {
  sick: "Sick leave", casual: "Casual leave", holiday: "Holiday", other: "Other",
};

function AbsenceSection({ staff, absences }: { staff: Staff; absences: StaffAbsence[] }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selected, setSelected] = useState<string | null>(null); // ISO date clicked
  const [absenceType, setAbsenceType] = useState<AbsenceType>("casual");
  const [note, setNote] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Build a map of date → absence
  const absenceMap = new Map(absences.map(a => [a.date, a]));

  // Calendar grid for current view
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Shift so Monday = 0
  const offset = (firstDay + 6) % 7;
  const cells = Array.from({ length: offset + daysInMonth }, (_, i) =>
    i < offset ? null : i - offset + 1
  );

  function isoDate(day: number) {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${viewYear}-${m}-${d}`;
  }

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelected(null);
  }

  function handleDayClick(day: number) {
    const iso = isoDate(day);
    if (selected === iso) { setSelected(null); return; }
    setSelected(iso);
    setAbsenceType("casual");
    setNote("");
  }

  function handleSave() {
    if (!selected) return;
    const fd = new FormData();
    fd.set("staff_id", staff.id);
    fd.set("date", selected);
    fd.set("type", absenceType);
    fd.set("note", note);
    startTransition(async () => {
      await addAbsence(fd);
      setSelected(null);
    });
  }

  function handleDelete(absence: StaffAbsence) {
    const fd = new FormData();
    fd.set("id", absence.id);
    fd.set("staff_id", staff.id);
    startTransition(() => deleteAbsence(fd));
    setConfirmId(null);
    setSelected(null);
  }

  const monthAbsences = absences.filter(a => a.date.startsWith(
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`
  ));

  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" })
    .format(new Date(viewYear, viewMonth, 1));

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <section className="card overflow-hidden mt-4">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <CalendarOff size={16} strokeWidth={1.75} className="text-muted" />
        <h2 className="text-base font-medium">Days Off</h2>
        {monthAbsences.length > 0 && (
          <span className="ml-auto text-xs text-amber-600 font-medium">
            {monthAbsences.length} day{monthAbsences.length !== 1 ? "s" : ""} off this month
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => shiftMonth(-1)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="text-sm font-medium">{monthLabel}</span>
          <button onClick={() => shiftMonth(1)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs text-faint py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const iso = isoDate(day);
            const absence = absenceMap.get(iso);
            const isSelected = selected === iso;
            const todayStr = today.toISOString().slice(0, 10);
            const isToday = iso === todayStr;

            return (
              <button
                key={iso}
                onClick={() => handleDayClick(day)}
                className={`relative flex items-center justify-center rounded-lg text-sm h-9 transition-colors
                  ${absence ? "bg-amber-100 text-amber-700 font-medium" : ""}
                  ${isSelected ? "ring-2 ring-accent" : ""}
                  ${isToday && !absence ? "font-semibold text-accent" : ""}
                  ${!absence && !isSelected ? "hover:bg-surface-2 text-text" : ""}
                `}
              >
                {day}
                {absence && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Inline panel for selected date */}
        {selected && (() => {
          const absence = absenceMap.get(selected);
          const displayDate = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" })
            .format(new Date(selected));
          return (
            <div className="mt-3 rounded-lg border border-border p-3 space-y-2">
              <p className="text-sm font-medium">{displayDate}</p>
              {absence ? (
                // Already marked — show details + delete
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
                      {ABSENCE_LABELS[absence.type]}
                    </span>
                    {absence.note && <span className="text-muted text-xs">{absence.note}</span>}
                  </div>
                  {confirmId === absence.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(absence)} className="text-xs text-red-500 hover:underline">Confirm delete</button>
                      <button onClick={() => setConfirmId(null)} className="text-xs text-muted hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(absence.id)}
                      className="flex items-center gap-1 text-xs text-faint hover:text-red-500">
                      <Trash2 size={12} strokeWidth={1.75} /> Remove absence
                    </button>
                  )}
                </div>
              ) : (
                // Not marked — show add form
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select value={absenceType} onChange={e => setAbsenceType(e.target.value as AbsenceType)}
                      className="input flex-1">
                      {(Object.keys(ABSENCE_LABELS) as AbsenceType[]).map(t => (
                        <option key={t} value={t}>{ABSENCE_LABELS[t]}</option>
                      ))}
                    </select>
                    <input value={note} onChange={e => setNote(e.target.value)}
                      placeholder="Note (optional)" className="input flex-1" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="btn-primary text-xs px-3 py-1">Mark absent</button>
                    <button onClick={() => setSelected(null)} className="btn-ghost text-xs px-3 py-1">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </section>
  );
}

function SalarySlip({ staff, transactions, absences }: {
  staff: Staff;
  transactions: StaffTransaction[];
  absences: StaffAbsence[];
}) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" })
    .format(new Date(month + "-01"));

  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();

  const monthTx = transactions.filter(t =>
    (t.for_month ?? t.date).slice(0, 7) === month
  );
  const monthAbsences = absences.filter(a => a.date.slice(0, 7) === month);

  const salaryPaid = monthTx.filter(t => t.type === "salary").reduce((s, t) => s + Number(t.amount), 0);
  const advances   = monthTx.filter(t => t.type === "advance").reduce((s, t) => s + Number(t.amount), 0);
  const repayments = monthTx.filter(t => t.type === "repayment").reduce((s, t) => s + Number(t.amount), 0);
  const deductions = monthTx.filter(t => t.type === "deduction").reduce((s, t) => s + Number(t.amount), 0);
  const bonuses    = monthTx.filter(t => t.type === "bonus").reduce((s, t) => s + Number(t.amount), 0);

  const daysOff = monthAbsences.length;
  const daysWorked = daysInMonth - daysOff;
  const netPaid = salaryPaid + bonuses - deductions;

  async function printSlip() {
    const html = `<!DOCTYPE html><html><head>
      <title>Salary Slip – ${staff.name} – ${monthLabel}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
               font-size: 13px; color: #222; padding: 40px; max-width: 680px; margin: 0 auto; }
        h1 { font-size: 20px; font-weight: 700; text-align: center; margin-bottom: 4px; }
        .sub { text-align: center; color: #666; margin-bottom: 24px; font-size: 13px; }
        hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 20px; }
        .lbl { color: #888; font-size: 11px; margin-bottom: 2px; }
        .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;
                 background: #f5f5f3; border-radius: 8px; padding: 14px; margin-bottom: 20px; text-align: center; }
        .stat-v { font-size: 22px; font-weight: 700; }
        .stat-l { font-size: 11px; color: #888; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { text-align: left; font-size: 11px; color: #888; border-bottom: 1px solid #ddd; padding: 6px 0; }
        td { padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
        td:last-child { text-align: right; font-weight: 500; }
        tfoot td { border-top: 2px solid #222; border-bottom: none; font-weight: 700;
                   padding-top: 10px; font-size: 16px; }
        .absent { font-size: 12px; color: #555; margin-bottom: 20px; }
        .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 48px; }
        .sig-line { border-top: 1px solid #999; padding-top: 6px; color: #888; font-size: 11px; }
      </style>
    </head><body>
      <h1>Salary Slip</h1>
      <p class="sub">${monthLabel}</p>
      <hr/>
      <div class="grid2">
        <div><div class="lbl">Name</div><strong>${staff.name}</strong></div>
        ${staff.role ? `<div><div class="lbl">Role</div>${staff.role}</div>` : ""}
        ${staff.phone ? `<div><div class="lbl">Phone</div>${staff.phone}</div>` : ""}
        <div><div class="lbl">Monthly salary</div><strong>${fmt(staff.monthly_salary ?? 0)}</strong></div>
      </div>
      <div class="stats">
        <div><div class="stat-l">Days in month</div><div class="stat-v">${daysInMonth}</div></div>
        <div><div class="stat-l">Days absent</div><div class="stat-v" style="color:${daysOff > 0 ? "#d97706" : "inherit"}">${daysOff}</div></div>
        <div><div class="stat-l">Days worked</div><div class="stat-v" style="color:#1d9e75">${daysWorked}</div></div>
      </div>
      <table>
        <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          <tr><td>Salary paid</td><td>${fmt(salaryPaid)}</td></tr>
          ${bonuses > 0 ? `<tr><td>Bonus</td><td style="color:#1d9e75">${fmt(bonuses)}</td></tr>` : ""}
          ${advances > 0 ? `<tr><td style="color:#d97706">Advance given</td><td style="color:#d97706">− ${fmt(advances)}</td></tr>` : ""}
          ${repayments > 0 ? `<tr><td style="color:#0ea5e9">Advance repaid</td><td style="color:#0ea5e9">+ ${fmt(repayments)}</td></tr>` : ""}
          ${deductions > 0 ? `<tr><td style="color:#ef4444">Deductions</td><td style="color:#ef4444">− ${fmt(deductions)}</td></tr>` : ""}
        </tbody>
        <tfoot><tr><td>Net paid</td><td>${fmt(netPaid)}</td></tr></tfoot>
      </table>
      ${monthAbsences.length > 0 ? `<p class="absent"><strong>Absent dates:</strong> ${monthAbsences.map(a =>
        new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(a.date))
      ).join(", ")}</p>` : ""}
      <div class="sigs">
        <div><div class="sig-line">Employer signature</div></div>
        <div><div class="sig-line">Employee signature</div></div>
      </div>
      <script>window.onload = () => window.print();</script>
    </body></html>`;

    try {
      const { appCacheDir } = await import("@tauri-apps/api/path");
      const { writeFile, mkdir } = await import("@tauri-apps/plugin-fs");
      const { openUrl } = await import("@tauri-apps/plugin-opener");

      const cacheDir = await appCacheDir();
      const dir = `${cacheDir.replace(/\/$/, "")}/slips`;
      await mkdir(dir, { recursive: true }).catch(() => {});
      const path = `${dir}/slip-${Date.now()}.html`;
      await writeFile(path, new TextEncoder().encode(html));
      await openUrl(`file://${path}`);
    } catch {
      // Browser fallback — open in new tab.
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
  }

  return (
    <section className="card p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Printer size={16} strokeWidth={1.75} className="text-muted" />
          <h2 className="text-base font-medium">Salary Slip</h2>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="input text-sm" style={{ width: "160px" }} />
          <button onClick={printSlip} className="btn-primary flex items-center gap-1.5 text-xs">
            <Printer size={13} strokeWidth={1.75} /> Print
          </button>
        </div>
      </div>

      {/* Printable slip */}
      <div id="salary-slip" className="rounded-lg border border-border p-5 space-y-4 print:border-0 print:p-0">
        {/* Header */}
        <div className="text-center border-b border-border pb-4">
          <h3 className="text-lg font-semibold">Salary Slip</h3>
          <p className="text-sm text-muted">{monthLabel}</p>
        </div>

        {/* Employee details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-faint">Name:</span> <span className="font-medium">{staff.name}</span></div>
          {staff.role && <div><span className="text-faint">Role:</span> {staff.role}</div>}
          {staff.phone && <div><span className="text-faint">Phone:</span> {staff.phone}</div>}
          <div><span className="text-faint">Monthly salary:</span> <span className="font-medium">{fmt(staff.monthly_salary ?? 0)}</span></div>
        </div>

        {/* Attendance */}
        <div className="rounded-lg bg-surface-2 p-3 text-sm grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-faint text-xs mb-0.5">Days in month</p>
            <p className="font-semibold text-lg">{daysInMonth}</p>
          </div>
          <div className="text-center">
            <p className="text-faint text-xs mb-0.5">Days absent</p>
            <p className={`font-semibold text-lg ${daysOff > 0 ? "text-amber-600" : ""}`}>{daysOff}</p>
          </div>
          <div className="text-center">
            <p className="text-faint text-xs mb-0.5">Days worked</p>
            <p className="font-semibold text-lg text-accent">{daysWorked}</p>
          </div>
        </div>

        {/* Earnings & deductions */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-faint text-xs">
              <th className="text-left pb-1">Description</th>
              <th className="text-right pb-1">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="py-1.5">Salary paid</td><td className="text-right font-medium">{fmt(salaryPaid)}</td></tr>
            {bonuses > 0 && <tr><td className="py-1.5">Bonus</td><td className="text-right text-accent">{fmt(bonuses)}</td></tr>}
            {advances > 0 && <tr><td className="py-1.5 text-amber-600">Advance given</td><td className="text-right text-amber-600">−{fmt(advances)}</td></tr>}
            {repayments > 0 && <tr><td className="py-1.5 text-sky-600">Advance repaid</td><td className="text-right text-sky-600">+{fmt(repayments)}</td></tr>}
            {deductions > 0 && <tr><td className="py-1.5 text-red-500">Deductions</td><td className="text-right text-red-500">−{fmt(deductions)}</td></tr>}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              <td className="pt-2">Net paid</td>
              <td className="pt-2 text-right text-lg">{fmt(netPaid)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Absences list */}
        {monthAbsences.length > 0 && (
          <div className="text-sm">
            <p className="text-xs text-faint mb-1">Absent dates:</p>
            <p>{monthAbsences.map(a =>
              new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(a.date))
            ).join(", ")}</p>
          </div>
        )}

        {/* Signature */}
        <div className="grid grid-cols-2 gap-8 pt-6 mt-4 border-t border-border text-xs text-faint">
          <div>
            <div className="border-b border-border mb-1 h-6" />
            Employer signature
          </div>
          <div>
            <div className="border-b border-border mb-1 h-6" />
            Employee signature
          </div>
        </div>
      </div>
    </section>
  );
}

export function StaffDetail({ staff, transactions, balance, absences }: {
  staff: Staff;
  transactions: StaffTransaction[];
  balance: StaffBalance | null;
  absences: StaffAbsence[];
}) {
  const router = useRouter();
  const [logging, setLogging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const outstanding = balance?.advance_outstanding ?? 0;
  const lastPaid = balance?.last_salary_date;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <button
          onClick={() => router.push("/staff")}
          className="mt-1 rounded-lg p-1.5 text-muted hover:bg-surface-2"
          aria-label="Back"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-medium">{staff.name}</h1>
            {staff.status === "inactive" && (
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-faint">Inactive</span>
            )}
          </div>
          {staff.role && <p className="mt-0.5 text-sm text-muted">{staff.role}</p>}
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface-2"
        >
          <Pencil size={14} strokeWidth={1.75} />
          Edit
        </button>
      </div>

      {editing && <div className="mb-4"><EditStaffForm staff={staff} onClose={() => setEditing(false)} /></div>}

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Monthly salary", value: staff.monthly_salary ? fmt(staff.monthly_salary) : "—" },
          { label: "Outstanding advance", value: outstanding > 0 ? fmt(outstanding) : "None", highlight: outstanding > 0 },
          { label: "Last paid", value: lastPaid ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(lastPaid)) : "Never" },
          { label: "Pay day", value: staff.pay_day ? `${staff.pay_day}th` : "—" },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="card p-3">
            <p className="text-xs text-faint mb-1">{label}</p>
            <p className={`font-medium ${highlight ? "text-amber-600" : ""}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Log transaction */}
      <div className="mb-4">
        {logging ? (
          <LogTransactionForm staffId={staff.id} salary={staff.monthly_salary} outstanding={outstanding} onClose={() => setLogging(false)} />
        ) : (
          <button
            onClick={() => setLogging(true)}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus size={15} strokeWidth={1.75} />
            Log transaction
          </button>
        )}
      </div>

      {/* Ledger */}
      <section className="card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-medium">Activity</h2>
        </div>
        {transactions.length === 0 ? (
          <p className="py-10 text-center text-sm text-faint">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {transactions.map((tx) => (
              <li key={tx.id} className="group flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${TX_COLORS[tx.type]}`}>
                      {TX_LABELS[tx.type]}
                    </span>
                    {tx.method && <span className="text-xs text-faint capitalize">{tx.method}</span>}
                    {tx.for_month && (
                      <span className="text-xs text-faint">
                        for {new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(tx.for_month))}
                      </span>
                    )}
                  </div>
                  {tx.note && <p className="mt-0.5 text-xs text-muted truncate">{tx.note}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-medium ${TX_COLORS[tx.type]}`}>{fmt(tx.amount)}</p>
                  <p className="text-xs text-faint">
                    {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(tx.date))}
                  </p>
                </div>
                {confirmDeleteId === tx.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <form action={deleteTransaction}>
                      <input type="hidden" name="id" value={tx.id} />
                      <input type="hidden" name="staff_id" value={tx.staff_id} />
                      <button type="submit" className="rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 font-medium">
                        Delete
                      </button>
                    </form>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded px-2 py-0.5 text-xs text-muted hover:bg-surface-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(tx.id)}
                    aria-label="Delete transaction"
                    className="opacity-0 group-hover:opacity-100 rounded p-1 text-faint hover:text-red-500 transition-opacity shrink-0"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <AbsenceSection staff={staff} absences={absences} />
      <SalarySlip staff={staff} transactions={transactions} absences={absences} />
    </div>
  );
}
