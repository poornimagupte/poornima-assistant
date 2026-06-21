"use client";

import { useTransition } from "react";
import { Trash2, Bell, X, Plus } from "lucide-react";
import type { TaskWithReminders, Project } from "@/lib/types";
import {
  updateTask,
  deleteTask,
  addReminder,
  removeReminder,
} from "@/app/actions";

const RECURRENCE = [
  { label: "Does not repeat", value: "" },
  { label: "Every day", value: "FREQ=DAILY" },
  { label: "Every weekday", value: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
  { label: "Every week", value: "FREQ=WEEKLY" },
  { label: "Every month", value: "FREQ=MONTHLY" },
];

const REMINDER_PRESETS = [
  { label: "1 day before", value: 1440 },
  { label: "2 hours before", value: 120 },
  { label: "1 hour before", value: 60 },
  { label: "30 min before", value: 30 },
  { label: "10 min before", value: 10 },
];

function reminderLabel(mins: number | null): string {
  if (!mins) return "reminder";
  if (mins % 1440 === 0) return `${mins / 1440} day before`;
  if (mins % 60 === 0) return `${mins / 60} hr before`;
  return `${mins} min before`;
}

// Splits an ISO timestamp into the date + time strings the inputs want,
// in the browser's own timezone.
function splitLocal(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function TaskEditor({
  task,
  projects,
}: {
  task: TaskWithReminders;
  projects: Project[];
}) {
  const [pending, startTransition] = useTransition();
  const { date, time } = splitLocal(task.due_at);

  // Compose due_at from the date/time fields (browser tz) before saving.
  function save(fd: FormData) {
    const d = String(fd.get("due_date") ?? "").trim();
    const t = String(fd.get("due_time") ?? "").trim();
    const allDay = fd.get("is_all_day") === "true";

    let dueAt = "";
    if (d) {
      const composed = new Date(`${d}T${allDay ? "00:00" : t || "09:00"}`);
      dueAt = composed.toISOString();
    }
    fd.set("due_at", dueAt);
    fd.delete("due_date");
    fd.delete("due_time");
    startTransition(() => updateTask(fd));
  }

  const labelCls = "text-xs text-muted w-20 shrink-0 pt-2";
  const fieldRow = "flex items-start gap-3";

  return (
    <div className="card p-5">
      <form action={save} className="space-y-3.5">
        <input type="hidden" name="id" value={task.id} />

        <input
          name="title"
          defaultValue={task.title}
          placeholder="Task title"
          className="w-full bg-transparent text-base font-medium outline-none"
        />

        <div className={fieldRow}>
          <span className={labelCls}>Due</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              name="due_date"
              defaultValue={date}
              className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm outline-none"
            />
            <input
              type="time"
              name="due_time"
              defaultValue={time}
              className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm outline-none"
            />
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                name="is_all_day"
                value="true"
                defaultChecked={task.is_all_day}
              />
              All day
            </label>
          </div>
        </div>

        <div className={fieldRow}>
          <span className={labelCls}>Priority</span>
          <div className="flex gap-1.5">
            {(["low", "med", "high"] as const).map((p) => (
              <label
                key={p}
                className="cursor-pointer rounded-lg border border-border px-3 py-1 text-xs capitalize has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent"
              >
                <input
                  type="radio"
                  name="priority"
                  value={p}
                  defaultChecked={task.priority === p}
                  className="sr-only"
                />
                {p}
              </label>
            ))}
          </div>
        </div>

        <div className={fieldRow}>
          <span className={labelCls}>Project</span>
          <select
            name="project_id"
            defaultValue={task.project_id ?? ""}
            className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm outline-none"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className={fieldRow}>
          <span className={labelCls}>Repeat</span>
          <select
            name="recurrence"
            defaultValue={task.recurrence ?? ""}
            className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm outline-none"
          >
            {RECURRENCE.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className={fieldRow}>
          <span className={labelCls}>Notes</span>
          <textarea
            name="notes"
            defaultValue={task.notes ?? ""}
            rows={2}
            placeholder="Anything to remember…"
            className="flex-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm outline-none resize-none"
          />
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>

      {/* Reminders live in their own forms (can't nest <form>) */}
      <div className="mt-4 border-t border-border pt-4">
        <div className="mb-2 flex items-center gap-2">
          <Bell size={15} strokeWidth={1.75} className="text-muted" />
          <span className="text-xs text-muted">Reminders</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {task.reminders.map((r) => (
            <span
              key={r.id}
              className="flex items-center gap-1.5 rounded-lg bg-info-soft px-2.5 py-1 text-xs text-info"
            >
              {reminderLabel(r.offset_minutes)}
              <form action={removeReminder}>
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" aria-label="Remove reminder">
                  <X size={12} strokeWidth={2} />
                </button>
              </form>
            </span>
          ))}

          <form action={addReminder} className="flex items-center gap-1">
            <input type="hidden" name="task_id" value={task.id} />
            <select
              name="offset_minutes"
              className="rounded-lg border border-dashed border-border-strong bg-transparent px-2 py-1 text-xs text-muted outline-none"
              defaultValue=""
            >
              <option value="" disabled>
                add…
              </option>
              {REMINDER_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              aria-label="Add reminder"
              className="rounded p-1 text-muted hover:text-text"
            >
              <Plus size={14} strokeWidth={2} />
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <form action={deleteTask}>
          <input type="hidden" name="id" value={task.id} />
          <button
            type="submit"
            className="flex items-center gap-1.5 text-xs text-muted hover:text-red-500"
          >
            <Trash2 size={14} strokeWidth={1.75} />
            Delete task
          </button>
        </form>
      </div>
    </div>
  );
}
